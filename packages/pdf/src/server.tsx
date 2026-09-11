import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { SectionTitleResolver } from "./section-title";
import { createElement } from "react";
import { parseResumeData } from "@reactive-resume/schema/resume/data";
import { renderToBuffer } from "#react-pdf-renderer";
import { ResumeDocument } from "./document";

export type CreateResumePdfFileOptions = {
	data: ResumeData;
	filename: string;
	template?: Template | undefined;
	resolveSectionTitle?: SectionTitleResolver | undefined;
};

export const createResumePdfFile = async ({
	data: input,
	filename,
	template,
	resolveSectionTitle,
}: CreateResumePdfFileOptions): Promise<File> => {
	const data = parseResumeData(input);
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
