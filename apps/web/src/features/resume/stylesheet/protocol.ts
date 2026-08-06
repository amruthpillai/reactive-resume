import type {
	BrowserPdfPreflightResult,
	PdfPreflightPageLimits,
	StylesheetPreflightInput,
} from "@reactive-resume/pdf/preflight";
import type {
	AuthoredPageContext,
	BaseSettingsSnapshot,
	SemanticCssDiagnostic,
	SemanticNode,
	StyleProgram,
} from "@reactive-resume/resume/stylesheet";
import type { StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { SemanticCssColorToken } from "./color-tokens";

export type SemanticCssEditorMetadata = {
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
	diagnostics: readonly SemanticCssDiagnostic[];
	colorTokens?: readonly SemanticCssColorToken[];
};

type PreflightLimits = PdfPreflightPageLimits & {
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

export type SerializedPreflightCause = {
	name: string;
	message: string;
	issues: readonly unknown[];
};

export type PreflightWorkerError = {
	type: "preflight_error";
	requestId: number;
	editGeneration: number;
	cause: SerializedPreflightCause;
};

export type PreflightWorkerReady = {
	type: "preflight_ready";
};

export function getPreflightTransferables(response: PreflightWorkerResponse): Transferable[] {
	return response.result.ok ? [response.result.pdf] : [];
}
