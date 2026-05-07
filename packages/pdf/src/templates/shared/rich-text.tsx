import type { Style } from "@react-pdf/types";
import { Text as PdfText, View } from "@react-pdf/renderer";
import { Html } from "react-pdf-html";
import { useTemplateStyle } from "./context";
import { safeTextStyle } from "./primitives";
import { composeStyles, mergeStyles } from "./styles";

export const RichText = ({ children }: { children: string }) => {
	const boldStyle = useTemplateStyle("bold");
	const linkStyle = useTemplateStyle("link");
	const richParagraphStyle = useTemplateStyle("richParagraph");
	const richListItemRowStyle = useTemplateStyle("richListItemRow");
	const richListItemMarkerStyle = useTemplateStyle("richListItemMarker");
	const richListItemContentStyle = useTemplateStyle("richListItemContent");

	if (!children.trim()) return null;

	return (
		<Html
			resetStyles
			renderers={{
				b: ({ children }) => <PdfText style={composeStyles(boldStyle, safeTextStyle)}>{children}</PdfText>,
				li: ({ element, style, children }) => {
					const list = element.closest("ol, ul");
					const isOrderedList = list?.rawTagName === "ol" || element.parentNode.tag === "ol";
					const marker = isOrderedList ? `${element.indexOfType + 1}.` : "•";
					const itemStyle = Array.isArray(style) ? (style as Style[]) : [style as Style | undefined];

					return (
						<View style={composeStyles(richListItemRowStyle)}>
							<PdfText style={composeStyles(richListItemMarkerStyle)}>{marker}</PdfText>
							<PdfText style={composeStyles(richListItemContentStyle, ...itemStyle, safeTextStyle)}>{children}</PdfText>
						</View>
					);
				},
			}}
			stylesheet={{
				b: mergeStyles(boldStyle, safeTextStyle),
				strong: mergeStyles(boldStyle, safeTextStyle),
				p: mergeStyles(richParagraphStyle, safeTextStyle),
				a: mergeStyles(linkStyle, { textDecoration: "underline" }, safeTextStyle),
			}}
		>
			{children}
		</Html>
	);
};
