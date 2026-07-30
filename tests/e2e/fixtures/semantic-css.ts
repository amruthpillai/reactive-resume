import type { Download, Locator, Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import { updateSemanticCssFixture } from "./db";
import { createSampleResumeFromDashboard, openSidebarSection } from "./resume";

const EMPTY_SEMANTIC_STYLESHEET = {
	languageVersion: 1,
	text: "@rr-version 1;\n",
} as const;

type SemanticStylesheetSeed = {
	mode: "semantic";
	source: { languageVersion: number; text: string };
	applied: { languageVersion: number; text: string };
};

export const PORTABLE_STYLESHEET = `@rr-version 1;

:root {
	--accent: var(--rr-primary-color);
}

header > name {
	color: var(--accent);
}

section:is([type="experience"], [type="education"]) > section-heading {
	text-transform: uppercase;
}

section[id="projects"] > section-items > item {
	padding: 6pt;
}

section[id="experience"] item[id="experience-item-2"] field[name="period"] {
	color: var(--accent);
}

rich-text list-item > list-item-content {
	line-height: 1.25;
}

region[placement="sidebar"] section {
	background-color: rgba(0, 0, 0, 0.04);
}

section[type="projects"] {
	break-inside: avoid;
	-rr-min-presence-ahead: 24pt;
}

@media (max-width: 600pt) {
	region[placement="sidebar"] section-heading {
		font-size: 9pt;
	}
}

resume[template="azurill"] template-part[name="timeline-dot"] {
	background-color: var(--accent);
}
`;

export const resumeIdFromPage = (page: Page) => {
	const resumeId = new URL(page.url()).pathname.match(/^\/builder\/([^/]+)/)?.[1];
	if (!resumeId) throw new Error(`Expected a builder URL, received ${page.url()}.`);
	return resumeId;
};

export async function createSemanticCssResume(page: Page, testInfo: TestInfo) {
	await createSampleResumeFromDashboard(page, testInfo);
	const resumeId = resumeIdFromPage(page);
	await openSemanticCssEditor(page);
	return resumeId;
}

export async function seedSemanticCssResume(
	page: Page,
	resumeId: string,
	{
		basicsName,
		portableLayout,
		experienceItemId,
		hidePicture = false,
		stylesheet = {
			mode: "semantic",
			source: EMPTY_SEMANTIC_STYLESHEET,
			applied: EMPTY_SEMANTIC_STYLESHEET,
		},
	}: {
		basicsName?: string;
		portableLayout?: "balanced" | "pagination-stress";
		experienceItemId?: string;
		hidePicture?: boolean;
		stylesheet?: SemanticStylesheetSeed;
	} = {},
) {
	await updateSemanticCssFixture(resumeId, {
		basicsName,
		portableLayout,
		experienceItemId,
		hidePicture,
		stylesheet,
	});
	await page.reload();
	await openSemanticCssEditor(page);
	await waitForStylesheetStatus(page, "Applied");
}

export async function openSemanticCssEditor(page: Page) {
	await openSidebarSection(page, "Custom Styles");
	await expect(page.getByRole("textbox", { name: "Semantic CSS stylesheet" })).toBeVisible();
}

export async function replaceStylesheet(page: Page, source: string) {
	const editor = page.getByRole("textbox", { name: "Semantic CSS stylesheet" });
	await editor.fill(source);
	await expect.poll(() => readStylesheetSource(page)).toBe(source);
}

export function readStylesheetSource(page: Page) {
	const editor = page.getByRole("textbox", { name: "Semantic CSS stylesheet" });
	return editor.evaluate((element) =>
		Array.from(element.querySelectorAll(".cm-line"), (line) => line.textContent ?? "").join("\n"),
	);
}

export async function waitForStylesheetStatus(page: Page, status: string) {
	await expect(page.getByText(status, { exact: true }).filter({ visible: true }).last()).toBeVisible({
		timeout: 30_000,
	});
}

export async function activateStylesheet(page: Page) {
	const button = page.getByRole("button", { name: "Activate Semantic CSS" });
	await expect(button).toBeEnabled({ timeout: 30_000 });
	await button.click();
	await waitForStylesheetStatus(page, "Applied");
}

async function firstPreviewPage(page: Page): Promise<Locator> {
	const canvas = page.locator('canvas[aria-label^="Resume page 1 of"]').filter({ visible: true }).first();
	await expect(canvas).toBeVisible({ timeout: 30_000 });
	return canvas;
}

export async function waitForStablePreview(page: Page): Promise<Locator> {
	const canvas = await firstPreviewPage(page);
	let previous: string | undefined;
	let stableSamples = 0;
	await expect
		.poll(
			async () => {
				const current = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
				stableSamples = previous === current ? stableSamples + 1 : 0;
				previous = current;
				return stableSamples >= 1;
			},
			{ timeout: 15_000, intervals: [250] },
		)
		.toBe(true);
	return canvas;
}

export async function switchTemplate(page: Page, template: string) {
	await openSidebarSection(page, "Template");
	const section = page.getByRole("region", { name: "Toggle Template section" });
	if (await section.getByRole("heading", { name: template, exact: true }).isVisible()) {
		await waitForStablePreview(page);
		return;
	}
	await section.getByRole("button").first().click();
	const gallery = page.getByRole("dialog", { name: "Template Gallery" });
	await expect(gallery).toBeVisible();
	const save = page.waitForResponse((response) => {
		const body = response.request().postData() ?? "";
		return response.url().includes("/api/rpc") && response.ok() && body.includes(template.toLowerCase());
	});
	await gallery.getByRole("img", { name: template, exact: true }).click();
	await save;
	await page.keyboard.press("Escape");
	await waitForStablePreview(page);
}

export async function downloadPdf(page: Page): Promise<Download> {
	await page.getByRole("button", { name: "Download options" }).click();
	const dialog = page.getByRole("dialog", { name: "Download" });
	await expect(dialog).toBeVisible();
	const download = page.waitForEvent("download");
	await dialog.getByRole("button", { name: "Download PDF" }).click();
	return download;
}
