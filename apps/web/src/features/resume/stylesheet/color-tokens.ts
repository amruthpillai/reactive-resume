import type { StyleProgram } from "@reactive-resume/resume/stylesheet";
import { PROPERTY_REGISTRY_V1 } from "@reactive-resume/resume/stylesheet";

export type SemanticCssColorToken = {
	from: number;
	to: number;
	value: string;
};

// Contextual currentcolor cannot be resolved by the literal color picker.
const colorValue =
	/^(?:#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([^)]*\)|(?:aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|transparent|white|yellow))$/i;

// Keep comments and strings whole so their contents cannot be mistaken for editable color values.
const declarationToken =
	/\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|:|(?:rgba?|hsla?)\([^)]*\)|#[\da-f]{3,8}\b|\b[a-z]+\b/gi;

function normalizeColor(value: string): string {
	return value
		.replaceAll(/\/\*[\s\S]*?\*\//g, "")
		.replaceAll(/\s+/g, " ")
		.replaceAll(/\s*([(),/])\s*/g, "$1")
		.trim()
		.toLowerCase();
}

const isColorProperty = (property: string) =>
	PROPERTY_REGISTRY_V1[property] !== undefined &&
	(PROPERTY_REGISTRY_V1[property]?.category === "color" || property.endsWith("-color"));

export function collectCompiledColorTokens(
	source: string,
	program: StyleProgram | null,
): readonly SemanticCssColorToken[] {
	if (!program) return [];
	const tokens = new Map<string, SemanticCssColorToken>();

	for (const rule of program.rules) {
		for (const declaration of rule.declarations) {
			if (!isColorProperty(declaration.property) || !colorValue.test(declaration.value)) continue;
			const declarationSource = source.slice(declaration.range.start.offset, declaration.range.end.offset);
			const compiledColor = normalizeColor(declaration.value);
			let inValue = false;
			for (const match of declarationSource.matchAll(declarationToken)) {
				const value = match[0];
				if (value === ":") inValue = true;
				if (!inValue || !colorValue.test(value) || normalizeColor(value) !== compiledColor) continue;
				const from = declaration.range.start.offset + match.index;
				const token = { from, to: from + value.length, value };
				tokens.set(`${token.from}:${token.to}`, token);
			}
		}
	}

	return [...tokens.values()].sort((left, right) => left.from - right.from);
}
