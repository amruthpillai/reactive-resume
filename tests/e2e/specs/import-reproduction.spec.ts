import type { Locator, Page, TestInfo } from "@playwright/test";
import type { E2EAccount } from "../fixtures/data";
import type { ImportFormat, SyntheticImportFile } from "../fixtures/import";
import { parseJSONResume } from "@reactive-resume/import/json-resume";
import { parseReactiveResumeJSON } from "@reactive-resume/import/reactive-resume-json";
import { parseReactiveResumeV4JSON } from "@reactive-resume/import/reactive-resume-v4-json";
import {
	countUserResumes,
	currentJsonFixture,
	jsonResumeFixture,
	malformedJsonFixture,
	observeImport,
	pdfFixture,
	structurallyInvalidCurrentJsonFixture,
	v4JsonFixture,
	withoutMimeType,
} from "../fixtures/import";
import { expect, test } from "../fixtures/test";

const formatLabels: Record<ImportFormat, string> = {
	"reactive-resume-json": "Reactive Resume (JSON)",
	"reactive-resume-v4-json": "Reactive Resume v4 (JSON)",
	"json-resume-json": "JSON Resume",
	pdf: "PDF",
};

async function openImportDialog(page: Page): Promise<Locator> {
	await page.goto("/dashboard/resumes");
	await page.getByText("Import an existing resume", { exact: true }).click();
	return page.getByRole("dialog", { name: "Import an existing resume" });
}

async function selectImportFile(
	page: Page,
	dialog: Locator,
	file: SyntheticImportFile,
	selectedFormat = file.declaredFormat,
): Promise<void> {
	await dialog.locator('input[type="file"]').setInputFiles({
		name: file.name,
		mimeType: file.mimeType,
		buffer: file.buffer,
	});

	const combobox = dialog.getByRole("combobox");
	await expect(combobox).toContainText(formatLabels[file.declaredFormat]);
	if (selectedFormat === file.declaredFormat) return;

	await combobox.click();
	await page.getByRole("option", { name: formatLabels[selectedFormat], exact: true }).click();
	await expect(combobox).toContainText(formatLabels[selectedFormat]);
}

async function assertImportedName(page: Page, expectedName: string): Promise<void> {
	await page.waitForURL(/\/builder\/.+/);
	await page.getByTestId("left").getByRole("button", { name: "Basics", exact: true }).click();
	await expect(page.getByLabel("Name", { exact: true })).toHaveValue(expectedName);
}

async function assertErrorToast(page: Page, expected: string | RegExp, timeout = 10_000): Promise<string> {
	const toast = page.locator('[data-slot="toast"][data-type="error"]');
	await expect(toast).toBeVisible({ timeout });
	const description = toast.locator('[data-slot="toast-description"]');
	await expect(description).toContainText(expected);
	return (await description.textContent()) ?? "";
}

async function attachDiagnostics(
	observation: ReturnType<typeof observeImport>,
	testInfo: TestInfo,
	details: {
		fixture: string;
		detectedFormat: ImportFormat | "";
		selectedFormat: ImportFormat;
		uiOutcome: string;
		beforeCount: number;
		afterCount: number;
	},
): Promise<void> {
	await observation.attach(testInfo, { ...details, providerState: "none" });
	observation.dispose();
}

async function importSuccessfully(
	page: Page,
	account: E2EAccount,
	testInfo: TestInfo,
	file: SyntheticImportFile,
): Promise<void> {
	const observation = observeImport(page);
	const beforeCount = await countUserResumes(account);
	let afterCount = beforeCount;
	let uiOutcome = "test failed before UI outcome";

	try {
		const dialog = await openImportDialog(page);
		await selectImportFile(page, dialog, file);
		await dialog.getByRole("button", { name: "Import", exact: true }).click();
		await assertImportedName(page, file.expectedName ?? "");
		await expect.poll(() => countUserResumes(account)).toBe(beforeCount + 1);
		afterCount = await countUserResumes(account);
		uiOutcome = `builder:${new URL(page.url()).pathname}`;

		expect(observation.rpc).toEqual([
			expect.objectContaining({ method: "POST", path: "/api/rpc/resume/import", status: 200 }),
		]);
		expect(observation.pageErrors).toEqual([]);
	} finally {
		await attachDiagnostics(observation, testInfo, {
			fixture: file.name,
			detectedFormat: file.declaredFormat,
			selectedFormat: file.declaredFormat,
			uiOutcome,
			beforeCount,
			afterCount,
		});
	}
}

