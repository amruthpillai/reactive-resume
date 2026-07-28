export type { PropertyDefinition, PropertyRegistry } from "./registry/properties";
export type { SemanticNodeDefinition, SemanticRegistry } from "./registry/semantic";
export type { SystemVariableDefinition, SystemVariableRegistry } from "./registry/system-variables";
export type { RenderDataProjection } from "./render-data";
export type { RenderDataHashInput } from "./render-hash";
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
	RrssDiagnostic,
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
export { RRSS_LIMITS_V1 } from "./limits";
export { parseStylesheet } from "./parse";
export { PROPERTY_REGISTRY_V1 } from "./registry/properties";
export { canContainNode, SEMANTIC_NODE_KINDS, SEMANTIC_REGISTRY_V1 } from "./registry/semantic";
export { createSystemVariables, SYSTEM_VARIABLE_REGISTRY_V1 } from "./registry/system-variables";
export { projectPublicRenderData, projectRenderData } from "./render-data";
export { computeRenderDataHash } from "./render-hash";
export { compileSelector, createSelectorMatcher, getSpecificity, matchesSelector } from "./selector";
export { escapeCssComment, escapeCssString, serializeGeneratedStylesheet } from "./serialize";
export { SUPPORTED_RRSS_VERSIONS } from "./version";
