import type { CSSProperties } from "react";

// Translate a resolved @react-pdf style (or array of styles) into CSS so the
// editor canvas can render with the base template's REAL styles. @react-pdf and
// CSS share most property names; the canvas is drawn at A4 width where 1pt ≈ 1px,
// so numeric values map directly (React appends "px" for length props).

type AnyStyle = Record<string, unknown>;

// Keys that are valid CSS and can pass straight through.
const PASSTHROUGH = new Set<string>([
	"display",
	"flexDirection",
	"flexWrap",
	"alignItems",
	"alignSelf",
	"alignContent",
	"justifyContent",
	"flex",
	"flexBasis",
	"flexGrow",
	"flexShrink",
	"gap",
	"rowGap",
	"columnGap",
	"width",
	"height",
	"minWidth",
	"maxWidth",
	"minHeight",
	"maxHeight",
	"padding",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"margin",
	"marginTop",
	"marginRight",
	"marginBottom",
	"marginLeft",
	"color",
	"backgroundColor",
	"opacity",
	"fontFamily",
	"fontSize",
	"fontWeight",
	"fontStyle",
	"lineHeight",
	"letterSpacing",
	"textAlign",
	"textTransform",
	"textDecoration",
	"textDecorationColor",
	"textDecorationStyle",
	"borderTopWidth",
	"borderRightWidth",
	"borderBottomWidth",
	"borderLeftWidth",
	"borderWidth",
	"borderColor",
	"borderTopColor",
	"borderRightColor",
	"borderBottomColor",
	"borderLeftColor",
	"borderStyle",
	"borderRadius",
	"borderTopLeftRadius",
	"borderTopRightRadius",
	"borderBottomLeftRadius",
	"borderBottomRightRadius",
	"objectFit",
	"position",
	"top",
	"right",
	"bottom",
	"left",
	"zIndex",
	"overflow",
]);

const flatten = (input: unknown): AnyStyle => {
	if (!input || typeof input !== "object") return {};
	if (Array.isArray(input)) return input.reduce<AnyStyle>((acc, s) => Object.assign(acc, flatten(s)), {});
	return input as AnyStyle;
};

export function pdfStyleToCss(input: unknown, options?: { asFlexContainer?: boolean }): CSSProperties {
	const flat = flatten(input);
	const css: AnyStyle = {};

	// @react-pdf Views are ALWAYS flex (default direction column); a DOM <div> is
	// block, so `flexDirection`/`flex`/`alignItems` are no-ops without this. The
	// style's own flexDirection (set in the loop below) overrides the default.
	if (options?.asFlexContainer) {
		css.display = "flex";
		css.flexDirection = "column";
	}

	for (const [key, value] of Object.entries(flat)) {
		if (value === undefined || value === null) continue;

		// @react-pdf shorthands that CSS lacks.
		if (key === "paddingHorizontal") {
			css.paddingLeft = value;
			css.paddingRight = value;
			continue;
		}
		if (key === "paddingVertical") {
			css.paddingTop = value;
			css.paddingBottom = value;
			continue;
		}
		if (key === "marginHorizontal") {
			css.marginLeft = value;
			css.marginRight = value;
			continue;
		}
		if (key === "marginVertical") {
			css.marginTop = value;
			css.marginBottom = value;
			continue;
		}
		// A border width without a style won't render in CSS; default to solid.
		if (
			(key === "borderTopWidth" ||
				key === "borderBottomWidth" ||
				key === "borderLeftWidth" ||
				key === "borderRightWidth" ||
				key === "borderWidth") &&
			typeof value === "number" &&
			value > 0 &&
			css.borderStyle === undefined &&
			flat.borderStyle === undefined
		) {
			css.borderStyle = "solid";
		}

		if (PASSTHROUGH.has(key)) css[key] = value;
	}

	return css as CSSProperties;
}

// Mirrors getSectionHeadingTextStyle in packages/pdf/.../shared/sections.tsx:
// the heading container carries layout (width/border/flex/spacing), while the
// heading TEXT keeps only typographic properties.
const HEADING_TEXT_OMIT = new Set<string>([
	"borderBottomWidth",
	"borderLeftWidth",
	"borderRightWidth",
	"borderTopWidth",
	"borderWidth",
	"borderColor",
	"borderTopColor",
	"borderBottomColor",
	"flexGrow",
	"flexShrink",
	"flexBasis",
	"flex",
	"width",
	"marginBottom",
	"marginLeft",
	"marginRight",
	"marginTop",
	"paddingBottom",
	"paddingLeft",
	"paddingRight",
	"paddingTop",
	"padding",
	"backgroundColor",
]);

export function headingTextCss(input: unknown): CSSProperties {
	const flat = flatten(input);
	const text: AnyStyle = {};
	for (const [key, value] of Object.entries(flat)) {
		if (HEADING_TEXT_OMIT.has(key)) continue;
		text[key] = value;
	}
	return pdfStyleToCss(text);
}
