import type { InferSelectModel } from "drizzle-orm";

import { ORPCError } from "@orpc/server";
import dns from "node:dns/promises";
import { isIP } from "node:net";
import puppeteer, { type Browser, type BrowserContext, type ConnectOptions, type Page } from "puppeteer-core";

import type { schema } from "@/integrations/drizzle";

import { pageDimensionsAsPixels } from "@/schema/page";
import { printMarginTemplates } from "@/schema/templates";
import { env } from "@/utils/env";
import { generatePrinterToken } from "@/utils/printer-token";

import { getStorageService, uploadFile } from "./storage";

const SCREENSHOT_TTL = 1000 * 60 * 60 * 6; // 6 hours

// Deduplicate concurrent requests for the same resume
const activePrintJobs = new Map<string, Promise<string>>();
const activeScreenshotJobs = new Map<string, Promise<string>>();

// Singleton browser instance for connection reuse
let browserInstance: Browser | null = null;

async function normalizePrinterEndpoint(printerEndpoint: string): Promise<URL> {
  // Convert endpoint hostname to IP when using chromedp
  // https://github.com/amruthpillai/reactive-resume/issues/2681
  const endpoint = new URL(printerEndpoint);

  if (!isIP(endpoint.hostname) && !endpoint.protocol.startsWith("ws")) {
    const { address } = await dns.lookup(endpoint.hostname);
    endpoint.hostname = address;
  }

  return endpoint;
}

async function getBrowser(): Promise<Browser> {
  // Reuse existing connected browser if available
  if (browserInstance?.connected) return browserInstance;

  const args = ["--disable-dev-shm-usage", "--disable-features=LocalNetworkAccessChecks,site-per-process,FedCm"];

  const endpoint = await normalizePrinterEndpoint(env.PRINTER_ENDPOINT);
  const isWebSocket = endpoint.protocol.startsWith("ws");
  const connectOptions: ConnectOptions = { acceptInsecureCerts: true };

  endpoint.searchParams.append("launch", JSON.stringify({ args }));

  if (isWebSocket) connectOptions.browserWSEndpoint = endpoint.toString();
  else connectOptions.browserURL = endpoint.toString();

  browserInstance = await puppeteer.connect(connectOptions);
  return browserInstance;
}

async function closeBrowser(): Promise<void> {
  if (browserInstance?.connected) {
    await browserInstance.close();
    browserInstance = null;
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Unknown error";
}

function throwPrinterStepError(step: string, hint: string, error: unknown): never {
  const details = toErrorMessage(error);

  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `${step}. ${hint}. Details: ${details}`,
    cause: error,
  });
}

// Close browser on process termination
process.on("exit", async () => {
  await closeBrowser();
  process.exit(0);
});

/**
 * Generates a PDF from a resume and uploads it to storage.
 *
 * The process:
 * 1. Clean up any existing PDF for this resume
 * 2. Navigate to the printer route which renders the resume
 * 3. Calculate PDF margins (some templates require margins to be applied via PDF)
 * 4. Adjust CSS variables so content fits within printable area (accounting for margins)
 * 5. Add page break CSS to ensure each visual resume page becomes a PDF page
 * 6. Generate the PDF with proper dimensions and margins
 * 7. Upload to storage and return the URL
 */
