import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { SectionTitleResolver } from "./section-title";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { ResumeDocument } from "./document";

type CreateResumePdfBlobOptions = {
	data: ResumeData;
	template?: Template | undefined;
	resolveSectionTitle?: SectionTitleResolver | undefined;
};

export const createResumePdfBlob = async ({ data, template, resolveSectionTitle }: CreateResumePdfBlobOptions) => {
	const document = createElement(ResumeDocument, {
		data,
		template: template ?? data.metadata.template,
		resolveSectionTitle,
	}) as Parameters<typeof pdf>[0];

	return pdf(document).toBlob();
};
