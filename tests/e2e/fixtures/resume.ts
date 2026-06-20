import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import { createResumeName } from "./data";

export async function createSampleResumeFromDashboard(page: Page, testInfo: TestInfo) {
	const resumeName = createResumeName(testInfo);

	await page.goto("/dashboard/resumes");
	await page.getByText("Create a new resume").click();

	const dialog = page.getByRole("dialog", { name: "Create a new resume" });
	await dialog.getByLabel("Name").fill(resumeName);

	const createGroup = dialog.getByRole("group", { name: "Create resume with options" });
	await createGroup.getByRole("button").last().click();
	await page.getByRole("menuitem", { name: "Create a Sample Resume" }).click();

	const resumeLink = page.getByRole("link", { name: new RegExp(resumeName) });
	await expect(resumeLink).toBeVisible();
	await resumeLink.click();
	await page.waitForURL(/\/builder\/.+/);

	return resumeName;
}

export async function openSidebarSection(page: Page, title: string) {
	await page.getByTitle(title, { exact: true }).click();
	await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
}
