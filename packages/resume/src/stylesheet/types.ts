import type { Design, Layout, Page, ResumeData, Typography } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";

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

export type SemanticNodeKind =
	| "resume"
	| "page"
	| "region"
	| "header"
	| "picture"
	| "name"
	| "headline"
	| "contact-list"
	| "contact-item"
	| "section"
	| "section-heading"
	| "section-items"
	| "item"
	| "item-header"
	| "field"
	| "link"
	| "icon"
	| "level"
	| "rich-text"
	| "rich-heading"
	| "blockquote"
	| "paragraph"
	| "list"
	| "list-item"
	| "list-item-content"
	| "list-marker"
	| "strong"
	| "emphasis"
	| "underline"
	| "strike"
	| "code"
	| "text-span"
	| "mark"
	| "hard-break"
	| "horizontal-rule"
	| "template-part";

export type SemanticNode = {
	key: string;
	kind: SemanticNodeKind;
	id?: string;
	attributes: Readonly<Record<string, string>>;
	roles: readonly string[];
	children: readonly SemanticNode[];
};

export type BaseSettingsSnapshot = Pick<ResumeData, "picture"> & {
	template: Template;
	design: Design;
	typography: Typography;
	page: Page;
	layout: Pick<Layout, "sidebarWidth">;
};

export type ResolvedPageDimensions = {
	width: number;
	height: number;
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
