import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { useEffect, useState } from "react";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { cn } from "@reactive-resume/utils/style";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { createPdfFirstPageImageUrl } from "./pdf-thumbnail";

// ponytail: object URLs cached per (data, template) and never revoked. Bounded by hovers within one edit
// version; the WeakMap drops stale data keys once the resume is edited (new data object). Add explicit
// revocation only if profiling shows the leak matters.
const previewCache = new WeakMap<ResumeData, Map<Template, string>>();

const getCachedPreview = (data: ResumeData, template: Template) => previewCache.get(data)?.get(template);

const setCachedPreview = (data: ResumeData, template: Template, url: string) => {
	const templateCache = previewCache.get(data) ?? new Map<Template, string>();
	templateCache.set(template, url);
	previewCache.set(data, templateCache);
};

type TemplateLivePreviewProps = {
	alt: string;
	className?: string;
	data: ResumeData;
	fallbackSrc: string;
	template: Template;
};

/**
 * Renders the first page of the user's actual resume data through a given template, lazily.
 * Reuses the browser PDF pipeline (`createResumePdfBlob` + pdf.js first-page render). Falls back to the
 * static template image while generating or if generation fails. Intended to be mounted on demand (e.g.
 * inside a hover/preview card) so the render stays off the hover critical path.
 */
export function TemplateLivePreview({ alt, className, data, fallbackSrc, template }: TemplateLivePreviewProps) {
	const [imageUrl, setImageUrl] = useState<string | null>(() => getCachedPreview(data, template) ?? null);
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		const cached = getCachedPreview(data, template);
		if (cached) {
			setImageUrl(cached);
			return;
		}

		let cancelled = false;

		const generatePreview = async () => {
			try {
				const blob = await createResumePdfBlob(data, template);
				const url = await createPdfFirstPageImageUrl(blob);

				if (cancelled) {
					URL.revokeObjectURL(url);
					return;
				}

				setCachedPreview(data, template, url);
				setImageUrl(url);
			} catch {
				if (!cancelled) setHasError(true);
			}
		};

		void generatePreview();

		return () => {
			cancelled = true;
		};
	}, [data, template]);

	const isLoading = !imageUrl && !hasError;

	return (
		<div className={cn("relative aspect-page w-full overflow-hidden rounded-md bg-white", className)}>
			<img src={imageUrl ?? fallbackSrc} alt={alt} className="size-full object-contain" />
			{isLoading ? (
				<div className="absolute inset-0 flex items-center justify-center bg-white/40">
					<Spinner className="size-8" />
				</div>
			) : null}
		</div>
	);
}
