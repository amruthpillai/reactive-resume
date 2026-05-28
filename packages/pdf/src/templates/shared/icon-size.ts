import type { Style } from "@react-pdf/types";
import type { StyleInput } from "./styles";
import { composeStyles } from "./styles";

const parseFiniteNumber = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) ? value : undefined;

const parsePxValue = (value: unknown): number | undefined => {
	if (typeof value !== "string" || !value.endsWith("px")) return undefined;

	const parsedValue = Number.parseFloat(value);
	return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

export const parseStyleFontSize = (fontSize: Style["fontSize"] | undefined): number | undefined =>
	parseFiniteNumber(fontSize) ?? parsePxValue(fontSize);

export const resolveStyleFontSize = (...styles: StyleInput[]): number | undefined => {
	for (let index = styles.length - 1; index >= 0; index -= 1) {
		for (const style of composeStyles(styles[index]).toReversed()) {
			const fontSize = parseStyleFontSize(style.fontSize);
			if (fontSize !== undefined) return fontSize;
		}
	}

	return undefined;
};

export const resolveIconSize = (options: {
	size?: number | string | undefined;
	styles?: StyleInput[];
}): number | string | undefined => {
	if (options.size !== undefined) return options.size;

	return resolveStyleFontSize(...(options.styles ?? []));
};