test.describe("synthetic import fixtures", () => {
	test("valid JSON fixtures parse through their declared importers", () => {
		const current = currentJsonFixture();
		const v4 = v4JsonFixture();
		const jsonResume = jsonResumeFixture();

		expect(parseReactiveResumeJSON(current.buffer.toString()).basics.name).toBe(current.expectedName);
		expect(parseReactiveResumeV4JSON(v4.buffer.toString()).basics.name).toBe(v4.expectedName);
		expect(parseJSONResume(jsonResume.buffer.toString()).basics.name).toBe(jsonResume.expectedName);
	});

	test("invalid JSON fixtures fail for their intended reason", () => {
		expect(() => parseReactiveResumeJSON(malformedJsonFixture().buffer.toString())).toThrow(/JSON/i);
		expect(() => parseReactiveResumeJSON(structurallyInvalidCurrentJsonFixture().buffer.toString())).toThrow(
			/picture/i,
		);
	});
});

for (const fixtureFactory of [v4JsonFixture, jsonResumeFixture]) {
	const fixture = fixtureFactory();
	test(`imports ${fixture.declaredFormat} through real dialog and RPC`, async ({
		authPage: page,
		account,
	}, testInfo) => {
		await importSuccessfully(page, account, testInfo, fixtureFactory());
	});
}

test("imports current JSON while close cancellation preserves pending dialog state", async ({
	authPage: page,
	account,
}, testInfo) => {
	const file = currentJsonFixture();
	const observation = observeImport(page);
	const beforeCount = await countUserResumes(account);
	let afterCount = beforeCount;
	let uiOutcome = "test failed before UI outcome";
	let releaseImport = () => {};
	const barrier = new Promise<void>((resolve) => {
		releaseImport = resolve;
	});
	let interceptedImport = () => {};
	const intercepted = new Promise<void>((resolve) => {
		interceptedImport = resolve;
	});

	await page.route("**/api/rpc/resume/import", async (route) => {
		interceptedImport();
		await barrier;
		try {
			await route.continue();
		} catch (error) {
			if (!page.isClosed()) throw error;
		}
	});

	try {
		const dialog = await openImportDialog(page);
		await selectImportFile(page, dialog, file);
		await dialog.getByRole("button", { name: "Import", exact: true }).click();
		await intercepted;
		await dialog.getByRole("button", { name: "Close", exact: true }).click();
		const confirmation = page.getByRole("alertdialog", { name: "Are you sure you want to close this dialog?" });
		await expect(confirmation).toBeVisible();
		await confirmation.getByRole("button", { name: "Stay", exact: true }).click();
		await expect(dialog).toBeVisible();
		await expect(dialog.getByText(file.name, { exact: true })).toBeVisible();
		await expect(dialog.getByRole("button", { name: /Importing/ })).toBeDisabled();

		releaseImport();
		await assertImportedName(page, file.expectedName ?? "");
		await expect.poll(() => countUserResumes(account)).toBe(beforeCount + 1);
		afterCount = await countUserResumes(account);
		uiOutcome = `close-cancelled:file-retained;builder:${new URL(page.url()).pathname}`;

		expect(observation.rpc).toEqual([
			expect.objectContaining({ method: "POST", path: "/api/rpc/resume/import", status: 200 }),
		]);
		expect(observation.pageErrors).toEqual([]);
	} finally {
		releaseImport();
		if (!page.isClosed()) await page.unroute("**/api/rpc/resume/import");
		await attachDiagnostics(observation, testInfo, {
			fixture: file.name,
			detectedFormat: file.declaredFormat,
			selectedFormat: file.declaredFormat,
			uiOutcome,
			beforeCount,
			afterCount,
		});
	}
});

test("imports current JSON when browser supplies no MIME metadata", async ({ authPage: page, account }, testInfo) => {
	await importSuccessfully(page, account, testInfo, withoutMimeType(currentJsonFixture()));
});

test("imports offline text PDF generated by Playwright Chromium", async ({
	authPage: page,
	account,
	browser,
}, testInfo) => {
	test.setTimeout(60_000);
	await importSuccessfully(page, account, testInfo, await pdfFixture(browser, testInfo));
});

test("imports magic-byte PDF when browser supplies no MIME metadata", async ({
	authPage: page,
	account,
	browser,
}, testInfo) => {
	test.setTimeout(60_000);
	await importSuccessfully(page, account, testInfo, await pdfFixture(browser, testInfo, { mimeType: "" }));
});

