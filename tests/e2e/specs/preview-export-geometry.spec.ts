import type { Page, TestInfo } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { Pool } from "pg";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { generateFilename } from "@reactive-resume/utils/file";
import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

type CapturedPdfWindow = Window & { resumePdfBytes?: number[] };

type GeometryScenario = {
	format: "a4" | "letter" | "free-form";
	marginY: number;
	overflow: boolean;
};

type PdfPageGeometry = {
	mediaBox: { height: number; width: number };
	inkBounds: { bottomY: number; topY: number } | null;
	sentinels: Record<string, { bottomY: number; topY: number }>;
	text: string;
};

type PdfGeometry = {
	pages: PdfPageGeometry[];
	pageCount: number;
};

type PreviewPageGeometry = {
	canvas: { cssHeight: number; cssWidth: number; height: number; width: number };
	canvasRect: { height: number; width: number; x: number; y: number };
	wrapper: { clientHeight: number; clientWidth: number; height: number; width: number; x: number; y: number };
};

type PreviewGeometry = {
	devicePixelRatio: number;
	pages: PreviewPageGeometry[];
	transform: { matrix: string; scaleX: number; scaleY: number };
	viewportClip: {
		clientHeight: number;
		clientWidth: number;
		height: number;
		scrollHeight: number;
		scrollWidth: number;
		overflowX: string;
		overflowY: string;
		width: number;
		x: number;
		y: number;
	};
	viewport: { height: number; width: number };
};

type PersistedFixture = {
	data: ReturnType<typeof createFixture>;
	revision: string;
};

const FORMATS: GeometryScenario["format"][] = ["a4", "letter", "free-form"];
const MARGINS = [defaultResumeData.metadata.page.marginY, 15];
const SCENARIOS: GeometryScenario[] = FORMATS.flatMap((format) =>
	MARGINS.flatMap((marginY) => [
		{ format, marginY, overflow: false },
		{ format, marginY, overflow: true },
	]),
);

// Policy: PDF coordinates allow 0.05pt layout rounding; raster comparisons allow a 32-level
// per-channel antialiasing delta and at most 2% (capped at 200,000) mismatching pixels per page.
// Page count, ink presence, sentinels, and export target remain strict.
const PDF_COORDINATE_TOLERANCE = 0.05;
const DOM_LAYOUT_TOLERANCE = 1;
const TRANSFORM_SCALE_TOLERANCE = 0.005;
const RASTER_CHANNEL_TOLERANCE = 32;
const RASTER_MISMATCH_RATIO_LIMIT = 0.02;
const RASTER_MISMATCH_PIXEL_LIMIT = 200_000;
const GEOMETRY_E2E_OPT_IN = "PREVIEW_EXPORT_GEOMETRY_E2E";
const DISPOSABLE_DATABASE_NAME = "reactive_resume_preview_export_geometry_e2e";
const geometryE2eOptedIn = process.env[GEOMETRY_E2E_OPT_IN] === "1";

const requirePdf = createRequire(`${process.cwd()}/packages/pdf/package.json`);
const requireWeb = createRequire(`${process.cwd()}/apps/web/package.json`);
const { createCanvas } = requirePdf("@napi-rs/canvas") as {
	createCanvas: (
		width: number,
		height: number,
	) => {
		getContext: (type: "2d") => {
			getImageData: (x: number, y: number, width: number, height: number) => { data: Uint8ClampedArray };
		};
	};
};

function dedicatedDatabaseUrl() {
	const value = process.env.DATABASE_URL;
	if (!value) throw new Error("DATABASE_URL is required for preview/export geometry E2E.");
	if (process.env[GEOMETRY_E2E_OPT_IN] !== "1") {
		throw new Error(
			`Refusing preview/export geometry E2E: set ${GEOMETRY_E2E_OPT_IN}=1 to opt in; this suite mutates and deletes fixture data.`,
		);
	}

	const url = new URL(value);
	if (
		!["localhost", "127.0.0.1"].includes(url.hostname) ||
		url.port !== "55432" ||
		decodeURIComponent(url.pathname.slice(1)) !== DISPOSABLE_DATABASE_NAME
	) {
		throw new Error(
			`Refusing preview/export geometry E2E: DATABASE_URL must be loopback port 55432 database ${DISPOSABLE_DATABASE_NAME}.`,
		);
	}

	return value;
}

