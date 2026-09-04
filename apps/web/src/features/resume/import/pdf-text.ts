let pdfModule: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")>;

const loadPdfModule = () => (pdfModule ??= import("pdfjs-dist/legacy/build/pdf.mjs"));

const createNestedWorker = () =>
	new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), {
		type: "module",
		name: "import-pdfjs",
	});

const LINE_TOLERANCE = 3;
const COLUMN_GAP = 12;
const WORD_GAP = 1;

type PdfTextItem = {
	str?: unknown;
	width?: unknown;
	transform?: unknown;
};

type PositionedItem = {
	text: string;
	x: number;
	y: number;
	width: number;
};

function toPositionedItem(item: PdfTextItem): PositionedItem | null {
	if (typeof item.str !== "string" || !item.str.trim()) return null;

	const transform = Array.isArray(item.transform) ? (item.transform as unknown[]) : [];
	const x = typeof transform[4] === "number" ? transform[4] : 0;
	const y = typeof transform[5] === "number" ? transform[5] : 0;

	return { text: item.str, x, y, width: typeof item.width === "number" ? item.width : 0 };
}

function joinRow(items: PositionedItem[]): string {
	const sorted = [...items].sort((a, b) => a.x - b.x);
	let text = "";
	let previousEnd: number | null = null;

	for (const item of sorted) {
		if (previousEnd !== null) {
			const gap = item.x - previousEnd;
			if (gap > COLUMN_GAP) text += "  ";
			else if (gap > WORD_GAP && !text.endsWith(" ")) text += " ";
		}

		text += item.text;
		previousEnd = item.x + item.width;
	}

	return text.replace(/\s+$/, "");
}

export function itemsToLines(rawItems: readonly unknown[]): string[] {
	const items = rawItems
		.map((item) => toPositionedItem(item as PdfTextItem))
		.filter((item): item is PositionedItem => item !== null)
		.sort((a, b) => b.y - a.y);

	const lines: string[] = [];
	let row: PositionedItem[] = [];
	let rowY: number | null = null;

	for (const item of items) {
		if (rowY === null || Math.abs(item.y - rowY) <= LINE_TOLERANCE) {
			rowY ??= item.y;
			row.push(item);
			continue;
		}

		lines.push(joinRow(row));
		row = [item];
		rowY = item.y;
	}

	if (row.length > 0) lines.push(joinRow(row));

	return lines.filter((line) => line.trim().length > 0);
}

export async function extractPdfLines(
	pdf: ArrayBuffer,
	createWorker: () => Worker = createNestedWorker,
): Promise<string[]> {
	const { PDFWorker, getDocument } = await loadPdfModule();
	const nestedWorker = createWorker();
	let loadingTask: ReturnType<typeof getDocument> | undefined;
	let worker: InstanceType<typeof PDFWorker> | undefined;

	try {
		const WorkerWithPort = PDFWorker as unknown as new (options: { port: Worker }) => InstanceType<typeof PDFWorker>;
		worker = new WorkerWithPort({ port: nestedWorker });
		loadingTask = getDocument({ data: pdf.slice(0), worker });
		const document = await loadingTask.promise;
		const lines: string[] = [];

		for (let index = 1; index <= document.numPages; index++) {
			const page = await document.getPage(index);
			const content = await page.getTextContent();
			lines.push(...itemsToLines(content.items));
		}

		return lines;
	} finally {
		try {
			if (loadingTask) await loadingTask.destroy();
			else worker?.destroy();
		} finally {
			nestedWorker.terminate();
		}
	}
}
