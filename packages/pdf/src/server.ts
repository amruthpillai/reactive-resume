import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";
import { render } from "@reactive-resume/renderer";

let _browser: Browser | null = null;

const getBrowser = async (): Promise<Browser> => {
	if (_browser?.isConnected()) return _browser;
	_browser = await puppeteer.launch({
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});
	return _browser;
};

type GeneratePdfOptions = {
	files: Record<string, string>;
	data: ResumeData;
	metadata: TemplateMetadata;
	templateId: string;
	baseUrl: string;
};

export const generatePdfFromTemplate = async (options: GeneratePdfOptions): Promise<Buffer> => {
	const { files, data, metadata, templateId, baseUrl } = options;
	const html = render(files, data, metadata, templateId, baseUrl);

	const browser = await getBrowser();
	const page = await browser.newPage();

	await page.setContent(html, { waitUntil: ["networkidle0"] });

	const pdfBuffer = await page.pdf({
		format: data.metadata.page.format === "letter" ? "Letter" : "A4",
		printBackground: true,
		margin: { top: 0, right: 0, bottom: 0, left: 0 },
	});

	await page.close();
	return Buffer.from(pdfBuffer);
};

export const closeBrowser = async (): Promise<void> => {
	if (_browser) {
		await _browser.close();
		_browser = null;
	}
};

// Re-export from server.tsx for backward compatibility during transition.
// The bulk of PDF generation still routes through @react-pdf/renderer until
// Phase 7 migrates all 15 built-in templates to .rxt archives.
export { createResumePdfFile } from "./server.tsx";
