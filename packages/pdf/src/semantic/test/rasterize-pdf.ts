import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type RasterizedPdfPage = {
	width: number;
	height: number;
	data: Uint8Array;
};

type RasterPage = {
	getViewport(input: { scale: number }): { width: number; height: number };
	render(input: unknown): { promise: Promise<unknown> };
	cleanup(): void;
};

type RasterDocument = {
	numPages: number;
	getPage(pageNumber: number): Promise<RasterPage>;
};

type RasterLoadingTask = {
	promise: Promise<RasterDocument>;
	destroy(): Promise<void>;
};

export type RasterizePdfDependencies = {
	loadDocument?: (bytes: Uint8Array) => RasterLoadingTask;
};

const loadPdfDocument = (bytes: Uint8Array): RasterLoadingTask =>
	getDocument({ data: bytes }) as unknown as RasterLoadingTask;

export async function rasterizePdf(
	bytes: Uint8Array,
	dependencies: RasterizePdfDependencies = {},
): Promise<readonly RasterizedPdfPage[]> {
	const loadingTask = (dependencies.loadDocument ?? loadPdfDocument)(bytes);
	const pages: RasterizedPdfPage[] = [];

	try {
		const document = await loadingTask.promise;
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
			const page = await document.getPage(pageNumber);
			try {
				const viewport = page.getViewport({ scale: 1.5 });
				const width = Math.ceil(viewport.width);
				const height = Math.ceil(viewport.height);
				const canvas = createCanvas(width, height);
				const context = canvas.getContext("2d");

				await page.render({
					canvas: canvas as unknown as HTMLCanvasElement,
					canvasContext: context as unknown as CanvasRenderingContext2D,
					viewport,
				}).promise;
				pages.push({
					width,
					height,
					data: Uint8Array.from(context.getImageData(0, 0, width, height).data),
				});
			} finally {
				page.cleanup();
			}
		}
	} finally {
		await loadingTask.destroy();
	}

	return pages;
}
