import { updateSemanticCssFixture } from "../../fixtures/db";
import { activateStylesheet, createSemanticCssResume, openSemanticCssEditor } from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test.setTimeout(120_000);

test("@semantic-css converts legacy rules into an inactive draft before activation", async ({
	authPage: page,
}, testInfo) => {
	const preflightWorkerErrors: string[] = [];
	page.on("console", (message) => {
		if (message.location().url.includes("preflight.worker") && message.text().includes("Buffer is not defined")) {
			preflightWorkerErrors.push(message.text());
		}
	});

	const resumeId = await createSemanticCssResume(page, testInfo);
	await updateSemanticCssFixture(resumeId, { legacyStyleRule: true });
	await page.reload();
	await openSemanticCssEditor(page);

	await expect(page.getByText("Converted stylesheet draft", { exact: true })).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Semantic CSS stylesheet" })).toContainText("@version 1;");
	await expect(page.getByRole("textbox", { name: "Semantic CSS stylesheet" })).toContainText(
		'section[type="experience"]',
	);
	await expect(page.getByRole("textbox", { name: "Semantic CSS stylesheet" })).toContainText("padding-left: 7pt;");
	await expect(page.getByText(/^Ready to activate(?: with warnings)?$/)).toBeVisible({ timeout: 30_000 });

	await activateStylesheet(page);
	expect(preflightWorkerErrors).toEqual([]);
	await page.reload();
	await expect(page.getByText("Converted stylesheet draft", { exact: true })).toHaveCount(0);
	await expect(page.getByText("Applied", { exact: true }).filter({ visible: true })).toBeVisible();
});
