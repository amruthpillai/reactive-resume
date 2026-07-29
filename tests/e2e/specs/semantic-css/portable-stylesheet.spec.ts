import { updateSemanticCssFixture } from "../../fixtures/db";
import {
	createSemanticCssResume,
	firstPreviewPage,
	PORTABLE_STYLESHEET,
	replaceStylesheet,
	seedSemanticCssResume,
	switchTemplate,
	waitForStylesheetStatus,
} from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test.setTimeout(120_000);

test("@semantic-css applies one portable stylesheet across Onyx, Azurill, and Ditto", async ({
	authPage: page,
}, testInfo) => {
	const resumeId = await createSemanticCssResume(page, testInfo);
	await seedSemanticCssResume(page, resumeId);
	await updateSemanticCssFixture(resumeId, { experienceItemId: "experience-item-2" });
	await page.reload();
	await replaceStylesheet(page, PORTABLE_STYLESHEET);
	await waitForStylesheetStatus(page, "Applied");

	const editor = page.getByRole("textbox", { name: "Semantic CSS stylesheet" });
	for (const selector of [
		"header > name",
		'section:is([type="experience"], [type="education"])',
		'section[id="projects"]',
		'item[id="experience-item-2"] field[name="period"]',
		"rich-text list-item > list-item-content",
		'region[placement="sidebar"]',
		"break-inside: avoid",
		"@media (max-width: 600pt)",
		'template-part[name="timeline-dot"]',
	]) {
		await expect(editor).toContainText(selector);
	}

	const images: Buffer[] = [];
	for (const template of ["Azurill", "Onyx", "Ditto"]) {
		await switchTemplate(page, template);
		images.push(await (await firstPreviewPage(page)).screenshot({ animations: "disabled", caret: "hide" }));
	}
	expect(new Set(images.map((image) => image.toString("base64"))).size).toBe(3);
});
