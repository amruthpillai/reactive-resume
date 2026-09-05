import { createSemanticCssResume, readStylesheetSource, seedSemanticCssResume } from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test("@semantic-css keeps color picker edits and swatches aligned through dismissal and undo", async ({
	authPage: page,
}, testInfo) => {
	test.setTimeout(60_000);
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	const resumeId = await createSemanticCssResume(page, testInfo);
	const source = "@version 1;\nsection {\n\tcolor: #f00;\n\tbackground-color: #fff;\n}";
	await seedSemanticCssResume(page, resumeId, {
		stylesheet: { mode: "semantic", source: { languageVersion: 1, text: source } },
	});
	const swatches = page.locator(".semantic-css-color-swatch");
	const trigger = page.locator("[data-semantic-css-color-picker-trigger]");
	const picker = page.getByRole("dialog").filter({ has: page.getByText("Presets", { exact: true }) });
	await expect(swatches).toHaveCount(2);
	await page.getByRole("button", { name: "Edit color #f00", exact: true }).click();

	const first = source.replace("#f00", "rgba(0, 0, 0, 1)");
	await picker.getByRole("button", { name: "Use color rgba(0, 0, 0, 1)", exact: true }).click();
	await expect.poll(() => readStylesheetSource(page)).toBe(first);
	await expect(page.getByText("Presets", { exact: true })).toBeVisible();

	const second = source.replace("#f00", "rgba(231, 0, 11, 1)");
	await picker.getByRole("button", { name: "Use color rgba(231, 0, 11, 1)", exact: true }).click();
	await expect.poll(() => readStylesheetSource(page)).toBe(second);
	await expect(swatches).toHaveCount(2);
	await page.keyboard.press("Escape");
	await expect(page.getByText("Presets", { exact: true })).toHaveCount(0);
	await expect(trigger).toHaveCount(0);
	await page.getByRole("button", { name: "Edit color rgba(231, 0, 11, 1)", exact: true }).click();
	await expect(page.getByText("Presets", { exact: true })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(trigger).toHaveCount(0);

	await page.getByRole("button", { name: "Undo stylesheet edit", exact: true }).click();
	// Rapid presets can coalesce into one undo step; either complete prior stylesheet is valid.
	await expect.poll(async () => [source, first].includes(await readStylesheetSource(page))).toBe(true);
	await expect(trigger).toHaveCount(0);
	await page.getByRole("button", { name: "Redo stylesheet edit", exact: true }).click();
	await expect.poll(() => readStylesheetSource(page)).toBe(second);
	await expect(swatches).toHaveCount(2);

	await page.getByRole("button", { name: "Edit color #fff", exact: true }).click();
	await picker.getByRole("button", { name: "Use color rgba(21, 93, 252, 1)", exact: true }).click();
	await expect.poll(() => readStylesheetSource(page)).toBe(second.replace("#fff", "rgba(21, 93, 252, 1)"));
	await page.keyboard.press("Escape");
	await expect(trigger).toHaveCount(0);
	await expect(swatches).toHaveCount(2);
	await expect(page.getByRole("button", { name: "Edit color rgba(231, 0, 11, 1)", exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Edit color rgba(21, 93, 252, 1)", exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Open focus mode", exact: true }).click();
	await expect(page.getByRole("button", { name: "Edit color rgba(231, 0, 11, 1)", exact: true })).toBeInViewport();
	await expect(page.getByRole("button", { name: "Edit color rgba(21, 93, 252, 1)", exact: true })).toBeInViewport();
	await expect(page.getByText("Saved", { exact: true })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("color-picker-after-undo.png"), animations: "disabled" });
	expect(errors).toEqual([]);
});
