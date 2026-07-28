import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type RasterizedPdfPage = {
	width: number;
	height: number;
	data: Uint8Array;
};

export async function rasterizePdf(bytes: Uint8Array): Promise<readonly RasterizedPdfPage[]> {
	const loadingTask = getDocument({ data: bytes });
	const document = await loadingTask.promise;
	const pages: RasterizedPdfPage[] = [];

	try {
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
			const page = await document.getPage(pageNumber);
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
			page.cleanup();
		}
	} finally {
		await loadingTask.destroy();
	}

	return pages;
}
