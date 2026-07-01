import type { PreviewPageSize } from "@/features/resume/preview/preview.shared";
import { Trans } from "@lingui/react/macro";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { PdfCanvasDocument, PdfCanvasPage } from "@/features/resume/preview/pdf-canvas";
import { useTemplateEditorStore } from "@/features/template-editor/store";
import { buildDemoResumeData } from "@/features/template-editor/wysiwyg/theme";

// Render the exact PDF output of the demo resume through the user's custom
// template, using the same @react-pdf → pdf.js pipeline as the resume builder.
// This is the source-of-truth verification for the DOM editing canvas.

const REGENERATE_DEBOUNCE_MS = 350;
const PAGE_SCALE = 1;

export function TemplatePdfPreview() {
	const data = useTemplateEditorStore((state) => state.template?.data);

	const [blob, setBlob] = useState<Blob | null>(null);
	const [pageSizes, setPageSizes] = useState<Record<number, PreviewPageSize>>({});
	const requestIdRef = useRef(0);
	const hasRenderedRef = useRef(false);

	useEffect(() => {
		if (!data) return;

		let cancelled = false;
		const requestId = ++requestIdRef.current;
		const delay = hasRenderedRef.current ? REGENERATE_DEBOUNCE_MS : 0;

		const timer = window.setTimeout(() => {
			void (async () => {
				try {
					const nextBlob = await createResumePdfBlob(buildDemoResumeData(data));
					if (cancelled || requestId !== requestIdRef.current) return;
					hasRenderedRef.current = true;
					setBlob(nextBlob);
				} catch (error) {
					console.error("Failed to render template preview", error);
				}
			})();
		}, delay);

		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, [data]);

	return (
		<ScrollArea className="h-[calc(100svh-3.5rem)] bg-secondary/30">
			{blob ? (
				<PdfCanvasDocument file={blob} onLoadSuccess={() => {}}>
					{(document) => (
						<div className="flex flex-col items-center gap-4 py-8">
							{Array.from({ length: document.numPages }, (_, index) => {
								const pageNumber = index + 1;
								return (
									<PdfCanvasPage
										key={pageNumber}
										document={document}
										pageNumber={pageNumber}
										pageScale={PAGE_SCALE}
										totalPages={document.numPages}
										pageSize={pageSizes[pageNumber]}
										showPageNumbers
										className="shadow-xl ring-1 ring-border/20"
										onLoadSuccess={(_, pageSize) => {
											setPageSizes((current) => ({ ...current, [pageNumber]: pageSize }));
										}}
									/>
								);
							})}
						</div>
					)}
				</PdfCanvasDocument>
			) : (
				<div className="flex h-full items-center justify-center gap-2 text-muted-foreground text-sm">
					<CircleNotchIcon className="size-4 animate-spin" />
					<Trans>Rendering preview…</Trans>
				</div>
			)}
		</ScrollArea>
	);
}
