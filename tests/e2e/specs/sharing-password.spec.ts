import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("password-protects a public resume and unlocks it as a visitor", async ({ browser, authPage: page }, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);
	await openSidebarSection(page, "Sharing");

	await page.getByRole("switch", { name: /Allow Public Access/ }).click();
	const sharingUrl = page.locator("#sharing-url");
	await expect(sharingUrl).toHaveValue(/\/e2e_/);
	const publicUrl = await sharingUrl.inputValue();

	const password = "e2e-secret-42";
	await page.getByRole("button", { name: "Set Password" }).click();
	const prompt = page.getByRole("alertdialog");
	await prompt.locator('input[type="password"]').fill(password);
	await prompt.getByRole("button", { name: "Set Password" }).click();
	await expect(page.getByRole("button", { name: "Remove Password" })).toBeVisible();

	const anonymous = await browser.newPage();
	try {
		// Anonymous visitors hit the password gate first
		await anonymous.goto(publicUrl);
		await anonymous.waitForURL(/\/auth\/resume-password/);

		await anonymous.getByLabel("Password", { exact: true }).fill(password);
		await anonymous.getByRole("button", { name: "Unlock" }).click();

		// The correct password reveals the actual resume
		await expect(anonymous.getByRole("button", { name: "Download PDF" }).first()).toBeVisible();
	} finally {
		await anonymous.close();
	}
});
