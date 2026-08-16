import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { ResumeRenderOptions } from "./context";
import type { SectionTitleResolver } from "./section-title";
import type { ResolvedResumeRuntime, ResumePdfRenderResult } from "./semantic";
import { createElement } from "react";
import { parseResumeData } from "@reactive-resume/schema/resume/data";
import { pdf } from "#react-pdf-renderer";
import { ResumeDocument } from "./document";
import { inspectResumePdf } from "./semantic";

export type {
	BrowserPdfPreflightResult,
	PdfPreflightFailure,
	PdfPreflightPageLimits,
	PdfPreflightResult,
	RenderPreflightPdfResult,
	StylesheetPreflightInput,
} from "./semantic/preflight-core";
export { renderPreflightPdf } from "./semantic/preflight-core";

export type CreateResumePdfBlobOptions = {
	data: ResumeData;
	template?: Template | undefined;
	renderOptions?: ResumeRenderOptions | undefined;
	resolveSectionTitle?: SectionTitleResolver | undefined;
};

export type CreateResumePdfBlobResultOptions = CreateResumePdfBlobOptions & {
	inspection?: ResolvedResumeRuntime | undefined;
};

const renderResumePdfBlob = ({ data, template, renderOptions, resolveSectionTitle }: CreateResumePdfBlobOptions) => {
	const document = createElement(ResumeDocument, {
		data,
		template: template ?? data.metadata.template,
		...(renderOptions ? { renderOptions } : {}),
		resolveSectionTitle,
	}) as Parameters<typeof pdf>[0];

	return pdf(document).toBlob();
};

export const createResumePdfBlobResult = async ({
	inspection,
	...options
}: CreateResumePdfBlobResultOptions): Promise<ResumePdfRenderResult<Blob>> => {
	const normalizedOptions = { ...options, data: parseResumeData(options.data) };
	const resolvedInspection = inspection ?? inspectResumePdf(normalizedOptions);

	return {
		ok: true,
		value: await renderResumePdfBlob(normalizedOptions),
		diagnostics: resolvedInspection.diagnostics,
	};
};

export const createResumePdfBlob = async (options: CreateResumePdfBlobOptions): Promise<Blob> => {
	const result = await createResumePdfBlobResult(options);
	if (!result.ok) {
		throw new Error("The semantic stylesheet could not be rendered.", { cause: result.diagnostics });
	}
	return result.value;
};