function scenarioName(scenario: GeometryScenario) {
	return `GEOMETRY_${scenario.format.toUpperCase()}_M${scenario.marginY}_${scenario.overflow ? "OVERFLOW" : "FIT"}`;
}

function createFixture(scenario: GeometryScenario) {
	const data = structuredClone(defaultResumeData);
	const name = scenarioName(scenario);
	const paragraphs = scenario.overflow ? 40 : 4;

	data.picture.hidden = true;
	data.picture.url = "";
	data.basics.name = name;
	data.basics.headline = "Synthetic Helvetica geometry fixture";
	data.basics.email = "";
	data.basics.phone = "";
	data.basics.location = "";
	data.basics.website = { url: "", label: "" };
	data.basics.customFields = [];
	data.summary.title = "Geometry";
	data.summary.content = [
		"<p>TOP_SENTINEL</p>",
		...Array.from(
			{ length: paragraphs },
			(_, index) => `<p>Geometry line ${index + 1}: deterministic Helvetica content for page measurements.</p>`,
		),
		"<p>BOTTOM_SENTINEL</p>",
	].join("");
	data.sections = structuredClone(defaultResumeData.sections);
	data.metadata.template = "rhyhorn";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.metadata.page = {
		...data.metadata.page,
		format: scenario.format,
		marginY: scenario.marginY,
	};
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.notes = `preview-export-geometry:${name}`;

	return data;
}

async function updateFixture(resumeId: string, data: ReturnType<typeof createFixture>): Promise<PersistedFixture> {
	const pool = new Pool({ connectionString: dedicatedDatabaseUrl() });
	try {
		const before = await pool.query<{ revision: string }>(
			'select updated_at::text as revision from "resume" where id = $1',
			[resumeId],
		);
		const previousRevision = before.rows[0]?.revision;
		await pool.query('update "resume" set data = $2, updated_at = now() where id = $1', [resumeId, data]);
		const result = await pool.query<{ data: ReturnType<typeof createFixture>; revision: string }>(
			'select data, updated_at::text as revision from "resume" where id = $1',
			[resumeId],
		);
		const persisted = result.rows[0];
		if (!persisted) throw new Error("Synthetic geometry fixture row disappeared during persistence.");
		expect(persisted.data, "Synthetic geometry fixture full source JSON").toEqual(data);
		if (!persisted.revision || persisted.revision === previousRevision) {
			throw new Error("Synthetic geometry fixture revision did not advance.");
		}
		return persisted;
	} finally {
		await pool.end();
	}
}

async function readPersistedFixture(resumeId: string): Promise<PersistedFixture> {
	const pool = new Pool({ connectionString: dedicatedDatabaseUrl() });
	try {
		const result = await pool.query<{ data: ReturnType<typeof createFixture>; revision: string }>(
			'select data, updated_at::text as revision from "resume" where id = $1',
			[resumeId],
		);
		const persisted = result.rows[0];
		if (!persisted) throw new Error("Synthetic geometry fixture row is missing.");
		return persisted;
	} finally {
		await pool.end();
	}
}

async function installPreviewCapture(page: Page) {
	await page.addInitScript(() => {
		(window as CapturedPdfWindow).resumePdfBytes = undefined;
		const originalArrayBuffer = Blob.prototype.arrayBuffer;
		Blob.prototype.arrayBuffer = async function () {
			const buffer = await originalArrayBuffer.call(this);
			const bytes = new Uint8Array(buffer);
			if (String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-") {
				(window as CapturedPdfWindow).resumePdfBytes = Array.from(bytes);
			}
			return buffer;
		};
	});

	await page.route("**/__pdf_reference/*", async (route) => {
		const worker = new URL(route.request().url()).pathname.endsWith("worker.mjs");
		await route.fulfill({
			contentType: "text/javascript",
			path: requireWeb.resolve(`pdfjs-dist/legacy/build/${worker ? "pdf.worker.mjs" : "pdf.mjs"}`),
		});
	});
}

