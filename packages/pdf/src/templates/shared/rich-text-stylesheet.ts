import type { Style } from "@react-pdf/types";
import type { StyleInput } from "./styles";
import { richTextMarkClassName } from "./rich-text-html";
import { safeTextStyle } from "./safe-text-style";
import { mergeLinkStyles, mergeStyles } from "./styles";

type RichTextProseSpacing = {
	paragraph: Style;
	listItem: Style;
};

type CreateRichTextStylesheetOptions = {
	boldStyle?: StyleInput;
	linkStyle?: StyleInput;
	richParagraphStyle?: StyleInput;
	richParagraphRuleStyle?: StyleInput;
	richListRuleStyle?: StyleInput;
	richBoldRuleStyle?: StyleInput;
	richLinkRuleStyle?: StyleInput;
	richMarkRuleStyle?: StyleInput;
	proseSpacing?: RichTextProseSpacing;
};

const richMarkStyle = {
	backgroundColor: "#ffff00",
} satisfies Style;

const emptyProseSpacing: RichTextProseSpacing = {
	paragraph: {},
	listItem: {},
};

export const createRichTextStylesheet = ({
	boldStyle,
	linkStyle,
	richParagraphStyle,
	richParagraphRuleStyle,
	richListRuleStyle,
	richBoldRuleStyle,
	richLinkRuleStyle,
	richMarkRuleStyle,
	proseSpacing = emptyProseSpacing,
}: CreateRichTextStylesheetOptions = {}) => ({
	b: mergeStyles(boldStyle, richBoldRuleStyle, safeTextStyle),
	strong: mergeStyles(boldStyle, richBoldRuleStyle, safeTextStyle),
	ul: mergeStyles(richListRuleStyle),
	ol: mergeStyles(richListRuleStyle),
	li: mergeStyles(proseSpacing.listItem),
	[`.${richTextMarkClassName}`]: mergeStyles(richMarkStyle, richMarkRuleStyle, safeTextStyle),
	p: mergeStyles(richParagraphStyle, richParagraphRuleStyle, safeTextStyle, proseSpacing.paragraph),
	a: mergeLinkStyles(linkStyle, richLinkRuleStyle, safeTextStyle),
});
