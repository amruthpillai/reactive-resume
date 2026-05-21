import type { Style } from "@react-pdf/types";
import { Text as PdfText, View } from "@react-pdf/renderer";
import { Html } from "react-pdf-html";
import { useTemplateStyle } from "./context";
import { safeTextStyle } from "./primitives";
import { normalizeRichTextHtml, richTextMarkClassName } from "./rich-text-html";
import { renderRichTextParagraph, toRichTextStyleArray } from "./rich-text-renderers";
import {
	createRichTextProseSpacing,
	getRichTextEdgeTrimStyle,
	isRichTextElementInsideOrderedList,
	resolveRichTextBodyLineHeight,
	stripRichTextVerticalMargins,
} from "./rich-text-spacing";
import { composeStyles, mergeLinkStyles, mergeStyles } from "./styles";

const richListItemContentStackStyle = {
	flexDirection: "column",
} satisfies Style;

const richMarkStyle = {
	backgroundColor: "#ffff00",
} satisfies Style;

export const RichText = ({ children }: { children: string }) => {
	const boldStyle = useTemplateStyle("bold");
	const linkStyle = useTemplateStyle("link");
	const richParagraphStyle = useTemplateStyle("richParagraph");
	const richListItemRowStyle = useTemplateStyle("richListItemRow");
	const richListItemMarkerStyle = useTemplateStyle("richListItemMarker");
	const richListItemContentStyle = useTemplateStyle("richListItemContent");
	const bodyLineHeight = resolveRichTextBodyLineHeight(richParagraphStyle, richListItemContentStyle);
	const proseSpacing = createRichTextProseSpacing(bodyLineHeight);

	const html = normalizeRichTextHtml(children);

	if (!html) return null;

	return (
		<Html
			resetStyles
			renderers={{
				b: ({ children }) => <PdfText style={composeStyles(boldStyle, safeTextStyle)}>{children}</PdfText>,
				p: renderRichTextParagraph,
				li: ({ element, style, children }) => {
					const isOrderedList = isRichTextElementInsideOrderedList(element);
					const marker = isOrderedList ? `${element.indexOfType + 1}.` : "•";
					const itemStyles = toRichTextStyleArray(style);
					const contentItemStyles = itemStyles.map(stripRichTextVerticalMargins);

					return (
						<View style={composeStyles(richListItemRowStyle, itemStyles, getRichTextEdgeTrimStyle(element))}>
							<PdfText style={composeStyles(richListItemMarkerStyle)}>{marker}</PdfText>
							<View
								style={composeStyles(
									richListItemContentStyle,
									contentItemStyles,
									richListItemContentStackStyle,
									safeTextStyle,
								)}
							>
								{children}
							</View>
						</View>
					);
				},
			}}
			stylesheet={{
				b: mergeStyles(boldStyle, safeTextStyle),
				strong: mergeStyles(boldStyle, safeTextStyle),
				li: mergeStyles(proseSpacing.listItem),
				[`.${richTextMarkClassName}`]: mergeStyles(richMarkStyle, safeTextStyle),
				p: mergeStyles(richParagraphStyle, safeTextStyle, proseSpacing.paragraph),
				a: mergeLinkStyles(linkStyle, safeTextStyle),
			}}
		>
			{html}
		</Html>
	);
};
