/// <reference path="./css-tree.d.ts" />
/// <reference path="./specificity.d.ts" />

export type { SemanticCssCompilerDiagnosticCode } from "./diagnostics";
export type { PropertyDefinition, PropertyRegistry } from "./registry/properties";
export type { SemanticNodeDefinition, SemanticRegistry } from "./registry/semantic";
export type { SystemVariableDefinition, SystemVariableRegistry } from "./registry/system-variables";
export type { CompiledSelector, CompileSelectorResult, Specificity } from "./selector";
export type { GeneratedStylesheet, GeneratedStylesheetBlock } from "./serialize";
export type {
	AuthoredPageContext,
	BaseSettingsSnapshot,
	CompiledDeclaration,
	CompiledMediaQuery,
	CompiledStyleRule,
	CompileStylesheetResult,
	DiagnosticSeverity,
	MediaFeature,
	ParsedAtRule,
	ParsedStylesheet,
	ResolvedNodeStyle,
	ResolvedPageDimensions,
	ResolvedPageSize,
	ResolveStylesheetContext,
	ResolveStylesheetInput,
	ResolveStylesheetResult,
	SemanticCssDiagnostic,
	SemanticNode,
	SemanticNodeKind,
	SourcePosition,
	SourceRange,
	StructuralPresentation,
	StyleProgram,
} from "./types";
export { analyzeStylesheet } from "./analyze";
export { resolveStylesheet } from "./cascade";
export { compileStylesheet } from "./compile";
export { isFatalStylesheetDiagnostic, SEMANTIC_CSS_DIAGNOSTIC_CATALOG_V1 } from "./diagnostics";
export { SEMANTIC_CSS_LIMITS_V1 } from "./limits";
export { parseStylesheet } from "./parse";
export { PROPERTY_REGISTRY_V1 } from "./registry/properties";
export {
	canContainNode,
	SEMANTIC_NODE_KINDS,
	SEMANTIC_REGISTRY_V1,
	TEMPLATE_PART_CHILD_KINDS_V1,
} from "./registry/semantic";
export { createSystemVariables, SYSTEM_VARIABLE_REGISTRY_V1 } from "./registry/system-variables";
export { compileSelector, createSelectorMatcher, getSpecificity, matchesSelector } from "./selector";
export { escapeCssComment, escapeCssString, serializeGeneratedStylesheet } from "./serialize";
export { SUPPORTED_SEMANTIC_CSS_VERSIONS } from "./version";