test("keeps blank PDF in dialog and creates no resume", async ({ authPage: page, account, browser }, testInfo) => {
	test.setTimeout(60_000);
	const file = await pdfFixture(browser, testInfo, { blank: true });
	const observation = observeImport(page);
	const beforeCount = await countUserResumes(account);
	let afterCount = beforeCount;
	let uiOutcome = "test failed before UI outcome";

	try {
		const dialog = await openImportDialog(page);
		await selectImportFile(page, dialog, file);
		await dialog.getByRole("button", { name: "Import", exact: true }).click();
		await assertErrorToast(
			page,
			"This PDF has no readable text. It is likely a scan, so there is nothing to import.",
			30_000,
		);
		await expect(dialog).toBeVisible();
		await expect(dialog.getByText(file.name, { exact: true })).toBeVisible();
		afterCount = await countUserResumes(account);
		uiOutcome = "error:no-readable-text;dialog-and-file-retained";

		expect(afterCount).toBe(beforeCount);
		expect(observation.rpc).toEqual([]);
		expect(observation.pageErrors).toEqual([]);
	} finally {
		await attachDiagnostics(observation, testInfo, {
			fixture: file.name,
			detectedFormat: file.declaredFormat,
			selectedFormat: file.declaredFormat,
			uiOutcome,
			beforeCount,
			afterCount,
		});
	}
});

for (const file of [malformedJsonFixture(), structurallyInvalidCurrentJsonFixture()]) {
	test(`keeps invalid fixture ${file.name} in dialog and creates no resume`, async ({
		authPage: page,
		account,
	}, testInfo) => {
		const observation = observeImport(page);
		const beforeCount = await countUserResumes(account);
		let afterCount = beforeCount;
		let uiOutcome = "test failed before UI outcome";

		try {
			const dialog = await openImportDialog(page);
			await dialog.locator('input[type="file"]').setInputFiles({
				name: file.name,
				mimeType: file.mimeType,
				buffer: file.buffer,
			});
			const detectedFormat = file.name === "malformed.json" ? "" : file.declaredFormat;
			if (detectedFormat === "") {
				await expect(dialog.getByText("We couldn't detect the format automatically. Choose it above.")).toBeVisible();
				await dialog.getByRole("combobox").click();
				await page.getByRole("option", { name: formatLabels[file.declaredFormat], exact: true }).click();
			} else {
				await expect(dialog.getByRole("combobox")).toContainText(formatLabels[file.declaredFormat]);
			}
			await dialog.getByRole("button", { name: "Import", exact: true }).click();
			const expectedError =
				file.name === "malformed.json"
					? /Unexpected end of JSON input/
					: /The file could not be read as a valid resume/;
			await assertErrorToast(page, expectedError);
			await expect(dialog.getByText(file.name, { exact: true })).toBeVisible();
			afterCount = await countUserResumes(account);
			uiOutcome = "parse-error;dialog-and-file-retained";

			expect(afterCount).toBe(beforeCount);
			expect(observation.rpc).toEqual([]);
			expect(observation.pageErrors).toEqual([]);
		} finally {
			await attachDiagnostics(observation, testInfo, {
				fixture: file.name,
				detectedFormat: file.name === "malformed.json" ? "" : file.declaredFormat,
				selectedFormat: file.declaredFormat,
				uiOutcome,
				beforeCount,
				afterCount,
			});
		}
	});
}

test("rejects a JSON Resume deliberately selected as current JSON without creating a resume", async ({
	authPage: page,
	account,
}, testInfo) => {
	const file = jsonResumeFixture();
	const selectedFormat = "reactive-resume-json" as const;
	const observation = observeImport(page);
	const beforeCount = await countUserResumes(account);
	let afterCount = beforeCount;
	let uiOutcome = "test failed before UI outcome";

	try {
		const dialog = await openImportDialog(page);
		await selectImportFile(page, dialog, file, selectedFormat);
		await dialog.getByRole("button", { name: "Import", exact: true }).click();
		await assertErrorToast(page, /The file could not be read as a valid resume/);
		await expect(dialog.getByText(file.name, { exact: true })).toBeVisible();
		afterCount = await countUserResumes(account);
		uiOutcome = "selected-format-parse-error;dialog-and-file-retained";

		expect(afterCount).toBe(beforeCount);
		expect(observation.rpc).toEqual([]);
		expect(observation.pageErrors).toEqual([]);
	} finally {
		await attachDiagnostics(observation, testInfo, {
			fixture: file.name,
			detectedFormat: file.declaredFormat,
			selectedFormat,
			uiOutcome,
			beforeCount,
			afterCount,
		});
	}
});
