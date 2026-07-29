import type { PublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { AnnotationMode, GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { EventBus, LinkTarget, PDFLinkService, PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import { useEffect, useReducer, useRef } from "react";
import {
	getPublicStyleProjectionFingerprints,
	PUBLIC_STYLE_PROJECTION_FORMAT_VERSION,
	SEMANTIC_TREE_VERSION,
	validatePublicStyleProjection,
} from "@reactive-resume/pdf/public-projection";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { cn } from "@reactive-resume/utils/style";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import "pdfjs-dist/legacy/web/pdf_viewer.css";
import "./pdf-viewer.css";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

type PdfViewerProps = {
	className?: string;
	data: ResumeData;
	styleProjection?: PublicStyleProjection;
	refetchStyleProjection?: () => Promise<PublicStyleProjection>;
	publicResume?: {
		username: string;
		slug: string;
	};
};

type PdfViewerOptions = ConstructorParameters<typeof PDFViewer>[0] & {
	abortSignal: AbortSignal;
};

type PdfViewerState = {
	error: boolean;
	fileVersion: number;
	isReady: boolean;
	viewerHeight: number | null;
};

type PdfViewerAction =
	| { type: "error" }
	| { type: "fileLoaded" }
	| { type: "height"; height: number }
	| { type: "ready" }
	| { type: "resetForData" }
	| { type: "viewerLoading" };

const INITIAL_PDF_VIEWER_STATE: PdfViewerState = {
	error: false,
	fileVersion: 0,
	isReady: false,
	viewerHeight: null,
};

const clearPdfViewerDocument = (pdfViewer: PDFViewer) => {
	(pdfViewer.setDocument as (document: PDFDocumentProxy | null) => void)(null);
};

function pdfViewerReducer(state: PdfViewerState, action: PdfViewerAction): PdfViewerState {
	switch (action.type) {
		case "resetForData":
		case "fileLoaded":
			return {
				...INITIAL_PDF_VIEWER_STATE,
				fileVersion: state.fileVersion + 1,
			};
		case "viewerLoading":
			return { ...state, error: false, isReady: false, viewerHeight: null };
		case "height":
			return action.height > 0 && action.height !== state.viewerHeight
				? { ...state, viewerHeight: action.height }
				: state;
		case "ready":
			return { ...state, isReady: true };
		case "error":
			return { ...state, error: true, isReady: false };
	}
}

type ProjectionMismatchReason =
	| "format-version"
	| "language-version"
	| "semantic-tree-version"
	| "registry-fingerprint"
	| "adapter-fingerprint"
	| "render-data-hash"
	| "invalid-projection";

async function projectionMismatchReason(
	data: ResumeData,
	projection: PublicStyleProjection,
): Promise<ProjectionMismatchReason | null> {
	if (projection.formatVersion !== PUBLIC_STYLE_PROJECTION_FORMAT_VERSION) return "format-version";
	const languageVersion =
		data.metadata.stylesheet?.mode === "semantic" ? data.metadata.stylesheet.applied.languageVersion : 1;
	if (projection.languageVersion !== languageVersion) return "language-version";
	if (projection.semanticTreeVersion !== SEMANTIC_TREE_VERSION) return "semantic-tree-version";
	const fingerprints = await getPublicStyleProjectionFingerprints();
	if (projection.registryFingerprint !== fingerprints.registryFingerprint) return "registry-fingerprint";
	if (projection.adapterFingerprint !== fingerprints.adapterFingerprint) return "adapter-fingerprint";
	return (await validatePublicStyleProjection(data, projection)) ? null : "render-data-hash";
}

export function PdfViewer({ className, data, styleProjection, refetchStyleProjection, publicResume }: PdfViewerProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const viewerRef = useRef<HTMLDivElement>(null);
	const fileRef = useRef<Blob | null>(null);
	const projectionRetryRef = useRef<{ data?: ResumeData; publicKey?: string; retried: boolean }>({
		retried: false,
	});
	const [{ error, fileVersion, isReady, viewerHeight }, dispatch] = useReducer(
		pdfViewerReducer,
		INITIAL_PDF_VIEWER_STATE,
	);

	useEffect(() => {
		let isCancelled = false;

		fileRef.current = null;
		dispatch({ type: "resetForData" });

		const createPdf = async () => {
			if (!styleProjection || !publicResume) return createResumePdfBlob(data);

			let projection = styleProjection;
			let reason = await projectionMismatchReason(data, projection).catch(() => "invalid-projection" as const);
			const publicKey = `${publicResume.username}/${publicResume.slug}`;
			if (projectionRetryRef.current.data !== data || projectionRetryRef.current.publicKey !== publicKey) {
				projectionRetryRef.current = { data, publicKey, retried: false };
			}
			if (reason && refetchStyleProjection && !projectionRetryRef.current.retried) {
				projectionRetryRef.current.retried = true;
				try {
					projection = await refetchStyleProjection();
					reason = await projectionMismatchReason(data, projection).catch(() => "invalid-projection" as const);
				} catch {
					// The original mismatch still requires the authorized server-rendered fallback.
				}
			}
			if (!reason) return createResumePdfBlob(data, undefined, undefined, { publicStyleProjection: projection });

			const search = new URLSearchParams({
				reason,
				registryFingerprint: projection.registryFingerprint,
				adapterFingerprint: projection.adapterFingerprint,
			});
			const response = await fetch(
				`/api/resumes/${encodeURIComponent(publicResume.username)}/${encodeURIComponent(publicResume.slug)}/pdf?${search}`,
				{ credentials: "include" },
			);
			if (!response.ok) throw new Error(`Public PDF fallback failed with ${response.status}`);
			return response.blob();
		};

		void createPdf()
			.then((blob) => {
				if (isCancelled) return;

				fileRef.current = blob;
				dispatch({ type: "fileLoaded" });
			})
			.catch((error: unknown) => {
				if (!isCancelled) {
					console.error("Failed to generate public resume PDF", error);
					dispatch({ type: "error" });
				}
			});

		return () => {
			isCancelled = true;
		};
	}, [data, publicResume, refetchStyleProjection, styleProjection]);

	useEffect(() => {
		void fileVersion;

		const root = rootRef.current;
		const container = containerRef.current;
		const viewer = viewerRef.current;
		const file = fileRef.current;

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
				dispatch({ type: "height", height: nextHeight });
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
		dispatch({ type: "viewerLoading" });
		resizeObserver = new ResizeObserver(syncViewerHeight);
		resizeObserver.observe(viewer);

		const loadDocument = async () => {
			if (isCancelled) return;
			const arrayBuffer = await file.arrayBuffer();

			if (!isCancelled) {
				loadingTask = getDocument({
					data: new Uint8Array(arrayBuffer),
					docBaseUrl: window.location.href,
				});

				const nextDocument = await loadingTask.promise;

				if (isCancelled) {
					void loadingTask.destroy();
				} else {
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
					dispatch({ type: "ready" });
				}
			}
		};

		void loadDocument().catch((error: unknown) => {
			if (!isCancelled) {
				console.error("Failed to render public resume PDF with PDF.js", error);
				dispatch({ type: "error" });
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
			void loadingTask?.destroy();
			viewer.replaceChildren();
		};
	}, [fileVersion]);

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
