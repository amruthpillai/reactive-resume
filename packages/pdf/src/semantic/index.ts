import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { StylesheetMode, StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { Template } from "@reactive-resume/schema/templates";
import type { ResolvedResumeRuntime } from "./resolve";
import { resolveResumeRuntime, resolveStylesheetMode } from "./resolve";

export type InspectResumePdfOptions = {
	data: ResumeData;
	template?: Template | undefined;
	source?: StylesheetSource | undefined;
	mode?: StylesheetMode | undefined;
};

export type ResumePdfRenderResult<T> =
	| { ok: true; value: T; diagnostics: ResolvedResumeRuntime["diagnostics"] }
	| { ok: false; diagnostics: ResolvedResumeRuntime["diagnostics"] };

export const inspectResumePdf = ({
	data,
	template = data.metadata.template,
	source,
	mode = resolveStylesheetMode(data),
}: InspectResumePdfOptions): ResolvedResumeRuntime =>
	resolveResumeRuntime({
		data,
		template,
		mode,
		...(source ? { source } : {}),
	});

export type {
	ResolvedResumeRuntime,
	ResolveResumePresentationInput,
} from "./resolve";
export * from "./legacy-converter";
export * from "./legacy-parity";
export * from "./preflight-core";
export {
	resolveResumePresentation,
	resolveResumeRuntime,
	resolveStylesheetMode,
} from "./resolve";
export * from "./tree";