async function inspectPdf(bytes: Uint8Array): Promise<PdfGeometry> {
	const loading = getDocument({ data: bytes.slice(), useSystemFonts: true });
	try {
		const document = await loading.promise;
		const pages: PdfPageGeometry[] = [];
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
			const page = await document.getPage(pageNumber);
			const viewport = page.getViewport({ scale: 1 });
			const content = await page.getTextContent();
			const sentinels: PdfPageGeometry["sentinels"] = {};
			for (const item of content.items) {
				if (!("str" in item) || !(item.str.includes("TOP_SENTINEL") || item.str.includes("BOTTOM_SENTINEL"))) continue;
				const topY = viewport.height - item.transform[5] - item.height;
				const bottomY = viewport.height - item.transform[5];
				if (item.str.includes("TOP_SENTINEL")) sentinels.TOP_SENTINEL = { bottomY, topY };
				if (item.str.includes("BOTTOM_SENTINEL")) sentinels.BOTTOM_SENTINEL = { bottomY, topY };
			}

			const width = Math.ceil(viewport.width);
			const height = Math.ceil(viewport.height);
			const canvas = createCanvas(width, height);
			const context = canvas.getContext("2d");
			await page.render({
				canvas: canvas as unknown as HTMLCanvasElement,
				canvasContext: context as unknown as CanvasRenderingContext2D,
				viewport,
				background: "white",
			}).promise;
			const pixels = context.getImageData(0, 0, width, height).data;
			let topY = height;
			let bottomY = -1;
			for (let y = 0; y < height; y += 1) {
				for (let x = 0; x < width; x += 1) {
					const offset = (y * width + x) * 4;
					if (
						(pixels[offset] ?? 255) >= 245 &&
						(pixels[offset + 1] ?? 255) >= 245 &&
						(pixels[offset + 2] ?? 255) >= 245
					) {
						continue;
					}
					topY = Math.min(topY, y);
					bottomY = Math.max(bottomY, y);
				}
			}

			pages.push({
				mediaBox: { width: viewport.width, height: viewport.height },
				inkBounds: bottomY >= 0 ? { bottomY, topY } : null,
				sentinels,
				text: content.items.flatMap((item) => ("str" in item ? [item.str] : [])).join(" "),
			});
			page.cleanup();
		}
		return { pages, pageCount: document.numPages };
	} finally {
		await loading.destroy();
	}
}

function assertPdfSurface(pdf: PdfGeometry, expectedText: string, label: string) {
	expect(pdf.pageCount, `${label}: page count`).toBeGreaterThan(0);
	expect(pdf.pages, `${label}: page list`).toHaveLength(pdf.pageCount);
	expect(
		pdf.pages.some((page) => page.text.includes(expectedText)),
		`${label}: fixture text`,
	).toBe(true);
	expect(
		pdf.pages.some((page) => page.sentinels.TOP_SENTINEL),
		`${label}: TOP_SENTINEL presence`,
	).toBe(true);
	expect(
		pdf.pages.some((page) => page.sentinels.BOTTOM_SENTINEL),
		`${label}: BOTTOM_SENTINEL presence`,
	).toBe(true);
	for (const [index, page] of pdf.pages.entries()) {
		expect(page.inkBounds, `${label}: page ${index + 1} must contain ink`).not.toBeNull();
	}
}

async function capturePreviewBytes(page: Page, expectedText: string) {
	let bytes: Uint8Array | undefined;
	let geometry: PdfGeometry | undefined;
	for (let attempt = 0; attempt < 80; attempt += 1) {
		const captured = await page.evaluate(() => (window as CapturedPdfWindow).resumePdfBytes);
		if (captured) {
			const candidate = Uint8Array.from(captured);
			const candidateGeometry = await inspectPdf(candidate);
			if (candidateGeometry.pages.some((entry) => entry.text.includes(expectedText))) {
				bytes = candidate;
				geometry = candidateGeometry;
				break;
			}
		}
		await page.waitForTimeout(250);
	}
	if (!bytes || !geometry) throw new Error(`Active preview PDF did not settle on ${expectedText}.`);
	assertPdfSurface(geometry, expectedText, "Active preview PDF");
	return { bytes, geometry };
}

