import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { ResumeRenderOptions } from "./context";
import type { SectionTitleResolver } from "./section-title";
import type { ResolvedResumeRuntime, ResumePdfRenderResult } from "./semantic";
import { createElement } from "react";
import { pdf } from "#react-pdf-renderer";
import { ResumeDocument } from "./document";
import { hasSemanticErrors, inspectResumePdf } from "./semantic";

export type CreateResumePdfBlobOptions = {
	data: ResumeData;
	template?: Template | undefined;
	renderOptions?: ResumeRenderOptions | undefined;
	resolveSectionTitle?: SectionTitleResolver | undefined;
};

export type CreateResumePdfBlobResultOptions = CreateResumePdfBlobOptions & {
	inspection?: ResolvedResumeRuntime | undefined;
};

// biome-ignore lint/suspicious/useAwait: keep synchronous renderer errors on the public Promise rejection path.
export const createResumePdfBlob = async ({
	data,
	template,
	renderOptions,
	resolveSectionTitle,
}: CreateResumePdfBlobOptions) => {
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
	const resolvedInspection = inspection ?? inspectResumePdf(options);
	if (hasSemanticErrors(resolvedInspection)) {
		return { ok: false, diagnostics: resolvedInspection.diagnostics };
	}

	return {
		ok: true,
		value: await createResumePdfBlob(options),
		diagnostics: resolvedInspection.diagnostics,
	};
};
