import type { Style } from "@react-pdf/types";
import type { ComponentProps, ReactNode } from "react";
import type { StyleInput } from "./styles";
import { Icon as PhosphorIcon } from "phosphor-icons-react-pdf/dynamic";
import { Children, isValidElement } from "react";
import { Image, Link as PdfLink, Text as PdfText, View } from "#react-pdf-renderer";
import { useRender } from "../../context";
import { resolvedPdfFlowProps, resolvedPdfTextProps } from "../../semantic/adapter";
import {
	projectRenderedChildren,
	SemanticNodeKeyProvider,
	useRenderedChildKeys,
	useResolvedNode,
	useSemanticNodeExists,
	useSemanticNodeKey,
	useSemanticNodeVisible,
} from "../../semantic/context";
import { semanticNodeKeys } from "../../semantic/node-keys";
import { useSectionStyleRule, useTemplateIconSlot, useTemplatePageNodeKey, useTemplateStyle } from "./context";
import { resolveIconSize } from "./icon-size";
import { safeTextStyle } from "./safe-text-style";
import { composeLinkStyles, composeStyles } from "./styles";

const asStyleInput = (style: unknown): StyleInput => style as StyleInput;

type SemanticProps = {
	nodeKey?: string | undefined;
	semanticField?: string | undefined;
	bindSemanticNode?: boolean | undefined;
	bindCurrentNode?: boolean | undefined;
};

type SemanticLinkProps = SemanticProps & {
	semanticRole?: string | undefined;
};

const getChildren = (props: object): ReactNode =>
	"children" in props ? (props as { children?: ReactNode }).children : undefined;

const contactChildNodeKey = (contactListNodeKey: string, child: ReactNode): string | undefined => {
	if (!isValidElement(child)) return;
	const props = child.props as Record<string, unknown>;
	if (typeof props.primitiveNodeKey === "string") return props.primitiveNodeKey;
	if (typeof props.nodeKey === "string") return props.nodeKey;
	if (typeof props.partKey === "string") return semanticTemplatePartNodeKey(contactListNodeKey, props.partKey);
	if ("email" in props) return semanticNodeKeys.contactItem(contactListNodeKey, "email");
	if ("phone" in props) return semanticNodeKeys.contactItem(contactListNodeKey, "phone");
	if ("location" in props) return semanticNodeKeys.contactItem(contactListNodeKey, "location");
	if ("website" in props) return semanticNodeKeys.contactItem(contactListNodeKey, "website");
	if (typeof props.field === "object" && props.field !== null && "id" in props.field) {
		return semanticNodeKeys.contactItem(contactListNodeKey, "custom", String(props.field.id));
	}
};

const projectContactChildren = (
	children: ReactNode,
	contactListNodeKey: string,
	renderedChildKeys: readonly string[],
): ReactNode => {
	const authored = Children.toArray(children);
	const entries = authored.flatMap((child) => {
		const nodeKey = contactChildNodeKey(contactListNodeKey, child);
		return nodeKey ? [{ nodeKey, value: child }] : [];
	});

	return entries.length === authored.length ? projectRenderedChildren(renderedChildKeys, entries) : authored;
};

