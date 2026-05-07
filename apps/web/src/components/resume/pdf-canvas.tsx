import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { ReactNode } from "react";
import type { PreviewPageSize } from "./preview.shared";
import { AnnotationMode, GlobalWorkerOptions, getDocument, RenderingCancelledException } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { cn } from "@reactive-resume/utils/style";
import { DEFAULT_PDF_PAGE_SIZE, getPreviewCanvasScale, getScaledPreviewPageSize } from "./preview.shared";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type PdfCanvasDocumentProps = {
	children: (document: PDFDocumentProxy) => ReactNode;
	file: Blob;
	onLoadSuccess: (document: PDFDocumentProxy) => void;
};

type PdfCanvasPageProps = {
	className?: string;
	document: PDFDocumentProxy;
	onLoadSuccess: (pageNumber: number, pageSize: PreviewPageSize) => void;
	onRenderSuccess?: () => void;
	pageNumber: number;
	pageScale: number;
	pageSize?: PreviewPageSize;
	showPageNumbers: boolean;
	totalPages: number;
};

const isRenderingCancelledError = (error: unknown) =>
	error instanceof RenderingCancelledException ||
	(typeof error === "object" && error !== null && "name" in error && error.name === "RenderingCancelledException");

export function PdfCanvasDocument({ children, file, onLoadSuccess }: PdfCanvasDocumentProps) {
	const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
	const onLoadSuccessRef = useRef(onLoadSuccess);

	useEffect(() => {
		onLoadSuccessRef.current = onLoadSuccess;
	}, [onLoadSuccess]);

	useEffect(() => {
		let isCancelled = false;
		let loadingTask: PDFDocumentLoadingTask | undefined;
		let loadedDocument: PDFDocumentProxy | undefined;

		const loadDocument = async () => {
			setDocument(null);

			const arrayBuffer = await file.arrayBuffer();
			if (isCancelled) return;

			loadingTask = getDocument({ data: new Uint8Array(arrayBuffer) });
			const pdfDocument = await loadingTask.promise;

			if (isCancelled) {
				void pdfDocument.destroy();
				return;
			}

			loadedDocument = pdfDocument;
			setDocument(pdfDocument);
			onLoadSuccessRef.current(pdfDocument);
		};

		void loadDocument().catch((error: unknown) => {
			if (isCancelled) return;

			console.error("Failed to load PDF document", error);
		});

		return () => {
			isCancelled = true;

			if (loadedDocument) {
				void loadedDocument.destroy();
			} else if (loadingTask) {
				void loadingTask.destroy();
			}
		};
	}, [file]);

	if (!document) return null;

	return children(document);
}

export function PdfCanvasPage({
	className,
	document,
	onLoadSuccess,
	onRenderSuccess,
	pageNumber,
	pageScale,
	pageSize = DEFAULT_PDF_PAGE_SIZE,
	showPageNumbers,
	totalPages,
}: PdfCanvasPageProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const onLoadSuccessRef = useRef(onLoadSuccess);
	const onRenderSuccessRef = useRef(onRenderSuccess);
	const scaledPageSize = getScaledPreviewPageSize(pageSize, pageScale);

	useEffect(() => {
		onLoadSuccessRef.current = onLoadSuccess;
		onRenderSuccessRef.current = onRenderSuccess;
	}, [onLoadSuccess, onRenderSuccess]);

	useEffect(() => {
		let isCancelled = false;
		let renderTask: RenderTask | undefined;

		const renderPage = async () => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const page = await document.getPage(pageNumber);

			try {
				if (isCancelled) {
					page.cleanup();
					return;
				}

				const baseViewport = page.getViewport({ scale: 1 });
				const pageSize = { height: baseViewport.height, width: baseViewport.width };

				onLoadSuccessRef.current(pageNumber, pageSize);

				const width = baseViewport.width * pageScale;
				const height = baseViewport.height * pageScale;
				const renderScale = getPreviewCanvasScale(width, height);
				const canvasContext = canvas.getContext("2d");

				if (!canvasContext) return;

				canvas.style.width = `${width}px`;
				canvas.style.height = `${height}px`;
				canvas.width = Math.floor(width * renderScale);
				canvas.height = Math.floor(height * renderScale);

				canvasContext.setTransform(1, 0, 0, 1, 0, 0);
				canvasContext.clearRect(0, 0, canvas.width, canvas.height);

				const viewport = page.getViewport({ scale: pageScale });
				const transform = [renderScale, 0, 0, renderScale, 0, 0];

				renderTask = page.render({
					canvas,
					canvasContext,
					viewport,
					transform,
					annotationMode: AnnotationMode.DISABLE,
					background: "white",
				});

				await renderTask.promise;
				renderTask = undefined;

				if (!isCancelled) onRenderSuccessRef.current?.();
			} finally {
				page.cleanup();
			}
		};

		void renderPage().catch((error: unknown) => {
			if (isRenderingCancelledError(error)) return;

			console.error(`Failed to render PDF page ${pageNumber}`, error);
		});

		return () => {
			isCancelled = true;

			if (renderTask) {
				renderTask.cancel();
			}
		};
	}, [document, pageNumber, pageScale]);

	return (
		<figure className="shrink-0">
			{showPageNumbers ? (
				<figcaption className="mb-1 font-medium text-[0.625rem] text-muted-foreground">
					Page {pageNumber} of {totalPages}
				</figcaption>
			) : null}

			<div
				role="img"
				aria-label={`Resume page ${pageNumber} of ${totalPages}`}
				style={scaledPageSize}
				className={cn("aspect-page overflow-hidden rounded-md", className)}
			>
				<canvas ref={canvasRef} />
			</div>
		</figure>
	);
}
