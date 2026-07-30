import { createSemanticCssResume, readStylesheetSource } from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test("@semantic-css starts new resumes in semantic mode when default-on is enabled", async ({
	authPage: page,
}, testInfo) => {
	await createSemanticCssResume(page, testInfo);

	await expect(page.getByText("Converted stylesheet draft", { exact: true })).toHaveCount(0);
	await expect.poll(() => readStylesheetSource(page)).toBe("@version 1;\n");
	await expect(page.getByText("Applied", { exact: true }).filter({ visible: true })).toBeVisible();
});
