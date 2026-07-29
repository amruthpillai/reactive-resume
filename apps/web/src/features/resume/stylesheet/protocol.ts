import type {
	BrowserPdfPreflightResult,
	PdfPreflightPageLimits,
	StylesheetPreflightInput,
} from "@reactive-resume/pdf/preflight";
import type {
	AuthoredPageContext,
	BaseSettingsSnapshot,
	RrssDiagnostic,
	SemanticNode,
	StyleProgram,
} from "@reactive-resume/resume/stylesheet";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { RrssColorToken } from "./color-tokens";

export type RrssEditorMetadata = {
	semanticTree: SemanticNode;
	templateParts: readonly string[];
};

export type CompileWorkerInput = {
	editGeneration: number;
	source: StylesheetSource;
	semanticTree: SemanticNode;
	baseSettings: BaseSettingsSnapshot;
	pages: readonly AuthoredPageContext[];
};

export type CompileWorkerRequest = CompileWorkerInput & {
	type: "compile";
	requestId: number;
};

export type CompileWorkerResponse = {
	type: "compile_result";
	requestId: number;
	editGeneration: number;
	program: StyleProgram | null;
	diagnostics: readonly RrssDiagnostic[];
	colorTokens?: readonly RrssColorToken[];
};

export type PreflightLimits = PdfPreflightPageLimits & {
	maxPages: number;
	maxBytes: number;
};

export type PreflightWorkerInput = {
	editGeneration: number;
	input: StylesheetPreflightInput;
	limits: PreflightLimits;
};

export type PreflightWorkerRequest = PreflightWorkerInput & {
	type: "preflight";
	requestId: number;
};

export type PreflightWorkerResponse = {
	type: "preflight_result";
	requestId: number;
	editGeneration: number;
	result: BrowserPdfPreflightResult;
};

export type StylesheetResumeSnapshot = {
	data: ResumeData;
};

export function getPreflightTransferables(response: PreflightWorkerResponse): Transferable[] {
	return response.result.ok ? [response.result.pdf] : [];
}
