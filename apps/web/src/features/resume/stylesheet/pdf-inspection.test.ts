import { beforeEach, describe, expect, it, vi } from "vitest";
import { inspectPdfPageCount } from "./pdf-inspection";

const mocks = vi.hoisted(() => ({
	workerDestroy: vi.fn(),
	getDocument: vi.fn(),
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
	PDFWorker: class {
		destroy = mocks.workerDestroy;
	},
	getDocument: mocks.getDocument,
}));

describe("inspectPdfPageCount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("inspects a copy through a nested worker without detaching the result buffer", async () => {
		const destroy = vi.fn();
		const nestedWorker = { terminate: vi.fn() } as unknown as Worker;
		mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 3 }), destroy });
		const pdf = Uint8Array.of(1, 2, 3, 4).buffer;

		await expect(inspectPdfPageCount(pdf, () => nestedWorker)).resolves.toBe(3);

		expect(mocks.getDocument).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.any(ArrayBuffer), worker: expect.any(Object) }),
		);
		const inspectedPdf = mocks.getDocument.mock.calls[0]?.[0].data as ArrayBuffer;
		expect(inspectedPdf).not.toBe(pdf);
		expect(Array.from(new Uint8Array(inspectedPdf))).toEqual([1, 2, 3, 4]);
		expect(Array.from(new Uint8Array(pdf))).toEqual([1, 2, 3, 4]);
		expect(destroy).toHaveBeenCalledOnce();
		expect(nestedWorker.terminate).toHaveBeenCalledOnce();
	});

	it("destroys the loading task and nested worker when parsing fails", async () => {
		const destroy = vi.fn();
		const nestedWorker = { terminate: vi.fn() } as unknown as Worker;
		mocks.getDocument.mockReturnValue({ promise: Promise.reject(new Error("invalid PDF")), destroy });

		await expect(inspectPdfPageCount(new ArrayBuffer(4), () => nestedWorker)).rejects.toThrow("invalid PDF");

		expect(destroy).toHaveBeenCalledOnce();
		expect(nestedWorker.terminate).toHaveBeenCalledOnce();
	});

	it("terminates the nested worker even when loading-task cleanup fails", async () => {
		const nestedWorker = { terminate: vi.fn() } as unknown as Worker;
		mocks.getDocument.mockReturnValue({
			promise: Promise.resolve({ numPages: 1 }),
			destroy: vi.fn().mockRejectedValue(new Error("cleanup failed")),
		});

		await expect(inspectPdfPageCount(new ArrayBuffer(4), () => nestedWorker)).rejects.toThrow("cleanup failed");

		expect(nestedWorker.terminate).toHaveBeenCalledOnce();
	});
});
