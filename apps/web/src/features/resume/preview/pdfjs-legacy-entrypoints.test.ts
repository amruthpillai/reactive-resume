// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pdfjsMock = vi.hoisted(() => {
	const page = {
		cleanup: vi.fn(),
		getViewport: vi.fn(({ scale }: { scale: number }) => ({ height: 200 * scale, width: 100 * scale })),
		render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
	};

	const pdfDocument = {
		getPage: vi.fn(async () => page),
		numPages: 1,
	};

	const loadingTask = {
		destroy: vi.fn(async () => {}),
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

		await expect(
			createPdfFirstPageImageUrl(new Blob(["%PDF"], { type: "application/pdf" }), { width: 600, height: 900 }),
		).resolves.toBe("blob:thumbnail");

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

	it("cancels obsolete thumbnail rasterization and releases the PDF loading task", async () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
		vi.spyOn(URL, "createObjectURL").mockImplementation(pdfjsMock.createObjectURL);
		let rejectRender!: (error: Error) => void;
		const promise = new Promise<never>((_resolve, reject) => {
			rejectRender = reject;
		});
		const cancel = vi.fn(() => rejectRender(new pdfjsMock.legacyModule.RenderingCancelledException("cancelled")));
		pdfjsMock.page.render.mockReturnValueOnce({ promise, cancel });
		const controller = new AbortController();
		const { createPdfFirstPageImageUrl } = await import("./pdf-thumbnail");
		const pending = createPdfFirstPageImageUrl(new Blob(["%PDF"]), { width: 600, height: 900 }, controller.signal);
		const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
		await vi.waitFor(() => expect(pdfjsMock.page.render).toHaveBeenCalledTimes(1));
		try {
			controller.abort();
			expect(cancel).toHaveBeenCalledTimes(1);
		} finally {
			rejectRender(new DOMException("cancelled", "AbortError"));
			await rejected;
		}
		expect(pdfjsMock.loadingTask.destroy).toHaveBeenCalledTimes(1);
		expect(pdfjsMock.createObjectURL).not.toHaveBeenCalled();
	});

	it("does not load a PDF for an already aborted thumbnail request", async () => {
		const controller = new AbortController();
		controller.abort();
		const { createPdfFirstPageImageUrl } = await import("./pdf-thumbnail");
		await expect(
			createPdfFirstPageImageUrl(new Blob(["%PDF"]), { width: 600, height: 900 }, controller.signal),
		).rejects.toMatchObject({ name: "AbortError" });
		expect(pdfjsMock.legacyModule.getDocument).not.toHaveBeenCalled();
	});
});