async function waitForStablePreview(page: Page, expectedZoom: number) {
	await page.waitForFunction(
		({ expectedZoom: targetZoom }) => {
			const wrapper = document.querySelector<HTMLElement>(".react-transform-wrapper");
			const content = document.querySelector<HTMLElement>(".react-transform-component");
			const active = document.querySelector<HTMLElement>(
				'[aria-hidden="false"][data-resume-preview-template="rhyhorn"]',
			);
			const canvases = [...(active?.querySelectorAll<HTMLCanvasElement>('canvas[aria-label^="Resume page"]') ?? [])];
			if (!wrapper || !content || canvases.length === 0) return false;

			const transform = getComputedStyle(content).transform;
			const matrix = transform === "none" ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform);
			const signature = JSON.stringify([
				matrix.a,
				matrix.b,
				matrix.c,
				matrix.d,
				matrix.e,
				matrix.f,
				...canvases.flatMap((canvas) => {
					const rect = canvas.getBoundingClientRect();
					return [rect.x, rect.y, rect.width, rect.height, canvas.width, canvas.height, canvas.toDataURL("image/png")];
				}),
			]);
			const stateKey = "__previewGeometryStability";
			const previous = (window as unknown as Record<string, unknown>)[stateKey] as
				| { count: number; signature: string }
				| undefined;
			const count = previous?.signature === signature ? previous.count + 1 : 1;
			(window as unknown as Record<string, unknown>)[stateKey] = { count, signature };

			return (
				Math.abs(matrix.a - targetZoom) < 0.005 &&
				Math.abs(matrix.d - targetZoom) < 0.005 &&
				matrix.b === 0 &&
				matrix.c === 0 &&
				wrapper.clientWidth > 0 &&
				wrapper.clientHeight > 0 &&
				count >= 3
			);
		},
		{ expectedZoom },
		{ polling: "raf", timeout: 15_000 },
	);
}

function capturePreviewGeometry(page: Page): Promise<PreviewGeometry> {
	return page.evaluate(() => {
		const active = document.querySelector<HTMLElement>('[aria-hidden="false"][data-resume-preview-template="rhyhorn"]');
		if (!active) throw new Error("Missing active Rhyhorn preview layer.");
		const viewportElement = document.querySelector<HTMLElement>(".react-transform-wrapper");
		const transformElement = document.querySelector<HTMLElement>(".react-transform-component");
		if (!viewportElement || !transformElement || !viewportElement.contains(active)) {
			throw new Error("Missing preview transform wrapper or clipped active layer.");
		}
		const viewportRect = viewportElement.getBoundingClientRect();
		const transform = getComputedStyle(transformElement).transform;
		const matrix = transform === "none" ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform);
		const pages = [...active.querySelectorAll<HTMLCanvasElement>('canvas[aria-label^="Resume page"]')].map((canvas) => {
			const wrapper = canvas.parentElement;
			if (!wrapper) throw new Error("Missing preview canvas wrapper.");
			const canvasRect = canvas.getBoundingClientRect();
			const wrapperRect = wrapper.getBoundingClientRect();
			return {
				canvas: {
					cssHeight: Number.parseFloat(canvas.style.height),
					cssWidth: Number.parseFloat(canvas.style.width),
					height: canvas.height,
					width: canvas.width,
				},
				canvasRect: { height: canvasRect.height, width: canvasRect.width, x: canvasRect.x, y: canvasRect.y },
				wrapper: {
					clientHeight: wrapper.clientHeight,
					clientWidth: wrapper.clientWidth,
					height: wrapperRect.height,
					width: wrapperRect.width,
					x: wrapperRect.x,
					y: wrapperRect.y,
				},
			};
		});
		if (pages.length === 0) throw new Error("Missing active preview canvases.");
		return {
			devicePixelRatio: window.devicePixelRatio,
			pages,
			transform: { matrix: transform, scaleX: matrix.a, scaleY: matrix.d },
			viewportClip: {
				clientHeight: viewportElement.clientHeight,
				clientWidth: viewportElement.clientWidth,
				height: viewportRect.height,
				scrollHeight: viewportElement.scrollHeight,
				scrollWidth: viewportElement.scrollWidth,
				overflowX: getComputedStyle(viewportElement).overflowX,
				overflowY: getComputedStyle(viewportElement).overflowY,
				width: viewportRect.width,
				x: viewportRect.x,
				y: viewportRect.y,
			},
			viewport: { height: window.innerHeight, width: window.innerWidth },
		};
	});
}

