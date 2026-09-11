import { createSampleResumeFromDashboard } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("keeps compact and list preferences through navigation and reload, with explicit URL overrides", async ({
	authPage: page,
}, testInfo) => {
	test.setTimeout(60_000);
	await page.setViewportSize({ width: 1440, height: 1000 });
	const name = await createSampleResumeFromDashboard(page, testInfo);
	await page.goto("/dashboard/resumes");
	const card = page.getByRole("link").filter({ hasText: name });
	await expect(card).toBeVisible();
	const gridWidth = (await card.boundingBox())?.width;
	if (!gridWidth) throw new Error("Resume card has no width.");
	await page.getByRole("tab", { name: "Compact", exact: true }).click();
	await expect(page.getByRole("tab", { name: "Compact", exact: true })).toHaveAttribute("aria-selected", "true");
	await expect.poll(async () => (await card.boundingBox())?.width ?? gridWidth).toBeLessThan(gridWidth);
	await card.click();
	await page.waitForURL(/\/builder\/.+/);
	await page.goto("/dashboard/resumes");
	await expect(page.getByRole("tab", { name: "Compact", exact: true })).toHaveAttribute("aria-selected", "true");
	await page.reload();
	await expect(page.getByRole("tab", { name: "Compact", exact: true })).toHaveAttribute("aria-selected", "true");
	await expect(card.locator('[style*="background-image: url("]')).toBeVisible({ timeout: 30_000 });
	await page.screenshot({ path: testInfo.outputPath("compact-resumes.png"), animations: "disabled" });

	await page.getByRole("tab", { name: "Grid", exact: true }).click();
	await expect(page).toHaveURL(/view=grid/);
	await expect(page.getByRole("tab", { name: "Grid", exact: true })).toHaveAttribute("aria-selected", "true");
	await expect.poll(async () => (await card.boundingBox())?.width).toBe(gridWidth);
	await page.getByRole("tab", { name: "List", exact: true }).click();
	await expect(page.getByRole("tab", { name: "List", exact: true })).toHaveAttribute("aria-selected", "true");
	await page.goto("/dashboard/resumes");
	await expect(page.getByRole("tab", { name: "List", exact: true })).toHaveAttribute("aria-selected", "true");
	await page.goto("/dashboard/resumes?view=grid");
	await expect(page.getByRole("tab", { name: "Grid", exact: true })).toHaveAttribute("aria-selected", "true");
	await page.goto("/dashboard/resumes?view=invalid");
	await expect(page.getByRole("tab", { name: "Grid", exact: true })).toHaveAttribute("aria-selected", "true");

	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole("tab", { name: "Compact", exact: true }).click();
	await expect(page.getByRole("tab", { name: "Compact", exact: true })).toHaveAttribute("aria-selected", "true");
	await expect(card).toBeVisible();
	await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await page.screenshot({ path: testInfo.outputPath("compact-resumes-mobile.png"), animations: "disabled" });
});
