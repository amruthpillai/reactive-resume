import type { Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Pool } from "pg";
import { expect, test } from "../fixtures/test";

type PdfCaptureWindow = Window & { resumePdfBytes?: number[] };

async function capturePdfBytes(page: Page) {
	await page.addInitScript(() => {
		const read = Blob.prototype.arrayBuffer;
		Blob.prototype.arrayBuffer = async function () {
			const buffer = await read.call(this);
			const bytes = new Uint8Array(buffer);
			if (String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-") {
				(window as PdfCaptureWindow).resumePdfBytes = Array.from(bytes);
			}
			return buffer;
		};
	});
}

async function compareWithPdfReference(page: Page) {
	const require = createRequire(`${process.cwd()}/package.json`);
	await page.route("**/__pdf_reference/*", async (route) => {
		const worker = new URL(route.request().url()).pathname.endsWith("worker.mjs");
		await route.fulfill({
			contentType: "text/javascript",
			path: require.resolve(`pdfjs-dist/legacy/build/${worker ? "pdf.worker.mjs" : "pdf.mjs"}`),
		});
	});

	return page.evaluate(async () => {
		const canvas = document.querySelector<HTMLCanvasElement>('[aria-hidden="false"] canvas');
		const bytes = (window as PdfCaptureWindow).resumePdfBytes;
		if (!canvas || !bytes) throw new Error("Missing rendered preview or original PDF bytes");
		const actual = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height);
		if (!actual) throw new Error("Missing preview pixels");
		const moduleUrl = `${location.origin}/__pdf_reference/pdf.mjs`;
		const pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs") = await import(moduleUrl);
		pdfjs.GlobalWorkerOptions.workerSrc = `${location.origin}/__pdf_reference/worker.mjs`;
		const task = pdfjs.getDocument({ data: Uint8Array.from(bytes) });
		try {
			const pdf = await task.promise;
			const pdfPage = await pdf.getPage(1);
			const reference = document.createElement("canvas");
			reference.width = canvas.width;
			reference.height = canvas.height;
			// Match inherited font rasterization styles as well as the original bitmap size.
			canvas.parentElement?.append(reference);
			const context = reference.getContext("2d");
			if (!context) throw new Error("Missing reference context");
			// PDF coordinates are physical. Reference must not inherit the interface's text direction.
			context.direction = "ltr";
			await pdfPage.render({
				canvas: reference,
				canvasContext: context,
				viewport: pdfPage.getViewport({ scale: 1 }),
				transform: [4, 0, 0, 4, 0, 0],
				annotationMode: pdfjs.AnnotationMode.DISABLE,
				background: "white",
			}).promise;
			const expected = context.getImageData(0, 0, reference.width, reference.height);
			reference.remove();
			let differentPixels = 0;
			let inkPixels = 0;
			for (let i = 0; i < actual.data.length; i += 4) {
				if (expected.data[i] !== 255 || expected.data[i + 1] !== 255 || expected.data[i + 2] !== 255) inkPixels++;
				if (
					actual.data[i] !== expected.data[i] ||
					actual.data[i + 1] !== expected.data[i + 1] ||
					actual.data[i + 2] !== expected.data[i + 2] ||
					actual.data[i + 3] !== expected.data[i + 3]
				) {
					differentPixels++;
				}
			}
			return {
				differentPixels,
				actualPng: canvas.toDataURL(),
				referencePng: reference.toDataURL(),
				inkPixels,
				pageDirection: canvas.closest("[dir]")?.getAttribute("dir"),
				uiDirection: document.documentElement.dir,
			};
		} finally {
			await task.destroy();
		}
	});
}

for (const uiLanguage of ["English", "Arabic"]) {
	for (const resumeLocale of ["en-US", "ar-SA"]) {
		test(`preserves PDF glyph pixels with ${uiLanguage} UI and ${resumeLocale} resume`, async ({
			authPage: page,
		}, info) => {
			test.setTimeout(60_000);
			await page.setViewportSize({ width: 1920, height: 950 });
			await capturePdfBytes(page);
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
					`update resume set data = jsonb_set(jsonb_set(jsonb_set(data, '{metadata,page,locale}', $2::jsonb), '{basics,name}', '"Preview direction fixture"'::jsonb), '{basics,headline}', '"Software مهندس Engineer"'::jsonb) where id = $1`,
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
			await expect(page.locator('[aria-hidden="false"] canvas').first()).toBeVisible();
			const result = await compareWithPdfReference(page);
			const { actualPng, referencePng, ...metrics } = result;
			await writeFile(
				info.outputPath("actual.png"),
				Buffer.from(actualPng.slice(actualPng.indexOf(",") + 1), "base64"),
			);
			await writeFile(
				info.outputPath("reference.png"),
				Buffer.from(referencePng.slice(referencePng.indexOf(",") + 1), "base64"),
			);
			await info.attach("raster-comparison", { body: JSON.stringify(metrics), contentType: "application/json" });
			expect(result.inkPixels).toBeGreaterThan(1000);
			expect(result.uiDirection).toBe(uiLanguage === "Arabic" ? "rtl" : "ltr");
			expect(result.pageDirection).toBe(resumeLocale === "ar-SA" ? "rtl" : "ltr");
			expect(result.differentPixels).toBe(0);
		});
	}
}