async function doPrintResumeAsPDF(
  input: Pick<InferSelectModel<typeof schema.resume>, "id" | "data" | "userId">,
): Promise<string> {
  const { id, data, userId } = input;

  // Step 1: Delete any existing PDF for this resume to ensure fresh generation
  const storageService = getStorageService();
  const pdfPrefix = `uploads/${userId}/pdfs/${id}`;
  await storageService.delete(pdfPrefix);

  // Step 2: Prepare the URL and authentication for the printer route
  // The printer route renders the resume in a format optimized for PDF generation
  const baseUrl = env.PRINTER_APP_URL ?? env.APP_URL;
  const domain = new URL(baseUrl).hostname;

  const format = data.metadata.page.format;
  const locale = data.metadata.page.locale;
  const template = data.metadata.template;

  // Generate a secure token to authenticate the printer request
  const token = generatePrinterToken(id);
  const url = `${baseUrl}/printer/${id}?token=${token}`;

  // Step 3: Calculate print paddings for templates that disable CSS padding in print mode.
  // We render these margins inside the page (not via Puppeteer's PDF margins), so the margin
  // area matches the resume background color instead of staying white.
  let pagePaddingX = 0;
  let pagePaddingY = 0;

  if (printMarginTemplates.includes(template)) {
    pagePaddingX = data.metadata.page.marginX;
    pagePaddingY = data.metadata.page.marginY;
  }

  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Step 4: Connect to the browser and navigate to the printer route
    // Use an isolated browser context so concurrent requests with different locales don't interfere
    const browser = await getBrowser().catch((error) =>
      throwPrinterStepError(
        "Failed to connect to the printer browser",
        "Check PRINTER_ENDPOINT and ensure Browserless/Chrome is reachable",
        error,
      ),
    );
    context = await browser
      .createBrowserContext()
      .catch((error) =>
        throwPrinterStepError(
          "Failed to create an isolated browser context for PDF generation",
          "Retry the request",
          error,
        ),
      );

    await context
      .setCookie({ name: "locale", value: locale, domain })
      .catch((error) =>
        throwPrinterStepError(
          "Failed to set locale cookie in printer browser context",
          "Verify APP_URL/PRINTER_APP_URL host is valid and reachable",
          error,
        ),
      );

    page = await context
      .newPage()
      .catch((error) =>
        throwPrinterStepError("Failed to open a new browser page for PDF generation", "Retry the request", error),
      );

    // Wait for the page to become ready without relying on strict network idle.
    await page
      .emulateMediaType("print")
      .catch((error) =>
        throwPrinterStepError("Failed to switch browser page to print media mode", "Retry the request", error),
      );
    await page
      .setViewport(pageDimensionsAsPixels[format])
      .catch((error) => throwPrinterStepError("Failed to apply PDF viewport dimensions", "Retry the request", error));
    await page
      .goto(url, { waitUntil: "domcontentloaded" })
      .catch((error) =>
        throwPrinterStepError(
          "Failed to open the internal printer route",
          "Check PRINTER_APP_URL/APP_URL reachability from the browser container and verify printer token configuration",
          error,
        ),
      );
    await page
      .waitForFunction(() => document.body.getAttribute("data-wf-loaded") === "true", { timeout: 5_000 })
      .catch((error) =>
        throwPrinterStepError(
          "Resume print page did not finish loading",
          "Check frontend runtime errors and ensure the /printer route can render successfully",
          error,
        ),
      );

    // Step 5a: Prepare the DOM for PDF rendering (background colors, reset margins, print padding)
    await page
      .evaluate(
        (pagePaddingX: number, pagePaddingY: number, backgroundColor: string) => {
          const root = document.documentElement;
          const body = document.body;
          const pageElements = document.querySelectorAll("[data-page-index]");
          const pageContentElements = document.querySelectorAll(".page-content");

          // Ensure PDF margins inherit the resume background color instead of defaulting to white.
          root.style.backgroundColor = backgroundColor;
          body.style.backgroundColor = backgroundColor;
          root.style.margin = "0";
          body.style.margin = "0";
          root.style.padding = "0";
          body.style.padding = "0";

          for (const el of pageElements) {
            const pageWrapper = el as HTMLElement;
            const pageSurface = pageWrapper.querySelector(".page") as HTMLElement | null;

            pageWrapper.style.backgroundColor = backgroundColor;
            pageWrapper.style.breakInside = "auto";

            if (pageSurface) pageSurface.style.backgroundColor = backgroundColor;
          }

          // Apply print-only margins as padding inside each page's content surface.
          if (pagePaddingX > 0 || pagePaddingY > 0) {
            for (const el of pageContentElements) {
              const pageContent = el as HTMLElement;

              pageContent.style.boxSizing = "border-box";
              // Ensure padding is repeated on every printed fragment when content
              // flows across physical PDF pages (not just the first fragment).
              pageContent.style.boxDecorationBreak = "clone";
              pageContent.style.setProperty("-webkit-box-decoration-break", "clone");
              if (pagePaddingX > 0) {
                pageContent.style.paddingLeft = `${pagePaddingX}pt`;
                pageContent.style.paddingRight = `${pagePaddingX}pt`;
              }
              if (pagePaddingY > 0) {
                pageContent.style.paddingTop = `${pagePaddingY}pt`;
                pageContent.style.paddingBottom = `${pagePaddingY}pt`;
              }
            }
          }
        },
        pagePaddingX,
        pagePaddingY,
        data.metadata.design.colors.background,
      )
      .catch((error) =>
        throwPrinterStepError(
          "Failed to apply PDF print styles",
          "Check that resume template styles can be evaluated in headless browser mode",
          error,
        ),
      );

    // Step 5b: Format-specific layout adjustments
    const isFreeForm = format === "free-form";
    let contentHeight: number | null = null;

    if (isFreeForm) {
      // Free-form: measure actual content height after adding inter-page margins
      contentHeight = await page
        .evaluate(
          (pagePaddingY: number, minPageHeight: number) => {
            const pageElements = document.querySelectorAll("[data-page-index]");
            const numberOfPages = pageElements.length;

            // Add margin between pages (except the last one)
            for (let i = 0; i < numberOfPages - 1; i++) {
              const pageEl = pageElements[i] as HTMLElement;
              if (pagePaddingY > 0) pageEl.style.marginBottom = `${pagePaddingY}pt`;
            }

            // Measure the total height (margins are now part of the DOM)
            let totalHeight = 0;

            for (const el of pageElements) {
              const pageEl = el as HTMLElement;
              const style = getComputedStyle(pageEl);
              const marginBottom = Number.parseFloat(style.marginBottom) || 0;
              totalHeight += pageEl.offsetHeight + marginBottom;
            }

            return Math.max(totalHeight, minPageHeight);
          },
          pagePaddingY,
          pageDimensionsAsPixels[format].height,
        )
        .catch((error) =>
          throwPrinterStepError(
            "Failed to compute free-form PDF content height",
            "Check resume layout and page metadata values",
            error,
          ),
        );
    } else {
      // A4/Letter: set fixed page height and add page breaks between pages
      await page
        .evaluate((pageHeight: number) => {
          const root = document.documentElement;
          const pageElements = document.querySelectorAll("[data-page-index]");
          const container = document.querySelector(".resume-preview-container") as HTMLElement | null;

          const newHeight = `${pageHeight}px`;
          if (container) container.style.setProperty("--page-height", newHeight);
          root.style.setProperty("--page-height", newHeight);

          for (const el of pageElements) {
            const element = el as HTMLElement;
            const index = Number.parseInt(element.getAttribute("data-page-index") ?? "0", 10);

            // Force a page break before each page except the first
            if (index > 0) {
              element.style.breakBefore = "page";
              element.style.pageBreakBefore = "always";
            }

            // Allow content within a page to break naturally if it overflows
            element.style.breakInside = "auto";
          }
        }, pageDimensionsAsPixels[format].height)
        .catch((error) =>
          throwPrinterStepError(
            "Failed to prepare fixed-page PDF layout",
            "Check template/page format configuration",
            error,
          ),
        );
    }

    // Step 6: Generate the PDF with the specified dimensions and margins
    // For free-form: use measured content height (with minimum constraint)
    // For A4/Letter: use fixed dimensions from pageDimensionsAsPixels
    const pdfHeight = isFreeForm && contentHeight ? contentHeight : pageDimensionsAsPixels[format].height;

    const pdfBuffer = await page
      .pdf({
        width: `${pageDimensionsAsPixels[format].width}px`,
        height: `${pdfHeight}px`,
        tagged: true, // Adds accessibility tags to the PDF
        waitForFonts: true, // Ensures all fonts are loaded before rendering
        printBackground: true, // Includes background colors and images
        margin: {
          bottom: 0,
          top: 0,
          right: 0,
          left: 0,
        },
      })
      .catch((error) =>
        throwPrinterStepError(
          "Failed to render PDF document",
          "Check font loading, page dimensions, and Browserless resource limits",
          error,
        ),
      );

    // Step 7: Upload the generated PDF to storage
    const result = await uploadFile({
      userId,
      resumeId: id,
      data: new Uint8Array(pdfBuffer),
      contentType: "application/pdf",
      type: "pdf",
    }).catch((error) =>
      throwPrinterStepError(
        "Failed to upload generated PDF",
        "Check storage configuration (S3/local disk permissions and related environment variables)",
        error,
      ),
    );

    return result.url;
  } catch (error) {
    if (error instanceof ORPCError) throw error;
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: `Failed to generate PDF. Details: ${toErrorMessage(error)}`,
      cause: error,
    });
  } finally {
    if (page) await page.close().catch(() => null);
    if (context) await context.close().catch(() => null);
  }
}

