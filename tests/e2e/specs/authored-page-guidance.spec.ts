import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("explains authored pages and automatic PDF overflow in Layout", async ({ authPage: page }, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);
	await openSidebarSection(page, "Layout");

	const guidance = page.getByRole("note", { name: "Authored pages and PDF overflow" });
	await expect(guidance).toBeVisible();
	await expect(guidance).toContainText("overflow pages are not saved or editable separately");
	await expect(guidance).toContainText("Move to → New Page");
	await expect(guidance).toContainText("Full Width");
});