function comparePreviewToPdf(page: Page, bytes: Uint8Array) {
	return page.evaluate(
		async ({ channelTolerance, serializedBytes }) => {
			const active = document.querySelector<HTMLElement>(
				'[aria-hidden="false"][data-resume-preview-template="rhyhorn"]',
			);
			const canvases = [...(active?.querySelectorAll<HTMLCanvasElement>('canvas[aria-label^="Resume page"]') ?? [])];
			if (canvases.length === 0) throw new Error("Missing active preview canvases for pixel comparison.");
			const moduleUrl = `${location.origin}/__pdf_reference/pdf.mjs`;
			const pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs") = await import(moduleUrl);
			pdfjs.GlobalWorkerOptions.workerSrc = `${location.origin}/__pdf_reference/worker.mjs`;
			const task = pdfjs.getDocument({ data: Uint8Array.from(serializedBytes) });
			try {
				const pdfDocument = await task.promise;
				if (pdfDocument.numPages !== canvases.length) throw new Error("Preview and downloaded PDF page counts differ.");
				const pages = [];
				for (const [index, canvas] of canvases.entries()) {
					const actual = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height);
					if (!actual) throw new Error("Missing active preview pixels.");
					const pdfPage = await pdfDocument.getPage(index + 1);
					const baseViewport = pdfPage.getViewport({ scale: 1 });
					const renderScale = canvas.width / baseViewport.width;
					if (!Number.isFinite(renderScale) || renderScale <= 0) throw new Error("Missing preview render scale.");
					const reference = globalThis.document.createElement("canvas");
					reference.width = canvas.width;
					reference.height = canvas.height;
					canvas.parentElement?.append(reference);
					const context = reference.getContext("2d");
					if (!context) throw new Error("Missing reference canvas context.");
					context.direction = "ltr";
					await pdfPage.render({
						canvas: reference,
						canvasContext: context,
						viewport: baseViewport,
						transform: [renderScale, 0, 0, renderScale, 0, 0],
						annotationMode: pdfjs.AnnotationMode.DISABLE,
						background: "white",
					}).promise;
					const expected = context.getImageData(0, 0, reference.width, reference.height);
					let differentPixels = 0;
					let maxChannelDelta = 0;
					for (let offset = 0; offset < actual.data.length; offset += 4) {
						const redDelta = Math.abs(actual.data[offset] - expected.data[offset]);
						const greenDelta = Math.abs(actual.data[offset + 1] - expected.data[offset + 1]);
						const blueDelta = Math.abs(actual.data[offset + 2] - expected.data[offset + 2]);
						const alphaDelta = Math.abs(actual.data[offset + 3] - expected.data[offset + 3]);
						const channelDelta = Math.max(redDelta, greenDelta, blueDelta, alphaDelta);
						maxChannelDelta = Math.max(maxChannelDelta, channelDelta);
						if (channelDelta > channelTolerance) {
							differentPixels += 1;
						}
					}
					pages.push({
						differentPixels,
						differentPixelRatio: differentPixels / (canvas.width * canvas.height),
						height: canvas.height,
						maxChannelDelta,
						width: canvas.width,
					});
					reference.remove();
					pdfPage.cleanup();
				}
				return {
					pages,
				};
			} finally {
				await task.destroy();
			}
		},
		{ channelTolerance: RASTER_CHANNEL_TOLERANCE, serializedBytes: Array.from(bytes) },
	);
}

