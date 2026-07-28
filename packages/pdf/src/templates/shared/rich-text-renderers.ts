import type { Style } from "@react-pdf/types";
import type { ReactNode } from "react";
import { createElement } from "react";
import { Text as PdfText } from "#react-pdf-renderer";
import {
	getRichTextEdgeTrimStyle,
	isRichTextElementInsideListItem,
	stripRichTextVerticalMargins,
} from "./rich-text-spacing";
import { safeTextStyle } from "./safe-text-style";
import { composeStyles } from "./styles";

export const toRichTextStyleArray = (style: Style | Style[] | undefined): Style[] => {
	if (!style) return [];
	if (Array.isArray(style)) return style.filter(Boolean);

	return [style];
};

type RichTextParagraphRendererProps = {
	children: ReactNode;
	element: Parameters<typeof isRichTextElementInsideListItem>[0];
	style: Style | Style[] | undefined;
	semanticStyle?: Style | Style[] | undefined;
	rtl?: boolean;
	rtlTextWrapStyle?: Style | undefined;
	applyRtlDirection?: (node: ReactNode) => ReactNode;
	textProps?: Record<string, unknown>;
};

export const renderRichTextParagraph = ({
	element,
	style,
	semanticStyle,
	children,
	rtl,
	rtlTextWrapStyle,
	applyRtlDirection,
	textProps,
}: RichTextParagraphRendererProps) => {
	const paragraphStyles = isRichTextElementInsideListItem(element)
		? toRichTextStyleArray(style).map(stripRichTextVerticalMargins)
		: style;

	const composedStyle = composeStyles(
		paragraphStyles,
		getRichTextEdgeTrimStyle(element),
		rtl ? rtlTextWrapStyle : undefined,
		semanticStyle,
		safeTextStyle,
	);

	const content = rtl && applyRtlDirection ? applyRtlDirection(children) : children;

	return createElement(PdfText, { ...textProps, style: composedStyle }, content);
};
