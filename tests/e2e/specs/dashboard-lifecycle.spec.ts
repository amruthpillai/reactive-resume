import { createSampleResumeFromDashboard, openResumeCardMenu } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("renames, duplicates and deletes a resume from the dashboard", async ({ authPage: page }, testInfo) => {
	const resumeName = await createSampleResumeFromDashboard(page, testInfo);

	// Rename via the card context menu (resume names are capped at 64 chars, keep it short)
	const renamedTo = `E2E Renamed ${Date.now().toString(36)}`;
	await openResumeCardMenu(page, resumeName);
	await page.getByRole("menuitem", { name: "Edit details" }).click();
	const updateDialog = page.getByRole("dialog", { name: "Update Resume" });
	await updateDialog.getByLabel("Name").fill(renamedTo);
	await updateDialog.getByRole("button", { name: "Save Changes" }).click();
	await expect(page.getByRole("link", { name: new RegExp(renamedTo) })).toBeVisible();

	// Duplicate — the copy defaults to "<name> (Copy)"
	await openResumeCardMenu(page, renamedTo);
	await page.getByRole("menuitem", { name: "Duplicate" }).click();
	const duplicateDialog = page.getByRole("dialog", { name: "Duplicate Resume" });
	await duplicateDialog.getByRole("button", { name: "Duplicate" }).click();
	const copyLink = page.getByRole("link", { name: new RegExp(`${renamedTo} \\(Copy\\)`) });
	await expect(copyLink).toBeVisible();

	// Delete the copy and verify it disappears while the original stays
	await openResumeCardMenu(page, `${renamedTo} \\(Copy\\)`);
	await page.getByRole("menuitem", { name: "Delete" }).click();
	await page.getByRole("alertdialog").getByRole("button", { name: "Confirm" }).click();
	await expect(copyLink).toBeHidden();
	await expect(page.getByRole("link", { name: new RegExp(renamedTo) })).toBeVisible();
});
