// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pdfjsMock = vi.hoisted(() => {
	const page = {
		cleanup: vi.fn(),
		getViewport: vi.fn(({ scale }: { scale: number }) => ({ height: 200 * scale, width: 100 * scale })),
		render: vi.fn(() => ({ promise: Promise.resolve() })),
	};

	const pdfDocument = {
		getPage: vi.fn(async () => page),
		numPages: 1,
	};

	const loadingTask = {
		destroy: vi.fn(),
		promise: Promise.resolve(pdfDocument),
	};

	return {
		createObjectURL: vi.fn(() => "blob:thumbnail"),
		getDocument: vi.fn(() => loadingTask),
		legacyModule: {
			AnnotationMode: { DISABLE: 0 },
			getDocument: vi.fn(() => loadingTask),
			GlobalWorkerOptions: {} as { workerSrc?: string },
			RenderingCancelledException: class RenderingCancelledException extends Error {},
		},
		loadingTask,
		page,
		pdfDocument,
	};
});

vi.mock("pdfjs-dist", () => {
	throw new Error("Modern pdfjs-dist runtime should not be imported by browser preview code.");
});

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => pdfjsMock.legacyModule);

const pdfCanvasModule = import("./pdf-canvas");
const pdfCanvasModuleTimeoutMs = 15_000;

describe("PDF.js browser entrypoints", () => {
	beforeEach(() => {
		pdfjsMock.legacyModule.GlobalWorkerOptions.workerSrc = undefined;
		pdfjsMock.legacyModule.getDocument.mockClear();
		pdfjsMock.loadingTask.destroy.mockClear();
		pdfjsMock.pdfDocument.getPage.mockClear();
		pdfjsMock.page.cleanup.mockClear();
		pdfjsMock.page.getViewport.mockClear();
		pdfjsMock.page.render.mockClear();
		pdfjsMock.createObjectURL.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it(
		"loads the canvas preview renderer from the legacy PDF.js runtime",
		async () => {
			await expect(pdfCanvasModule).resolves.toEqual(
				expect.objectContaining({
					PdfCanvasDocument: expect.any(Function),
					PdfCanvasPage: expect.any(Function),
				}),
			);

			expect(pdfjsMock.legacyModule.GlobalWorkerOptions.workerSrc).toContain(
				"pdfjs-dist/legacy/build/pdf.worker.min.mjs",
			);
		},
		pdfCanvasModuleTimeoutMs,
	);

	it("creates thumbnails with the legacy PDF.js runtime", async () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
		vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
			callback(new Blob(["png"], { type: "image/png" }));
		});
		vi.spyOn(URL, "createObjectURL").mockImplementation(pdfjsMock.createObjectURL);

		const { createPdfFirstPageImageUrl } = await import("./pdf-thumbnail");

		await expect(createPdfFirstPageImageUrl(new Blob(["%PDF"], { type: "application/pdf" }))).resolves.toBe(
			"blob:thumbnail",
		);

		expect(pdfjsMock.legacyModule.GlobalWorkerOptions.workerSrc).toContain(
			"pdfjs-dist/legacy/build/pdf.worker.min.mjs",
		);
		expect(pdfjsMock.legacyModule.getDocument).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.any(Uint8Array) }),
		);
		expect(pdfjsMock.page.render).toHaveBeenCalledWith(
			expect.objectContaining({ annotationMode: 0, background: "white" }),
		);
		expect(pdfjsMock.loadingTask.destroy).toHaveBeenCalledTimes(1);
	});
});
