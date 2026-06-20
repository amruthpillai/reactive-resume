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
	await createGroup.getByRole("button").nth(1).click();
	await page.getByRole("menuitem", { name: "Create a Sample Resume" }).click();

	const resumeLink = page.getByRole("link", { name: resumeName, exact: true });
	await expect(resumeLink).toBeVisible();
	await resumeLink.click();
	await page.waitForURL(/\/builder\/.+/);

	return resumeName;
}

export async function openSidebarSection(page: Page, title: string, side: "left" | "right" = "left") {
	await page.getByTitle(title, { exact: true }).click();
	await expect(page.getByTestId(side).getByRole("heading", { name: title })).toBeVisible();
}
