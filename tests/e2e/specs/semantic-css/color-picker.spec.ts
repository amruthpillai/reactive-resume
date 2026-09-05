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

	const first = source.replace("#f00", "#000000");
	await picker.getByRole("button", { name: "Use color rgba(0, 0, 0, 1)", exact: true }).click();
	await expect.poll(() => readStylesheetSource(page)).toBe(first);
	await expect(page.getByText("Presets", { exact: true })).toBeVisible();

	const second = source.replace("#f00", "#e7000b");
	await picker.getByRole("button", { name: "Use color rgba(231, 0, 11, 1)", exact: true }).click();
	await expect.poll(() => readStylesheetSource(page)).toBe(second);
	await expect(swatches).toHaveCount(2);
	await page.keyboard.press("Escape");
	await expect(page.getByText("Presets", { exact: true })).toHaveCount(0);
	await expect(trigger).toHaveCount(0);
	await page.getByRole("button", { name: "Edit color #e7000b", exact: true }).click();
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
	await expect.poll(() => readStylesheetSource(page)).toBe(second.replace("#fff", "#155dfc"));
	await page.keyboard.press("Escape");
	await expect(trigger).toHaveCount(0);
	await expect(swatches).toHaveCount(2);
	await expect(page.getByRole("button", { name: "Edit color #e7000b", exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Edit color #155dfc", exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Open focus mode", exact: true }).click();
	await expect(page.getByRole("button", { name: "Edit color #e7000b", exact: true })).toBeInViewport();
	await expect(page.getByRole("button", { name: "Edit color #155dfc", exact: true })).toBeInViewport();
	await expect(page.getByText("Saved", { exact: true })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("color-picker-after-undo.png"), animations: "disabled" });
	expect(errors).toEqual([]);
});

for (const inputColor of ["#FF000080", "red", "rgb(100% 0% 0% / 50%)"]) {
	test(`@semantic-css preserves alpha when editing ${inputColor} and reopening hex colors`, async ({
		authPage: page,
	}, testInfo) => {
		const resumeId = await createSemanticCssResume(page, testInfo);
		const source = `@version 1;\nsection { color: ${inputColor}; background-color: #fff; }`;
		await seedSemanticCssResume(page, resumeId, {
			stylesheet: { mode: "semantic", source: { languageVersion: 1, text: source } },
		});
		await page.getByRole("button", { name: `Edit color ${inputColor}`, exact: true }).click();
		const picker = page.getByRole("dialog").filter({ has: page.getByText("Presets", { exact: true }) });
		await expect(picker).toBeVisible();
		expect(await readStylesheetSource(page)).toBe(source);
		const alpha = picker.locator(".w-color-alpha:not(.w-color-hue)");
		const bounds = await alpha.boundingBox();
		if (!bounds) throw new Error("Missing alpha control");
		await alpha.click({ position: { x: 0, y: bounds.height / 2 } });
		await expect.poll(() => readStylesheetSource(page)).toBe(source.replace(inputColor, "#ff000000"));
		await page.keyboard.press("Escape");
		await page.getByRole("button", { name: "Edit color #ff000000", exact: true }).click();
		await expect(picker).toBeVisible();
		await alpha.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
		await expect
			.poll(async () => {
				const value = await readStylesheetSource(page);
				const match = value.match(/color: #ff0000([\da-f]{2});/);
				return match ? Number.parseInt(match[1] ?? "", 16) : -1;
			})
			.toBeGreaterThanOrEqual(127);
		const halfTransparent = await readStylesheetSource(page);
		// Browser pointer coordinates round to pixels; the midpoint can land on either adjacent alpha byte.
		expect(halfTransparent).toMatch(/color: #ff0000(?:7f|80);/);
		expect(halfTransparent).toContain("background-color: #fff;");
		await page.keyboard.press("Escape");
		await page.getByRole("button", { name: /^Edit color #ff0000(?:7f|80)$/ }).click();
		await expect(picker).toBeVisible();
		expect(await readStylesheetSource(page)).toBe(halfTransparent);
	});
}
