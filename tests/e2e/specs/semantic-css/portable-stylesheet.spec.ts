import { readSemanticCssFixture } from "../../fixtures/db";
import {
	createSemanticCssResume,
	firstPreviewPage,
	openSemanticCssEditor,
	PORTABLE_STYLESHEET,
	replaceStylesheet,
	seedSemanticCssResume,
	switchTemplate,
	waitForStylesheetStatus,
} from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test.setTimeout(120_000);

const PORTABLE_PAGE_COLOR = [18, 52, 86, 255];

async function countPortablePageColorPixels(page: Parameters<typeof firstPreviewPage>[0]) {
	const canvas = await firstPreviewPage(page);
	return canvas.evaluate((element, color) => {
		const context = (element as HTMLCanvasElement).getContext("2d");
		if (!context) throw new Error("Expected a 2D preview canvas.");
		const pixels = context.getImageData(0, 0, element.width, element.height).data;
		let matches = 0;
		for (let index = 0; index < pixels.length; index += 4) {
			if (
				pixels[index] === color[0] &&
				pixels[index + 1] === color[1] &&
				pixels[index + 2] === color[2] &&
				pixels[index + 3] === color[3]
			) {
				matches += 1;
			}
		}
		return matches;
	}, PORTABLE_PAGE_COLOR);
}

test("@semantic-css applies one portable stylesheet across Azurill, Pikachu, and Scizor", async ({
	authPage: page,
}, testInfo) => {
	const resumeId = await createSemanticCssResume(page, testInfo);
	await seedSemanticCssResume(page, resumeId, { experienceItemId: "experience-item-2" });
	await replaceStylesheet(page, PORTABLE_STYLESHEET);
	await waitForStylesheetStatus(page, "Applied");
	await expect
		.poll(async () => (await readSemanticCssFixture(resumeId)).stylesheet?.applied.text, { timeout: 30_000 })
		.toBe(PORTABLE_STYLESHEET);
	await page.reload();
	await openSemanticCssEditor(page);
	await waitForStylesheetStatus(page, "Applied");

	for (const template of ["Azurill", "Pikachu", "Scizor"]) {
		await switchTemplate(page, template);
		expect(
			await countPortablePageColorPixels(page),
			`${template} should render the portable page background rule`,
		).toBeGreaterThan(1_000);
	}
});
