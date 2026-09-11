import type { Page, TestInfo } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { Pool } from "pg";
import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

const longWord = "Gewerbesteuerdurchführungsverordnung";

async function seedHyphenationResume(page: Page) {
	const resumeId = new URL(page.url()).pathname.match(/^\/builder\/([^/]+)/)?.[1];
	if (!resumeId || !process.env.DATABASE_URL) throw new Error("Missing hyphenation fixture database or resume.");
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	let slug: string | undefined;
	const patches = [
		{ path: ["picture", "hidden"], value: true },
		{
			path: ["basics"],
			value: {
				name: "Probe",
				headline: "",
				email: "",
				phone: "",
				location: "",
				website: { url: "", label: "" },
				customFields: [],
			},
		},
		{ path: ["summary", "title"], value: "Text" },
		{ path: ["summary", "content"], value: `<p>${longWord}</p>` },
		{ path: ["metadata", "template"], value: "onyx" },
		{ path: ["metadata", "layout", "pages"], value: [{ fullWidth: true, main: ["summary"], sidebar: [] }] },
		{ path: ["metadata", "typography", "body", "fontFamily"], value: "Helvetica" },
		{ path: ["metadata", "typography", "heading", "fontFamily"], value: "Helvetica" },
		{
			path: ["metadata", "stylesheet"],
			value: {
				mode: "semantic",
				source: {
					languageVersion: 1,
					text: "@version 1; section { width: 100pt; } paragraph { font-size: 12pt; text-align: justify; }",
				},
			},
		},
	];
	try {
		for (const { path, value } of patches) {
			await pool.query('update "resume" set data = jsonb_set(data, $2::text[], $3::jsonb) where id = $1', [
				resumeId,
				path,
				JSON.stringify(value),
			]);
		}
		slug = (await pool.query<{ slug: string }>('select slug from "resume" where id = $1', [resumeId])).rows[0]?.slug;
	} finally {
		await pool.end();
	}
	await page.reload();
	if (!slug) throw new Error("Missing hyphenation fixture slug.");
	return slug;
}

async function downloadPdfText(page: Page, testInfo: TestInfo, name: string) {
	await openSidebarSection(page, "Export");
	await page.getByRole("button", { name: /Choose PDF, DOCX, Markdown, or JSON/ }).click();
	const pending = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download PDF", exact: true }).click();
	const download = await pending;
	const path = testInfo.outputPath(`${name}.pdf`);
	await download.saveAs(path);
	await page.keyboard.press("Escape");
	return readPdfText(new Uint8Array(await readFile(path)));
}

async function readPdfText(data: Uint8Array) {
	const loading = getDocument({ data, useSystemFonts: true });
	try {
		const document = await loading.promise;
		const text: string[] = [];
		for (let number = 1; number <= document.numPages; number++) {
			const page = await document.getPage(number);
			text.push(...(await page.getTextContent()).items.flatMap((item) => ("str" in item ? [item.str] : [])));
		}
		return text.join(" ");
	} finally {
		await loading.destroy();
	}
}

test("keeps hyphenation opt-in saved across reloads and resume language changes", async ({
	authPage: page,
	account,
}, testInfo) => {
	test.setTimeout(90_000);
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await createSampleResumeFromDashboard(page, testInfo);
	const slug = await seedHyphenationResume(page);
	const notices = await page.request.get("/third-party-notices.txt");
	expect(notices.ok()).toBe(true);
	expect(await notices.text()).toBe(await readFile("apps/web/public/third-party-notices.txt", "utf8"));
	await openSidebarSection(page, "Typography");
	const toggle = page.getByRole("switch", { name: "Hyphenation", exact: true });
	await expect(toggle).not.toBeChecked();
	await expect(toggle).toHaveAccessibleDescription(
		"Currently available for German resumes. Uses the language set in Page.",
	);

	await openSidebarSection(page, "Page");
	await page.getByLabel("Language", { exact: true }).click();
	await page.getByRole("option", { name: /de-DE/ }).click();
	await expect(page.getByText("Saved", { exact: true })).toBeVisible();
	const disabledText = await downloadPdfText(page, testInfo, "hyphenation-default-off");
	expect(disabledText).not.toContain("-");
	expect(disabledText.replaceAll(/\s/g, "")).toContain(longWord);
	await openSidebarSection(page, "Typography");
	await toggle.check();
	await expect(page.getByText("Saved", { exact: true })).toBeVisible();
	await page.reload();
	await openSidebarSection(page, "Typography");
	await expect(toggle).toBeChecked();
	const enabledText = await downloadPdfText(page, testInfo, "hyphenation-german-enabled");
	expect(enabledText).toContain("-");
	expect(enabledText.replaceAll(/[\s-]/g, "")).toContain(longWord);
	const serverPdf = await page.request.get(
		`/api/resumes/${encodeURIComponent(account.username)}/${encodeURIComponent(slug)}/pdf`,
	);
	expect(serverPdf.ok()).toBe(true);
	expect(serverPdf.headers()["content-type"]).toContain("application/pdf");
	const serverBytes = await serverPdf.body();
	await writeFile(testInfo.outputPath("hyphenation-server-enabled.pdf"), serverBytes);
	expect(await readPdfText(new Uint8Array(serverBytes))).toBe(enabledText);

	await openSidebarSection(page, "Page");
	await expect(page.getByLabel("Language", { exact: true })).toHaveText("German");
	await page.getByLabel("Language", { exact: true }).click();
	await page.getByRole("option", { name: /en-US/ }).click();
	await expect(page.getByText("Saved", { exact: true })).toBeVisible();
	const unsupportedText = await downloadPdfText(page, testInfo, "hyphenation-english-enabled");
	expect(unsupportedText).toBe(disabledText);
	await openSidebarSection(page, "Typography");
	await expect(toggle).toBeChecked();
	await page
		.locator('[data-slot="form-item"]')
		.filter({ has: toggle })
		.screenshot({
			path: testInfo.outputPath("hyphenation-preference.png"),
			animations: "disabled",
		});
	await toggle.uncheck();
	await expect(page.getByText("Saved", { exact: true })).toBeVisible();
	await page.reload();
	await openSidebarSection(page, "Typography");
	await expect(toggle).not.toBeChecked();
	await openSidebarSection(page, "Page");
	await page.getByLabel("Language", { exact: true }).click();
	await page.getByRole("option", { name: /de-DE/ }).click();
	await expect(page.getByText("Saved", { exact: true })).toBeVisible();
	expect(await downloadPdfText(page, testInfo, "hyphenation-german-disabled")).toBe(disabledText);
	expect(errors).toEqual([]);
});
