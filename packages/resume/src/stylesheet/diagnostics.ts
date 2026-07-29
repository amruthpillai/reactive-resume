import type { RrssDiagnostic, SourceRange } from "./types";

type DiagnosticReference = {
	severity: RrssDiagnostic["severity"];
	meaning: string;
	action: string;
};

export const RRSS_DIAGNOSTIC_CATALOG_V1 = {
	MISSING_VERSION_DIRECTIVE: {
		severity: "warning",
		meaning: "The stylesheet omitted @rr-version.",
		action: "Add @rr-version 1; as the first statement.",
	},
	DUPLICATE_RR_VERSION_DIRECTIVE: {
		severity: "error",
		meaning: "More than one @rr-version directive was found.",
		action: "Keep exactly one version directive.",
	},
	INVALID_RR_VERSION: {
		severity: "error",
		meaning: "The version directive is not one positive integer without a block.",
		action: "Use @rr-version 1;.",
	},
	RR_VERSION_MISMATCH: {
		severity: "error",
		meaning: "The directive and stored language version disagree.",
		action: "Set both to version 1.",
	},
	UNSUPPORTED_RR_VERSION: {
		severity: "error",
		meaning: "The requested RRSS version is not implemented.",
		action: "Use @rr-version 1;.",
	},
	CSS_PARSE_ERROR: {
		severity: "error",
		meaning: "The stylesheet is not valid parseable CSS syntax.",
		action: "Fix the syntax at the reported source range.",
	},
	CSS_RAW_SYNTAX: {
		severity: "error",
		meaning: "The parser encountered unsupported raw CSS syntax.",
		action: "Rewrite the declaration or selector using documented RRSS syntax.",
	},
	FORBIDDEN_AT_RULE: {
		severity: "error",
		meaning: "The at-rule can load resources or execute unsupported CSS behavior.",
		action: "Remove the at-rule.",
	},
	UNSUPPORTED_AT_RULE: {
		severity: "error",
		meaning: "The at-rule is not part of RRSS version 1.",
		action: "Use only @rr-version and documented @media queries.",
	},
	INVALID_MEDIA_QUERY: {
		severity: "error",
		meaning: "The PDF dimension query is malformed or unsupported.",
		action: "Use width, min-width, max-width, height, min-height, or max-height with an RRSS length.",
	},
	MEDIA_PAGE_SIZE: {
		severity: "error",
		meaning: "A media rule attempts to change the page size it is evaluated against.",
		action: "Move the page size declaration outside @media.",
	},
	INVALID_SELECTOR: {
		severity: "error",
		meaning: "The selector uses unsupported syntax or exceeds selector limits.",
		action: "Rewrite it using documented RRSS selectors and combinators.",
	},
	UNSUPPORTED_PROPERTY: {
		severity: "error",
		meaning: "The property is not in the RRSS property registry.",
		action: "Choose a property from the property reference.",
	},
	SYSTEM_VARIABLE_READONLY: {
		severity: "error",
		meaning: "An author attempted to assign a reserved --rr-* variable.",
		action: "Read the system variable or rename the author variable.",
	},
	FORBIDDEN_CSS_VALUE: {
		severity: "error",
		meaning: "The value attempts to use an external resource or forbidden CSS capability.",
		action: "Use a PDF-safe local value.",
	},
	INVALID_VALUE: {
		severity: "error",
		meaning: "The value does not match the supported grammar for the property.",
		action: "Use the documented property value form.",
	},
	VARIABLE_CYCLE: {
		severity: "error",
		meaning: "Custom properties form a var() reference cycle.",
		action: "Break the cycle or provide a non-cyclic fallback.",
	},
	UNRESOLVED_VARIABLE: {
		severity: "error",
		meaning: "A var() reference has neither a value nor a usable fallback.",
		action: "Define the variable or add a fallback.",
	},
	EXTREME_VALUE: {
		severity: "warning",
		meaning: "A value is valid but likely to produce unusable output.",
		action: "Reduce the value unless the effect is intentional.",
	},
	SELECTOR_NO_MATCH: {
		severity: "warning",
		meaning: "The selector matches no node in the current resume and template.",
		action: "Check the ID, attribute value, placement, or template guard.",
	},
	PROPERTY_NOT_APPLICABLE: {
		severity: "warning",
		meaning: "The property cannot affect any matched semantic node kind.",
		action: "Target a node listed in the property's Applies to column.",
	},
	RESOURCE_LIMIT: {
		severity: "error",
		meaning: "Compilation, matching, values, variables, or semantic nodes exceeded a bounded RRSS limit.",
		action: "Reduce stylesheet or resume complexity.",
	},
} as const satisfies Readonly<Record<string, DiagnosticReference>>;

export type RrssCompilerDiagnosticCode = keyof typeof RRSS_DIAGNOSTIC_CATALOG_V1;

export const EMPTY_SOURCE_RANGE: SourceRange = {
	start: { line: 1, column: 1, offset: 0 },
	end: { line: 1, column: 1, offset: 0 },
};

export function createDiagnostic(
	code: RrssCompilerDiagnosticCode,
	severity: RrssDiagnostic["severity"],
	message: string,
	range: SourceRange = EMPTY_SOURCE_RANGE,
): RrssDiagnostic {
	return { code, severity, message, range };
}
