import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("adds an experience item and persists it across reloads", async ({ authPage: page }, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);

	const company = `E2E Corp ${Date.now()}`;
	const position = "Principal Tester";

	await openSidebarSection(page, "Experience");
	await page.getByRole("button", { name: "Add a new experience" }).click();

	const dialog = page.getByRole("dialog", { name: "Create a new experience" });
	await dialog.getByLabel("Company").fill(company);
	await dialog.getByLabel("Position").fill(position);

	const savePromise = page.waitForResponse((response) => {
		if (!response.url().includes("/api/rpc")) return false;
		if (response.request().method() !== "POST") return false;
		if (!response.ok()) return false;
		return (response.request().postData() ?? "").includes(company);
	});
	await dialog.getByRole("button", { name: "Create" }).click();
	await savePromise;

	// The new item shows up in the section list with the company as its title
	await expect(page.getByText(company).filter({ visible: true }).first()).toBeVisible();

	// And it survives a full reload
	await page.reload();
	await openSidebarSection(page, "Experience");
	await expect(page.getByText(company).filter({ visible: true }).first()).toBeVisible();
	await expect(page.getByText(position).filter({ visible: true }).first()).toBeVisible();
});
