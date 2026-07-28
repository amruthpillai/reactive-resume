export type DiagnosticSeverity = "error" | "warning";

export type SourcePosition = {
	line: number;
	column: number;
	offset: number;
};

export type SourceRange = {
	start: SourcePosition;
	end: SourcePosition;
};

export type RrssDiagnostic = {
	code: string;
	severity: DiagnosticSeverity;
	message: string;
	range: SourceRange;
};

export type StyleProgram = {
	languageVersion: number;
	rules: readonly unknown[];
};

export type ParsedAtRule = {
	name: string;
	prelude: string;
	hasBlock: boolean;
	range: SourceRange;
};

export type ParsedStylesheet = {
	ast: unknown;
	atRules: readonly ParsedAtRule[];
	rules: readonly unknown[];
	diagnostics: readonly RrssDiagnostic[];
};

export type CompileStylesheetResult = {
	program: StyleProgram | null;
	diagnostics: readonly RrssDiagnostic[];
};
