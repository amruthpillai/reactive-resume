import { createSemanticCssResume, readStylesheetSource } from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test("@semantic-css starts new resumes in semantic mode", async ({ authPage: page }, testInfo) => {
	await createSemanticCssResume(page, testInfo);

	await expect(page.getByText("Converted stylesheet draft", { exact: true })).toHaveCount(0);
	await expect.poll(() => readStylesheetSource(page)).toBe("@version 1;\n");
	await expect(page.getByText("Valid", { exact: true }).filter({ visible: true })).toBeVisible();
});
