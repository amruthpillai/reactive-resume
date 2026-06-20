import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("publishes a resume and renders it for an anonymous visitor", async ({ browser, authPage: page }, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);
	await openSidebarSection(page, "Sharing");

	await page.getByRole("switch", { name: /Allow Public Access/ }).click();
	const sharingUrl = page.locator("#sharing-url");
	await expect(sharingUrl).toHaveValue(/\/e2e_/);
	const publicUrl = await sharingUrl.inputValue();
	expect(publicUrl).toMatch(/\/e2e_/);

	const anonymous = await browser.newPage();
	try {
		await anonymous.goto(publicUrl);
		await expect(anonymous.getByRole("button", { name: "Download PDF" })).toBeVisible();
	} finally {
		await anonymous.close();
	}
});
