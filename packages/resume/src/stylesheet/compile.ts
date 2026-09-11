import type { StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { CompileStylesheetResult } from "./types";
import { stylesheetCacheKey, stylesheetCompilationCache } from "./cache";
import { createDiagnostic, isFatalStylesheetDiagnostic } from "./diagnostics";
import { SEMANTIC_CSS_LIMITS_V1 } from "./limits";
import { parseStylesheet } from "./parse";
import { PROPERTY_REGISTRY_V1 } from "./registry/properties";
import { SEMANTIC_NODE_KINDS } from "./registry/semantic";
import { SYSTEM_VARIABLE_REGISTRY_V1 } from "./registry/system-variables";
import { compileProgram, cssFunctionDepth } from "./values";
import { getStylesheetCompiler } from "./version";

function isPositiveInteger(value: string): boolean {
	return /^[1-9]\d*$/.test(value);
}

export function compileStylesheet(source: StylesheetSource): CompileStylesheetResult {
	if (new TextEncoder().encode(source.text).byteLength > SEMANTIC_CSS_LIMITS_V1.maxSourceBytes) {
		return {
			program: null,
			diagnostics: [
				createDiagnostic("RESOURCE_LIMIT", "error", "The stylesheet source exceeds the Semantic CSS byte limit."),
			],
		};
	}

	if (cssFunctionDepth(source.text) > SEMANTIC_CSS_LIMITS_V1.maxFunctionDepth) {
		return {
			program: null,
			diagnostics: [
				createDiagnostic("RESOURCE_LIMIT", "error", "CSS function nesting exceeds the Semantic CSS limit."),
			],
		};
	}

	const registry = JSON.stringify([PROPERTY_REGISTRY_V1, SEMANTIC_NODE_KINDS, SYSTEM_VARIABLE_REGISTRY_V1]);
	const cacheKey = stylesheetCacheKey(source.languageVersion, source.text, registry);
	const cached = stylesheetCompilationCache.get(cacheKey);
	if (cached) return cached;

	const stylesheet = parseStylesheet(source.text);
	const diagnostics = [...stylesheet.diagnostics];
	const versionDirectives = stylesheet.atRules.filter((atRule) => atRule.name === "version");

	if (versionDirectives.length === 0 && source.languageVersion === 1) {
		diagnostics.push(
			createDiagnostic("MISSING_VERSION_DIRECTIVE", "warning", "Version-one stylesheets should start with @version 1;"),
		);
	}

	if (versionDirectives.length > 1) {
		for (const directive of versionDirectives.slice(1)) {
			diagnostics.push(
				createDiagnostic(
					"DUPLICATE_VERSION_DIRECTIVE",
					"error",
					"A stylesheet can contain only one @version directive.",
					directive.range,
				),
			);
		}
	}

	for (const directive of versionDirectives) {
		if (directive.hasBlock || !isPositiveInteger(directive.prelude)) {
			diagnostics.push(
				createDiagnostic(
					"INVALID_VERSION",
					"error",
					"@version must contain one positive integer and no block.",
					directive.range,
				),
			);
			continue;
		}

		const version = Number(directive.prelude);
		if (version !== source.languageVersion) {
			diagnostics.push(
				createDiagnostic(
					"VERSION_MISMATCH",
					"error",
					"@version must match the stylesheet language version.",
					directive.range,
				),
			);
		}
	}

	const compiler = getStylesheetCompiler(source.languageVersion);
	if (!compiler) {
		diagnostics.push(
			createDiagnostic(
				"UNSUPPORTED_VERSION",
				"error",
				`Semantic CSS version ${source.languageVersion} is not supported.`,
			),
		);
	}

	if (!compiler || diagnostics.some(isFatalStylesheetDiagnostic)) {
		return { program: null, diagnostics };
	}

	const compiled = compileProgram(stylesheet, source.languageVersion);
	diagnostics.push(...compiled.diagnostics);
	if (!compiled.program || diagnostics.some(isFatalStylesheetDiagnostic)) {
		return { program: null, diagnostics };
	}

	const result = { program: compiler(compiled.program.rules), diagnostics };
	stylesheetCompilationCache.set(cacheKey, result);
	return result;
}
