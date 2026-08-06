import type { CompiledStyleRule, StyleProgram } from "./types";

export const SUPPORTED_SEMANTIC_CSS_VERSIONS = Object.freeze([1] as const);

type StylesheetCompiler = (rules: readonly CompiledStyleRule[]) => StyleProgram;

function compileVersionOne(rules: readonly CompiledStyleRule[]): StyleProgram {
	return Object.freeze({ languageVersion: 1, rules: Object.freeze([...rules]) });
}

const COMPILERS = Object.freeze({ 1: compileVersionOne } satisfies Record<
	(typeof SUPPORTED_SEMANTIC_CSS_VERSIONS)[number],
	StylesheetCompiler
>);

export function getStylesheetCompiler(version: number): StylesheetCompiler | undefined {
	return COMPILERS[version as keyof typeof COMPILERS];
}
