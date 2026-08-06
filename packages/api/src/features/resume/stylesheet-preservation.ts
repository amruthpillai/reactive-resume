import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Locale } from "@reactive-resume/utils/locale";
import { projectRenderData } from "@reactive-resume/resume/stylesheet/render-data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createSampleResumeData } from "@reactive-resume/schema/resume/sample";
import { EMPTY_SEMANTIC_CSS_SOURCE } from "@reactive-resume/schema/resume/stylesheet";

type CreateResumeDataOptions = {
	withSampleData?: boolean;
	name?: string;
	locale?: Locale;
};

export function preserveServerStylesheet(serverData: ResumeData, clientData: ResumeData): ResumeData {
	const { stylesheet: _clientStylesheet, ...metadata } = clientData.metadata;
	const stylesheet = serverData.metadata.stylesheet;

	return {
		...clientData,
		metadata: stylesheet ? { ...metadata, stylesheet: structuredClone(stylesheet) } : metadata,
	};
}

export function hasRenderDataChanged(before: ResumeData, after: ResumeData): boolean {
	return JSON.stringify(projectRenderData(before)) !== JSON.stringify(projectRenderData(after));
}

export function createResumeData(options: CreateResumeDataOptions): ResumeData {
	const data = structuredClone(options.withSampleData ? createSampleResumeData(options.name) : defaultResumeData);

	if (options.locale) data.metadata.page.locale = options.locale;
	data.metadata.stylesheet = {
		mode: "semantic",
		source: { languageVersion: 1, text: EMPTY_SEMANTIC_CSS_SOURCE },
		applied: { languageVersion: 1, text: EMPTY_SEMANTIC_CSS_SOURCE },
	};

	return data;
}
