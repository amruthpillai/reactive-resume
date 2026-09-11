import type { PdfDocumentLike, PdfPageLike } from "./harvest";
import { describe, expect, it, vi } from "vitest";
import { HarvestAbortedError, harvestPdfDocument } from "./harvest";
import { PDF_OPS } from "./pdf-ops";

const FILE = { name: "resume.pdf", sizeBytes: 120_000, magicBytesOk: true };

type PageOptions = {
	items?: unknown[];
	annotations?: unknown[];
	operatorList?: unknown;
	operatorDelayMs?: number;
	fontObject?: unknown;
	rotate?: number;
};

function makePage(pageNumber: number, options: PageOptions = {}): PdfPageLike {
	return {
		pageNumber,
		rotate: options.rotate ?? 0,
		view: [0, 0, 595.28, 841.89],
		commonObjs: {
			has: () => options.fontObject !== undefined,
			get: () => options.fontObject,
		},
		getTextContent: vi.fn(async () => ({
			items: options.items ?? [
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
		getAnnotations: vi.fn(async () => options.annotations ?? []),
		getOperatorList: vi.fn(async () => {
			if (options.operatorDelayMs) await new Promise((resolve) => setTimeout(resolve, options.operatorDelayMs));
			return options.operatorList ?? { fnArray: [], argsArray: [] };
		}),
		cleanup: vi.fn(),
	};
}

function makeDocument(pages: PdfPageLike[], metadata: Record<string, unknown> = {}): PdfDocumentLike {
	return {
		numPages: pages.length,
		getPage: async (pageNumber) => pages[pageNumber - 1] as PdfPageLike,
		getMetadata: async () => ({ info: { Producer: "Test", Language: "en-GB", ...metadata } }),
		getMarkInfo: async () => ({ Marked: true }),
	};
}

describe("harvestPdfDocument", () => {
	it("harvests text, metadata and fonts into plain JSON", async () => {
		const raw = await harvestPdfDocument(
			makeDocument([makePage(1, { fontObject: { name: "AAAAAA+Inter", isType3Font: false } })]),
			{ file: FILE },
		);

		expect(raw.pages).toHaveLength(1);
		expect(raw.pages[0]?.items[0]?.str).toBe("Ada Lovelace");
		expect(raw.pages[0]?.width).toBeCloseTo(595.28, 2);
		expect(raw.metadata.language).toBe("en-GB");
		expect(raw.metadata.isTagged).toBe(true);
		expect(raw.fonts[0]?.name).toBe("AAAAAA+Inter");
		expect(JSON.parse(JSON.stringify(raw))).toEqual(raw);
	});

	it("reads encryption and XFA off the document info dictionary", async () => {
		const raw = await harvestPdfDocument(
			makeDocument([makePage(1)], { EncryptFilterName: "Standard", IsXFAPresent: true, IsAcroFormPresent: true }),
			{ file: FILE },
		);

		expect(raw.metadata).toMatchObject({ isEncrypted: true, isXfa: true, hasAcroForm: true });
	});

	it("stops at the page ceiling and says so", async () => {
		const pages = Array.from({ length: 5 }, (_, index) => makePage(index + 1));
		const raw = await harvestPdfDocument(makeDocument(pages), { file: FILE, maxPages: 2 });

		expect(raw.pages).toHaveLength(2);
		expect(raw.pageCount).toBe(5);
		expect(raw.truncated).toBe(true);
	});

	it("skips the operator pass entirely on a zero budget", async () => {
		const page = makePage(1);
		const raw = await harvestPdfDocument(makeDocument([page]), { file: FILE, operatorBudgetMs: 0 });

		expect(page.getOperatorList).not.toHaveBeenCalled();
		expect(raw.operatorsAvailable).toBe(false);
		expect(raw.pages[0]?.operators).toBeNull();
	});

	it("leaves operators null when the page blows its budget", async () => {
		const page = makePage(1, { operatorDelayMs: 50 });
		const raw = await harvestPdfDocument(makeDocument([page]), {
			file: FILE,
			operatorBudgetPerPageMs: 5,
		});

		expect(raw.pages[0]?.operators).toBeNull();
		expect(raw.operatorsAvailable).toBe(false);
	});

	it("summarises the operator list when it arrives in time", async () => {
		const page = makePage(1, {
			operatorList: {
				fnArray: [PDF_OPS.setTextRenderingMode, PDF_OPS.showText],
				argsArray: [[3], [[]]],
			},
		});

		const raw = await harvestPdfDocument(makeDocument([page]), { file: FILE });

		expect(raw.pages[0]?.operators?.invisibleTextItems).toBe(1);
		expect(raw.operatorsAvailable).toBe(true);
	});

	it("keeps link annotations and drops everything else", async () => {
		const raw = await harvestPdfDocument(
			makeDocument([
				makePage(1, {
					annotations: [
						{ subtype: "Link", url: "https://example.com", rect: [10, 20, 30, 40] },
						{ subtype: "Widget", url: "https://ignored.example" },
					],
				}),
			]),
			{ file: FILE },
		);

		expect(raw.links).toEqual([{ page: 1, url: "https://example.com", rect: [10, 20, 30, 40] }]);
	});

	it("drops text items the reader could not describe rather than throwing", async () => {
		const raw = await harvestPdfDocument(
			makeDocument([
				makePage(1, {
					items: [{ type: "beginMarkedContent" }, { str: 42 }, { str: "ok", transform: [10, 0, 0, 10, 0, 0] }],
				}),
			]),
			{ file: FILE },
		);

		expect(raw.pages[0]?.items.map((item) => item.str)).toEqual(["ok"]);
	});

	it("tolerates a font object the reader refuses to resolve", async () => {
		const page = makePage(1);
		page.commonObjs = {
			get: () => {
				throw new Error("not resolved");
			},
		};

		const raw = await harvestPdfDocument(makeDocument([page]), { file: FILE });
		expect(raw.fonts).toEqual([]);
	});

	it("reports progress and honours an abort signal", async () => {
		const progress: string[] = [];
		const signal = { aborted: false };

		await expect(
			harvestPdfDocument(makeDocument([makePage(1), makePage(2)]), {
				file: FILE,
				signal,
				onProgress: (entry) => {
					progress.push(`${entry.phase}:${entry.page}`);
					signal.aborted = true;
				},
			}),
		).rejects.toBeInstanceOf(HarvestAbortedError);

		expect(progress[0]).toBe("text:1");
	});
});
