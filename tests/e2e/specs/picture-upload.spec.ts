import { createSampleResumeFromDashboard } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("uploads a large JPEG after cropping without exceeding the upload limit", async ({ authPage: page }, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);
	await expect(page.locator("#sidebar-picture")).toBeVisible();

	// A deterministic high-detail image: JPEG fits the upload limit, but re-encoding at higher quality does not.
	const dataUrl = await page.evaluate(() => {
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 4400;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas is unavailable");
		const pixels = context.createImageData(4400, 4400);
		let seed = 42;
		for (let i = 0; i < pixels.data.length; i += 4) {
			for (let channel = 0; channel < 3; channel++) {
				seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
				pixels.data[i + channel] = seed >>> 24;
			}
			pixels.data[i + 3] = 255;
		}
		context.putImageData(pixels, 0, 0);
		return canvas.toDataURL("image/jpeg", 0.65);
	});
	const buffer = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
	expect(buffer.byteLength).toBeLessThan(10 * 1024 * 1024);
	await page.locator('input[type="file"][aria-label="Upload picture"]').setInputFiles({
		name: "large-photo.jpg",
		mimeType: "image/jpeg",
		buffer,
	});
	const cropDialog = page.getByRole("dialog", { name: "Crop picture" });
	await expect(cropDialog.locator("img")).toBeVisible();
	await cropDialog.getByRole("button", { name: "Save & Upload" }).click();
	await expect(page.locator("#sidebar-picture input[name=url]")).toHaveValue(/\/uploads\//);
	await expect
		.poll(() => page.locator("#sidebar-picture img").evaluate((image: HTMLImageElement) => image.naturalWidth))
		.toBeGreaterThan(0);
});
