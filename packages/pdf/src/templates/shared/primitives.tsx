import type { Style } from "@react-pdf/types";
import type { ComponentProps, ReactNode } from "react";
import type { StyleInput } from "./styles";
import { Icon as PhosphorIcon } from "phosphor-icons-react-pdf/dynamic";
import { Image, Link as PdfLink, Text as PdfText, View } from "#react-pdf-renderer";
import { useRender } from "../../context";
import { resolvedPdfFlowProps, resolvedPdfTextProps } from "../../semantic/adapter";
import {
	SemanticNodeKeyProvider,
	useResolvedNode,
	useSemanticNodeKey,
	useSemanticNodeVisible,
} from "../../semantic/context";
import { semanticNodeKeys } from "../../semantic/node-keys";
import { useSectionStyleRule, useTemplateIconSlot, useTemplatePageNodeKey, useTemplateStyle } from "./context";
import { resolveIconSize } from "./icon-size";
import { safeTextStyle } from "./safe-text-style";
import { composeStyles } from "./styles";

const asStyleInput = (style: unknown): StyleInput => style as StyleInput;

type SemanticProps = {
	nodeKey?: string | undefined;
	semanticField?: string | undefined;
};

type SemanticLinkProps = SemanticProps & {
	semanticRole?: string | undefined;
};

const getChildren = (props: object): ReactNode =>
	"children" in props ? (props as { children?: ReactNode }).children : undefined;

const usePrimitiveNodeKey = ({
	nodeKey,
	semanticField,
	children,
	heading = false,
}: SemanticProps & { children?: ReactNode; heading?: boolean }) => {
	const data = useRender();
	const parentKey = useSemanticNodeKey();
	if (nodeKey) return nodeKey;
	if (semanticField && parentKey) return semanticNodeKeys.field(parentKey, semanticField);
	if (!parentKey) return undefined;

	if (parentKey.endsWith("/header")) {
		if (heading && children === data.basics.name) return semanticNodeKeys.headerPart(parentKey, "name");
		if (!heading && children === data.basics.headline) return semanticNodeKeys.headerPart(parentKey, "headline");
	}

	if (heading && parentKey.includes("/section-") && !parentKey.includes("/section-items")) {
		return semanticNodeKeys.sectionHeading(parentKey);
	}

	return undefined;
};

export const Div = ({ style, nodeKey, semanticField, ...props }: ComponentProps<typeof View> & SemanticProps) => {
	const divStyle = useTemplateStyle("div");
	const resolvedNodeKey = usePrimitiveNodeKey({ nodeKey, semanticField, children: getChildren(props) });
	const resolved = useResolvedNode(resolvedNodeKey);
	const visible = useSemanticNodeVisible(resolvedNodeKey);
	if (!visible) return null;

	return (
		<View
			{...props}
			{...resolvedPdfFlowProps(resolved)}
			style={composeStyles(divStyle, style as Style | Style[] | undefined, resolved.style)}
		/>
	);
};

export const Text = ({ style, nodeKey, semanticField, ...props }: ComponentProps<typeof PdfText> & SemanticProps) => {
	const textStyle = useTemplateStyle("text");
	const textRuleStyle = useSectionStyleRule("text");
	const resolvedNodeKey = usePrimitiveNodeKey({ nodeKey, semanticField, children: getChildren(props) });
	const resolved = useResolvedNode(resolvedNodeKey);
	const visible = useSemanticNodeVisible(resolvedNodeKey);
	if (!visible) return null;

	return (
		<PdfText
			{...props}
			{...resolvedPdfTextProps(resolved)}
			style={composeStyles(textStyle, textRuleStyle, asStyleInput(style), resolved.style, safeTextStyle)}
		/>
	);
};

export const Heading = ({
	style,
	nodeKey,
	semanticField,
	...props
}: ComponentProps<typeof PdfText> & SemanticProps) => {
	const headingStyle = useTemplateStyle("heading");
	const headingRuleStyle = useSectionStyleRule("heading");
	const resolvedNodeKey = usePrimitiveNodeKey({ nodeKey, semanticField, children: getChildren(props), heading: true });
	const resolved = useResolvedNode(resolvedNodeKey);
	const visible = useSemanticNodeVisible(resolvedNodeKey);
	if (!visible) return null;

	return (
		<PdfText
			{...props}
			{...resolvedPdfTextProps(resolved)}
			style={composeStyles(headingStyle, headingRuleStyle, asStyleInput(style), resolved.style, safeTextStyle)}
		/>
	);
};

export const Link = ({
	style,
	nodeKey,
	semanticField,
	semanticRole,
	...props
}: ComponentProps<typeof PdfLink> & SemanticLinkProps) => {
	const { metadata } = useRender();
	const linkStyle = useTemplateStyle("link");
	const linkRuleStyle = useSectionStyleRule("link");
	const parentKey = useSemanticNodeKey();
	const resolvedNodeKey =
		nodeKey ??
		(semanticRole && parentKey ? semanticNodeKeys.link(parentKey, semanticRole) : undefined) ??
		(semanticField && parentKey ? semanticNodeKeys.field(parentKey, semanticField) : undefined);
	const resolved = useResolvedNode(resolvedNodeKey);
	const visible = useSemanticNodeVisible(resolvedNodeKey);
	if (!visible) return null;

	return (
		<PdfLink
			{...props}
			{...resolvedPdfTextProps(resolved)}
			style={composeStyles(
				{ textDecoration: metadata.page.hideLinkUnderline ? "none" : "underline" },
				linkStyle,
				linkRuleStyle,
				asStyleInput(style),
				resolved.style,
				safeTextStyle,
			)}
		/>
	);
};