const usePrimitiveNodeKey = ({
	nodeKey,
	semanticField,
	bindSemanticNode = true,
	bindCurrentNode = false,
	children,
	heading = false,
}: SemanticProps & { children?: ReactNode; heading?: boolean }) => {
	const data = useRender();
	const parentKey = useSemanticNodeKey();
	if (!bindSemanticNode) return undefined;
	if (bindCurrentNode) return parentKey;
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

export const Div = ({
	style,
	nodeKey,
	semanticField,
	bindSemanticNode,
	bindCurrentNode,
	...props
}: ComponentProps<typeof View> & SemanticProps) => {
	const divStyle = useTemplateStyle("div");
	const resolvedNodeKey = usePrimitiveNodeKey({
		nodeKey,
		semanticField,
		bindSemanticNode,
		bindCurrentNode,
		children: getChildren(props),
	});
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

export const Text = ({
	style,
	nodeKey,
	semanticField,
	bindSemanticNode,
	bindCurrentNode: _bindCurrentNode,
	...props
}: ComponentProps<typeof PdfText> & SemanticProps) => {
	const textStyle = useTemplateStyle("text");
	const textRuleStyle = useSectionStyleRule("text");
	const resolvedNodeKey = usePrimitiveNodeKey({
		nodeKey,
		semanticField,
		bindSemanticNode,
		children: getChildren(props),
	});
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
	bindSemanticNode,
	bindCurrentNode: _bindCurrentNode,
	...props
}: ComponentProps<typeof PdfText> & SemanticProps) => {
	const headingStyle = useTemplateStyle("heading");
	const headingRuleStyle = useSectionStyleRule("heading");
	const resolvedNodeKey = usePrimitiveNodeKey({
		nodeKey,
		semanticField,
		bindSemanticNode,
		children: getChildren(props),
		heading: true,
	});
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
	bindSemanticNode: _bindSemanticNode,
	bindCurrentNode: _bindCurrentNode,
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
				composeLinkStyles(
					{ hideUnderline: metadata.page.hideLinkUnderline },
					linkStyle,
					linkRuleStyle,
					asStyleInput(style),
				),
				resolved.style,
				safeTextStyle,
			)}
		/>
	);
};

