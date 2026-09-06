import type { Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { createSampleResumeFromDashboard } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

async function measureThumbnail(page: Page) {
	const image = page.locator('a[href^="/builder/"] [style*="background-image"]').first();
	await expect(image).toBeVisible({ timeout: 60_000 });
	return image.evaluate(async (element) => {
		const style = getComputedStyle(element);
		const url = style.backgroundImage.slice(5, -2);
		const blob = await (await fetch(url)).blob();
		const bitmap = await createImageBitmap(blob);
		const rect = element.getBoundingClientRect();
		const scale = Math.min(rect.width / bitmap.width, rect.height / bitmap.height);
		const result = {
			url,
			viewport: innerWidth,
			dpr: devicePixelRatio,
			cssWidth: rect.width,
			cssHeight: rect.height,
			pngWidth: bitmap.width,
			pngHeight: bitmap.height,
			coverage: 1 / (scale * devicePixelRatio),
		};
		bitmap.close();
		return result;
	});
}

async function expectSharpThumbnail(page: Page) {
	await page.mouse.move(0, 0);
	await expect
		.poll(async () => (await measureThumbnail(page)).coverage, { timeout: 60_000 })
		.toBeGreaterThanOrEqual(0.99);
	return measureThumbnail(page);
}

test("dashboard thumbnails cover physical pixels in fresh and cached Grid and Compact views", async ({
	authPage,
	browser,
}, info) => {
	test.setTimeout(180_000);
	await createSampleResumeFromDashboard(authPage, info);
	const storageState = await authPage.context().storageState();
	const measurements: unknown[] = [];
	for (const deviceScaleFactor of [1, 2, 3]) {
		const context = await browser.newContext({
			baseURL: String(info.project.use.baseURL),
			storageState,
			deviceScaleFactor,
			viewport: { width: 1440, height: 1000 },
		});
		try {
			const page = await context.newPage();
			await page.goto("/dashboard/resumes?view=grid");
			const desktop = await expectSharpThumbnail(page);
			measurements.push({ scenario: "fresh-desktop-grid", ...desktop });
			// Immediately below sm, one Grid column is 607 CSS px wide.
			await page.setViewportSize({ width: 639, height: 1000 });
			const grown = await expectSharpThumbnail(page);
			expect(grown.pngWidth).toBeGreaterThan(desktop.pngWidth);
			measurements.push({ scenario: "grown-cached-grid", ...grown });
			await page.screenshot({ path: info.outputPath(`grid-dpr${deviceScaleFactor}.png`) });
			await page.getByRole("tab", { name: "Compact", exact: true }).click();
			const compact = await expectSharpThumbnail(page);
			expect(compact.url).toBe(grown.url);
			measurements.push({ scenario: "cached-compact", ...compact });
			await page.reload();
			measurements.push({ scenario: "fresh-compact", ...(await expectSharpThumbnail(page)) });
			await page.getByRole("tab", { name: "Grid", exact: true }).click();
			measurements.push({ scenario: "compact-to-grid", ...(await expectSharpThumbnail(page)) });
			await page.reload();
			measurements.push({ scenario: "fresh-mobile-grid", ...(await expectSharpThumbnail(page)) });
			await page.setViewportSize({ width: 390, height: 1000 });
			const phone = await expectSharpThumbnail(page);
			measurements.push({ scenario: "phone-grid", ...phone });
			if (deviceScaleFactor === 1) {
				const cdp = await context.newCDPSession(page);
				await cdp.send("Emulation.setDeviceMetricsOverride", {
					width: 390,
					height: 1000,
					deviceScaleFactor: 3,
					mobile: false,
				});
				await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(3);
				const higherDpr = await expectSharpThumbnail(page);
				expect(higherDpr.pngWidth).toBeGreaterThan(phone.pngWidth);
				measurements.push({ scenario: "changed-dpr-grid", ...higherDpr });
			}
		} finally {
			await context.close();
		}
	}
	await writeFile(info.outputPath("measurements.json"), JSON.stringify(measurements, null, 2));
});