function expectSamePdfGeometry(preview: PdfGeometry, downloaded: PdfGeometry, label: string) {
	const expectWithinTolerance = (actual: number, expected: number, message: string) => {
		expect(Math.abs(actual - expected), message).toBeLessThanOrEqual(PDF_COORDINATE_TOLERANCE);
	};

	expect(downloaded.pageCount, `${label}: page count`).toBe(preview.pageCount);
	for (const [index, previewPage] of preview.pages.entries()) {
		const downloadedPage = downloaded.pages[index];
		expect(downloadedPage, `${label}: page ${index + 1}`).toBeDefined();
		if (!downloadedPage) continue;
		expectWithinTolerance(
			downloadedPage.mediaBox.width,
			previewPage.mediaBox.width,
			`${label}: page ${index + 1} width`,
		);
		expectWithinTolerance(
			downloadedPage.mediaBox.height,
			previewPage.mediaBox.height,
			`${label}: page ${index + 1} height`,
		);
		expect(downloadedPage.inkBounds, `${label}: page ${index + 1} ink`).not.toBeNull();
		expect(previewPage.inkBounds, `${label}: preview page ${index + 1} ink`).not.toBeNull();
		for (const sentinel of ["TOP_SENTINEL", "BOTTOM_SENTINEL"]) {
			const expected = previewPage.sentinels[sentinel];
			const actual = downloadedPage.sentinels[sentinel];
			expect(Boolean(actual), `${label}: page ${index + 1} ${sentinel} presence`).toBe(Boolean(expected));
			if (!expected || !actual) continue;
			expectWithinTolerance(actual.bottomY, expected.bottomY, `${label}: page ${index + 1} ${sentinel} bottom`);
			expectWithinTolerance(actual.topY, expected.topY, `${label}: page ${index + 1} ${sentinel} top`);
		}
		if (previewPage.inkBounds && downloadedPage.inkBounds) {
			expectWithinTolerance(
				downloadedPage.inkBounds.bottomY,
				previewPage.inkBounds.bottomY,
				`${label}: page ${index + 1} ink bottom`,
			);
			expectWithinTolerance(
				downloadedPage.inkBounds.topY,
				previewPage.inkBounds.topY,
				`${label}: page ${index + 1} ink top`,
			);
		}
	}
}

async function setZoom(page: Page, zoom: 75 | 100 | 115) {
	const zoomLevel = page.getByRole("button", { name: "Zoom level", exact: true });
	if (zoom === 75) {
		await expect(zoomLevel).toHaveText("75%");
		return;
	}
	if (zoom === 100) {
		await zoomLevel.click();
		await page.getByRole("menuitem", { name: "Actual size (100%)", exact: true }).click();
		await expect(zoomLevel).toHaveText("100%");
		return;
	}
	await setZoom(page, 100);
	await page.getByRole("button", { name: "Zoom in", exact: true }).click();
	await expect(zoomLevel).toHaveText("115%");
}

