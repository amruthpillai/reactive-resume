import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Locale } from "@reactive-resume/utils/locale";
import { ORPCError } from "@orpc/client";
import { projectRenderData } from "@reactive-resume/resume/stylesheet/render-data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createSampleResumeData } from "@reactive-resume/schema/resume/sample";
import { EMPTY_RRSS_SOURCE } from "@reactive-resume/schema/resume/stylesheet";

type CreateResumeDataOptions = {
	semanticCssDefault: boolean;
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
	if (options.semanticCssDefault) {
		data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: EMPTY_RRSS_SOURCE },
			applied: { languageVersion: 1, text: EMPTY_RRSS_SOURCE },
		};
	}

	return data;
}

export function assertResumeImportAvailable(data: unknown): void {
	if (
		typeof data !== "object" ||
		data === null ||
		!("metadata" in data) ||
		typeof data.metadata !== "object" ||
		data.metadata === null ||
		!Object.hasOwn(data.metadata, "stylesheet")
	) {
		return;
	}

	throw new ORPCError("SEMANTIC_STYLESHEET_UNAVAILABLE", {
		status: 400,
		message: "Semantic stylesheets cannot be imported until stylesheet validation is available.",
	});
}
