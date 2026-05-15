import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { useMemo } from "react";
import { createResumePdfBlob as createPdfBlob } from "@reactive-resume/pdf/browser";
import { ResumeDocument } from "@reactive-resume/pdf/document";
import { createSectionTitleResolverForLocale, useSectionTitleResolver } from "@/libs/resume/section-title-locale";

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

export const createResumePdfBlob = async (data: ResumeData, template?: Template) => {
	const sectionTitleResolver = await createSectionTitleResolverForLocale(data.metadata.page.locale);

	return createPdfBlob({
		data,
		template,
		resolveSectionTitle: sectionTitleResolver,
	});
};
