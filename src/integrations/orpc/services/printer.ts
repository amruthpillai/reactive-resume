import { ORPCError } from "@orpc/server";
import type { InferSelectModel } from "drizzle-orm";
import puppeteer, { type Browser, type ConnectOptions } from "puppeteer-core";
import type { schema } from "@/integrations/drizzle";
import { pageDimensionsAsPixels } from "@/schema/page";
import { printMarginTemplates } from "@/schema/templates";
import { env } from "@/utils/env";
import { generatePrinterToken } from "@/utils/printer-token";
import { getStorageService, uploadFile } from "./storage";

const SCREENSHOT_TTL = 1000 * 60 * 60 * 6; // 6 hours

// Singleton browser instance for connection reuse
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
	// Reuse existing connected browser if available
	if (browserInstance?.connected) return browserInstance;

	const args = ["--disable-dev-shm-usage", "--disable-features=LocalNetworkAccessChecks,site-per-process,FedCm"];

	const endpoint = new URL(env.PRINTER_ENDPOINT);
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

// Close browser on process termination
process.on("SIGINT", async () => {
	await closeBrowser();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	await closeBrowser();
	process.exit(0);
});

export const printerService = {
	healthcheck: async (): Promise<object> => {
		const headers = new Headers({ Accept: "application/json" });
		const endpoint = new URL(env.PRINTER_ENDPOINT);

		endpoint.protocol = endpoint.protocol.replace("ws", "http");
		endpoint.pathname = "/json/version";

		const response = await fetch(endpoint, { headers });
		const data = await response.json();

		return data;
	},

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
	printResumeAsPDF: async (
		input: Pick<InferSelectModel<typeof schema.resume>, "id" | "data" | "userId">,
	): Promise<string> => {
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

		// Step 3: Calculate PDF margins
		// Some templates require margins to be applied via PDF (they use print:p-0 to remove CSS padding)
		// Convert from CSS pixels to PDF points (divide by 0.75 since 1pt = 0.75px at 72dpi)
		let marginX = 0;
		let marginY = 0;

		if (printMarginTemplates.includes(template)) {
			marginX = Math.round(data.metadata.page.marginX / 0.75);
			marginY = Math.round(data.metadata.page.marginY / 0.75);
		}

		let browser: Browser | null = null;

		try {
			// Step 4: Connect to the browser and navigate to the printer route
			browser = await getBrowser();

			// Set locale cookie so the resume renders in the correct language
			await browser.setCookie({ name: "locale", value: locale, domain });

			const page = await browser.newPage();

			// Wait for the page to fully load (network idle + custom loaded attribute)
			await page.setViewport(pageDimensionsAsPixels[format]);
			await page.goto(url, { waitUntil: "networkidle0" });
			await page.waitForFunction(() => document.body.getAttribute("data-wf-loaded") === "true", { timeout: 5_000 });

			// Step 5: Adjust the DOM for proper PDF pagination
			// This runs in the browser context to modify CSS before PDF generation
			// For free-form: measure actual content height, don't add page breaks
			// For A4/Letter: adjust page height for margins, add page breaks
			const isFreeForm = format === "free-form";

			const contentHeight = await page.evaluate(
				(marginY: number, isFreeForm: boolean, minPageHeight: number) => {
					const root = document.documentElement;
					const pageElements = document.querySelectorAll("[data-page-index]");
					const container = document.querySelector(".resume-preview-container") as HTMLElement | null;

					if (isFreeForm) {
						// For free-form: add visual gaps between pages, then measure total height
						// Convert marginY from PDF points to CSS pixels (1pt = 0.75px)
						const marginYAsPixels = marginY * 0.75;
						const numberOfPages = pageElements.length;

						// Add margin between pages (except the last one)
						for (let i = 0; i < numberOfPages - 1; i++) {
							const pageEl = pageElements[i] as HTMLElement;
							pageEl.style.marginBottom = `${marginYAsPixels}px`;
						}

						// Now measure the total height (margins are now part of the DOM)
						let totalHeight = 0;
						for (const el of pageElements) {
							const pageEl = el as HTMLElement;
							// offsetHeight includes padding and border, but not margin
							const style = getComputedStyle(pageEl);
							const marginBottom = Number.parseFloat(style.marginBottom) || 0;
							totalHeight += pageEl.offsetHeight + marginBottom;
						}

						return Math.max(totalHeight, minPageHeight);
					}

					// For A4/Letter: existing behavior
					// The --page-height CSS variable controls the height of each resume page.
					// We need to reduce it by the PDF margins so content fits within the printable area.
					// Without this, content would overflow and create empty pages.
					const rootHeight = getComputedStyle(root).getPropertyValue("--page-height").trim();
					const containerHeight = container
						? getComputedStyle(container).getPropertyValue("--page-height").trim()
						: null;
					const currentHeight = containerHeight || rootHeight;
					const heightValue = Math.max(Number.parseFloat(currentHeight), minPageHeight);

					if (!Number.isNaN(heightValue)) {
						// Subtract top + bottom margins from page height
						const newHeight = `${heightValue - marginY}px`;
						if (container) container.style.setProperty("--page-height", newHeight);
						root.style.setProperty("--page-height", newHeight);
					}

					// Add page break CSS to each resume page element (identified by data-page-index attribute)
					// This ensures each visual resume page starts a new PDF page
					for (const el of pageElements) {
						const element = el as HTMLElement;
						const index = Number.parseInt(element.getAttribute("data-page-index") ?? "0", 10);

						// Force a page break before each page except the first
						if (index > 0) element.style.breakBefore = "page";

						// Allow content within a page to break naturally if it overflows
						// (e.g., if a single page has more content than fits on one PDF page)
						element.style.breakInside = "auto";
					}

					return null; // Fixed height from pageDimensionsAsPixels for A4/Letter
				},
				marginY,
				isFreeForm,
				pageDimensionsAsPixels[format].height,
			);

			// Step 6: Generate the PDF with the specified dimensions and margins
			// For free-form: use measured content height (with minimum constraint)
			// For A4/Letter: use fixed dimensions from pageDimensionsAsPixels
			const pdfHeight = isFreeForm && contentHeight ? contentHeight : pageDimensionsAsPixels[format].height;

			const pdfBuffer = await page.pdf({
				width: `${pageDimensionsAsPixels[format].width}px`,
				height: `${pdfHeight}px`,
				tagged: true, // Adds accessibility tags to the PDF
				waitForFonts: true, // Ensures all fonts are loaded before rendering
				printBackground: true, // Includes background colors and images
				margin: {
					bottom: 0,
					top: marginY,
					right: marginX,
					left: marginX,
				},
			});

			await page.close();

			// Step 7: Upload the generated PDF to storage
			const result = await uploadFile({
				userId,
				resumeId: id,
				data: new Uint8Array(pdfBuffer),
				contentType: "application/pdf",
				type: "pdf",
			});

			return result.url;
		} catch (error) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", error as Error);
		}
	},

	getResumeScreenshot: async (
		input: Pick<InferSelectModel<typeof schema.resume>, "userId" | "id" | "data" | "updatedAt">,
	): Promise<string> => {
		const { id, userId, data, updatedAt } = input;

		const storageService = getStorageService();
		const screenshotPrefix = `uploads/${userId}/screenshots/${id}`;

		const existingScreenshots = await storageService.list(screenshotPrefix);
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
				await Promise.all(sortedFiles.map((file) => storageService.delete(file.path)));
			}
		}

		const baseUrl = env.PRINTER_APP_URL ?? env.APP_URL;
		const domain = new URL(baseUrl).hostname;

		const locale = data.metadata.page.locale;

		const token = generatePrinterToken(id);
		const url = `${baseUrl}/printer/${id}?token=${token}`;

		let browser: Browser | null = null;

		try {
			browser = await getBrowser();

			await browser.setCookie({ name: "locale", value: locale, domain });

			const page = await browser.newPage();

			await page.setViewport(pageDimensionsAsPixels.a4);
			await page.goto(url, { waitUntil: "networkidle0" });
			await page.waitForFunction(() => document.body.getAttribute("data-wf-loaded") === "true", { timeout: 5_000 });

			const screenshotBuffer = await page.screenshot({ type: "webp", quality: 80 });

			await page.close();

			const result = await uploadFile({
				userId,
				resumeId: id,
				data: new Uint8Array(screenshotBuffer),
				contentType: "image/webp",
				type: "screenshot",
			});

			return result.url;
		} catch (error) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", error as Error);
		}
	},
};
