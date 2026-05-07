import type { PreviewPageSize, ResolvedResumePreviewProps } from "./preview.shared";
import { pdf } from "@react-pdf/renderer";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@reactive-resume/utils/style";
import { useLocalizedResumeDocument } from "@/libs/resume/pdf-document";
import { PdfCanvasDocument, PdfCanvasPage } from "./pdf-canvas";
import { ResumePreviewLoader } from "./preview.shared";
import { useResumeData } from "./use-resume";

type PreviewPdf = {
	file: Blob;
	id: number;
	numPages: number;
	pageSizes: Record<number, PreviewPageSize>;
	phase: "active" | "exiting" | "staged";
	renderedPages: number[];
};

const UPDATE_DEBOUNCE_MS = 100;
const CROSSFADE_DURATION_MS = 180;

const createPreviewPdf = (file: Blob, id: number, hasExistingPreview: boolean): PreviewPdf => ({
	file,
	id,
	numPages: 0,
	pageSizes: {},
	phase: hasExistingPreview ? "staged" : "active",
	renderedPages: [],
});

const addPreviewLayer = (layers: PreviewPdf[], nextPdf: PreviewPdf) => {
	const activeLayers = layers.filter((layer) => layer.phase === "active");
	return activeLayers.length === 0 ? [nextPdf] : [...activeLayers, nextPdf];
};

const getActivePreviewLayer = (layers: PreviewPdf[]) => layers.find((layer) => layer.phase === "active") ?? null;

const setPreviewPageCount = (layers: PreviewPdf[], layerId: number, numPages: number) =>
	layers.map((layer) => (layer.id === layerId ? { ...layer, numPages } : layer));

const setPreviewPageSize = (layers: PreviewPdf[], layerId: number, pageNumber: number, pageSize: PreviewPageSize) =>
	layers.map((layer) =>
		layer.id === layerId
			? {
					...layer,
					pageSizes: {
						...layer.pageSizes,
						[pageNumber]: pageSize,
					},
				}
			: layer,
	);

const markPreviewPageRendered = (layers: PreviewPdf[], layerId: number, pageNumber: number) => {
	let shouldPromoteLayer = false;

	const nextLayers = layers.map((layer) => {
		if (layer.id !== layerId || layer.renderedPages.includes(pageNumber)) return layer;

		const renderedPages = [...layer.renderedPages, pageNumber];
		const nextLayer = { ...layer, renderedPages };

		if (layer.phase === "staged" && renderedPages.length >= layer.numPages) {
			shouldPromoteLayer = true;
			return { ...nextLayer, phase: "active" as const };
		}

		return nextLayer;
	});

	if (!shouldPromoteLayer) return nextLayers;

	return nextLayers.map((layer) => {
		if (layer.id === layerId) return layer;
		if (layer.phase === "active") return { ...layer, phase: "exiting" as const };

		return layer;
	});
};

const removePreviewLayer = (layers: PreviewPdf[], layerId: number) => layers.filter((layer) => layer.id !== layerId);

export function ResumePreviewClient({
	className,
	pageGap,
	pageLayout,
	pageScale,
	pageClassName,
	showPageNumbers,
}: ResolvedResumePreviewProps) {
	const resumeData = useResumeData();
	const resumeDocument = useLocalizedResumeDocument(resumeData);

	const [previewLayers, setPreviewLayers] = useState<PreviewPdf[]>([]);

	const pdfIdRef = useRef(0);
	const requestIdRef = useRef(0);
	const hasPreviewRef = useRef(false);

	useEffect(() => {
		if (!resumeDocument) return;

		let cancelled = false;
		const requestId = ++requestIdRef.current;
		const delay = hasPreviewRef.current ? UPDATE_DEBOUNCE_MS : 0;

		const generatePdfPreview = async () => {
			try {
				const blob = await pdf(resumeDocument).toBlob();

				if (cancelled || requestId !== requestIdRef.current) return;

				const nextPdf = createPreviewPdf(blob, pdfIdRef.current++, hasPreviewRef.current);

				hasPreviewRef.current = true;
				setPreviewLayers((current) => addPreviewLayer(current, nextPdf));
			} catch {}
		};

		const timeoutId = window.setTimeout(() => {
			void generatePdfPreview();
		}, delay);

		return () => {
			cancelled = true;
			window.clearTimeout(timeoutId);
		};
	}, [resumeDocument]);

	if (!resumeData) return null;

	const visiblePdf = getActivePreviewLayer(previewLayers);

	if (!visiblePdf) return <ResumePreviewLoader />;

	return (
		<div className={cn("grid", className)}>
			<AnimatePresence initial={false}>
				{previewLayers.map((visiblePdf) => (
					<motion.div
						key={visiblePdf.id}
						aria-hidden={visiblePdf.phase !== "active"}
						className={cn("col-start-1 row-start-1", visiblePdf.phase !== "active" && "pointer-events-none")}
						style={{ "--resume-preview-page-gap": pageGap } as React.CSSProperties}
						initial={{ opacity: visiblePdf.phase === "active" ? 1 : 0 }}
						animate={{ opacity: visiblePdf.phase === "active" ? 1 : 0 }}
						exit={{ opacity: 0 }}
						transition={{ duration: CROSSFADE_DURATION_MS / 1000, ease: "easeOut" }}
						onAnimationComplete={() => {
							if (visiblePdf.phase !== "exiting") return;
							setPreviewLayers((current) => removePreviewLayer(current, visiblePdf.id));
						}}
					>
						<PdfCanvasDocument
							file={visiblePdf.file}
							onLoadSuccess={(document) => {
								setPreviewLayers((current) => setPreviewPageCount(current, visiblePdf.id, document.numPages));
							}}
						>
							{(document) => (
								<div
									className={cn(
										"flex items-center justify-start gap-(--resume-preview-page-gap)",
										pageLayout === "horizontal" ? "flex-row" : "flex-col",
									)}
								>
									{Array.from({ length: visiblePdf.numPages }, (_, index) => {
										const pageNumber = index + 1;
										const totalPages = visiblePdf.numPages;
										const pageSize = visiblePdf.pageSizes[pageNumber];

										return (
											<PdfCanvasPage
												key={`${visiblePdf.id}-${pageNumber}`}
												document={document}
												pageSize={pageSize}
												pageNumber={pageNumber}
												pageScale={pageScale}
												totalPages={totalPages}
												className={pageClassName}
												showPageNumbers={showPageNumbers}
												onLoadSuccess={(_, pageSize) => {
													setPreviewLayers((current) =>
														setPreviewPageSize(current, visiblePdf.id, pageNumber, pageSize),
													);
												}}
												onRenderSuccess={() => {
													if (visiblePdf.phase !== "staged") return;

													setPreviewLayers((current) => markPreviewPageRendered(current, visiblePdf.id, pageNumber));
												}}
											/>
										);
									})}
								</div>
							)}
						</PdfCanvasDocument>
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
}
