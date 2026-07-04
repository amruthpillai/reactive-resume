import type { Style } from "@react-pdf/types";
import type { ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement } from "react";
import { Html } from "react-pdf-html";
import { Text as PdfText, View } from "#react-pdf-renderer";
import { useRender } from "../../context";
import { useSectionStyleRule, useTemplateStyle } from "./context";
import { convertPseudoBulletParagraphs, normalizeRichTextHtml } from "./rich-text-html";
import { renderRichTextParagraph, toRichTextStyleArray } from "./rich-text-renderers";
import {
	createRichTextProseSpacing,
	getRichTextEdgeTrimStyle,
	isRichTextElementInsideOrderedList,
	resolveRichTextBodyLineHeight,
	stripRichTextVerticalMargins,
} from "./rich-text-spacing";
import { createRichTextStylesheet } from "./rich-text-stylesheet";
import { safeTextStyle } from "./safe-text-style";
import { composeStyles } from "./styles";

const richListItemContentStackStyle = {
	flexDirection: "column",
} satisfies Style;

type RichTextProps = {
	children: string;
};

// react-pdf textkit reads BiDi base direction from each run's own `direction` attribute
// (default "ltr"), and react-pdf-html buckets inline content into styleless inner <Text>
// frames — so the rtl style has to be injected onto every descendant, not just a wrapper.
const applyRtlDirectionRecursively = (node: ReactNode): ReactNode => {
	if (Array.isArray(node)) {
		return node.map((child, i) => {
			const cloned = applyRtlDirectionRecursively(child);
			if (isValidElement(cloned) && cloned.key == null) {
				return cloneElement(cloned as ReactElement<{ key?: string }>, {
					key: `rtl-${i}`,
				});
			}
			return cloned;
		});
	}
	if (!isValidElement(node)) return node;
	const element = node as ReactElement<{
		style?: Style | Style[];
		children?: ReactNode;
	}>;
	const existingStyle = element.props.style;
	const rtlPatch: Style = { direction: "rtl", textAlign: "right" };
	const nextStyle: Style | Style[] = Array.isArray(existingStyle)
		? [...existingStyle, rtlPatch]
		: existingStyle
			? [existingStyle, rtlPatch]
			: rtlPatch;
	const nextChildren = applyRtlDirectionRecursively(element.props.children);
	return cloneElement(element, { style: nextStyle }, nextChildren);
};

export const RichText = ({ children }: RichTextProps) => {
	const { metadata, rtl } = useRender();
	const rtlTextWrapStyle: Style | undefined = rtl ? { direction: "rtl", textAlign: "right" } : undefined;

	const richListItemMarkerMargin: Style = {
		marginLeft: rtl ? 4 : 0,
		marginRight: rtl ? 0 : 4,
	};
	const boldStyle = useTemplateStyle("bold");
	const linkStyle = useTemplateStyle("link");
	const richParagraphStyle = useTemplateStyle("richParagraph");
	const richListItemRowStyle = useTemplateStyle("richListItemRow");
	const richListItemMarkerStyle = useTemplateStyle("richListItemMarker");
	const richListItemContentStyle = useTemplateStyle("richListItemContent");
	const richParagraphRuleStyle = useSectionStyleRule("richParagraph");
	const richListRuleStyle = useSectionStyleRule("richList");
	const richListItemRowRuleStyle = useSectionStyleRule("richListItemRow");
	const richListItemContentRuleStyle = useSectionStyleRule("richListItemContent");
	const richLinkRuleStyle = useSectionStyleRule("richLink");
	const richBoldRuleStyle = useSectionStyleRule("richBold");
	const richMarkRuleStyle = useSectionStyleRule("richMark");
	const bodyLineHeight = resolveRichTextBodyLineHeight(
		richParagraphStyle,
		richParagraphRuleStyle,
		richListItemContentStyle,
		richListItemContentRuleStyle,
	);
	const proseSpacing = createRichTextProseSpacing(bodyLineHeight);

	const normalized = normalizeRichTextHtml(children);
	// RTL-only: pseudo-bullets share one BiDi paragraph across <br>, causing chars to
	// bleed between visual lines. Real <li> items are independent BiDi paragraphs.
	const withBullets = normalized && rtl ? convertPseudoBulletParagraphs(normalized) : normalized;
	// Inject U+200F (RLM) after each <p>/<li> opener to anchor BiDi base direction
	// on the inner styleless <Text> frame react-pdf-html creates.
	const html =
		withBullets && rtl
			? withBullets.replace(/<(p|li)\b([^>]*)>/gi, (_match, tag, rest) => `<${tag}${rest}>‏`)
			: withBullets;

	if (!html) return null;

	return (
		<Html
			resetStyles
			renderers={{
				b: ({ children }) => (
					<PdfText style={composeStyles(boldStyle, richBoldRuleStyle, safeTextStyle)}>{children}</PdfText>
				),
				p: (props) => {
					const paragraphProps = {
						...props,
						rtl,
						...(rtlTextWrapStyle ? { rtlTextWrapStyle } : {}),
						...(rtl ? { applyRtlDirection: applyRtlDirectionRecursively } : {}),
					};

					return renderRichTextParagraph(paragraphProps);
				},
				li: ({ element, style, children }) => {
					const isOrderedList = isRichTextElementInsideOrderedList(element);
					const marker = isOrderedList ? `${element.indexOfType + 1}.` : "•";
					const itemStyles = toRichTextStyleArray(style);
					const contentItemStyles = itemStyles.map(stripRichTextVerticalMargins);

					const markerNode = (
						<PdfText key="marker" style={composeStyles(richListItemMarkerStyle, richListItemMarkerMargin)}>
							{marker}
						</PdfText>
					);

					// Same BiDi-injection trick as the <p> renderer — see applyRtlDirectionRecursively.
					const contentNode = rtl ? (
						<PdfText
							key="content"
							style={composeStyles(
								richListItemContentStyle,
								richListItemContentRuleStyle,
								contentItemStyles,
								safeTextStyle,
								rtlTextWrapStyle,
							)}
						>
							{applyRtlDirectionRecursively(children)}
						</PdfText>
					) : (
						<View
							key="content"
							style={composeStyles(
								richListItemContentStyle,
								richListItemContentRuleStyle,
								contentItemStyles,
								richListItemContentStackStyle,
								safeTextStyle,
							)}
						>
							<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
								{markerNode}
								<View style={{ flex: 1, minWidth: 0 }}>{children}</View>
							</View>
						</View>
					);

					// Yoga ignores `flexDirection`/`direction` on rows inside react-pdf-html's <ul>
					// (works fine for split-row/contact-list). Swap DOM order to position the marker.
					return (
						<View
							style={composeStyles(
								richListItemRowStyle,
								richListItemRowRuleStyle,
								itemStyles,
								getRichTextEdgeTrimStyle(element),
							)}
						>
							{rtl ? [contentNode, markerNode] : contentNode}
						</View>
					);
				},
			}}
			stylesheet={createRichTextStylesheet({
				boldStyle,
				hideLinkUnderline: metadata.page.hideLinkUnderline,
				linkStyle,
				richParagraphStyle,
				richParagraphRuleStyle,
				richListRuleStyle,
				richBoldRuleStyle,
				richLinkRuleStyle,
				richMarkRuleStyle,
				proseSpacing,
			})}
		>
			{html}
		</Html>
	);
};
