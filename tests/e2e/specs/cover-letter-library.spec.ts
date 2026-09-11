import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { createSampleResumeFromDashboard } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("imports a library letter into the builder as an independent copy", async ({ authPage: page }, testInfo) => {
	test.setTimeout(90_000);
	await createSampleResumeFromDashboard(page, testInfo);
	const builderUrl = page.url();
	await page.goto("/dashboard/cover-letters");
	await page.getByRole("button", { name: "Create", exact: true }).click();
	await page.getByLabel("Name", { exact: true }).fill("Platform engineer letter");
	await page.getByRole("button", { name: "Create cover letter", exact: true }).click();
	const editor = page.getByRole("dialog", { name: "Edit cover letter", exact: true });
	await editor.getByLabel("Recipient", { exact: true }).fill("Dear hiring team,");
	await editor.getByLabel("Content", { exact: true }).fill("I build reliable platforms for growing teams.");
	await editor.getByRole("button", { name: "Save Changes", exact: true }).click();
	await expect(editor.getByRole("button", { name: "Save Changes", exact: true })).toBeDisabled();

	const jsonDownload = page.waitForEvent("download");
	await editor.getByRole("button", { name: "Export JSON", exact: true }).click();
	const json = await jsonDownload;
	const jsonPath = await json.path();
	if (!jsonPath) throw new Error("JSON download did not produce a file.");
	const document = JSON.parse(await readFile(jsonPath, "utf8"));
	expect(document.format).toBe("reactive-resume-cover-letter");
	expect(document.content).toContain("reliable platforms");
	expect(document).not.toHaveProperty("id");
	await expect(editor.getByRole("button", { name: "Download PDF", exact: true })).toBeEnabled();
	await editor.evaluate((element) => {
		element.scrollTop = 0;
	});
	await page.screenshot({ path: testInfo.outputPath("cover-letter-editor.png") });
	await editor.getByRole("button", { name: "Preview PDF", exact: true }).click();
	await expect(editor.locator("canvas").first()).toBeVisible();
	await editor.getByRole("button", { name: "Hide preview", exact: true }).click();

	const pdfDownload = page.waitForEvent("download");
	await editor.getByRole("button", { name: "Download PDF", exact: true }).click();
	const pdf = await pdfDownload;
	const pdfPath = await pdf.path();
	if (!pdfPath) throw new Error("PDF download did not produce a file.");
	expect((await readFile(pdfPath)).subarray(0, 5).toString()).toBe("%PDF-");
	await editor.getByRole("button", { name: "Close", exact: true }).click();

	await page.goto(builderUrl);
	await page.getByRole("button", { name: "Cover Letter", exact: true }).click();
	await page.getByRole("button", { name: "Add a new item", exact: true }).last().click();
	const createItem = page.getByRole("dialog", { name: "Create a new cover letter", exact: true });
	await createItem.getByLabel("Import from library", { exact: true }).click();
	await page.getByRole("option", { name: "Platform engineer letter", exact: true }).click();
	const createEditors = createItem.locator('[data-editor="true"]');
	await expect(createEditors.nth(0)).toContainText("Dear hiring team");
	await expect(createEditors.nth(1)).toContainText("reliable platforms");
	await createEditors.nth(1).fill("Updated independent resume copy.");
	const resumeSaved = page.waitForResponse(
		(response) => new URL(response.url()).pathname === "/api/rpc/resume/update" && response.ok(),
	);
	await createItem.getByRole("button", { name: "Create", exact: true }).click();
	await resumeSaved;
	await expect(page.getByRole("button", { name: /^Dear hiring team, Updated independent resume copy/ })).toBeVisible();

	await page.goto("/dashboard/cover-letters");
	await page.getByRole("button", { name: "Edit Platform engineer letter", exact: true }).click();
	await expect(editor.getByLabel("Content", { exact: true })).toContainText("reliable platforms");
	await expect(editor.getByLabel("Content", { exact: true })).not.toContainText("Updated independent resume copy");
	await editor.getByRole("button", { name: "Close", exact: true }).click();
	await page.getByLabel("Import cover letter JSON", { exact: true }).setInputFiles(jsonPath);
	await expect(editor.getByLabel("Content", { exact: true })).toContainText("reliable platforms");
	await editor.getByLabel("Name", { exact: true }).fill("Imported independent copy");
	await editor.getByRole("button", { name: "Save Changes", exact: true }).click();
	await expect(editor.getByRole("button", { name: "Save Changes", exact: true })).toBeDisabled();
	await editor.getByRole("button", { name: "Close", exact: true }).click();
	await expect(page.getByRole("button", { name: "Edit Platform engineer letter", exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Edit Imported independent copy", exact: true })).toBeVisible();
});

test("keeps the application PDF snapshot after the library letter is deleted", async ({ authPage: page, account }) => {
	test.setTimeout(60_000);
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	const applicationId = randomUUID();
	try {
		await pool.query(
			'insert into application (id, user_id, company, role) select $1, id, $2, $3 from "user" where email = $4',
			[applicationId, "Snapshot Company", "Platform Engineer", account.email],
		);
		await page.goto("/dashboard/cover-letters");
		await page.getByRole("button", { name: "Create", exact: true }).click();
		await page.getByLabel("Name", { exact: true }).fill("Snapshot letter");
		await page.getByRole("button", { name: "Create cover letter", exact: true }).click();
		const editor = page.getByRole("dialog", { name: "Edit cover letter", exact: true });
		await editor.getByLabel("Content", { exact: true }).fill("My application snapshot remains available.");
		await editor.getByRole("button", { name: "Save Changes", exact: true }).click();
		await expect(editor.getByRole("button", { name: "Save Changes", exact: true })).toBeDisabled();
		await editor.getByLabel("Application", { exact: true }).click();
		await page.getByRole("option", { name: "Snapshot Company — Platform Engineer", exact: true }).click();
		await editor.getByRole("button", { name: "Attach PDF", exact: true }).click();
		await expect(page.getByText("PDF snapshot attached to the application.", { exact: true })).toBeVisible();
		const result = await pool.query<{ cover_letter_url: string }>(
			"select cover_letter_url from application where id = $1",
			[applicationId],
		);
		const url = result.rows[0]?.cover_letter_url;
		if (!url) throw new Error("Cover-letter PDF was not attached.");
		const before = await page.request.get(url);
		expect(before.ok()).toBe(true);
		const bytes = await before.body();
		expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
		await editor.getByRole("button", { name: "Delete", exact: true }).click();
		await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
		await expect(editor).not.toBeVisible();
		await expect(page.getByRole("button", { name: "Edit Snapshot letter", exact: true })).not.toBeVisible();
		const after = await page.request.get(url);
		expect(after.ok()).toBe(true);
		expect(await after.body()).toEqual(bytes);
		await page.goto("/dashboard/applications");
		await page
			.getByRole("button", { name: /Platform Engineer.*Snapshot Company/ })
			.first()
			.click();
		await expect(page.getByRole("dialog", { name: "Platform Engineer" }).locator(`a[href="${url}"]`)).toBeVisible();
	} finally {
		await pool.end();
	}
});
