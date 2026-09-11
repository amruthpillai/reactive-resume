import type { Browser, BrowserContext, Page, TestInfo } from "@playwright/test";
import type {
	RasterGlyphEvidence as MarkerRasterGlyphEvidence,
	RasterGlyphMeasurement as MarkerRasterGlyphMeasurement,
} from "../fixtures/offline-font-markers";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { assertPdfDownloadReceived } from "../fixtures/offline-font-diagnostic";
import { classifyRasterMeasurements, locatePdfMarkerBoxes } from "../fixtures/offline-font-markers";
import { offlineFontScriptSamples, seedOfflineFontResume } from "../fixtures/offline-fonts";
import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

const diagnosticEnabled = process.env.OFFLINE_FONT_DIAGNOSTIC === "1";
const serverRestartFlag = process.env.OFFLINE_FONT_DIAGNOSTIC_SERVER_RESTARTED === "1";

type BlockedRequest = {
	hostname: string;
	path: string;
};

type ColdContext = {
	context: BrowserContext;
	blockedRequests: BlockedRequest[];
};

type PdfMarkers = Record<(typeof offlineFontScriptSamples)[number]["name"], boolean>;

type RasterGlyphEvidence = MarkerRasterGlyphEvidence<(typeof offlineFontScriptSamples)[number]["name"]>;
type RasterGlyphMeasurement = MarkerRasterGlyphMeasurement<(typeof offlineFontScriptSamples)[number]["name"]>;

type PdfRasterEvidence = {
	rasterDataUrl: string;
	textLayerMarkers: PdfMarkers;
	referenceGlyphs: RasterGlyphEvidence[];
	previewGlyphs: RasterGlyphEvidence[];
};

