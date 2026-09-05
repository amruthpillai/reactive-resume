import type { Page } from "@playwright/test";
import { Pool } from "pg";
import { expect, test } from "../fixtures/test";

async function expectCenteredPreview(page: Page) {
	const canvas = page.locator('[aria-hidden="false"] canvas').first();
	await expect(canvas).toBeVisible();
	await expect
		.poll(async () => {
			const bounds = await canvas.boundingBox();
			if (!bounds) return Number.POSITIVE_INFINITY;
			return Math.abs(bounds.x + bounds.width / 2 - (page.viewportSize()?.width ?? 0) / 2);
		})
		.toBeLessThan(1);
}

for (const uiLanguage of ["English", "Arabic"]) {
	for (const resumeLocale of ["en-US", "ar-SA"]) {
		test(`centers preview with ${uiLanguage} UI and ${resumeLocale} resume`, async ({ authPage: page }, info) => {
			test.setTimeout(60_000);
			await page.setViewportSize({ width: 1920, height: 950 });
			await page.goto("/dashboard/resumes");
			await page.getByText("Create a new resume", { exact: true }).click();
			const dialog = page.getByRole("dialog", { name: "Create a new resume" });
			await dialog.getByLabel("Name", { exact: true }).fill("Preview direction fixture");
			await dialog.getByRole("button", { name: "Create", exact: true }).click();
			await page.waitForURL(/\/builder\/.+/);
			const builderUrl = page.url();
			const resumeId = builderUrl.split("/").at(-1);
			await page.goto("/dashboard/resumes");
			const pool = new Pool({ connectionString: process.env.DATABASE_URL });
			try {
				await pool.query(
					`update resume set data = jsonb_set(jsonb_set(data, '{metadata,page,locale}', $2::jsonb), '{basics,name}', '"Preview direction fixture"'::jsonb) where id = $1`,
					[resumeId, JSON.stringify(resumeLocale)],
				);
			} finally {
				await pool.end();
			}
			await page.goto(builderUrl);
			if (uiLanguage === "Arabic") {
				await page.getByRole("button", { name: "Account menu", exact: true }).click();
				await page.getByRole("menuitem", { name: "Language", exact: true }).click();
				await page.getByRole("menuitemradio", { name: "Arabic", exact: true }).click();
				await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
				await page.reload();
			}
			await expectCenteredPreview(page);
			const zoom = page.getByRole("button", {
				name: uiLanguage === "Arabic" ? "مستوى التكبير" : "Zoom level",
				exact: true,
			});
			await expect(zoom).toHaveCSS("direction", uiLanguage === "Arabic" ? "rtl" : "ltr");
			await zoom.click();
			await page
				.getByRole("menuitem", {
					name: uiLanguage === "Arabic" ? "الحجم الفعلي (100%)" : "Actual size (100%)",
					exact: true,
				})
				.click();
			await expect(zoom).toHaveText("100%");
			await expectCenteredPreview(page);
			await zoom.click();
			await page
				.getByRole("menuitem", { name: uiLanguage === "Arabic" ? "مناسب للعرض" : "Fit to view", exact: true })
				.click();
			await expect(zoom).toHaveText("75%");
			await expectCenteredPreview(page);
			const direction = await page
				.locator('[aria-hidden="false"] canvas')
				.first()
				.evaluate((canvas) => canvas.closest("[dir]")?.getAttribute("dir"));
			expect(direction).toBe(resumeLocale === "ar-SA" ? "rtl" : "ltr");
			await page.screenshot({ path: info.outputPath("centered-preview.png") });
		});
	}
}
