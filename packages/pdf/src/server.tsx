import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { SectionTitleResolver } from "./section-title";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { ResumeDocument } from "./document";

type CreateResumePdfFileOptions = {
	data: ResumeData;
	filename: string;
	template?: Template | undefined;
	resolveSectionTitle?: SectionTitleResolver | undefined;
};

export const createResumePdfFile = async ({
	data,
	filename,
	template,
	resolveSectionTitle,
}: CreateResumePdfFileOptions) => {
	const document = createElement(ResumeDocument, {
		data,
		template: template ?? data.metadata.template,
		resolveSectionTitle,
	}) as Parameters<typeof renderToBuffer>[0];
	const buffer = await renderToBuffer(document);
	const bytes = new Uint8Array(new ArrayBuffer(buffer.byteLength));
	bytes.set(buffer);

	return new File([bytes], filename, { type: "application/pdf" });
};
