import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractPdfLines, itemsToLines } from "./pdf-text";

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

const item = (text: string, x: number, y: number, width = text.length * 5) => ({
	str: text,
	width,
	transform: [1, 0, 0, 1, x, y],
});

describe("itemsToLines", () => {
	it("groups items on the same baseline into one line", () => {
		expect(itemsToLines([item("Ada", 0, 700), item("Lovelace", 22, 700)])).toEqual(["Ada Lovelace"]);
	});

	it("orders lines from the top of the page down", () => {
		expect(itemsToLines([item("Second", 0, 680), item("First", 0, 700)])).toEqual(["First", "Second"]);
	});

	it("tolerates a small baseline wobble within a line", () => {
		expect(itemsToLines([item("Ada", 0, 700), item("Lovelace", 22, 698)])).toEqual(["Ada Lovelace"]);
	});

	it("turns a wide column gap into a double space the parser can split on", () => {
		expect(itemsToLines([item("Acme", 0, 700, 20), item("Engineer", 120, 700)])).toEqual(["Acme  Engineer"]);
	});

	it("sorts items within a line by horizontal position", () => {
		expect(itemsToLines([item("world", 40, 700), item("hello", 0, 700, 20)])).toEqual(["hello  world"]);
	});

	it("drops blank items and blank lines", () => {
		expect(itemsToLines([item("   ", 0, 700), item("Ada", 0, 680)])).toEqual(["Ada"]);
	});

	it("ignores entries that carry no string", () => {
		expect(itemsToLines([{ type: "beginMarkedContent" }, item("Ada", 0, 700)])).toEqual(["Ada"]);
	});
});

describe("extractPdfLines", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const makeDocument = (pages: unknown[][]) => ({
		numPages: pages.length,
		getPage: (index: number) =>
			Promise.resolve({ getTextContent: () => Promise.resolve({ items: pages[index - 1] ?? [] }) }),
	});

	it("returns lines across every page in order", async () => {
		const nestedWorker = { terminate: vi.fn() } as unknown as Worker;
		const destroy = vi.fn();
		mocks.getDocument.mockReturnValue({
			promise: Promise.resolve(makeDocument([[item("Page one", 0, 700)], [item("Page two", 0, 700)]])),
			destroy,
		});

		await expect(extractPdfLines(new ArrayBuffer(4), () => nestedWorker)).resolves.toEqual(["Page one", "Page two"]);
		expect(destroy).toHaveBeenCalledOnce();
		expect(nestedWorker.terminate).toHaveBeenCalledOnce();
	});

	it("reads a copy so the caller's buffer is not detached", async () => {
		const nestedWorker = { terminate: vi.fn() } as unknown as Worker;
		mocks.getDocument.mockReturnValue({
			promise: Promise.resolve(makeDocument([[item("Ada", 0, 700)]])),
			destroy: vi.fn(),
		});
		const pdf = Uint8Array.of(1, 2, 3, 4).buffer;

		await extractPdfLines(pdf, () => nestedWorker);

		expect(mocks.getDocument.mock.calls[0]?.[0].data).not.toBe(pdf);
		expect(Array.from(new Uint8Array(pdf))).toEqual([1, 2, 3, 4]);
	});

	it("tears down the worker when parsing fails", async () => {
		const nestedWorker = { terminate: vi.fn() } as unknown as Worker;
		const destroy = vi.fn();
		mocks.getDocument.mockReturnValue({ promise: Promise.reject(new Error("invalid PDF")), destroy });

		await expect(extractPdfLines(new ArrayBuffer(4), () => nestedWorker)).rejects.toThrow("invalid PDF");
		expect(destroy).toHaveBeenCalledOnce();
		expect(nestedWorker.terminate).toHaveBeenCalledOnce();
	});
});

describe("extractPdfLines worker cleanup", () => {
	it("terminates the nested worker when the PDF worker cannot be constructed", async () => {
		const nestedWorker = { terminate: vi.fn() } as unknown as Worker;
		mocks.getDocument.mockImplementation(() => {
			throw new Error("worker unavailable");
		});

		await expect(extractPdfLines(new ArrayBuffer(4), () => nestedWorker)).rejects.toThrow("worker unavailable");
		expect(nestedWorker.terminate).toHaveBeenCalledOnce();
	});
});
