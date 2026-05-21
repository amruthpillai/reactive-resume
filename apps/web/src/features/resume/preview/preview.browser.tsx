import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import type { CSSProperties } from "react";
import type { ResolvedResumePreviewProps } from "./preview.shared";
import { useEffect, useRef, useState } from "react";
import { cn } from "@reactive-resume/utils/style";
import { useResumeData } from "../builder/draft";
import { getResumePreviewGapValue, getResumePreviewPageCount, ResumePreviewLoader } from "./preview.shared";

const UPDATE_DEBOUNCE_MS = 100;

function getTemplateId(resumeData: ResumeData): string {
	return resumeData.metadata.template ?? "test";
}

function buildTemplateMetadata(resumeData: ResumeData): TemplateMetadata {
	const { metadata } = resumeData;
	return {
		id: getTemplateId(resumeData),
		name: metadata.template,
		sidebarPosition: metadata.layout.sidebarPosition ?? "none",
		tags: [],
		fonts: [],
		typography: metadata.typography?.slots
			? Object.entries(metadata.typography.slots).map(([id, slot]) => ({
					id,
					label: id,
					defaultFont: slot.fontFamily,
					defaultSize: slot.fontSize,
					defaultWeight: slot.fontWeight,
					defaultLineHeight: slot.lineHeight,
				}))
			: [],
	};
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
	const [srcdoc, setSrcdoc] = useState<string | null>(null);
	const requestIdRef = useRef(0);
	const hasRenderedRef = useRef(false);

	useEffect(() => {
		if (!resumeData) return;
		setSrcdoc(null);

		const delay = hasRenderedRef.current ? UPDATE_DEBOUNCE_MS : 0;
		hasRenderedRef.current = true;

		let cancelled = false;
		const requestId = ++requestIdRef.current;

		const doRender = async () => {
			if (typeof window === "undefined") return;

			const { render } = await import("@reactive-resume/renderer");

			const templateMetadata = buildTemplateMetadata(resumeData);
			const templateId = getTemplateId(resumeData);
			const baseUrl = window.location.origin;

			const files: Record<string, string> = {
				"index.html": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Resume</title>
{% include "sections/metadata.html" ignore missing %}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: {{ page.format or 'A4' }}; margin: 0; }
html, body { width: 100%; height: 100%; }
body { font-family: var(--resume-font-body, sans-serif); color: var(--resume-foreground, #000); background: var(--resume-background, #fff); }
</style>
</head>
<body>
{% for sectionId, section in sections.items() %}
{% if not section.hidden %}
<section>
  <h2>{{ section.title }}</h2>
  {% for item in section.items | selectVisible %}
  <div style="margin-bottom: 6pt;">
    <strong>{{ item.position or item.company or item.name or item.title }}</strong>
    {% if item.period %}<span>{{ item.period }}</span>{% endif %}
    {{ item.description | safe }}
  </div>
  {% endfor %}
</section>
{% endif %}
{% endfor %}
</body>
</html>`,
			};

			try {
				const html = render(files, resumeData, templateMetadata, templateId, baseUrl);
				if (cancelled || requestId !== requestIdRef.current) return;
				setSrcdoc(html);
			} catch (error) {
				if (cancelled || requestId !== requestIdRef.current) return;
				console.error("[Resume Preview] Render error:", error);
				setSrcdoc("");
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

	if (!resumeData) return null;

	const pageCount = getResumePreviewPageCount(resumeData);
	const renderedGap = getResumePreviewGapValue(pageGap);

	if (srcdoc === null) {
		return (
			<ResumePreviewLoader
				pageCount={pageCount}
				pageClassName={undefined}
				pageGap={pageGap}
				pageLayout={pageLayout}
				pageScale={1}
				showPageNumbers={showPageNumbers}
			/>
		);
	}

	return (
		<div className={cn("grid", className)}>
			<div style={{ "--resume-preview-page-gap": renderedGap } as CSSProperties}>
				<iframe
					title="Resume preview"
					sandbox="allow-same-origin"
					srcDoc={srcdoc}
					className="block w-full rounded-md border-0 bg-white"
					style={{ width: "100%", height: "100%" }}
				/>
			</div>
		</div>
	);
}