/**
 * Captures a screenshot of the first page of a resume as WebP.
 *
 * Uses a timestamp-based cache (6-hour TTL) to avoid regenerating screenshots
 * for resumes that haven't changed. Old screenshots are cleaned up on regeneration.
 */
async function doGetResumeScreenshot(
  input: Pick<InferSelectModel<typeof schema.resume>, "userId" | "id" | "data" | "updatedAt">,
): Promise<string> {
  const { id, userId, data, updatedAt } = input;

  const storageService = getStorageService();
  const screenshotPrefix = `uploads/${userId}/screenshots/${id}`;

  const existingScreenshots = await storageService
    .list(screenshotPrefix)
    .catch((error) =>
      throwPrinterStepError(
        "Failed to list existing screenshots",
        "Check storage configuration (S3/local disk permissions and related environment variables)",
        error,
      ),
    );
  const now = Date.now();
  const resumeUpdatedAt = updatedAt.getTime();

  if (existingScreenshots.length > 0) {
    const sortedFiles = existingScreenshots
      .map((path) => {
        const filename = path.split("/").pop();
        const match = filename?.match(/^(\d+)\.webp$/);
        return match ? { path, timestamp: Number(match[1]) } : null;
      })
      .filter((item): item is { path: string; timestamp: number } => item !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (sortedFiles.length > 0) {
      const latest = sortedFiles[0];
      const age = now - latest.timestamp;

      // Return existing screenshot if it's still fresh (within TTL)
      if (age < SCREENSHOT_TTL) return new URL(latest.path, env.APP_URL).toString();

      // Screenshot is stale (past TTL), but only regenerate if the resume
      // was updated after the screenshot was taken. If the resume hasn't
      // changed, keep using the existing screenshot to avoid unnecessary work.
      if (resumeUpdatedAt <= latest.timestamp) {
        return new URL(latest.path, env.APP_URL).toString();
      }

      // Resume was updated after the screenshot - delete old ones and regenerate
      await Promise.all(sortedFiles.map((file) => storageService.delete(file.path))).catch((error) =>
        throwPrinterStepError(
          "Failed to clean up stale screenshots",
          "Check storage delete permissions and connectivity",
          error,
        ),
      );
    }
  }

  const baseUrl = env.PRINTER_APP_URL ?? env.APP_URL;
  const domain = new URL(baseUrl).hostname;

  const locale = data.metadata.page.locale;

  const token = generatePrinterToken(id);
  const url = `${baseUrl}/printer/${id}?token=${token}`;

  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const browser = await getBrowser().catch((error) =>
      throwPrinterStepError(
        "Failed to connect to the printer browser",
        "Check PRINTER_ENDPOINT and ensure Browserless/Chrome is reachable",
        error,
      ),
    );
    context = await browser
      .createBrowserContext()
      .catch((error) =>
        throwPrinterStepError(
          "Failed to create an isolated browser context for screenshot capture",
          "Retry the request",
          error,
        ),
      );

    await context
      .setCookie({ name: "locale", value: locale, domain })
      .catch((error) =>
        throwPrinterStepError(
          "Failed to set locale cookie in screenshot browser context",
          "Verify APP_URL/PRINTER_APP_URL host is valid and reachable",
          error,
        ),
      );

    page = await context
      .newPage()
      .catch((error) =>
        throwPrinterStepError("Failed to open a new browser page for screenshot capture", "Retry the request", error),
      );

    await page
      .setViewport(pageDimensionsAsPixels.a4)
      .catch((error) =>
        throwPrinterStepError("Failed to apply screenshot viewport dimensions", "Retry the request", error),
      );
    await page
      .goto(url, { waitUntil: "domcontentloaded" })
      .catch((error) =>
        throwPrinterStepError(
          "Failed to open the internal printer route for screenshot capture",
          "Check PRINTER_APP_URL/APP_URL reachability from the browser container and verify printer token configuration",
          error,
        ),
      );
    await page
      .waitForFunction(() => document.body.getAttribute("data-wf-loaded") === "true", { timeout: 5_000 })
      .catch((error) =>
        throwPrinterStepError(
          "Resume screenshot page did not finish loading",
          "Check frontend runtime errors and ensure the /printer route can render successfully",
          error,
        ),
      );

    const screenshotBuffer = await page
      .screenshot({ type: "webp", quality: 80 })
      .catch((error) =>
        throwPrinterStepError(
          "Failed to capture screenshot image",
          "Check renderer stability and Browserless resource limits",
          error,
        ),
      );

    const result = await uploadFile({
      userId,
      resumeId: id,
      data: new Uint8Array(screenshotBuffer),
      contentType: "image/webp",
      type: "screenshot",
    }).catch((error) =>
      throwPrinterStepError(
        "Failed to upload generated screenshot",
        "Check storage configuration (S3/local disk permissions and related environment variables)",
        error,
      ),
    );

    return result.url;
  } catch (error) {
    if (error instanceof ORPCError) throw error;
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: `Failed to capture screenshot. Details: ${toErrorMessage(error)}`,
      cause: error,
    });
  } finally {
    if (page) await page.close().catch(() => null);
    if (context) await context.close().catch(() => null);
  }
}

