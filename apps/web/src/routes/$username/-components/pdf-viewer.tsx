import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { AnnotationMode, GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { EventBus, LinkTarget, PDFLinkService, PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { cn } from "@reactive-resume/utils/style";
import { createResumePdfBlob } from "@/libs/resume/pdf-document";
import "pdfjs-dist/legacy/web/pdf_viewer.css";
import "./pdf-viewer.css";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

type PdfViewerProps = {
	className?: string;
	data: ResumeData;
};

type PdfViewerOptions = ConstructorParameters<typeof PDFViewer>[0] & {
	abortSignal: AbortSignal;
};

const clearPdfViewerDocument = (pdfViewer: PDFViewer) => {
	(pdfViewer.setDocument as (document: PDFDocumentProxy | null) => void)(null);
};

export function PdfViewer({ className, data }: PdfViewerProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const viewerRef = useRef<HTMLDivElement>(null);
	const [file, setFile] = useState<Blob | null>(null);
	const [error, setError] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const [viewerHeight, setViewerHeight] = useState<number | null>(null);

	useEffect(() => {
		let isCancelled = false;

		setError(false);
		setFile(null);
		setIsReady(false);
		setViewerHeight(null);

		void createResumePdfBlob(data)
			.then((blob) => {
				if (!isCancelled) setFile(blob);
			})
			.catch((error: unknown) => {
				if (!isCancelled) {
					console.error("Failed to generate public resume PDF", error);
					setError(true);
				}
			});

		return () => {
			isCancelled = true;
		};
	}, [data]);

	useEffect(() => {
		const root = rootRef.current;
		const container = containerRef.current;
		const viewer = viewerRef.current;

		if (!file || !root || !container || !viewer) return;

		let isCancelled = false;
		let animationFrameId = 0;
		let resizeObserver: ResizeObserver | undefined;
		const abortController = new AbortController();
		let loadingTask: PDFDocumentLoadingTask | undefined;
		let pdfDocument: PDFDocumentProxy | undefined;
		let pdfViewer: PDFViewer | undefined;

		const eventBus = new EventBus();
		const linkService = new PDFLinkService({
			eventBus,
			externalLinkTarget: LinkTarget.BLANK,
			externalLinkRel: "noreferrer",
		});

		const syncViewerHeight = () => {
			if (isCancelled) return;

			window.cancelAnimationFrame(animationFrameId);
			animationFrameId = window.requestAnimationFrame(() => {
				if (isCancelled) return;

				const nextHeight = Math.ceil(viewer.scrollHeight);
				if (nextHeight > 0) setViewerHeight(nextHeight);
				pdfViewer?.update();
			});
		};

		const setInitialScale = () => {
			if (!isCancelled && pdfViewer) {
				pdfViewer.currentScaleValue = "page-width";
				syncViewerHeight();
			}
		};

		eventBus.on("pagesinit", setInitialScale);
		eventBus.on("pagesloaded", syncViewerHeight);
		eventBus.on("pagerendered", syncViewerHeight);
		viewer.replaceChildren();
		setError(false);
		setIsReady(false);
		setViewerHeight(null);
		resizeObserver = new ResizeObserver(syncViewerHeight);
		resizeObserver.observe(viewer);

		const loadDocument = async () => {
			const arrayBuffer = await file.arrayBuffer();
			if (isCancelled) return;

			loadingTask = getDocument({
				data: new Uint8Array(arrayBuffer),
				docBaseUrl: window.location.href,
			});

			const nextDocument = await loadingTask.promise;
			if (isCancelled) {
				void nextDocument.destroy();
				return;
			}

			pdfDocument = nextDocument;
			const pdfViewerOptions = {
				annotationMode: AnnotationMode.ENABLE_FORMS,
				container,
				eventBus,
				linkService,
				removePageBorders: true,
				abortSignal: abortController.signal,
				viewer,
			} satisfies PdfViewerOptions;

			pdfViewer = new PDFViewer(pdfViewerOptions);

			linkService.setViewer(pdfViewer);
			pdfViewer.setDocument(pdfDocument);
			linkService.setDocument(pdfDocument);
			syncViewerHeight();
			setIsReady(true);
		};

		void loadDocument().catch((error: unknown) => {
			if (!isCancelled) {
				console.error("Failed to render public resume PDF with PDF.js", error);
				setError(true);
			}
		});

		return () => {
			isCancelled = true;
			eventBus.off("pagesinit", setInitialScale);
			eventBus.off("pagesloaded", syncViewerHeight);
			eventBus.off("pagerendered", syncViewerHeight);
			abortController.abort();
			window.cancelAnimationFrame(animationFrameId);
			resizeObserver?.disconnect();
			if (pdfViewer) clearPdfViewerDocument(pdfViewer);
			void pdfDocument?.destroy();
			void loadingTask?.destroy();
			viewer.replaceChildren();
		};
	}, [file]);

	return (
		<div
			ref={rootRef}
			className={cn("pdf-viewer relative bg-neutral-100", viewerHeight ? "min-h-0" : "min-h-48", className)}
			style={viewerHeight ? { height: viewerHeight } : undefined}
		>
			<div ref={containerRef} className="absolute inset-0 overflow-visible">
				<div ref={viewerRef} className="pdfViewer" />
			</div>

			{error ? (
				<div className="absolute inset-0 flex items-center justify-center bg-background px-6 text-center text-muted-foreground text-sm">
					Unable to display PDF preview.
				</div>
			) : isReady ? null : (
				<div className="absolute inset-0 flex items-center justify-center bg-background">
					<Spinner className="size-6" />
				</div>
			)}
		</div>
	);
}
