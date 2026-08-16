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
