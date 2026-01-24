import { ORPCError } from "@orpc/server";
import type { InferSelectModel } from "drizzle-orm";
import puppeteer, { type Browser, type ConnectOptions } from "puppeteer-core";
import type { schema } from "@/integrations/drizzle";
import { printMarginTemplates } from "@/schema/templates";
import { env } from "@/utils/env";
import { generatePrinterToken } from "@/utils/printer-token";
import { getStorageService, uploadFile } from "./storage";

const pageDimensions = {
	a4: {
		width: 794,
		height: 1123,
	},
	letter: {
		width: 816,
		height: 1056,
	},
} as const;

const SCREENSHOT_TTL = 1000 * 60 * 60; // 1 hour

async function getBrowser(): Promise<Browser> {
	const endpoint = new URL(env.PRINTER_ENDPOINT);
	const isWebSocket = endpoint.protocol.startsWith("ws");

	const connectOptions: ConnectOptions = { acceptInsecureCerts: true };

	if (isWebSocket) connectOptions.browserWSEndpoint = env.PRINTER_ENDPOINT;
	else connectOptions.browserURL = env.PRINTER_ENDPOINT;

	return puppeteer.connect(connectOptions);
}

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

	chromeDebug: async (): Promise<void> => {
		const browser = await getBrowser();

		const page = await browser.newPage();

		await page.goto("https://www.google.com");

		await page.pdf({ path: `screenshot-${Date.now()}.pdf` });

		await browser.disconnect();
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
		input: Pick<InferSelectModel<typeof schema.resume>, "userId" | "id" | "data">,
	): Promise<string> => {
		const { id, userId, data } = input;

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
			await page.setViewport(pageDimensions[format]);
			await page.goto(url, { waitUntil: "networkidle0" });
			await page.waitForFunction(() => document.body.getAttribute("data-wf-loaded") === "true", { timeout: 5_000 });

			// Step 5: Adjust the DOM for proper PDF pagination
			// This runs in the browser context to modify CSS before PDF generation
			await page.evaluate(
				(marginY: number, minPageHeight: number) => {
					const root = document.documentElement;
					const container = document.querySelector(".resume-preview-container") as HTMLElement | null;

					// The --page-height CSS variable controls the height of each resume page.
					// We need to reduce it by the PDF margins so content fits within the printable area.
					// Without this, content would overflow and create empty pages.
					const containerHeight = container
						? getComputedStyle(container).getPropertyValue("--page-height").trim()
						: null;
					const rootHeight = getComputedStyle(root).getPropertyValue("--page-height").trim();
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
					const pageElements = document.querySelectorAll("[data-page-index]");

					for (const el of pageElements) {
						const element = el as HTMLElement;
						const index = Number.parseInt(element.getAttribute("data-page-index") ?? "0", 10);

						// Force a page break before each page except the first
						if (index > 0) element.style.breakBefore = "page";

						// Allow content within a page to break naturally if it overflows
						// (e.g., if a single page has more content than fits on one PDF page)
						element.style.breakInside = "auto";
					}
				},
				marginY,
				pageDimensions[format].height,
			);

			// Step 6: Generate the PDF with the specified dimensions and margins
			const pdfBuffer = await page.pdf({
				width: `${pageDimensions[format].width}px`,
				height: `${pageDimensions[format].height}px`,
				tagged: true, // Adds accessibility tags to the PDF
				waitForFonts: true, // Ensures all fonts are loaded before rendering
				printBackground: true, // Includes background colors and images
				margin: {
					top: marginY,
					right: marginX,
					// bottom: marginY,
					left: marginX,
				},
			});

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
		} finally {
			if (browser) await browser.close();
		}
	},

	getResumeScreenshot: async (
		input: Pick<InferSelectModel<typeof schema.resume>, "userId" | "id" | "data">,
	): Promise<string> => {
		const { id, userId, data } = input;

		const storageService = getStorageService();
		const screenshotPrefix = `uploads/${userId}/screenshots/${id}`;

		const existingScreenshots = await storageService.list(screenshotPrefix);
		const now = Date.now();

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

				if (age < SCREENSHOT_TTL) return new URL(latest.path, env.APP_URL).toString();

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

			await page.setViewport(pageDimensions.a4);
			await page.goto(url, { waitUntil: "networkidle0" });
			await page.waitForFunction(() => document.body.getAttribute("data-wf-loaded") === "true", { timeout: 5_000 });

			const screenshotBuffer = await page.screenshot({ type: "webp", quality: 80 });

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
		} finally {
			if (browser) await browser.close();
		}
	},
};
