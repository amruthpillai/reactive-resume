import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({
	path: path.resolve(__dirname, "../../../.env"),
});

import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { expect, test } from "../fixtures/test";

test("test", async ({ authPage }) => {
	// Provide credentials for the test user
	await authPage.goto("http://localhost:3000/");
	await authPage.getByRole("button", { name: "Go to dashboard" }).click();

	// Import an existing resume in json format
	await authPage
		.getByRole("heading", { name: "Import an existing resume" })
		.locator("..") // move from <h3> to the overlay container
		.locator("..") // then to the clickable card wrapper
		.click();

	await authPage.getByRole("combobox", { name: "Type" }).click();
	await authPage.getByRole("option", { name: "Reactive Resume (JSON)" }).click();
	await authPage
		.locator('input[type="file"]', { hasText: "" })
		.setInputFiles(path.resolve(__dirname, "data/test-empty-page.json"));
	await authPage.getByRole("button", { name: "Import" }).click();

	// Move Experience / Company 2 to a custom section located on a new page.
	const experienceSectionNew = authPage.getByRole("heading", { name: "Experience" }).locator("../../.."); // Go up 3 levels instead of 1
	const company2Row = experienceSectionNew.locator('li:has-text("Company 2")');
	await company2Row.locator('button[aria-haspopup="menu"]').click();
	await authPage.getByRole("menuitem", { name: "Move to" }).click();
	await authPage.getByRole("menuitem", { name: "New Page" }).click();

	// Move the Custom section / Company 2 back to Page 1 / Experience section.
	const customSectionsHeading = authPage.getByRole("heading", { name: "Custom Sections" });
	const customSectionsContainer = customSectionsHeading.locator("../../.."); // Or whatever level works
	const company2 = customSectionsContainer.locator('li:has-text("Company 2")');
	await company2.locator('button[aria-haspopup="menu"]').click();
	await authPage.getByRole("menuitem", { name: "Move to" }).click();
	await authPage.getByRole("menuitem", { name: "Page 1" }).click();
	await authPage.getByRole("menuitem", { name: "Experience" }).click();

	// Download the edited resume in json format and save it as downloads/test-empty-page.json
	const [download] = await Promise.all([
		authPage.waitForEvent("download"),
		authPage.getByRole("button", { name: "JSON Download a copy of your" }).click(),
	]);
	const savedPath = test.info().outputPath("downloads/test-empty-page.json");
	await download.saveAs(savedPath);

	// Compare the inputted and downloaded JSON files to ensure they are equal
	const json_inputted = readFileSync(path.resolve(__dirname, "data/test-empty-page.json"), "utf8");
	const dict_inputted: Record<string, unknown> = JSON.parse(json_inputted);

	const json_downloaded = readFileSync(savedPath, "utf8");
	const dict_downloaded: Record<string, unknown> = JSON.parse(json_downloaded);

	// Check if the two dictionaries are deeply equal and log the result
	expect(dict_inputted).toEqual(dict_downloaded);

	if (!isDeepStrictEqual(dict_inputted, dict_downloaded)) {
		console.error("The inputted and downloaded JSON files are not equal.");
		console.error("Inputted JSON:", dict_inputted);
		console.error("Downloaded JSON:", dict_downloaded);
		throw new Error("The inputted and downloaded JSON files are not equal.");
	}
});
