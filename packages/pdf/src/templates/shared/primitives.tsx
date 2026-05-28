import type { Style } from "@react-pdf/types";
import type { ComponentProps } from "react";
import type { StyleInput } from "./styles";
import { Icon as PhosphorIcon } from "phosphor-icons-react-pdf/dynamic";
import { Link as PdfLink, Text as PdfText, View } from "../../renderer";
import { useSectionStyleRule, useTemplateIconSlot, useTemplateStyle } from "./context";
import { resolveIconSize } from "./icon-size";
import { safeTextStyle } from "./safe-text-style";
import { composeLinkStyles, composeStyles } from "./styles";

const asStyleInput = (style: unknown): StyleInput => style as StyleInput;

export const Div = ({ style, ...props }: ComponentProps<typeof View>) => {
	const divStyle = useTemplateStyle("div");

	return <View style={composeStyles(divStyle, style as Style | Style[] | undefined)} {...props} />;
};

export const Text = ({ style, ...props }: ComponentProps<typeof PdfText>) => {
	const textStyle = useTemplateStyle("text");
	const textRuleStyle = useSectionStyleRule("text");

	return <PdfText style={composeStyles(textStyle, textRuleStyle, asStyleInput(style), safeTextStyle)} {...props} />;
};

export const Heading = ({ style, ...props }: ComponentProps<typeof PdfText>) => {
	const headingStyle = useTemplateStyle("heading");
	const headingRuleStyle = useSectionStyleRule("heading");

	return (
		<PdfText style={composeStyles(headingStyle, headingRuleStyle, asStyleInput(style), safeTextStyle)} {...props} />
	);
};

export const Link = ({ style, ...props }: ComponentProps<typeof PdfLink>) => {
	const linkStyle = useTemplateStyle("link");
	const linkRuleStyle = useSectionStyleRule("link");

	return <PdfLink style={composeLinkStyles(linkStyle, linkRuleStyle, asStyleInput(style), safeTextStyle)} {...props} />;
};

export const Small = ({ style, ...props }: ComponentProps<typeof PdfText>) => {
	const textStyle = useTemplateStyle("text");
	const smallStyle = useTemplateStyle("small");
	const secondaryTextRuleStyle = useSectionStyleRule("secondaryText");

	return (
		<PdfText
			style={composeStyles(textStyle, smallStyle, secondaryTextRuleStyle, asStyleInput(style), safeTextStyle)}
			{...props}
		/>
	);
};

export const Bold = ({ style, ...props }: ComponentProps<typeof PdfText>) => {
	const textStyle = useTemplateStyle("text");
	const boldStyle = useTemplateStyle("bold");
	const textRuleStyle = useSectionStyleRule("text");

	return (
		<PdfText
			style={composeStyles(textStyle, textRuleStyle, boldStyle, asStyleInput(style), safeTextStyle)}
			{...props}
		/>
	);
};

export const Icon = ({ style, size: sizeProp, ...props }: ComponentProps<typeof PhosphorIcon>) => {
	const { style: iconStyle, size: templateSize, ...iconProps } = useTemplateIconSlot("icon");
	const iconRuleStyle = useSectionStyleRule("icon");
	const composedStyle = composeStyles(asStyleInput(iconStyle), iconRuleStyle, asStyleInput(style));
	const templateIconSize =
		typeof templateSize === "number" || typeof templateSize === "string" ? templateSize : undefined;
	const resolvedSize =
		resolveIconSize({
			size: sizeProp,
			styles: [iconRuleStyle, asStyleInput(style)],
		}) ?? templateIconSize;

	if (iconProps.display === "none") return null;

	return (
		<PhosphorIcon
			{...iconProps}
			{...props}
			{...(resolvedSize === undefined ? {} : { size: resolvedSize })}
			style={composedStyle}
		/>
	);
};
