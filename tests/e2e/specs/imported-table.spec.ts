import type { Page, TestInfo } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Pool } from "pg";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ACTIVE_PREVIEW_PAGE_SELECTOR } from "../fixtures/preview";
import { openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

const requireWeb = createRequire(`${process.cwd()}/apps/web/package.json`);
const tableHtml = `<table style="width: 300pt; border-collapse: collapse"><tbody><tr><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Alpha</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Beta</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Gamma</td></tr><tr><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Delta</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Epsilon</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Zeta</td></tr></tbody></table>`;

const fixture = () => {
	const data = structuredClone(defaultResumeData);
	data.basics.name = "Imported Table Probe";
	data.picture.hidden = true;
	data.summary.content = tableHtml;
	data.metadata.template = "ditgar";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };
	return data;
};

async function readImportedResume(id: string) {
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for imported table E2E.");
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	try {
		const result = await pool.query<{
			data: { basics: { name: string }; summary: { content: string } };
			slug: string;
			updatedAt: Date;
		}>('select data, slug, updated_at as "updatedAt" from "resume" where id = $1', [id]);
		const row = result.rows[0];
		if (!row) throw new Error(`Resume ${id} was not found.`);
		return row;
	} finally {
		await pool.end();
	}
}

async function publishImportedResume(id: string) {
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for imported table E2E.");
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	try {
		await pool.query('update "resume" set is_public = true where id = $1', [id]);
	} finally {
		await pool.end();
	}
}

async function inspectPdf(bytes: Uint8Array) {
	const { getDocument, OPS } = await import(requireWeb.resolve("pdfjs-dist/legacy/build/pdf.mjs"));
	const loading = getDocument({ data: bytes.slice(), useSystemFonts: true });
	try {
		const document = await loading.promise;
		const page = await document.getPage(1);
		const text = (await page.getTextContent()).items.flatMap((item: { str?: string }) => item.str ?? []);
		const operators = await page.getOperatorList();
		let stroke = "";
		let horizontal = 0;
		let vertical = 0;
		for (const [index, fn] of operators.fnArray.entries()) {
			if (fn === OPS.setStrokeRGBColor) stroke = operators.argsArray[index][0];
			if (fn !== OPS.constructPath || stroke !== "#cc00cc") continue;
			const bounds = operators.argsArray[index][2] as ArrayLike<number>;
			const width = Math.abs((bounds[2] ?? 0) - (bounds[0] ?? 0));
			const height = Math.abs((bounds[3] ?? 0) - (bounds[1] ?? 0));
			if (height > 0 && height <= 1.01 && width > height) horizontal++;
			if (width > 0 && width <= 1.01 && height > width) vertical++;
		}
		return { text, horizontal, vertical };
	} finally {
		await loading.destroy();
	}
}

async function downloadBuilderPdf(page: Page, testInfo: TestInfo, stage: string) {
	await openSidebarSection(page, "Export");
	await page.getByRole("button", { name: /Choose PDF, DOCX, Markdown, or JSON/ }).click();
	const pending = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download PDF", exact: true }).click();
	const download = await pending;
	const path = testInfo.outputPath(`${stage}-browser.pdf`);
	await download.saveAs(path);
	return new Uint8Array(await readFile(path));
}

async function previewBorderPixels(page: Page, testInfo: TestInfo, stage: string) {
	const canvas = page.locator(ACTIVE_PREVIEW_PAGE_SELECTOR);
	await expect(canvas).toBeVisible({ timeout: 30_000 });
	await canvas.screenshot({ path: testInfo.outputPath(`${stage}-preview.png`), animations: "disabled" });
	return canvas.evaluate((element) => {
		const context = (element as HTMLCanvasElement).getContext("2d");
		if (!context) throw new Error("Missing preview canvas context.");
		const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data;
		let magenta = 0;
		for (let index = 0; index < pixels.length; index += 4) {
			if ((pixels[index] ?? 0) > 180 && (pixels[index + 1] ?? 255) < 80 && (pixels[index + 2] ?? 0) > 180) magenta++;
		}
		return magenta;
	});
}

