import type { StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { CssNode } from "css-tree";
import type { CompileStylesheetResult } from "./types";
import { createDiagnostic } from "./diagnostics";
import { parseStylesheet } from "./parse";
import { compileSelector } from "./selector";
import { getStylesheetCompiler } from "./version";

function isPositiveInteger(value: string): boolean {
	return /^[1-9]\d*$/.test(value);
}

export function compileStylesheet(source: StylesheetSource): CompileStylesheetResult {
	const stylesheet = parseStylesheet(source.text);
	const diagnostics = [...stylesheet.diagnostics];
	const versionDirectives = stylesheet.atRules.filter((atRule) => atRule.name === "rr-version");

	if (versionDirectives.length === 0 && source.languageVersion === 1) {
		diagnostics.push(
			createDiagnostic(
				"MISSING_VERSION_DIRECTIVE",
				"warning",
				"Version-one stylesheets should start with @rr-version 1;",
			),
		);
	}

	if (versionDirectives.length > 1) {
		for (const directive of versionDirectives.slice(1)) {
			diagnostics.push(
				createDiagnostic(
					"DUPLICATE_RR_VERSION_DIRECTIVE",
					"error",
					"A stylesheet can contain only one @rr-version directive.",
					directive.range,
				),
			);
		}
	}

	for (const directive of versionDirectives) {
		if (directive.hasBlock || !isPositiveInteger(directive.prelude)) {
			diagnostics.push(
				createDiagnostic(
					"INVALID_RR_VERSION",
					"error",
					"@rr-version must contain one positive integer and no block.",
					directive.range,
				),
			);
			continue;
		}

		const version = Number(directive.prelude);
		if (version !== source.languageVersion) {
			diagnostics.push(
				createDiagnostic(
					"RR_VERSION_MISMATCH",
					"error",
					"@rr-version must match the stylesheet language version.",
					directive.range,
				),
			);
		}
	}

	for (const rule of stylesheet.rules) {
		const prelude = (rule as CssNode).prelude as CssNode;
		const result = compileSelector(prelude);
		if (!result.selector) {
			const range = prelude?.loc ? { start: { ...prelude.loc.start }, end: { ...prelude.loc.end } } : undefined;
			diagnostics.push(createDiagnostic("INVALID_SELECTOR", "error", result.error ?? "Invalid selector.", range));
		}
	}

	const compiler = getStylesheetCompiler(source.languageVersion);
	if (!compiler) {
		diagnostics.push(
			createDiagnostic("UNSUPPORTED_RR_VERSION", "error", `RRSS version ${source.languageVersion} is not supported.`),
		);
	}

	if (!compiler || diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
		return { program: null, diagnostics };
	}

	return { program: compiler(stylesheet), diagnostics };
}
