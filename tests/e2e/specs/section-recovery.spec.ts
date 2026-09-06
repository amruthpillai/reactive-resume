import type { Page, TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { Pool } from "pg";
import { createSampleResumeFromDashboard, openResumeCardMenu, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

const summaryMarker = "RECOVERY_SUMMARY_MARKER";
const builtInMarker = "RECOVERY_BUILTIN_MARKER";
const customMarker = "RECOVERY_CUSTOM_MARKER";

type AuthoredLayout = {
	pages: Array<{ fullWidth: boolean; main: string[]; sidebar: string[] }>;
};

async function seedRecoveryResume(resumeId: string): Promise<AuthoredLayout> {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	try {
		const result = await pool.query<{ data: Record<string, unknown> }>('select data from "resume" where id = $1', [
			resumeId,
		]);
		const data = result.rows[0]?.data as {
			summary: { title: string; content: string; hidden: boolean };
			sections: { experience: { title: string; hidden: boolean; items: Array<{ company: string }> } };
			customSections: Array<{
				id: string;
				title: string;
				hidden: boolean;
				items: Array<{ company?: string }>;
			}>;
			metadata: {
				layout: AuthoredLayout;
				typography: { body: { fontFamily: string }; heading: { fontFamily: string } };
			};
		};
		if (!data?.sections.experience.items[0] || !data.customSections[0]?.items[0]) {
			throw new Error("Sample resume lacks recovery fixture sections.");
		}

		data.summary.title = "Recovery Summary";
		data.summary.content = `<p>${summaryMarker}</p>`;
		data.summary.hidden = false;
		data.sections.experience.title = "Recovery Experience";
		data.sections.experience.items[0].company = builtInMarker;
		data.sections.experience.hidden = false;
		data.customSections[0].title = "Recovery Custom";
		data.customSections[0].items[0].company = customMarker;
		data.customSections[0].hidden = false;
		data.metadata.typography.body.fontFamily = "Helvetica";
		data.metadata.typography.heading.fontFamily = "Helvetica";
		const layout = structuredClone(data.metadata.layout);

		await pool.query('update "resume" set data = $2, updated_at = now() where id = $1', [resumeId, data]);
		return layout;
	} finally {
		await pool.end();
	}
}

async function readRecoveryState(resumeId: string) {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	try {
		const result = await pool.query<{
			data: {
				summary: { hidden: boolean };
				sections: { experience: { hidden: boolean } };
				customSections: Array<{ title: string; hidden: boolean }>;
				metadata: { layout: AuthoredLayout };
			};
		}>('select data from "resume" where id = $1', [resumeId]);
		const data = result.rows[0]?.data;
		if (!data) throw new Error(`Resume ${resumeId} was not found.`);
		return data;
	} finally {
		await pool.end();
	}
}

function waitForResumeSave(page: Page) {
	return page.waitForResponse((response) => {
		if (!response.url().includes("/api/rpc") || response.request().method() !== "POST") return false;
		if (!response.ok()) return false;
		return response.request().postData()?.includes('"data"') ?? false;
	});
}

async function hideStandardSection(page: Page, navigationTitle: string, title: string) {
	await page.getByRole("button", { name: navigationTitle, exact: true }).first().click();
	const heading = page.getByRole("heading", { name: title, exact: true }).filter({ visible: true }).first();
	await expect(heading).toBeVisible();
	await heading.locator("xpath=../..").getByRole("button", { name: "Section options" }).click();
	const saved = waitForResumeSave(page);
	await page.getByRole("menuitem", { name: "Hide", exact: true }).click();
	await saved;
}

async function hideCustomSection(page: Page, title: string) {
	await openSidebarSection(page, "Custom Sections");
	const titleElement = page.getByText(title, { exact: true }).filter({ visible: true }).first();
	const card = titleElement.locator("xpath=../../..");
	await card.getByRole("button", { name: "Section options" }).click();
	const saved = waitForResumeSave(page);
	await page.getByRole("menuitem", { name: "Hide", exact: true }).click();
	await saved;
}

async function showSection(page: Page, title: string) {
	const saved = waitForResumeSave(page);
	await page.getByRole("button", { name: `Show ${title} section` }).click();
	await saved;
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

	const loading = getDocument({ data: new Uint8Array(await readFile(path)), useSystemFonts: true });
	try {
		const pdf = await loading.promise;
		const text: string[] = [];
		for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
			const pdfPage = await pdf.getPage(pageNumber);
			text.push(...(await pdfPage.getTextContent()).items.flatMap((item) => ("str" in item ? [item.str] : [])));
		}
		return text.join(" ");
	} finally {
		await loading.destroy();
	}
}

test("recovers hidden printable sections without changing authored placement", async ({ authPage: page }, testInfo) => {
	test.setTimeout(120_000);
	const resumeName = await createSampleResumeFromDashboard(page, testInfo);
	const resumeId = new URL(page.url()).pathname.split("/").at(-1);
	if (!resumeId) throw new Error("Builder URL lacks resume id.");
	const authoredLayout = await seedRecoveryResume(resumeId);
	await page.reload();

	await hideStandardSection(page, "Summary", "Recovery Summary");
	await hideStandardSection(page, "Experience", "Recovery Experience");
	await hideCustomSection(page, "Recovery Custom");
	await page.reload();

	for (const title of ["Recovery Summary", "Recovery Experience", "Recovery Custom"]) {
		await expect(page.getByRole("button", { name: `Show ${title} section` })).toBeVisible();
	}
	await expect(
		page.getByRole("heading", { name: "Recovery Summary", exact: true }).filter({ visible: true }),
	).toHaveCount(0);
	await expect(
		page.getByRole("heading", { name: "Recovery Experience", exact: true }).filter({ visible: true }),
	).toHaveCount(0);
	await expect(page.getByText("Recovery Custom", { exact: true }).filter({ visible: true })).toHaveCount(1);

	const hiddenPdf = await downloadPdfText(page, testInfo, "section-recovery-hidden");
	expect(hiddenPdf).not.toContain(summaryMarker);
	expect(hiddenPdf).not.toContain(builtInMarker);
	expect(hiddenPdf).not.toContain(customMarker);

	await showSection(page, "Recovery Summary");
	await showSection(page, "Recovery Experience");
	await showSection(page, "Recovery Custom");
	const shownState = await readRecoveryState(resumeId);
	expect(shownState.metadata.layout).toEqual(authoredLayout);
	expect(shownState.summary.hidden).toBe(false);
	expect(shownState.sections.experience.hidden).toBe(false);
	expect(shownState.customSections.find((section) => section.title === "Recovery Custom")?.hidden).toBe(false);

	const shownPdf = await downloadPdfText(page, testInfo, "section-recovery-shown");
	expect(shownPdf).toContain(summaryMarker);
	expect(shownPdf).toContain(builtInMarker);
	expect(shownPdf).toContain(customMarker);

	await page.getByRole("button", { name: "Undo", exact: true }).click();
	await expect(page.getByRole("button", { name: "Show Recovery Custom section" })).toBeVisible();
	await page.getByRole("button", { name: "Redo", exact: true }).click();
	await expect(page.getByRole("button", { name: "Show Recovery Custom section" })).toHaveCount(0);

	const saved = waitForResumeSave(page);
	await page.getByRole("button", { name: "Undo", exact: true }).click();
	await saved;
	await openResumeCardMenu(page, resumeName);
	const locked = page.waitForResponse((response) => (response.request().postData() ?? "").includes('"isLocked":true'));
	await page.getByRole("menuitem", { name: "Lock" }).click();
	await page.getByRole("alertdialog").getByRole("button", { name: "Confirm" }).click();
	await locked;
	await page.goto(`/builder/${resumeId}`);

	await expect(page.getByRole("button", { name: "Show Recovery Custom section" })).toBeDisabled();
	expect((await readRecoveryState(resumeId)).metadata.layout).toEqual(authoredLayout);
});