async function runGeometryMatrix(page: Page, testInfo: TestInfo, scenarios: GeometryScenario[], expectedDpr: number) {
	dedicatedDatabaseUrl();
	await page.setViewportSize({ width: 1920, height: 1000 });
	await installPreviewCapture(page);
	const resumeName = await createSampleResumeFromDashboard(page, testInfo);
	const expectedExportFilename = generateFilename(resumeName, "pdf");
	const resumeId = new URL(page.url()).pathname.match(/^\/builder\/([^/]+)/)?.[1];
	if (!resumeId) throw new Error("Missing synthetic geometry resume id.");

	for (const scenario of scenarios) {
		const data = createFixture(scenario);
		const persistedFixture = await updateFixture(resumeId, data);
		const sourcePath = testInfo.outputPath(`${scenarioName(scenario)}.source.json`);
		await writeFile(sourcePath, JSON.stringify(data, null, 2));
		await page.goto(`/builder/${resumeId}`);
		await expect(page.locator('section[aria-label="Resume content"]')).toContainText(scenarioName(scenario));
		const { bytes: previewBytes, geometry: previewPdf } = await capturePreviewBytes(page, scenarioName(scenario));
		const loadedFixture = await readPersistedFixture(resumeId);
		expect(loadedFixture.data, `${scenarioName(scenario)} full source JSON`).toEqual(data);
		expect(loadedFixture.revision, `${scenarioName(scenario)} source revision`).toBe(persistedFixture.revision);
		await writeFile(testInfo.outputPath(`${scenarioName(scenario)}.preview.pdf`), previewBytes);
		const zoomReports: Array<{ previewGeometry: PreviewGeometry; downloadedPdf: PdfGeometry; zoom: number }> = [];

		for (const zoom of [75, 100, 115] as const) {
			await setZoom(page, zoom);
			await waitForStablePreview(page, zoom / 100);
			const previewGeometry = await capturePreviewGeometry(page);
			expect(previewGeometry.devicePixelRatio).toBe(expectedDpr);
			expect(previewGeometry.viewport).toEqual({ height: 1000, width: 1920 });
			expect(previewGeometry.viewportClip.clientWidth).toBe(1920);
			expect(previewGeometry.viewportClip.clientHeight).toBe(1000);
			expect(previewGeometry.viewportClip.overflowX).toBe("hidden");
			expect(previewGeometry.viewportClip.overflowY).toBe("hidden");
			expect(previewGeometry.viewportClip.scrollWidth).toBeGreaterThanOrEqual(1920);
			expect(previewGeometry.viewportClip.scrollHeight).toBeGreaterThanOrEqual(1000);
			expect(Math.abs(previewGeometry.transform.scaleX - zoom / 100)).toBeLessThanOrEqual(TRANSFORM_SCALE_TOLERANCE);
			expect(Math.abs(previewGeometry.transform.scaleY - zoom / 100)).toBeLessThanOrEqual(TRANSFORM_SCALE_TOLERANCE);
			expect(previewGeometry.transform.matrix).toMatch(/^matrix/);
			const currentFixture = await readPersistedFixture(resumeId);
			expect(currentFixture.data, `${scenarioName(scenario)} zoom ${zoom} persisted source JSON`).toEqual(data);
			expect(currentFixture.revision, `${scenarioName(scenario)} zoom ${zoom} persisted source revision`).toBe(
				persistedFixture.revision,
			);
			const pending = page.waitForEvent("download");
			await openSidebarSection(page, "Export");
			await page.getByRole("button", { name: "Choose PDF, DOCX, Markdown, or JSON" }).click();
			await expect(page.getByRole("tab", { name: "Resume", exact: true })).toHaveAttribute("aria-selected", "true");
			await page.getByRole("button", { name: "Download PDF", exact: true }).click();
			const download = await pending;
			expect(download.suggestedFilename(), `${scenarioName(scenario)} zoom ${zoom} export target`).toBe(
				expectedExportFilename,
			);
			const downloadPath = testInfo.outputPath(`${scenarioName(scenario)}.zoom-${zoom}.pdf`);
			await download.saveAs(downloadPath);
			const downloadBytes = new Uint8Array(await readFile(downloadPath));
			const downloadedPdf = await inspectPdf(downloadBytes);
			assertPdfSurface(downloadedPdf, scenarioName(scenario), `${scenarioName(scenario)} downloaded PDF`);
			expectSamePdfGeometry(previewPdf, downloadedPdf, `${scenarioName(scenario)} zoom ${zoom}`);
			const sourcePixelDiff = await comparePreviewToPdf(page, previewBytes);
			const pixelDiff = await comparePreviewToPdf(page, downloadBytes);
			await writeFile(
				testInfo.outputPath(`${scenarioName(scenario)}.zoom-${zoom}.pixel-diff.json`),
				JSON.stringify({ downloaded: pixelDiff.pages, preview: sourcePixelDiff.pages }, null, 2),
			);
			for (const [index, pageGeometry] of previewGeometry.pages.entries()) {
				const pdfPage = previewPdf.pages[index];
				expect(pdfPage).toBeDefined();
				if (!pdfPage) continue;
				const renderScale = pageGeometry.canvas.width / pageGeometry.canvas.cssWidth;
				expect(Math.abs(pageGeometry.canvas.cssWidth - pdfPage.mediaBox.width)).toBeLessThanOrEqual(
					PDF_COORDINATE_TOLERANCE,
				);
				expect(Math.abs(pageGeometry.canvas.cssHeight - pdfPage.mediaBox.height)).toBeLessThanOrEqual(
					PDF_COORDINATE_TOLERANCE,
				);
				expect(renderScale, `${scenarioName(scenario)} measured render scale`).toBeGreaterThan(0);
				expect(Math.abs(pageGeometry.canvas.width - pageGeometry.canvas.cssWidth * renderScale)).toBeLessThanOrEqual(
					DOM_LAYOUT_TOLERANCE,
				);
				expect(Math.abs(pageGeometry.canvas.height - pageGeometry.canvas.cssHeight * renderScale)).toBeLessThanOrEqual(
					DOM_LAYOUT_TOLERANCE,
				);
				expect(
					Math.abs(pageGeometry.canvasRect.width - pdfPage.mediaBox.width * previewGeometry.transform.scaleX),
				).toBeLessThanOrEqual(DOM_LAYOUT_TOLERANCE);
				expect(
					Math.abs(pageGeometry.canvasRect.height - pdfPage.mediaBox.height * previewGeometry.transform.scaleY),
				).toBeLessThanOrEqual(DOM_LAYOUT_TOLERANCE);
				expect(
					Math.abs(pageGeometry.canvasRect.width / pageGeometry.canvas.cssWidth - previewGeometry.transform.scaleX),
				).toBeLessThanOrEqual(TRANSFORM_SCALE_TOLERANCE);
				expect(pageGeometry.wrapper.width, `${scenarioName(scenario)} wrapper width`).toBeGreaterThan(0);
				expect(pageGeometry.wrapper.height, `${scenarioName(scenario)} wrapper height`).toBeGreaterThan(0);
				expect(pageGeometry.canvas.width, `${scenarioName(scenario)} canvas bitmap width`).toBeGreaterThan(0);
				expect(pageGeometry.canvas.height, `${scenarioName(scenario)} canvas bitmap height`).toBeGreaterThan(0);
			}
			for (const [label, diff] of [
				["active preview vs captured source", sourcePixelDiff.pages],
				["active preview vs download", pixelDiff.pages],
			] as const) {
				expect(diff, `${scenarioName(scenario)} zoom ${zoom} ${label} page count`).toHaveLength(
					previewGeometry.pages.length,
				);
				for (const [index, page] of diff.entries()) {
					const maxPixels = Math.min(
						RASTER_MISMATCH_PIXEL_LIMIT,
						Math.ceil(
							previewGeometry.pages[index].canvas.width *
								previewGeometry.pages[index].canvas.height *
								RASTER_MISMATCH_RATIO_LIMIT,
						),
					);
					expect(
						page.differentPixels,
						`${scenarioName(scenario)} zoom ${zoom} ${label} page ${index + 1}`,
					).toBeLessThanOrEqual(maxPixels);
					expect(page.differentPixelRatio, `${scenarioName(scenario)} zoom ${zoom} ${label} ratio`).toBeLessThanOrEqual(
						RASTER_MISMATCH_RATIO_LIMIT,
					);
				}
			}
			zoomReports.push({ downloadedPdf, previewGeometry, zoom });
			await page.keyboard.press("Escape");
		}

		const report = {
			devicePixelRatio: await page.evaluate(() => window.devicePixelRatio),
			format: scenario.format,
			marginY: scenario.marginY,
			overflow: scenario.overflow,
			previewPdf,
			zoomReports,
		};
		await writeFile(testInfo.outputPath(`${scenarioName(scenario)}.metrics.json`), JSON.stringify(report, null, 2));
	}
}

test.describe("preview/export geometry at DPR1", () => {
	test.skip(!geometryE2eOptedIn, `Set ${GEOMETRY_E2E_OPT_IN}=1 to run disposable preview/export geometry E2E.`);
	test.use({ deviceScaleFactor: 1 });

	test("matches active preview and downloaded PDF across synthetic Rhyhorn matrix", async ({ authPage }, testInfo) => {
		test.setTimeout(600_000);
		await runGeometryMatrix(authPage, testInfo, SCENARIOS, 1);
	});
});

test.describe("preview/export geometry at DPR2", () => {
	test.skip(!geometryE2eOptedIn, `Set ${GEOMETRY_E2E_OPT_IN}=1 to run disposable preview/export geometry E2E.`);
	test.use({ deviceScaleFactor: 2 });

	test("matches active preview and downloaded PDF at higher device pixel ratio", async ({ authPage }, testInfo) => {
		test.setTimeout(180_000);
		await runGeometryMatrix(
			authPage,
			testInfo,
			[{ format: "a4", marginY: defaultResumeData.metadata.page.marginY, overflow: true }],
			2,
		);
	});
});