test("edits and exports a synthetic imported table without losing its grid", async ({
	authPage: page,
	account,
}, testInfo) => {
	test.setTimeout(180_000);
	const importPath = testInfo.outputPath("imported-table.json");
	await writeFile(importPath, JSON.stringify(fixture()));

	await page.goto("/dashboard/resumes");
	await page.getByText("Import an existing resume", { exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Import an existing resume" });
	await dialog.locator('input[type="file"]').setInputFiles(importPath);
	await dialog.getByRole("button", { name: "Import", exact: true }).click();
	await page.waitForURL(/\/builder\/.+/);
	const id = new URL(page.url()).pathname.match(/^\/builder\/([^/]+)/)?.[1];
	if (!id) throw new Error("Missing imported resume id.");
	await publishImportedResume(id);
	let stored = await readImportedResume(id);
	const slug = stored.slug;

	const captureStage = async (stage: string, expectedCell: string) => {
		const summaryHtml = (await readImportedResume(id)).data.summary.content;
		await writeFile(testInfo.outputPath(`${stage}-summary.html`), summaryHtml);
		expect(summaryHtml).toContain("<table");
		expect(summaryHtml).toContain(expectedCell);
		expect(await previewBorderPixels(page, testInfo, stage)).toBeGreaterThan(1_000);

		for (const [surface, bytes] of [
			["browser", await downloadBuilderPdf(page, testInfo, stage)],
			[
				"server",
				new Uint8Array(
					await (
						await page.request.get(
							`/api/resumes/${encodeURIComponent(account.username)}/${encodeURIComponent(slug)}/pdf`,
						)
					).body(),
				),
			],
		] as const) {
			await writeFile(testInfo.outputPath(`${stage}-${surface}.pdf`), bytes);
			const pdf = await inspectPdf(bytes);
			expect(pdf.text, `${stage} ${surface}`).toEqual(
				expect.arrayContaining(["Alpha", expectedCell, "Gamma", "Delta", "Epsilon", "Zeta"]),
			);
			expect({ horizontal: pdf.horizontal, vertical: pdf.vertical }, `${stage} ${surface}`).toEqual({
				horizontal: 17,
				vertical: 12,
			});
		}
	};

	await openSidebarSection(page, "Summary");
	const summary = page.locator("#sidebar-summary");
	await expect(summary.locator("table tr")).toHaveCount(2);
	await expect(summary.locator("table td")).toHaveCount(6);
	expect(stored.data.summary.content).toBe(tableHtml);
	await captureStage("initial", "Beta");

	await openSidebarSection(page, "Basics");
	const unrelatedName = "Imported Table Probe unrelated edit";
	const beforeUnrelatedEdit = stored.updatedAt;
	await page.getByLabel("Name").fill(unrelatedName);
	await expect.poll(async () => (await readImportedResume(id)).data.basics.name).toBe(unrelatedName);
	stored = await readImportedResume(id);
	expect(stored.updatedAt.getTime()).toBeGreaterThan(beforeUnrelatedEdit.getTime());
	await page.reload();
	stored = await readImportedResume(id);
	expect(stored.data.basics.name).toBe(unrelatedName);
	expect(stored.data.summary.content).toBe(tableHtml);
	await openSidebarSection(page, "Basics");
	await expect(page.getByLabel("Name")).toHaveValue(unrelatedName);
	await openSidebarSection(page, "Summary");
	await expect(summary.locator("table td")).toHaveCount(6);
	await captureStage("unrelated-edit", "Beta");

	const beta = summary.locator("td").filter({ hasText: "Beta" });
	await beta.click();
	await page.keyboard.press("End");
	await page.keyboard.type("!");
	await expect(beta).toContainText("Beta!");
	await page.keyboard.press("Control+z");
	await expect(beta).toContainText("Beta");
	await page.keyboard.press("Control+Shift+z");
	await expect(beta).toContainText("Beta!");
	await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
	await page.reload();
	await openSidebarSection(page, "Summary");
	await expect(summary.locator("table tr")).toHaveCount(2);
	await expect(summary.locator("table td")).toHaveCount(6);
	await expect(summary.locator("td").filter({ hasText: "Beta!" })).toBeVisible();
	stored = await readImportedResume(id);
	expect(stored.data.summary.content).toContain("<table");
	expect(stored.data.summary.content).toContain("Beta!");
	await captureStage("table-edit", "Beta!");
});
