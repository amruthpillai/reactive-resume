import type { Style } from "@react-pdf/types";

export type TemplatePlacement = "main" | "sidebar";

export type StyleInput = Style | Style[] | null | undefined;

export const composeStyles = (...styles: StyleInput[]): Style[] => {
	return styles.flatMap((style) => {
		if (!style) return [];
		if (Array.isArray(style)) return style.filter(Boolean);

		return [style];
	});
};

const linkUnderlineStyle = { textDecoration: "underline" } satisfies Style;

export const composeLinkStyles = (...styles: StyleInput[]): Style[] => composeStyles(...styles, linkUnderlineStyle);

export const mergeStyles = (...styles: StyleInput[]): Style => Object.assign({}, ...composeStyles(...styles));

export const mergeLinkStyles = (...styles: StyleInput[]): Style => mergeStyles(...styles, linkUnderlineStyle);

// Increased from 1.2 to 1.3 to prevent descenders (g, p, y, etc.) from being
// clipped by the overflow:hidden applied in safeTextStyle on all Heading elements.
// At 1.5× heading font size, a lineHeight of 1.2 leaves insufficient room for
// the descender depth of many fonts, causing letters to appear visually cut off.
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
