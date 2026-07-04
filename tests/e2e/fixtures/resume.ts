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

	// Creating a resume now navigates straight into the builder.
	await page.waitForURL(/\/builder\/.+/);

	return resumeName;
}

export async function openSidebarSection(page: Page, title: string) {
	// Rail nav buttons are labelled with the section title (aria-label); clicking scrolls to the section.
	await page.getByRole("button", { name: title, exact: true }).first().click();
	// The visible section heading is exactly the title. Filter to visible because the screen-reader-only
	// resume mirror in the preview also renders <h2> section headings with the same name.
	await expect(page.getByRole("heading", { name: title, exact: true }).filter({ visible: true }).first()).toBeVisible();
}

export async function openResumeCardMenu(page: Page, resumeName: string) {
	await page.goto("/dashboard/resumes");
	const resumeLink = page.getByRole("link", { name: new RegExp(resumeName) });
	await expect(resumeLink).toBeVisible();
	await resumeLink.click({ button: "right" });
	await expect(page.getByRole("menuitem", { name: "Open" })).toBeVisible();
}