test.describe("offline font diagnostic", () => {
	test.describe.configure({ mode: "serial" });
	test.skip(!diagnosticEnabled, "Set OFFLINE_FONT_DIAGNOSTIC=1 to run network diagnostics.");
	test.setTimeout(120_000);

	async function createColdContext(browser: Browser, page: Page, testInfo: TestInfo): Promise<ColdContext> {
		const baseURL = String(testInfo.project.use.baseURL ?? "http://localhost:3000");
		const allowedOrigin = new URL(baseURL).origin;
		const context = await browser.newContext({
			baseURL,
			serviceWorkers: "block",
			storageState: await page.context().storageState(),
		});
		const blockedRequests: BlockedRequest[] = [];

		await context.route("**/*", async (route) => {
			const requestURL = new URL(route.request().url());
			if (requestURL.origin === allowedOrigin || requestURL.protocol === "data:" || requestURL.protocol === "blob:") {
				await route.continue();
				return;
			}

			blockedRequests.push({ hostname: requestURL.hostname, path: requestURL.pathname });
			await route.abort("blockedbyclient");
		});

		return { context, blockedRequests };
	}

	function extractedMarkerResult(text: string): PdfMarkers {
		return Object.fromEntries(
			offlineFontScriptSamples.map((sample) => [sample.name, text.includes(sample.marker)]),
		) as PdfMarkers;
	}

	function networkStatus(blockedRequests: BlockedRequest[]) {
		return blockedRequests.length > 0 ? "network-error" : "no-browser-network-error";
	}

	async function readPdfText(bytes: Uint8Array) {
		const loadingTask = getDocument({ data: bytes, useSystemFonts: false });
		try {
			const document = await loadingTask.promise;
			const pages: string[] = [];
			for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
				const pdfPage = await document.getPage(pageNumber);
				pages.push(
					(await pdfPage.getTextContent()).items.flatMap((item) => ("str" in item ? [item.str] : [])).join(""),
				);
			}
			return pages.join("\n");
		} finally {
			await loadingTask.destroy();
		}
	}

	async function capturePdfBytes(page: Page) {
		await page.addInitScript(() => {
			const read = Blob.prototype.arrayBuffer;
			Blob.prototype.arrayBuffer = async function () {
				const buffer = await read.call(this);
				const bytes = new Uint8Array(buffer);
				if (String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-") {
					(window as Window & { offlineFontPdfBytes?: number[] }).offlineFontPdfBytes = Array.from(bytes);
				}
				return buffer;
			};
		});
	}

	async function renderPdfRasterEvidence(page: Page, bytes: Uint8Array): Promise<PdfRasterEvidence> {
		const require = createRequire(`${process.cwd()}/package.json`);
		await page.route("**/__offline_font_pdfjs/*", async (route) => {
			const worker = new URL(route.request().url()).pathname.endsWith("worker.mjs");
			await route.fulfill({
				contentType: "text/javascript",
				path: require.resolve(`pdfjs-dist/legacy/build/${worker ? "pdf.worker.mjs" : "pdf.mjs"}`),
			});
		});

		const textEvidence = await page.evaluate(
			async ({ bytes }) => {
				const moduleUrl = `${location.origin}/__offline_font_pdfjs/pdf.mjs`;
				const pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs") = await import(moduleUrl);
				pdfjs.GlobalWorkerOptions.workerSrc = `${location.origin}/__offline_font_pdfjs/worker.mjs`;
				const loadingTask = pdfjs.getDocument({ data: Uint8Array.from(bytes), useSystemFonts: false });
				try {
					const pdfDocument = await loadingTask.promise;
					const pdfPage = await pdfDocument.getPage(1);
					const textContent = await pdfPage.getTextContent();
					return {
						pageHeight: pdfPage.getViewport({ scale: 1 }).height,
						textItems: textContent.items.flatMap((item) =>
							"str" in item
								? [
										{
											str: item.str,
											x: item.transform[4] ?? 0,
											y: item.transform[5] ?? 0,
											width: item.width,
											height: Math.max(item.height, Math.abs(item.transform[3] ?? 0), 1),
										},
									]
								: [],
						),
					};
				} finally {
					await loadingTask.destroy();
				}
			},
			{ bytes: Array.from(bytes) },
		);
		const boxes = locatePdfMarkerBoxes(textEvidence.textItems, offlineFontScriptSamples, textEvidence.pageHeight);
		const textLayerMarkers = extractedMarkerResult(textEvidence.textItems.map(({ str }) => str).join(""));

		const rasterEvidence = await page.evaluate(
			async ({ bytes, boxes }) => {
				const moduleUrl = `${location.origin}/__offline_font_pdfjs/pdf.mjs`;
				const pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs") = await import(moduleUrl);
				pdfjs.GlobalWorkerOptions.workerSrc = `${location.origin}/__offline_font_pdfjs/worker.mjs`;
				const loadingTask = pdfjs.getDocument({ data: Uint8Array.from(bytes), useSystemFonts: false });
				try {
					const pdfDocument = await loadingTask.promise;
					const pdfPage = await pdfDocument.getPage(1);
					const baseViewport = pdfPage.getViewport({ scale: 1 });
					const rasterScale = 4;
					const viewport = pdfPage.getViewport({ scale: rasterScale });
					const raster = globalThis.document.createElement("canvas");
					raster.width = Math.ceil(viewport.width);
					raster.height = Math.ceil(viewport.height);
					const rasterContext = raster.getContext("2d");
					if (!rasterContext) throw new Error("Missing PDF raster context.");
					await pdfPage.render({
						canvas: raster,
						canvasContext: rasterContext,
						viewport,
						annotationMode: pdfjs.AnnotationMode.DISABLE,
						background: "white",
					}).promise;

					function measure(canvas: HTMLCanvasElement, scale: number): RasterGlyphMeasurement[] {
						const context = canvas.getContext("2d");
						if (!context) throw new Error("Missing PDF preview raster context.");
						const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
						return boxes.map(({ name, box }) => {
							if (!box)
								return {
									name,
									located: false,
									inkPixels: 0,
									interiorInk: 0,
									trimmedWidth: 0,
									trimmedHeight: 0,
								};
							const markerLeft = box.x * scale;
							const markerTop = box.y * scale;
							const markerRight = (box.x + box.width) * scale;
							const markerBottom = (box.y + box.height) * scale;
							const padding = 2 * scale;
							const left = Math.max(0, Math.floor(box.x * scale - padding));
							const top = Math.max(0, Math.floor(box.y * scale - padding));
							const right = Math.min(canvas.width, Math.ceil((box.x + box.width) * scale + padding));
							const bottom = Math.min(canvas.height, Math.ceil((box.y + box.height) * scale + padding));
							let inkPixels = 0;
							let minX = right;
							let minY = bottom;
							let maxX = left;
							let maxY = top;
							for (let y = top; y < bottom; y += 1) {
								for (let x = left; x < right; x += 1) {
									// Scan with padding for antialiasing, but count ink only inside marker box.
									// Neighboring glyphs must never make blank/tofu marker evidence pass.
									if (x < markerLeft || x >= markerRight || y < markerTop || y >= markerBottom) continue;
									const index = (y * pixels.width + x) * 4;
									const red = pixels.data[index] ?? 255;
									const green = pixels.data[index + 1] ?? 255;
									const blue = pixels.data[index + 2] ?? 255;
									if (red >= 245 && green >= 245 && blue >= 245) continue;
									inkPixels += 1;
									minX = Math.min(minX, x);
									minY = Math.min(minY, y);
									maxX = Math.max(maxX, x);
									maxY = Math.max(maxY, y);
								}
							}
							if (inkPixels === 0) {
								return { name, located: true, inkPixels, interiorInk: 0, trimmedWidth: 0, trimmedHeight: 0 };
							}
							let interiorInk = 0;
							for (
								let y = minY + Math.floor((maxY - minY + 1) * 0.2);
								y < maxY - Math.floor((maxY - minY + 1) * 0.2);
								y += 1
							) {
								for (
									let x = minX + Math.floor((maxX - minX + 1) * 0.2);
									x < maxX - Math.floor((maxX - minX + 1) * 0.2);
									x += 1
								) {
									const index = (y * pixels.width + x) * 4;
									if (
										(pixels.data[index] ?? 255) < 245 ||
										(pixels.data[index + 1] ?? 255) < 245 ||
										(pixels.data[index + 2] ?? 255) < 245
									)
										interiorInk += 1;
								}
							}
							const trimmedWidth = maxX - minX + 1;
							const trimmedHeight = maxY - minY + 1;
							return { name, located: true, inkPixels, interiorInk, trimmedWidth, trimmedHeight };
						});
					}

					const preview = document.querySelector<HTMLCanvasElement>('[aria-hidden="false"] canvas');
					return {
						rasterDataUrl: raster.toDataURL(),
						referenceGlyphs: measure(raster, rasterScale),
						previewGlyphs: preview ? measure(preview, preview.width / baseViewport.width) : [],
					};
				} finally {
					await loadingTask.destroy();
				}
			},
			{ bytes: Array.from(bytes), boxes },
		);
		return {
			...rasterEvidence,
			referenceGlyphs: classifyRasterMeasurements(rasterEvidence.referenceGlyphs),
			previewGlyphs: classifyRasterMeasurements(rasterEvidence.previewGlyphs),
			textLayerMarkers,
		};
	}

	async function report(testInfo: TestInfo, name: string, reportData: Record<string, unknown>) {
		const body = JSON.stringify({
			version: 1,
			fixture: "offline-font-scripts-v1",
			surface: name,
			...reportData,
		});
		expect(body).not.toMatch(/https?:\/\/|[?&](token|secret|password|auth)=/i);
		await testInfo.attach(`${name}.json`, { body, contentType: "application/json" });
		console.log(`[offline-fonts] ${body}`);
	}

	test("captures cold font picker preview requests", async ({ browser, authPage: seedPage }, testInfo) => {
		await createSampleResumeFromDashboard(seedPage, testInfo);
		const fixture = await seedOfflineFontResume(seedPage);
		const cold = await createColdContext(browser, seedPage, testInfo);
		const page = await cold.context.newPage();
		try {
			await page.goto(fixture.builderURL);
			await openSidebarSection(page, "Typography");
			await page.getByRole("combobox").first().click();
			await expect(page.getByRole("option").first()).toBeVisible();
			await page.waitForTimeout(1_000);
			await report(testInfo, "picker-preview", {
				cache: "new-browser-context",
				blockedExternalFontRequests: cold.blockedRequests,
				networkStatus: networkStatus(cold.blockedRequests),
				glyphStatus: "not-applicable-picker-only",
			});
		} finally {
			await cold.context.close();
		}
	});

	test("captures cold builder PDF preview and classifies glyph/network results", async ({
		browser,
		authPage: seedPage,
	}, testInfo) => {
		await createSampleResumeFromDashboard(seedPage, testInfo);
		const fixture = await seedOfflineFontResume(seedPage);
		const cold = await createColdContext(browser, seedPage, testInfo);
		const page = await cold.context.newPage();
		await capturePdfBytes(page);
		try {
			await page.goto(fixture.builderURL);
			await page.waitForTimeout(5_000);
			const previewCanvas = page.locator('[aria-hidden="false"] canvas').first();
			const canvasVisible = await previewCanvas.isVisible().catch(() => false);
			const pdfBytes = await page.evaluate(
				() => (window as Window & { offlineFontPdfBytes?: number[] }).offlineFontPdfBytes,
			);
			expect(pdfBytes).toBeDefined();
			const rasterEvidence = pdfBytes ? await renderPdfRasterEvidence(page, Uint8Array.from(pdfBytes)) : null;
			if (rasterEvidence) {
				await testInfo.attach("builder-preview-raster.png", {
					body: Buffer.from(rasterEvidence.rasterDataUrl.split(",")[1] ?? "", "base64"),
					contentType: "image/png",
				});
				expect(rasterEvidence.previewGlyphs).toHaveLength(offlineFontScriptSamples.length);
				expect(rasterEvidence.previewGlyphs.every(({ status }) => status === "visible")).toBe(true);
			}
			expect(canvasVisible).toBe(true);
			await report(testInfo, "builder-preview", {
				cache: "new-browser-context",
				blockedExternalFontRequests: cold.blockedRequests,
				networkStatus: networkStatus(cold.blockedRequests),
				canvasVisible,
				textLayerMarkers: rasterEvidence?.textLayerMarkers ?? "not-extracted",
				glyphStatus: rasterEvidence?.previewGlyphs ?? "not-rasterized",
			});
		} finally {
			await cold.context.close();
		}
	});

	test("captures cold browser PDF download and classifies extracted glyphs", async ({
		browser,
		authPage: seedPage,
	}, testInfo) => {
		await createSampleResumeFromDashboard(seedPage, testInfo);
		const fixture = await seedOfflineFontResume(seedPage);
		const cold = await createColdContext(browser, seedPage, testInfo);
		const page = await cold.context.newPage();
		let markerResultValue: PdfMarkers | null = null;
		let rasterEvidence: PdfRasterEvidence | null = null;
		let downloadStatus = "not-started";
		let rasterEvidenceStatus = "not-attempted";
		try {
			await page.goto(fixture.builderURL);
			await openSidebarSection(page, "Export");
			await page.getByRole("button", { name: /Choose PDF, DOCX, Markdown, or JSON/ }).click();
			const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
			await page.getByRole("button", { name: "Download PDF", exact: true }).click();
			const download = await downloadPromise;
			downloadStatus = "received";
			const path = testInfo.outputPath("offline-font-browser-download.pdf");
			await download.saveAs(path);
			const bytes = new Uint8Array(await readFile(path));
			try {
				markerResultValue = extractedMarkerResult(await readPdfText(bytes));
				rasterEvidence = await renderPdfRasterEvidence(page, bytes);
				await testInfo.attach("browser-download-raster.png", {
					body: Buffer.from(rasterEvidence.rasterDataUrl.split(",")[1] ?? "", "base64"),
					contentType: "image/png",
				});
				rasterEvidenceStatus = "received";
			} catch {
				rasterEvidenceStatus = "unresolved-raster-evidence-error";
			}
		} catch {
			downloadStatus = "download-error";
		} finally {
			await report(testInfo, "browser-download", {
				cache: "new-browser-context",
				blockedExternalFontRequests: cold.blockedRequests,
				networkStatus: networkStatus(cold.blockedRequests),
				downloadStatus,
				rasterEvidenceStatus,
				textLayerMarkers: markerResultValue ?? "not-extracted",
				glyphStatus: rasterEvidence?.referenceGlyphs ?? "not-rasterized",
			});
			await cold.context.close();
		}
		assertPdfDownloadReceived(downloadStatus);
		expect(rasterEvidenceStatus).toBe("received");
		expect(rasterEvidence).not.toBeNull();
		if (!rasterEvidence) return;
		expect(rasterEvidence.referenceGlyphs).toHaveLength(offlineFontScriptSamples.length);
		expect(rasterEvidence.referenceGlyphs.every(({ status }) => status === "visible")).toBe(true);
	});

	test("exercises restarted-server PDF and records server observability boundary", async ({
		browser,
		authPage: seedPage,
	}, testInfo) => {
		await createSampleResumeFromDashboard(seedPage, testInfo);
		const fixture = await seedOfflineFontResume(seedPage);
		const cold = await createColdContext(browser, seedPage, testInfo);
		const page = await cold.context.newPage();
		let responseStatus = "not-requested";
		let markerResultValue: PdfMarkers | null = null;
		try {
			await page.goto(fixture.builderURL);
			if (!serverRestartFlag) {
				responseStatus = "blocked-before-request";
			} else {
				const response = await page.request.get(
					`/api/resumes/${encodeURIComponent(fixture.username)}/${encodeURIComponent(fixture.slug)}/pdf`,
				);
				responseStatus = String(response.status());
				if (response.ok()) {
					const bytes = await response.body();
					await writeFile(testInfo.outputPath("offline-font-server.pdf"), bytes);
					markerResultValue = extractedMarkerResult(await readPdfText(new Uint8Array(bytes)));
				}
			}
		} finally {
			await report(testInfo, "server-pdf", {
				cache: "new-browser-context; server-process-state-is-external",
				serverRestartFlag,
				serverGateStatus: "unresolved-external-host-level-blocker",
				blockedExternalFontRequests: cold.blockedRequests,
				networkStatus: "server-outbound-requests-unobservable-from-playwright",
				responseStatus,
				textLayerMarkers: markerResultValue ?? "not-extracted",
				glyphStatus: "not-rasterized-server-surface",
				limitation:
					"Server outbound request capture and verifiable restart identity remain unresolved external host-level blockers; the caller flag is not restart proof. Playwright route interception sees browser requests only; do not treat this run as a cold-network gate.",
			});
			await cold.context.close();
		}
	});
});
