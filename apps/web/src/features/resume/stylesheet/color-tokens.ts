import type { StyleProgram } from "@reactive-resume/resume/stylesheet";
import { PROPERTY_REGISTRY_V1 } from "@reactive-resume/resume/stylesheet";

export type RrssColorToken = {
	from: number;
	to: number;
	value: string;
};

const colorValue =
	/^(?:#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([^)]*\)|(?:aqua|black|blue|currentcolor|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|transparent|white|yellow))$/i;

const isColorProperty = (property: string) =>
	PROPERTY_REGISTRY_V1[property] !== undefined &&
	(PROPERTY_REGISTRY_V1[property]?.category === "color" || property.endsWith("-color"));

export function collectCompiledColorTokens(source: string, program: StyleProgram | null): readonly RrssColorToken[] {
	if (!program) return [];
	const tokens = new Map<string, RrssColorToken>();

	for (const rule of program.rules) {
		for (const declaration of rule.declarations) {
			if (!isColorProperty(declaration.property) || !colorValue.test(declaration.value)) continue;
			const declarationSource = source.slice(declaration.range.start.offset, declaration.range.end.offset);
			const valueOffset = declarationSource.indexOf(declaration.value, declarationSource.indexOf(":") + 1);
			if (valueOffset < 0) continue;
			const from = declaration.range.start.offset + valueOffset;
			const token = { from, to: from + declaration.value.length, value: declaration.value };
			tokens.set(`${token.from}:${token.to}`, token);
		}
	}

	return [...tokens.values()].sort((left, right) => left.from - right.from);
}
