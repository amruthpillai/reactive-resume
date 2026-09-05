import type { Page, TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Pool } from "pg";
import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

type MarkerBounds = {
	left: number;
	right: number;
	top: number;
	bottom: number;
	count: number;
};

type MarkerMetrics = Record<"red" | "green" | "blue" | "yellow", MarkerBounds | null>;

const requireRoot = createRequire(`${process.cwd()}/package.json`);

async function installPdfJsRoute(page: Page) {
	await page.route("**/__picture_pdfjs/*", async (route) => {
		const worker = new URL(route.request().url()).pathname.endsWith("worker.mjs");
		await route.fulfill({
			contentType: "text/javascript",
			path: requireRoot.resolve(`pdfjs-dist/legacy/build/${worker ? "pdf.worker.mjs" : "pdf.mjs"}`),
		});
	});
}

function markedLandscapePng(dataUrl: string) {
	return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
}

function createMarkedLandscape(page: Page) {
	return page.evaluate(() => {
		const canvas = document.createElement("canvas");
		canvas.width = 800;
		canvas.height = 600;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas is unavailable");
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, 800, 600);
		context.fillStyle = "#ff0000";
		context.fillRect(0, 0, 64, 600);
		context.fillStyle = "#00ff00";
		context.fillRect(736, 0, 64, 600);
		context.fillStyle = "#0000ff";
		context.fillRect(64, 0, 672, 48);
		context.fillStyle = "#ffff00";
		context.fillRect(64, 552, 672, 48);
		context.fillStyle = "#000000";
		context.fillRect(394, 48, 12, 504);
		context.fillRect(64, 294, 672, 12);
		return canvas.toDataURL("image/png");
	});
}

function markerMetricsFromPdf(page: Page, bytes: Uint8Array): Promise<MarkerMetrics> {
	return page.evaluate(async (pdfBytes) => {
		const pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs") = await import(
			`${location.origin}/__picture_pdfjs/pdf.mjs`
		);
		pdfjs.GlobalWorkerOptions.workerSrc = `${location.origin}/__picture_pdfjs/worker.mjs`;
		const task = pdfjs.getDocument({ data: Uint8Array.from(pdfBytes) });
		try {
			const pdfPage = await task.promise.then((pdf) => pdf.getPage(1));
			const viewport = pdfPage.getViewport({ scale: 1.5 });
			const canvas = document.createElement("canvas");
			canvas.width = Math.ceil(viewport.width);
			canvas.height = Math.ceil(viewport.height);
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Canvas is unavailable");
			await pdfPage.render({ canvas, canvasContext: context, viewport, background: "white" }).promise;
			const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
			const predicates = {
				red: (r: number, g: number, b: number) => r > 220 && g < 50 && b < 50,
				green: (r: number, g: number, b: number) => r < 50 && g > 220 && b < 50,
				blue: (r: number, g: number, b: number) => r < 50 && g < 50 && b > 220,
				yellow: (r: number, g: number, b: number) => r > 220 && g > 220 && b < 50,
			};
			const result = {} as Record<keyof typeof predicates, MarkerBounds | null>;
			for (const [name, predicate] of Object.entries(predicates) as Array<
				[keyof typeof predicates, (r: number, g: number, b: number) => boolean]
			>) {
				let left = Number.POSITIVE_INFINITY;
				let right = Number.NEGATIVE_INFINITY;
				let top = Number.POSITIVE_INFINITY;
				let bottom = Number.NEGATIVE_INFINITY;
				let count = 0;
				for (let index = 0; index < pixels.length; index += 4) {
					if (!predicate(pixels[index] ?? 0, pixels[index + 1] ?? 0, pixels[index + 2] ?? 0)) continue;
					const x = (index / 4) % canvas.width;
					const y = Math.floor(index / 4 / canvas.width);
					left = Math.min(left, x);
					right = Math.max(right, x);
					top = Math.min(top, y);
					bottom = Math.max(bottom, y);
					count++;
				}
				result[name] = count > 0 ? { left, right, top, bottom, count } : null;
			}
			return result;
		} finally {
			await task.destroy();
		}
	}, Array.from(bytes));
}

async function exportBuilderFile(page: Page, testInfo: TestInfo, buttonName: "Download JSON" | "Download PDF") {
	await openSidebarSection(page, "Export");
	await page.getByRole("button", { name: /Choose PDF, DOCX, Markdown, or JSON/ }).click();
	const pending = page.waitForEvent("download");
	await page.getByRole("button", { name: buttonName, exact: true }).click();
	const download = await pending;
	const path = testInfo.outputPath(download.suggestedFilename());
	await download.saveAs(path);
	await page.keyboard.press("Escape");
	return path;
}