export const Small = ({
	style,
	nodeKey,
	semanticField,
	bindSemanticNode,
	bindCurrentNode: _bindCurrentNode,
	...props
}: ComponentProps<typeof PdfText> & SemanticProps) => {
	const textStyle = useTemplateStyle("text");
	const smallStyle = useTemplateStyle("small");
	const secondaryTextRuleStyle = useSectionStyleRule("secondaryText");
	const resolvedNodeKey = usePrimitiveNodeKey({
		nodeKey,
		semanticField,
		bindSemanticNode,
		children: getChildren(props),
	});
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

export const Bold = ({
	style,
	nodeKey,
	semanticField,
	bindSemanticNode,
	bindCurrentNode: _bindCurrentNode,
	...props
}: ComponentProps<typeof PdfText> & SemanticProps) => {
	const textStyle = useTemplateStyle("text");
	const boldStyle = useTemplateStyle("bold");
	const textRuleStyle = useSectionStyleRule("text");
	const resolvedNodeKey = usePrimitiveNodeKey({
		nodeKey,
		semanticField,
		bindSemanticNode,
		children: getChildren(props),
	});
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
	const parentKey = useSemanticNodeKey();
	const resolvedNodeKey = nodeKey ?? (parentKey ? semanticNodeKeys.icon(parentKey, "item") : undefined);
	const resolved = useResolvedNode(resolvedNodeKey);
	const visible = useSemanticNodeVisible(resolvedNodeKey);
	const resolvedSize =
		resolveIconSize({
			size: sizeProp,
			styles: [iconRuleStyle, asStyleInput(style), resolved.style],
		}) ?? templateIconSize;

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
	const regionNodeKey = semanticNodeKeys.region(pageNodeKey, "header");
	const nodeKey = semanticNodeKeys.header(regionNodeKey);
	const regionResolved = useResolvedNode(regionNodeKey);
	const resolved = useResolvedNode(nodeKey);
	const regionVisible = useSemanticNodeVisible(regionNodeKey);
	const headerVisible = useSemanticNodeVisible(nodeKey);
	if (!regionVisible || !headerVisible) return null;

	return (
		<SemanticNodeKeyProvider nodeKey={nodeKey}>
			<View
				{...props}
				{...resolvedPdfFlowProps(regionResolved)}
				{...resolvedPdfFlowProps(resolved)}
				style={composeStyles(asStyleInput(style), regionResolved.style, resolved.style)}
			/>
		</SemanticNodeKeyProvider>
	);
};

export const SemanticRegionView = ({ region, style, ...props }: ComponentProps<typeof View> & { region: string }) => {
	const pageNodeKey = useTemplatePageNodeKey();
	const nodeKey = semanticNodeKeys.region(pageNodeKey, region);
	const resolved = useResolvedNode(nodeKey);
	const exists = useSemanticNodeExists(nodeKey);
	const visible = useSemanticNodeVisible(nodeKey);
	if (exists && !visible) return null;

	return (
		<View {...props} {...resolvedPdfFlowProps(resolved)} style={composeStyles(asStyleInput(style), resolved.style)} />
	);
};

export const SemanticRegionTemplatePartView = ({
	region,
	partKeys,
	style,
	...props
}: ComponentProps<typeof View> & { region: string; partKeys: readonly string[] }) => {
	const pageNodeKey = useTemplatePageNodeKey();
	const regionNodeKey = semanticNodeKeys.region(pageNodeKey, region);
	const partNodeKey = semanticTemplatePartNodeKey(regionNodeKey, ...partKeys);
	const regionResolved = useResolvedNode(regionNodeKey);
	const partResolved = useResolvedNode(partNodeKey);
	const regionVisible = useSemanticNodeVisible(regionNodeKey);
	const partVisible = useSemanticNodeVisible(partNodeKey);
	if (!regionVisible || !partVisible) return null;

	return (
		<View
			{...props}
			{...resolvedPdfFlowProps(regionResolved)}
			{...resolvedPdfFlowProps(partResolved)}
			style={composeStyles(asStyleInput(style), regionResolved.style, partResolved.style)}
		/>
	);
};

export const SemanticContactListView = ({ style, ...props }: ComponentProps<typeof View>) => {
	const headerNodeKey = useSemanticNodeKey();
	const nodeKey = headerNodeKey ? semanticNodeKeys.contactList(headerNodeKey) : undefined;
	const resolved = useResolvedNode(nodeKey);
	const renderedChildKeys = useRenderedChildKeys(nodeKey);
	const visible = useSemanticNodeVisible(nodeKey);
	if (!visible) return null;
	const children =
		nodeKey && renderedChildKeys ? projectContactChildren(props.children, nodeKey, renderedChildKeys) : props.children;

	return (
		<View {...props} {...resolvedPdfFlowProps(resolved)} style={composeStyles(asStyleInput(style), resolved.style)}>
			{children}
		</View>
	);
};

export const SemanticContactRowView = ({
	partKey,
	style,
	...props
}: ComponentProps<typeof View> & { partKey: string }) => {
	const headerNodeKey = useSemanticNodeKey();
	const contactListNodeKey = headerNodeKey ? semanticNodeKeys.contactList(headerNodeKey) : undefined;
	const nodeKey = semanticTemplatePartNodeKey(contactListNodeKey, partKey);
	const resolved = useResolvedNode(nodeKey);
	const renderedChildKeys = useRenderedChildKeys(nodeKey);
	const visible = useSemanticNodeVisible(nodeKey);
	if (!visible) return null;
	const children =
		contactListNodeKey && renderedChildKeys
			? projectContactChildren(props.children, contactListNodeKey, renderedChildKeys)
			: props.children;

	return (
		<View {...props} {...resolvedPdfFlowProps(resolved)} style={composeStyles(asStyleInput(style), resolved.style)}>
			{children}
		</View>
	);
};

export function semanticTemplatePartNodeKey(ownerNodeKey: string | undefined, ...partKeys: string[]) {
	return ownerNodeKey ? partKeys.reduce((key, part) => `${key}/template-part-${part}`, ownerNodeKey) : undefined;
}

export const SemanticTemplatePartView = ({
	ownerNodeKey,
	partKeys,
	style,
	...props
}: ComponentProps<typeof View> & { ownerNodeKey?: string | undefined; partKeys: readonly string[] }) => {
	const contextualOwnerNodeKey = useSemanticNodeKey();
	const nodeKey = semanticTemplatePartNodeKey(ownerNodeKey ?? contextualOwnerNodeKey, ...partKeys);
	const resolved = useResolvedNode(nodeKey);
	const visible = useSemanticNodeVisible(nodeKey);
	if (!visible) return null;

	return (
		<View {...props} {...resolvedPdfFlowProps(resolved)} style={composeStyles(asStyleInput(style), resolved.style)} />
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
			{...(resolved.style?.color === undefined ? {} : { color: resolved.style.color })}
			style={composeStyles(asStyleInput(iconStyle), asStyleInput(style), resolved.style)}
		/>
	);
};
