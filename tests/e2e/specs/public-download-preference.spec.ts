import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("persists public download-button visibility", async ({ browser, authPage: page }, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);
	await openSidebarSection(page, "Sharing");
	await page.getByRole("switch", { name: /Allow Public Access/ }).click();
	const downloadPreference = page.getByRole("switch", { name: "Show Download Buttons" });
	await expect(downloadPreference).toBeChecked();
	await downloadPreference.click();
	await expect(downloadPreference).not.toBeChecked();
	await page.reload();
	await openSidebarSection(page, "Sharing");
	await expect(downloadPreference).not.toBeChecked();
	const publicUrl = await page.locator("#sharing-url").inputValue();

	const anonymous = await browser.newPage();
	try {
		await anonymous.goto(publicUrl);
		await expect(anonymous.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(anonymous.getByRole("button", { name: "Download PDF" })).toHaveCount(0);
		await downloadPreference.click();
		await expect(downloadPreference).toBeChecked();
		await anonymous.reload();
		await expect(anonymous.getByRole("button", { name: "Download PDF" })).toHaveCount(2);
	} finally {
		await anonymous.close();
	}
});
