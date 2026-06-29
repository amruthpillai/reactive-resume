import type { Style } from "@react-pdf/types";

export type TemplatePlacement = "main" | "sidebar";

export type StyleInput = Style | Style[] | null | undefined;

type LinkStyleOptions = {
	hideUnderline?: boolean;
};

export const composeStyles = (...styles: StyleInput[]): Style[] => {
	return styles.flatMap((style) => {
		if (!style) return [];
		if (Array.isArray(style)) return style.filter(Boolean);

		return [style];
	});
};

const linkUnderlineStyle = { textDecoration: "underline" } satisfies Style;
const linkNoUnderlineStyle = { textDecoration: "none" } satisfies Style;

const resolveLinkDecorationStyle = ({ hideUnderline = false }: LinkStyleOptions = {}) =>
	hideUnderline ? linkNoUnderlineStyle : linkUnderlineStyle;

export const composeLinkStyles = (options: LinkStyleOptions = {}, ...styles: StyleInput[]): Style[] =>
	composeStyles(...styles, resolveLinkDecorationStyle(options));

export const mergeStyles = (...styles: StyleInput[]): Style => Object.assign({}, ...composeStyles(...styles));

export const mergeLinkStyles = (options: LinkStyleOptions = {}, ...styles: StyleInput[]): Style =>
	mergeStyles(...styles, resolveLinkDecorationStyle(options));

export const headerNameLineHeight = 1.3;

export type ResolvePlacementColorOptions = {
	placement: TemplatePlacement;
	defaultForeground: string;
	sidebarForeground?: string | undefined;
};

export const resolvePlacementColor = ({
	placement,
	defaultForeground,
	sidebarForeground,
}: ResolvePlacementColorOptions) => {
	if (placement === "sidebar" && sidebarForeground) return sidebarForeground;

	return defaultForeground;
};
