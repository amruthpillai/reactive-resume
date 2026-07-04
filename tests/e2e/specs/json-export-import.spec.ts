import { readFile } from "node:fs/promises";
import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("exports and imports a resume JSON backup", async ({ authPage: page }, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);

	await openSidebarSection(page, "Export");

	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: /^JSON/ }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toMatch(/\.json$/);

	const downloadPath = testInfo.outputPath(download.suggestedFilename());
	await download.saveAs(downloadPath);
	const exportedData = JSON.parse(await readFile(downloadPath, "utf-8")) as { basics: { name: string } };

	await page.goto("/dashboard/resumes");
	await page.getByRole("button", { name: "Import", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Import an existing resume" });
	// Import is now file-first: selecting the file auto-detects the Reactive Resume JSON format.
	await dialog.locator('input[type="file"]').setInputFiles(downloadPath);
	await dialog.getByRole("button", { name: "Import", exact: true }).click();

	await page.waitForURL(/\/builder\/.+/);
	await openSidebarSection(page, "Basics");
	await expect(page.getByLabel("Name")).toHaveValue(exportedData.basics.name);
});
