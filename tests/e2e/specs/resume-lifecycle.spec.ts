import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("creates a sample resume and persists a basics edit", async ({ authPage: page }, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);

	const updatedName = `E2E Edited ${Date.now()}`;
	await openSidebarSection(page, "Basics");
	const savePromise = page.waitForResponse((response) => {
		if (!response.url().includes("/api/rpc")) return false;
		if (response.request().method() !== "POST") return false;
		if (!response.ok()) return false;

		const body = response.request().postData() ?? "";
		return body.includes(updatedName);
	});
	await page.getByLabel("Name").fill(updatedName);
	await savePromise;

	await page.reload();
	await openSidebarSection(page, "Basics");
	await expect(page.getByLabel("Name")).toHaveValue(updatedName);
});
