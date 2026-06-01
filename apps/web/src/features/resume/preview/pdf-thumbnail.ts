import type { PreviewPageSize } from "./preview.shared";
import { getResumeThumbnailRenderSize, RESUME_THUMBNAIL_TARGET_WIDTH } from "./resume-thumbnail.shared";

const canvasToBlob = async (canvas: HTMLCanvasElement) => {
	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error("Failed to create resume thumbnail image."));
				return;
			}

			resolve(blob);
		}, "image/png");
	});
};

export const createPdfFirstPageImageUrl = async (file: Blob) => {
	const { AnnotationMode, GlobalWorkerOptions, getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
	GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

	const arrayBuffer = await file.arrayBuffer();
	const loadingTask = getDocument({ data: new Uint8Array(arrayBuffer) });
	let pdfDocument: Awaited<typeof loadingTask.promise> | undefined;

	try {
		pdfDocument = await loadingTask.promise;
		const page = await pdfDocument.getPage(1);

		try {
			const baseViewport = page.getViewport({ scale: 1 });
			const pageSize: PreviewPageSize = { height: baseViewport.height, width: baseViewport.width };
			const renderSize = getResumeThumbnailRenderSize(
				pageSize,
				RESUME_THUMBNAIL_TARGET_WIDTH,
				window.devicePixelRatio || 1,
			);

			const canvas = document.createElement("canvas");
			const canvasContext = canvas.getContext("2d");

			if (!canvasContext) throw new Error("Failed to create resume thumbnail canvas context.");

			canvas.height = renderSize.height;
			canvas.width = renderSize.width;

			const viewport = page.getViewport({ scale: renderSize.scale });
			const renderTask = page.render({
				canvas,
				canvasContext,
				viewport,
				annotationMode: AnnotationMode.DISABLE,
				background: "white",
			});

			await renderTask.promise;

			const image = await canvasToBlob(canvas);
			return URL.createObjectURL(image);
		} finally {
			page.cleanup();
		}
	} finally {
		void loadingTask.destroy();
	}
};
