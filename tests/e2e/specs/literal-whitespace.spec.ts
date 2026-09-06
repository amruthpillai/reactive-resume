import type { Page, TestInfo } from "@playwright/test";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { Pool } from "pg";
import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

const requireWeb = createRequire(`${process.cwd()}/apps/web/package.json`);
const execFileAsync = promisify(execFile);
const preservedHtml =
	'<p data-resume-whitespace="preserve">  LIT A\tB END  </p><p data-resume-whitespace="preserve">  REF A    B END  </p>';

async function readSummary(id: string) {
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for literal-whitespace E2E.");
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	try {
		const result = await pool.query<{ content: string }>(
			`select data->'summary'->>'content' as content from "resume" where id = $1`,
			[id],
		);
		const row = result.rows[0];
		if (!row) throw new Error(`Resume ${id} was not found.`);
		return row.content;
	} finally {
		await pool.end();
	}
}

async function download(page: Page, testInfo: TestInfo, format: "PDF" | "DOCX" | "JSON") {
	await openSidebarSection(page, "Export");
	await page.getByRole("button", { name: /Choose PDF, DOCX, Markdown, or JSON/ }).click();
	const pending = page.waitForEvent("download");
	await page.getByRole("button", { name: `Download ${format}`, exact: true }).click();
	const result = await pending;
	const path = testInfo.outputPath(`literal-whitespace.${format.toLowerCase()}`);
	await result.saveAs(path);
	return path;
}

async function pdfLineMetrics(path: string) {
	const { getDocument } = await import(requireWeb.resolve("pdfjs-dist/legacy/build/pdf.mjs"));
	const loading = getDocument({ data: new Uint8Array(await readFile(path)), useSystemFonts: true });
	try {
		const document = await loading.promise;
		const lines: Array<{ marker: string; start: number; gap: number; tailWidth: number }> = [];
		for (let pageIndex = 0; pageIndex < document.numPages; pageIndex++) {
			const page = await document.getPage(pageIndex + 1);
			const items = (await page.getTextContent()).items.flatMap((item) =>
				"str" in item ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }] : [],
			);
			for (const marker of ["LIT", "REF"]) {
				const anchor = items.find((item) => item.text.includes(marker));
				if (!anchor) continue;
				const tail = items.find(
					(item) => item.x > anchor.x && Math.abs(item.y - anchor.y) < 0.01 && item.text.includes("B END"),
				);
				if (!tail) continue;
				const anchorEnd = anchor.x + anchor.width;
				lines.push({ marker, start: anchor.x, gap: tail.x - anchorEnd, tailWidth: tail.x + tail.width - anchorEnd });
			}
		}
		return lines;
	} finally {
		await loading.destroy();
	}
}

test("persists typed and pasted literal whitespace through JSON, PDF, and DOCX", async ({
	authPage: page,
}, testInfo) => {
	test.setTimeout(180_000);
	await createSampleResumeFromDashboard(page, testInfo);
	const id = new URL(page.url()).pathname.match(/^\/builder\/([^/]+)/)?.[1];
	if (!id) throw new Error("Missing resume id.");

	await openSidebarSection(page, "Summary");
	const editor = page.locator("#sidebar-summary [data-editor=true]");
	await editor.click();
	await page.keyboard.press("ControlOrMeta+a");
	await page.keyboard.press("Backspace");
	await page.keyboard.insertText("  LIT A\tB END  ");
	await page.keyboard.press("Enter");
	await editor.evaluate((element) => {
		const clipboard = new DataTransfer();
		clipboard.setData("text/plain", "  REF A    B END  ");
		element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: clipboard }));
	});

	await expect.poll(() => readSummary(id)).toBe(preservedHtml);
	await page.reload();
	await openSidebarSection(page, "Summary");
	const reloadedEditor = page.locator("#sidebar-summary [data-editor=true]");
	await expect(reloadedEditor).toBeVisible();
	expect(await reloadedEditor.evaluate((element) => element.textContent)).toBe("  LIT A\tB END    REF A    B END  ");
	expect(
		await reloadedEditor
			.locator("p")
			.first()
			.evaluate((element) => getComputedStyle(element).whiteSpace),
	).toBe("pre-wrap");
	expect(await readSummary(id)).toBe(preservedHtml);

	const jsonPath = await download(page, testInfo, "JSON");
	const exported = JSON.parse(await readFile(jsonPath, "utf8")) as { summary: { content: string } };
	expect(exported.summary.content).toBe(preservedHtml);

	const pdfPath = await download(page, testInfo, "PDF");
	const lines = await pdfLineMetrics(pdfPath);
	const literal = lines.find((line) => line.marker === "LIT");
	const reference = lines.find((line) => line.marker === "REF");
	expect(literal).toBeDefined();
	expect(reference).toBeDefined();
	if (!literal || !reference) throw new Error("Expected literal whitespace PDF lines.");
	expect(literal.start).toBeCloseTo(reference.start, 2);
	expect(literal.gap).toBeCloseTo(reference.gap, 2);
	expect(literal.tailWidth).toBeCloseTo(reference.tailWidth, 2);

	const docxPath = await download(page, testInfo, "DOCX");
	const { stdout: documentXml } = await execFileAsync("unzip", ["-p", docxPath, "word/document.xml"], {
		encoding: "utf8",
	});
	expect(documentXml).toContain('xml:space="preserve">  LIT A    B END  </w:t>');
	expect(documentXml).toContain('xml:space="preserve">  REF A    B END  </w:t>');
});
