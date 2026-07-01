import type { NodeStyle } from "@reactive-resume/schema/custom-template";
import type { CSSProperties } from "react";

// ─── NodeStyle → CSS ──────────────────────────────────────────────────────────
//
// IMPORTANT: keep this in lockstep with `nodeStyleToReactPdf` in
// packages/pdf/src/templates/custom/CustomTemplatePage.tsx. Both translate the
// same NodeStyle; if they diverge, the editor canvas stops matching the PDF.

export function nodeStyleToCss(style: NodeStyle | undefined): CSSProperties {
	if (!style) return {};
	const css: CSSProperties = {};

	// Spacing
	if (style.padding !== undefined) css.padding = style.padding;
	if (style.paddingTop !== undefined) css.paddingTop = style.paddingTop;
	if (style.paddingRight !== undefined) css.paddingRight = style.paddingRight;
	if (style.paddingBottom !== undefined) css.paddingBottom = style.paddingBottom;
	if (style.paddingLeft !== undefined) css.paddingLeft = style.paddingLeft;
	if (style.margin !== undefined) css.margin = style.margin;
	if (style.marginTop !== undefined) css.marginTop = style.marginTop;
	if (style.marginRight !== undefined) css.marginRight = style.marginRight;
	if (style.marginBottom !== undefined) css.marginBottom = style.marginBottom;
	if (style.marginLeft !== undefined) css.marginLeft = style.marginLeft;

	// Visual
	if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
	if (style.textColor) css.color = style.textColor;
	if (style.borderRadius !== undefined) css.borderRadius = style.borderRadius;
	if (style.borderWidth !== undefined) {
		css.borderWidth = style.borderWidth;
		css.borderStyle = "solid";
	}
	if (style.borderColor) css.borderColor = style.borderColor;

	// Typography
	if (style.fontSize !== undefined) css.fontSize = style.fontSize;
	if (style.fontWeight) css.fontWeight = style.fontWeight;
	if (style.textAlign) css.textAlign = style.textAlign;

	// Layout
	if (style.alignItems) css.alignItems = style.alignItems;
	if (style.justifyContent) css.justifyContent = style.justifyContent;

	return css;
}
