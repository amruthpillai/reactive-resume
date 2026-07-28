import type { ParsedStylesheet, StyleProgram } from "./types";

export const SUPPORTED_RRSS_VERSIONS = Object.freeze([1] as const);

type StylesheetCompiler = (stylesheet: ParsedStylesheet) => StyleProgram;

function compileVersionOne(stylesheet: ParsedStylesheet): StyleProgram {
	return Object.freeze({ languageVersion: 1, rules: Object.freeze([...stylesheet.rules]) });
}

const COMPILERS = Object.freeze({ 1: compileVersionOne } satisfies Record<
	(typeof SUPPORTED_RRSS_VERSIONS)[number],
	StylesheetCompiler
>);

export function getStylesheetCompiler(version: number): StylesheetCompiler | undefined {
	return COMPILERS[version as keyof typeof COMPILERS];
}
