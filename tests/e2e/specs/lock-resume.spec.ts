import { createSampleResumeFromDashboard, openResumeCardMenu } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("locks a resume, blocking updates and deletion until unlocked", async ({ authPage: page }, testInfo) => {
	const resumeName = await createSampleResumeFromDashboard(page, testInfo);

	await openResumeCardMenu(page, resumeName);
	const lockPromise = page.waitForResponse((response) => {
		if (!response.url().includes("/api/rpc")) return false;
		if (!response.ok()) return false;
		return (response.request().postData() ?? "").includes('"isLocked":true');
	});
	await page.getByRole("menuitem", { name: "Lock" }).click();
	await page.getByRole("alertdialog").getByRole("button", { name: "Confirm" }).click();
	await lockPromise;

	// Locked: the menu now offers Unlock, and destructive/edit actions are disabled
	await openResumeCardMenu(page, resumeName);
	await expect(page.getByRole("menuitem", { name: "Unlock" })).toBeVisible();
	await expect(page.getByRole("menuitem", { name: "Edit details" })).toBeDisabled();
	await expect(page.getByRole("menuitem", { name: "Delete" })).toBeDisabled();

	// Unlock restores the actions — wait for the mutation to land before re-reading the menu
	const unlockPromise = page.waitForResponse((response) => {
		if (!response.url().includes("/api/rpc")) return false;
		if (!response.ok()) return false;
		return (response.request().postData() ?? "").includes('"isLocked":false');
	});
	await page.getByRole("menuitem", { name: "Unlock" }).click();
	await unlockPromise;
	await openResumeCardMenu(page, resumeName);
	await expect(page.getByRole("menuitem", { name: "Lock" })).toBeVisible();
	await expect(page.getByRole("menuitem", { name: "Delete" })).toBeEnabled();
});
