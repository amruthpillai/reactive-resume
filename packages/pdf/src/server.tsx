import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { SectionTitleResolver } from "./section-title";
import type { ResolvedResumeRuntime, ResumePdfRenderResult } from "./semantic";
import { createElement } from "react";
import { renderToBuffer } from "#react-pdf-renderer";
import { ResumeDocument } from "./document";
import { hasSemanticErrors, inspectResumePdf } from "./semantic";

export type {
	PdfPreflightFailure,
	PdfPreflightPageLimits,
	PdfPreflightResult,
	RenderPreflightPdfResult,
	StylesheetPreflightInput,
	StylesheetPreflightRunner,
} from "./semantic/preflight-core";
export { renderPreflightPdf } from "./semantic/preflight-core";

export type CreateResumePdfFileOptions = {
	data: ResumeData;
	filename: string;
	template?: Template | undefined;
	resolveSectionTitle?: SectionTitleResolver | undefined;
};

export type CreateResumePdfFileResultOptions = CreateResumePdfFileOptions & {
	inspection?: ResolvedResumeRuntime | undefined;
};

const renderResumePdfFile = async ({ data, filename, template, resolveSectionTitle }: CreateResumePdfFileOptions) => {
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

export const createResumePdfFileResult = async ({
	inspection,
	...options
}: CreateResumePdfFileResultOptions): Promise<ResumePdfRenderResult<File>> => {
	const resolvedInspection = inspection ?? inspectResumePdf(options);
	if (hasSemanticErrors(resolvedInspection)) {
		return { ok: false, diagnostics: resolvedInspection.diagnostics };
	}

	return {
		ok: true,
		value: await renderResumePdfFile(options),
		diagnostics: resolvedInspection.diagnostics,
	};
};

export const createResumePdfFile = async (options: CreateResumePdfFileOptions): Promise<File> => {
	const result = await createResumePdfFileResult(options);
	if (!result.ok) {
		throw new Error("The semantic stylesheet could not be rendered.", { cause: result.diagnostics });
	}
	return result.value;
};
