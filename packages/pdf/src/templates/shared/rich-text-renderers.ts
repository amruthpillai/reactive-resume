import type { Style } from "@react-pdf/types";
import type { ReactNode } from "react";
import { Text as PdfText } from "@react-pdf/renderer";
import { createElement } from "react";
import {
	getRichTextEdgeTrimStyle,
	isRichTextElementInsideListItem,
	stripRichTextVerticalMargins,
} from "./rich-text-spacing";
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
};

export const renderRichTextParagraph = ({ element, style, children }: RichTextParagraphRendererProps) => {
	const paragraphStyles = isRichTextElementInsideListItem(element)
		? toRichTextStyleArray(style).map(stripRichTextVerticalMargins)
		: style;

	return createElement(PdfText, { style: composeStyles(paragraphStyles, getRichTextEdgeTrimStyle(element)) }, children);
};
