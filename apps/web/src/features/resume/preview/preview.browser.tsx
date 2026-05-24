import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import type { CSSProperties } from "react";
import type { ResolvedResumePreviewProps } from "./preview.shared";
import { useEffect, useRef, useState } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { cn } from "@reactive-resume/utils/style";
import { client } from "@/libs/orpc/client";
import { useResumeData } from "../builder/draft";
import {
	DEFAULT_PDF_PAGE_SIZE,
	getResumePreviewGapValue,
	getResumePreviewPageCount,
	getScaledPreviewPageSize,
	ResumePreviewLoader,
} from "./preview.shared";

const PAGED_JS_URL = "/vendor/paged.polyfill.js";

const UPDATE_DEBOUNCE_MS = 100;

function buildPagedSrcdoc(rawHtml: string, pageIndex: number): string {
	const withBaseHref = rawHtml.includes("<base ")
		? rawHtml
		: rawHtml.replace("</head>", `<base href="${window.location.origin}/" />\n</head>`);
	const handlerScript = `
<style>
@page {
  size: 595.28px 841.89px;
  margin: 0;
}
</style>
<script src="${PAGED_JS_URL}"></script>
<script>
(function() {
  var __idx = ${pageIndex};
  class PageHandler extends window.Paged.Handler {
    afterRendered(pages) {
      if (pages.length > __idx) {
        var s = document.createElement('style');
        s.textContent = '.pagedjs_page{display:none!important}.pagedjs_page:nth-child(' + (__idx + 1) + '){display:block!important}body,html{margin:0;overflow:hidden}';
        document.head.appendChild(s);
      }
      window.parent.postMessage({ type: 'paged-ready', count: pages.length }, '*');
    }
  }
  window.Paged.registerHandlers(PageHandler);
})();
</script>`;
	return withBaseHref.replace("</head>", `${handlerScript}\n</head>`);
}

export function ResumePreviewClient({
	className,
	data,
	pageGap = 16,
	pageLayout,
	showPageNumbers,
}: ResolvedResumePreviewProps) {
	const builderResumeData = useResumeData();
	const resumeData = data ?? builderResumeData;
	const { centerView } = useControls();
	const [rawHtml, setRawHtml] = useState<string | null>(null);
	const [pageCount, setPageCount] = useState(0);
	const requestIdRef = useRef(0);
	const hasRenderedRef = useRef(false);
	const centeredSignatureRef = useRef<string | null>(null);

	// Render Nunjucks → rawHtml on resume data change
	useEffect(() => {
		if (!resumeData) return;
		setRawHtml(null);
		setPageCount(0);

		const delay = hasRenderedRef.current ? UPDATE_DEBOUNCE_MS : 0;
		hasRenderedRef.current = true;

		let cancelled = false;
		const requestId = ++requestIdRef.current;

		const doRender = async () => {
			if (typeof window === "undefined") return;

			const { render } = await import("@reactive-resume/renderer");
			const templateId = resumeData.metadata.template ?? "";
			const baseUrl = window.location.origin;

			let files: Record<string, string>;
			let templateMetadata: TemplateMetadata;

			try {
				const templateRecord = await client.templates.exportTemplate({ id: templateId });
				files = templateRecord.files as Record<string, string>;
				templateMetadata = templateRecord.metadata;
			} catch (fetchError) {
				if (cancelled || requestId !== requestIdRef.current) return;
				console.error("[Resume Preview] Failed to fetch template:", fetchError);
				return;
			}

			try {
				const html = render(files, resumeData, templateMetadata, templateId, baseUrl);
				if (cancelled || requestId !== requestIdRef.current) return;
				setRawHtml(html);
				// Optimistic page count from layout definition; Paged.js will correct it via postMessage
				setPageCount(Math.max(1, resumeData.metadata.layout.pages.length));
			} catch (error) {
				if (cancelled || requestId !== requestIdRef.current) return;
				console.error("[Resume Preview] Render error:", error);
			}
		};

		const timeoutId = window.setTimeout(() => {
			void doRender();
		}, delay);
		return () => {
			cancelled = true;
			window.clearTimeout(timeoutId);
		};
	}, [resumeData]);

	// Listen for Paged.js postMessage to get the actual rendered page count
	useEffect(() => {
		const handler = (e: MessageEvent) => {
			if (e.data?.type !== "paged-ready") return;
			setPageCount(Math.max(1, e.data.count as number));
		};
		window.addEventListener("message", handler);
		return () => window.removeEventListener("message", handler);
	}, []);

	useEffect(() => {
		if (!resumeData || !rawHtml) return;

		const visiblePageCount = pageCount || getResumePreviewPageCount(resumeData);
		const signature = `${resumeData.metadata.template ?? ""}:${pageLayout}:${visiblePageCount}`;
		if (centeredSignatureRef.current === signature) return;

		const rafId = window.requestAnimationFrame(() => {
			centerView(undefined, 0);
			centeredSignatureRef.current = signature;
		});

		return () => window.cancelAnimationFrame(rafId);
	}, [centerView, pageCount, pageLayout, rawHtml, resumeData]);

	if (!resumeData) return null;

	const initialPageCount = getResumePreviewPageCount(resumeData);
	const renderedGap = getResumePreviewGapValue(pageGap);
	const pageSize = getScaledPreviewPageSize(DEFAULT_PDF_PAGE_SIZE, 1);

	if (rawHtml === null) {
		return (
			<ResumePreviewLoader
				pageCount={1}
				pageClassName={undefined}
				pageGap={pageGap}
				pageLayout={pageLayout}
				pageScale={1}
				showPageNumbers={showPageNumbers}
			/>
		);
	}

	const visiblePageCount = pageCount || initialPageCount;

	return (
		<div
			style={{ "--resume-preview-page-gap": renderedGap } as CSSProperties}
			className={cn(
				"flex justify-start gap-(--resume-preview-page-gap)",
				pageLayout === "horizontal" ? "flex-row items-start" : "flex-col items-center",
				className,
			)}
		>
			{Array.from({ length: visiblePageCount }, (_, i) => (
				<figure key={i} className="shrink-0">
					{showPageNumbers && (
						<figcaption className="mb-1 font-medium text-[0.625rem] text-muted-foreground">
							Page {i + 1} of {visiblePageCount}
						</figcaption>
					)}
					<iframe
						title={`Resume page ${i + 1}`}
						sandbox="allow-scripts allow-same-origin"
						srcDoc={buildPagedSrcdoc(rawHtml, i)}
						className="block rounded-md border-0 bg-white"
						style={{ width: pageSize.width, height: pageSize.height, pointerEvents: "none" }}
					/>
				</figure>
			))}
		</div>
	);
}
