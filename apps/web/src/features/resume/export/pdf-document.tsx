import type { PublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SemanticStylesheet, StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { Template } from "@reactive-resume/schema/templates";
import { useMemo } from "react";
import { createResumePdfBlob as createPdfBlob } from "@reactive-resume/pdf/browser";
import { ResumeDocument } from "@reactive-resume/pdf/document";
import { createSectionTitleResolverForLocale, useSectionTitleResolver } from "@/libs/resume/section-title-locale";

type ResumePdfRenderOptions = {
	includeCoverLetterHeader?: boolean;
};

export type ResumePdfPresentation =
	| { stylesheet: Pick<SemanticStylesheet, "mode"> & { applied: StylesheetSource } }
	| { publicStyleProjection: PublicStyleProjection };

const withAppliedStylesheet = (data: ResumeData, presentation?: ResumePdfPresentation): ResumeData => {
	if (!presentation || !("stylesheet" in presentation)) return data;
	const { mode, applied } = presentation.stylesheet;
	return {
		...data,
		metadata: {
			...data.metadata,
			stylesheet: { mode, source: applied, applied },
		},
	};
};

export const useLocalizedResumeDocument = (data?: ResumeData, template?: Template) => {
	const sectionTitleResolver = useSectionTitleResolver(data?.metadata.page.locale);

	return useMemo(() => {
		if (!data || !sectionTitleResolver) return null;

		return (
			<ResumeDocument
				data={data}
				template={template ?? data.metadata.template}
				resolveSectionTitle={sectionTitleResolver}
			/>
		);
	}, [data, template, sectionTitleResolver]);
};

export const createResumePdfBlob = async (
	data: ResumeData,
	template?: Template,
	renderOptions?: ResumePdfRenderOptions,
	presentation?: ResumePdfPresentation,
) => {
	const sectionTitleResolver = await createSectionTitleResolverForLocale(data.metadata.page.locale);

	return createPdfBlob({
		data: withAppliedStylesheet(data, presentation),
		template,
		...(renderOptions ? { renderOptions } : {}),
		...(presentation && "publicStyleProjection" in presentation
			? { publicStyleProjection: presentation.publicStyleProjection }
			: {}),
		resolveSectionTitle: sectionTitleResolver,
	});
};