export const printerService = {
  healthcheck: async (): Promise<object> => {
    const headers = new Headers({ Accept: "application/json" });
    const endpoint = await normalizePrinterEndpoint(env.PRINTER_ENDPOINT);

    endpoint.protocol = endpoint.protocol.replace("ws", "http");
    endpoint.pathname = "/json/version";

    const response = await fetch(endpoint, { headers });
    const data = await response.json();

    return data;
  },

  /** Generates a PDF, deduplicating concurrent requests for the same resume. */
  printResumeAsPDF: async (
    input: Pick<InferSelectModel<typeof schema.resume>, "id" | "data" | "userId">,
  ): Promise<string> => {
    const { id } = input;

    // Deduplicate concurrent requests for the same resume
    const existing = activePrintJobs.get(id);
    if (existing) return existing;

    const job = doPrintResumeAsPDF(input).finally(() => {
      activePrintJobs.delete(id);
    });

    activePrintJobs.set(id, job);
    return job;
  },

  /** Captures a resume screenshot, deduplicating concurrent requests for the same resume. */
  getResumeScreenshot: async (
    input: Pick<InferSelectModel<typeof schema.resume>, "userId" | "id" | "data" | "updatedAt">,
  ): Promise<string> => {
    const { id } = input;

    // Deduplicate concurrent requests for the same resume
    const existing = activeScreenshotJobs.get(id);
    if (existing) return existing;

    const job = doGetResumeScreenshot(input).finally(() => {
      activeScreenshotJobs.delete(id);
    });

    activeScreenshotJobs.set(id, job);
    return job;
  },
};