test("uploads and persists full Contain image with browser/server PDF parity", async ({
	authPage: page,
	account,
}, info) => {
	test.setTimeout(120_000);
	await page.setViewportSize({ width: 1920, height: 950 });
	await installPdfJsRoute(page);
	await createSampleResumeFromDashboard(page, info);
	const resumeId = page.url().split("/").at(-1);
	if (!resumeId) throw new Error("Missing resume id");

	await openSidebarSection(page, "Picture");
	await page.getByRole("button", { name: "Contain", exact: true }).click();
	await expect(page.getByRole("button", { name: "Contain", exact: true })).toHaveAttribute("aria-pressed", "true");
	await page.getByRole("button", { name: "Undo", exact: true }).click();
	await expect(page.getByRole("button", { name: "Cover", exact: true })).toHaveAttribute("aria-pressed", "true");
	await page.getByRole("button", { name: "Redo", exact: true }).click();
	await expect(page.getByRole("button", { name: "Contain", exact: true })).toHaveAttribute("aria-pressed", "true");
	const dataUrl = await createMarkedLandscape(page);
	const inputBytes = markedLandscapePng(dataUrl);
	await info.attach("marked-landscape.png", { body: inputBytes, contentType: "image/png" });
	await page.locator('#sidebar-picture input[type="file"]').setInputFiles({
		name: "marked-landscape.png",
		mimeType: "image/png",
		buffer: inputBytes,
	});
	await expect(page.getByRole("dialog", { name: "Crop picture" })).toHaveCount(0);
	const pictureUrl = page.locator("#sidebar-picture input[name=url]");
	await expect(pictureUrl).toHaveValue(/\/uploads\//);
	const sidebarPreview = page.getByRole("button", { name: "Delete picture" }).locator("img");
	await expect(sidebarPreview).toBeVisible();
	await expect(sidebarPreview).toHaveCSS("object-fit", "contain");
	const storedUrl = await pictureUrl.inputValue();
	const storedRequestUrl = storedUrl.startsWith("/uploads/") ? `/api${storedUrl}` : storedUrl;
	const storedResponse = await page.request.get(storedRequestUrl);
	expect(storedResponse.ok()).toBe(true);
	expect(storedResponse.headers()["content-type"]).toMatch(/^image\//);
	const storedBytes = await storedResponse.body();
	await info.attach("stored-landscape", { body: storedBytes, contentType: storedResponse.headers()["content-type"] });
	const storedGeometry = await page.evaluate(async (url) => {
		const image = new Image();
		image.src = url;
		await image.decode();
		const canvas = document.createElement("canvas");
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas is unavailable");
		context.drawImage(image, 0, 0);
		const sample = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data.slice(0, 3)];
		return {
			width: image.naturalWidth,
			height: image.naturalHeight,
			left: sample(Math.floor(image.naturalWidth * 0.02), Math.floor(image.naturalHeight / 2)),
			right: sample(Math.floor(image.naturalWidth * 0.98), Math.floor(image.naturalHeight / 2)),
			top: sample(Math.floor(image.naturalWidth / 4), Math.floor(image.naturalHeight * 0.02)),
			bottom: sample(Math.floor(image.naturalWidth / 4), Math.floor(image.naturalHeight * 0.98)),
		};
	}, storedRequestUrl);
	expect(storedGeometry).toMatchObject({ width: 800, height: 600 });
	expect(storedGeometry.left[0]).toBeGreaterThan(220);
	expect(storedGeometry.left[1]).toBeLessThan(50);
	expect(storedGeometry.right[0]).toBeLessThan(50);
	expect(storedGeometry.right[1]).toBeGreaterThan(220);
	expect(storedGeometry.top[2]).toBeGreaterThan(220);
	expect(storedGeometry.bottom[0]).toBeGreaterThan(220);
	expect(storedGeometry.bottom[1]).toBeGreaterThan(220);

	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	let slug = "";
	try {
		await expect
			.poll(async () => {
				const result = await pool.query<{ data: { picture: { fit?: string; url?: string } }; slug: string }>(
					"select data, slug from resume where id = $1",
					[resumeId],
				);
				slug = result.rows[0]?.slug ?? "";
				return result.rows[0]?.data.picture;
			})
			.toMatchObject({ fit: "contain", url: storedUrl });

		await page.getByRole("button", { name: "Cover", exact: true }).click();
		await page.getByRole("button", { name: "Contain", exact: true }).click();
		expect(await pictureUrl.inputValue()).toBe(storedUrl);

		await page.reload();
		await openSidebarSection(page, "Picture");
		await expect(page.getByRole("button", { name: "Contain", exact: true })).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator("#sidebar-picture input[name=url]")).toHaveValue(storedUrl);

		await pool.query("update resume set is_public = true, updated_at = now() where id = $1", [resumeId]);
	} finally {
		await pool.end();
	}

	const jsonPath = await exportBuilderFile(page, info, "Download JSON");
	const exported = JSON.parse(await readFile(jsonPath, "utf8")) as { picture: { fit?: string; url?: string } };
	expect(exported.picture).toMatchObject({ fit: "contain", url: storedUrl });

	const browserPdfPath = await exportBuilderFile(page, info, "Download PDF");
	const browserPdf = new Uint8Array(await readFile(browserPdfPath));
	const serverResponse = await page.request.get(`/api/resumes/${account.username}/${slug}/pdf`);
	expect(serverResponse.ok()).toBe(true);
	const serverPdf = new Uint8Array(await serverResponse.body());
	const browserMarkers = await markerMetricsFromPdf(page, browserPdf);
	const serverMarkers = await markerMetricsFromPdf(page, serverPdf);
	for (const name of ["red", "green", "blue", "yellow"] as const) {
		expect(browserMarkers[name]?.count).toBeGreaterThan(100);
		expect(serverMarkers[name]?.count).toBeGreaterThan(100);
		expect(serverMarkers[name]).toEqual(browserMarkers[name]);
	}
	await info.attach("pdf-marker-metrics", {
		body: JSON.stringify({ browserMarkers, serverMarkers }),
		contentType: "application/json",
	});
});
