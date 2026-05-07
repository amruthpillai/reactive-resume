import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { pdf } from "@react-pdf/renderer";
import { useMemo } from "react";
import { ResumeDocument } from "@reactive-resume/pdf/document";
import { createSectionTitleResolverForLocale, useSectionTitleResolver } from "./section-title-locale";

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

const createLocalizedResumeDocument = async (data: ResumeData, template?: Template) => {
	const sectionTitleResolver = await createSectionTitleResolverForLocale(data.metadata.page.locale);

	return (
		<ResumeDocument
			data={data}
			template={template ?? data.metadata.template}
			resolveSectionTitle={sectionTitleResolver}
		/>
	);
};

export const createResumePdfBlob = async (data: ResumeData, template?: Template) => {
	return pdf(await createLocalizedResumeDocument(data, template)).toBlob();
};
