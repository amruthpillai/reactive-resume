import type { Style } from "@react-pdf/types";
import type { ComponentProps } from "react";
import type { StyleInput } from "./styles";
import { Link as PdfLink, Text as PdfText, View } from "@react-pdf/renderer";
import { Icon as PhosphorIcon } from "phosphor-icons-react-pdf/dynamic";
import { useTemplateIconSlot, useTemplateStyle } from "./context";
import { composeStyles } from "./styles";

const asStyleInput = (style: unknown): StyleInput => style as StyleInput;

export const safeTextStyle = {
	minWidth: 0,
	maxWidth: "100%",
	flexShrink: 1,
	overflow: "hidden",
} satisfies Style;

export const Div = ({ style, ...props }: ComponentProps<typeof View>) => {
	const divStyle = useTemplateStyle("div");

	return <View style={composeStyles(divStyle, style as Style | Style[] | undefined)} {...props} />;
};

export const Text = ({ style, ...props }: ComponentProps<typeof PdfText>) => {
	const textStyle = useTemplateStyle("text");

	return <PdfText style={composeStyles(textStyle, asStyleInput(style), safeTextStyle)} {...props} />;
};

export const Heading = ({ style, ...props }: ComponentProps<typeof PdfText>) => {
	const headingStyle = useTemplateStyle("heading");

	return <PdfText style={composeStyles(headingStyle, asStyleInput(style), safeTextStyle)} {...props} />;
};

export const Link = ({ style, ...props }: ComponentProps<typeof PdfLink>) => {
	const linkStyle = useTemplateStyle("link");

	return <PdfLink style={composeStyles(linkStyle, asStyleInput(style), safeTextStyle)} {...props} />;
};

export const Small = ({ style, ...props }: ComponentProps<typeof PdfText>) => {
	const textStyle = useTemplateStyle("text");
	const smallStyle = useTemplateStyle("small");

	return <PdfText style={composeStyles(textStyle, smallStyle, asStyleInput(style), safeTextStyle)} {...props} />;
};

export const Bold = ({ style, ...props }: ComponentProps<typeof PdfText>) => {
	const textStyle = useTemplateStyle("text");
	const boldStyle = useTemplateStyle("bold");

	return <PdfText style={composeStyles(textStyle, boldStyle, asStyleInput(style), safeTextStyle)} {...props} />;
};

export const Icon = ({ style, ...props }: ComponentProps<typeof PhosphorIcon>) => {
	const { style: iconStyle, ...iconProps } = useTemplateIconSlot("icon");

	if (iconProps.display === "none") return null;

	return <PhosphorIcon {...iconProps} {...props} style={composeStyles(asStyleInput(iconStyle), asStyleInput(style))} />;
};