export const Small = ({ style, nodeKey, semanticField, ...props }: ComponentProps<typeof PdfText> & SemanticProps) => {
	const textStyle = useTemplateStyle("text");
	const smallStyle = useTemplateStyle("small");
	const secondaryTextRuleStyle = useSectionStyleRule("secondaryText");
	const resolvedNodeKey = usePrimitiveNodeKey({ nodeKey, semanticField, children: getChildren(props) });
	const resolved = useResolvedNode(resolvedNodeKey);
	const visible = useSemanticNodeVisible(resolvedNodeKey);
	if (!visible) return null;

	return (
		<PdfText
			{...props}
			{...resolvedPdfTextProps(resolved)}
			style={composeStyles(
				textStyle,
				smallStyle,
				secondaryTextRuleStyle,
				asStyleInput(style),
				resolved.style,
				safeTextStyle,
			)}
		/>
	);
};

export const Bold = ({ style, nodeKey, semanticField, ...props }: ComponentProps<typeof PdfText> & SemanticProps) => {
	const textStyle = useTemplateStyle("text");
	const boldStyle = useTemplateStyle("bold");
	const textRuleStyle = useSectionStyleRule("text");
	const resolvedNodeKey = usePrimitiveNodeKey({ nodeKey, semanticField, children: getChildren(props) });
	const resolved = useResolvedNode(resolvedNodeKey);
	const visible = useSemanticNodeVisible(resolvedNodeKey);
	if (!visible) return null;

	return (
		<PdfText
			{...props}
			{...resolvedPdfTextProps(resolved)}
			style={composeStyles(textStyle, textRuleStyle, boldStyle, asStyleInput(style), resolved.style, safeTextStyle)}
		/>
	);
};

export const Icon = ({
	style,
	size: sizeProp,
	nodeKey,
	...props
}: ComponentProps<typeof PhosphorIcon> & { nodeKey?: string | undefined }) => {
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
	const resolved = useResolvedNode(nodeKey);
	const visible = useSemanticNodeVisible(nodeKey);

	if (iconProps.display === "none" || !visible) return null;

	return (
		<PhosphorIcon
			{...iconProps}
			{...props}
			{...(resolvedSize === undefined ? {} : { size: resolvedSize })}
			style={composeStyles(composedStyle, resolved.style)}
		/>
	);
};

export const SemanticHeaderView = ({ style, ...props }: ComponentProps<typeof View>) => {
	const pageNodeKey = useTemplatePageNodeKey();
	const nodeKey = semanticNodeKeys.header(semanticNodeKeys.region(pageNodeKey, "header"));
	const resolved = useResolvedNode(nodeKey);
	const visible = useSemanticNodeVisible(nodeKey);
	if (!visible) return null;

	return (
		<SemanticNodeKeyProvider nodeKey={nodeKey}>
			<View {...props} {...resolvedPdfFlowProps(resolved)} style={composeStyles(asStyleInput(style), resolved.style)} />
		</SemanticNodeKeyProvider>
	);
};

export const SemanticHeaderPicture = ({ style, ...props }: ComponentProps<typeof Image>) => {
	const pageNodeKey = useTemplatePageNodeKey();
	const headerNodeKey = useSemanticNodeKey() ?? semanticNodeKeys.header(semanticNodeKeys.region(pageNodeKey, "header"));
	const nodeKey = headerNodeKey ? semanticNodeKeys.headerPart(headerNodeKey, "picture") : undefined;
	const resolved = useResolvedNode(nodeKey);
	const visible = useSemanticNodeVisible(nodeKey);
	if (!visible) return null;

	return <Image {...props} style={composeStyles(asStyleInput(style), resolved.style)} />;
};

export const SectionHeadingIcon = ({
	style,
	size: sizeProp,
	nodeKey,
	...props
}: ComponentProps<typeof PhosphorIcon> & { nodeKey?: string | undefined }) => {
	const data = useRender();
	const { style: sectionIconStyle, ...sectionIconProps } = useTemplateIconSlot("sectionHeadingIcon");
	const { style: fallbackIconStyle, ...fallbackIconProps } = useTemplateIconSlot("icon");

	// Fall back to the item icon slot if no section heading icon slot is defined
	const hasSlot = sectionIconStyle !== undefined || Object.keys(sectionIconProps).length > 0;
	const iconStyle = hasSlot ? sectionIconStyle : fallbackIconStyle;
	const iconProps = hasSlot ? sectionIconProps : fallbackIconProps;

	// Section heading icon visibility is controlled by hideSectionIcons (in SectionShell),
	// NOT by the item-level hideIcons toggle. Ignore the "display: none" from item icon slot.
	const { display: _, size: templateSize, ...iconPropsWithoutDisplay } = iconProps;
	const templateIconSize =
		hasSlot && (typeof templateSize === "number" || typeof templateSize === "string") ? templateSize : undefined;

	// Icon size follows heading fontSize so they scale together
	const headingFontSize = data.metadata.typography.heading.fontSize;
	const resolvedSize =
		resolveIconSize({
			size: sizeProp,
			styles: [asStyleInput(iconStyle), asStyleInput(style)],
		}) ??
		templateIconSize ??
		headingFontSize;
	const resolved = useResolvedNode(nodeKey);
	const visible = useSemanticNodeVisible(nodeKey);
	if (!visible) return null;

	return (
		<PhosphorIcon
			{...iconPropsWithoutDisplay}
			{...props}
			{...(resolvedSize === undefined ? {} : { size: resolvedSize })}
			style={composeStyles(asStyleInput(iconStyle), asStyleInput(style), resolved.style)}
		/>
	);
};
