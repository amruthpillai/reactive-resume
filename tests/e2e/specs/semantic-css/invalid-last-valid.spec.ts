import { readFile } from "node:fs/promises";
import { readSemanticCssFixture } from "../../fixtures/db";
import {
	createSemanticCssResume,
	downloadPdf,
	replaceStylesheet,
	seedSemanticCssResume,
	waitForStablePreview,
	waitForStylesheetStatus,
} from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test.setTimeout(120_000);

test("@semantic-css keeps preview and export on the last valid source", async ({ authPage: page }, testInfo) => {
	const resumeId = await createSemanticCssResume(page, testInfo);
	await seedSemanticCssResume(page, resumeId);
	await replaceStylesheet(page, "@rr-version 1;\nname { color: #dc2626; }\n");
	await waitForStylesheetStatus(page, "Applied");

	const canvas = await waitForStablePreview(page);
	const validPreview = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
	const validDownload = await downloadPdf(page);
	const validPdf = await readFile(await validDownload.path());
	expect(validPdf.subarray(0, 4).toString()).toBe("%PDF");

	await replaceStylesheet(page, "@rr-version 1;\nname { color: ; }\n");
	await waitForStylesheetStatus(page, "Error");
	await expect(page.getByText("Preview and export use the last valid version.", { exact: true })).toBeVisible();
	await expect.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL())).toBe(validPreview);
	const invalidDownload = await downloadPdf(page);
	const invalidPdf = await readFile(await invalidDownload.path());
	expect(invalidPdf.subarray(0, 4).toString()).toBe("%PDF");
	await expect
		.poll(async () => (await readSemanticCssFixture(resumeId)).stylesheet)
		.toMatchObject({
			source: { text: "@rr-version 1;\nname { color: ; }\n" },
			applied: { text: "@rr-version 1;\nname { color: #dc2626; }\n" },
		});

	await replaceStylesheet(page, "@rr-version 1;\nname { color: #2563eb; }\n");
	await waitForStylesheetStatus(page, "Applied");
	await expect
		.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()))
		.not.toBe(validPreview);
	await waitForStablePreview(page);
	const fixedDownload = await downloadPdf(page);
	expect((await readFile(await fixedDownload.path())).subarray(0, 4).toString()).toBe("%PDF");
	await expect
		.poll(async () => (await readSemanticCssFixture(resumeId)).stylesheet?.applied.text)
		.toBe("@rr-version 1;\nname { color: #2563eb; }\n");
});
