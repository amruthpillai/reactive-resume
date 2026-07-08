import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../fixtures/test";

const field = (sheet: Locator, label: string) =>
	sheet
		.locator("label")
		.filter({ hasText: label })
		.locator("xpath=following-sibling::input | following-sibling::textarea")
		.first();

async function openApplications(page: Page) {
	await page.goto("/dashboard/applications");
	await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
}

test("adds an application and logs stage changes and notes", async ({ authPage: page }) => {
	const company = `E2E Company ${Date.now().toString(36)}`;
	const role = "Frontend Platform Engineer";
	const note = "Follow up with the hiring manager after the screen.";

	await openApplications(page);
	await page.getByRole("button", { name: "Add application" }).click();

	const sheet = page.getByRole("dialog", { name: "Add application" });
	await field(sheet, "Company").fill(company);
	await field(sheet, "Role / title").fill(role);
	await field(sheet, "Location").fill("Remote");
	await field(sheet, "Salary range").fill("$180k");
	await field(sheet, "Source").fill("Referral");
	await field(sheet, "Notes").fill("Submitted through a referral.");
	await sheet.getByRole("button", { name: "Add to pipeline" }).click();

	const card = page.getByRole("button", { name: new RegExp(`${role}.*${company}`) }).first();
	await expect(card).toBeVisible();
	await expect(card).toContainText("Referral");

	await card.click();
	const detail = page.getByRole("dialog", { name: role });
	await expect(detail.getByText(company)).toBeVisible();
	await detail.getByRole("button", { name: "Move to Applied" }).click();
	await expect(detail.getByRole("button", { name: "Move to Screening" })).toBeVisible();
	await expect(detail.locator('[data-timeline-entry="stage"][data-stage="applied"]')).toBeVisible();

	await detail.locator("[data-timeline-note-input]").fill(note);
	await detail.getByRole("button", { name: "Add", exact: true }).click();
	await expect(detail.getByText(note)).toBeVisible();
});

test("imports applications from CSV and archives them from the table view", async ({ authPage: page }) => {
	const company = `E2E Import ${Date.now().toString(36)}`;
	const role = "Imported Product Engineer";
	const csv = [
		"Company,Role,Stage,Location,Salary,Source,Tags",
		`${company},${role},applied,Remote,$190k,LinkedIn,remote;imported`,
	].join("\n");

	await openApplications(page);
	await page.getByRole("button", { name: /Import (CSV|from CSV)/ }).click();

	const sheet = page.getByRole("dialog", { name: "Import from CSV" });
	await sheet.locator("textarea").fill(csv);
	await expect(sheet.getByText("1 ready to import")).toBeVisible();
	await sheet.getByRole("button", { name: "Import 1" }).click();

	await expect(page.getByRole("button", { name: new RegExp(`${role}.*${company}`) }).first()).toBeVisible();

	await page.getByRole("tab", { name: "Insights" }).click();
	await expect(page.getByText("Pipeline health across all applications")).toBeVisible();
	await expect(page.getByText("Where your applications went")).toBeVisible();

	await page.getByRole("tab", { name: "Table" }).click();
	await expect(page.getByRole("button", { name: new RegExp(`${role}.*${company}`) }).first()).toBeVisible();
	await page.getByRole("checkbox", { name: `Select ${company}` }).check();
	await expect(page.getByText("1 selected")).toBeVisible();
	await page.getByRole("button", { name: "Archive" }).click();

	await expect(page.getByText("No applications match your filters.")).toBeVisible();
	await page.getByRole("button", { name: "Archived (1)" }).click();
	await expect(page.getByRole("button", { name: new RegExp(`${role}.*${company}`) }).first()).toBeVisible();
});
