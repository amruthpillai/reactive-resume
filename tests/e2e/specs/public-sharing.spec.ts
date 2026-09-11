import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("counts a visitor's PDF download without counting the preview", async ({ browser, authPage: page }, testInfo) => {
	test.setTimeout(60_000);
	await createSampleResumeFromDashboard(page, testInfo);
	const resumeId = new URL(page.url()).pathname.split("/")[2];
	const statisticsUrl = `/api/openapi/resumes/${resumeId}/statistics`;
	const readStatistics = async () => {
		const response = await page.request.get(statisticsUrl);
		expect(response.ok()).toBe(true);
		return response.json();
	};
	await openSidebarSection(page, "Sharing");

	await page.getByRole("switch", { name: /Allow Public Access/ }).click();
	const sharingUrl = page.locator("#sharing-url");
	await expect(sharingUrl).toHaveValue(/\/e2e_/);
	const publicUrl = await sharingUrl.inputValue();
	expect(publicUrl).toMatch(/\/e2e_/);

	const anonymous = await browser.newPage();
	try {
		await anonymous.goto(publicUrl);
		await expect(anonymous.getByRole("button", { name: "Download PDF" }).first()).toBeVisible();
		await expect.poll(readStatistics).toMatchObject({ views: 1, downloads: 0, lastDownloadedAt: null });

		const downloaded = anonymous.waitForEvent("download");
		await anonymous.getByRole("button", { name: "Download PDF" }).first().click();
		const download = await downloaded;
		expect(await download.failure()).toBeNull();
		const downloadPath = await download.path();
		if (!downloadPath) throw new Error("The browser did not save the PDF");
		expect((await readFile(downloadPath)).subarray(0, 5).toString()).toBe("%PDF-");
		await expect.poll(readStatistics).toMatchObject({ views: 1, downloads: 1, lastDownloadedAt: expect.any(String) });
		const daily = await page.request.get(`${statisticsUrl}/daily?days=1`);
		expect(daily.ok()).toBe(true);
		expect(await daily.json()).toEqual([{ date: expect.any(String), views: 1, downloads: 1 }]);
	} finally {
		await anonymous.close();
	}
});

import { readFile } from "node:fs/promises";
