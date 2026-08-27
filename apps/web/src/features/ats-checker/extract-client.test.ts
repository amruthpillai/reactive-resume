// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfjsMock = vi.hoisted(() => {
	const page = {
		pageNumber: 1,
		rotate: 0,
		view: [0, 0, 595.28, 841.89],
		commonObjs: { has: () => true, get: () => ({ name: "AAAAAA+Inter" }) },
		getTextContent: vi.fn(async () => ({
			items: [
				{
					str: "Ada Lovelace",
					transform: [10, 0, 0, 10, 56, 780],
					width: 60,
					height: 10,
					fontName: "g_d0_f1",
					hasEOL: true,
				},
			],
		})),
		getAnnotations: vi.fn(async () => []),
		getOperatorList: vi.fn(async () => ({ fnArray: [], argsArray: [] })),
		cleanup: vi.fn(),
	};

	const document = {
		numPages: 1,
		getPage: vi.fn(async () => page),
		getMetadata: vi.fn(async () => ({ info: { Producer: "Test", Language: "en-GB" } })),
		getMarkInfo: vi.fn(async () => ({ Marked: true })),
	};

	const loadingTask = { destroy: vi.fn(), promise: Promise.resolve(document) };

	return {
		document,
		loadingTask,
		page,
		legacyModule: {
			getDocument: vi.fn(() => loadingTask),
			GlobalWorkerOptions: {} as { workerSrc?: string },
		},
	};
});

vi.mock("pdfjs-dist", () => {
	throw new Error("Modern pdfjs-dist runtime should not be imported by the ATS checker.");
});

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => pdfjsMock.legacyModule);

const pdfFile = (bytes: number[], name = "resume.pdf") =>
	new File([new Uint8Array(bytes)], name, { type: "application/pdf" });

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];

const { extractPdf, hasPdfMagicBytes, PdfTooLargeError, PdfUnreadableError } = await import("./extract-client");

beforeEach(() => {
	pdfjsMock.legacyModule.GlobalWorkerOptions.workerSrc = undefined;
	pdfjsMock.legacyModule.getDocument.mockClear();
	pdfjsMock.loadingTask.destroy.mockClear();
	pdfjsMock.page.getOperatorList.mockClear();
});

describe("hasPdfMagicBytes", () => {
	it("accepts a real PDF header and rejects anything else", async () => {
		await expect(hasPdfMagicBytes(new Blob([new Uint8Array(PDF_HEADER)]))).resolves.toBe(true);
		await expect(hasPdfMagicBytes(new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])]))).resolves.toBe(false);
	});
});

describe("extractPdf", () => {
	it("loads the legacy PDF.js runtime and configures its worker", async () => {
		await extractPdf(pdfFile(PDF_HEADER));

		expect(pdfjsMock.legacyModule.GlobalWorkerOptions.workerSrc).toContain(
			"pdfjs-dist/legacy/build/pdf.worker.min.mjs",
		);
	});

	it("asks for the extra font properties the font checks depend on", async () => {
		await extractPdf(pdfFile(PDF_HEADER));

		expect(pdfjsMock.legacyModule.getDocument).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.any(Uint8Array), fontExtraProperties: true }),
		);
	});

	it("destroys the loading task once it is done", async () => {
		await extractPdf(pdfFile(PDF_HEADER));

		expect(pdfjsMock.loadingTask.destroy).toHaveBeenCalledTimes(1);
	});

	it("returns plain serialisable JSON", async () => {
		const raw = await extractPdf(pdfFile(PDF_HEADER, "ada.pdf"));

		expect(raw.file).toEqual({ name: "ada.pdf", sizeBytes: PDF_HEADER.length, magicBytesOk: true });
		expect(raw.pages[0]?.items[0]?.str).toBe("Ada Lovelace");
		expect(JSON.parse(JSON.stringify(raw))).toEqual(raw);
	});

	it("refuses a file that is not a PDF before loading PDF.js at all", async () => {
		pdfjsMock.legacyModule.getDocument.mockClear();

		await expect(extractPdf(pdfFile([0x50, 0x4b, 0x03, 0x04], "resume.pdf"))).rejects.toBeInstanceOf(
			PdfUnreadableError,
		);
		expect(pdfjsMock.legacyModule.getDocument).not.toHaveBeenCalled();
	});

	it("refuses an oversized file before reading it into memory", async () => {
		const huge = pdfFile(PDF_HEADER);
		Object.defineProperty(huge, "size", { value: 40_000_000 });

		await expect(extractPdf(huge)).rejects.toBeInstanceOf(PdfTooLargeError);
	});

	it("reports progress as it works", async () => {
		const phases: string[] = [];
		await extractPdf(pdfFile(PDF_HEADER), { onProgress: (progress) => phases.push(progress.phase) });

		expect(phases[0]).toBe("loading");
		expect(phases).toContain("text");
	});
});
