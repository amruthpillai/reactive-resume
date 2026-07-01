import type { Style } from "@react-pdf/types";
import type { CustomTemplateData, NodeStyle, TemplateNode } from "@reactive-resume/schema/custom-template";
import type { TemplatePageProps } from "../../document";
import { Fragment, useMemo } from "react";
import { useRender } from "../../context";
import { Image, View } from "../../renderer";
import { CustomFieldContactItem, WebsiteContactItem } from "../shared/contact-item";
import { getTemplateMetrics } from "../shared/metrics";
import { getTemplatePageMinHeightStyle, getTemplatePageSize } from "../shared/page-size";
import { hasTemplatePicture } from "../shared/picture";
import { Heading, Icon, Link, Text } from "../shared/primitives";
import { Section } from "../shared/sections";
import { headerNameLineHeight } from "../shared/styles";
import { getTemplateFrame } from "./base-template";

// ─── Style translation ───────────────────────────────────────────────────────
//
// Map a NodeStyle to the @react-pdf Style shape. IMPORTANT: keep in lockstep
// with `nodeStyleToCss` in apps/web/.../template-editor/wysiwyg/styles.ts.

function nodeStyleToReactPdf(style: NodeStyle | undefined): Style {
	if (!style) return {};
	const out: Style = {};

	if (style.padding !== undefined) out.padding = style.padding;
	if (style.paddingTop !== undefined) out.paddingTop = style.paddingTop;
	if (style.paddingRight !== undefined) out.paddingRight = style.paddingRight;
	if (style.paddingBottom !== undefined) out.paddingBottom = style.paddingBottom;
	if (style.paddingLeft !== undefined) out.paddingLeft = style.paddingLeft;
	if (style.margin !== undefined) out.margin = style.margin;
	if (style.marginTop !== undefined) out.marginTop = style.marginTop;
	if (style.marginRight !== undefined) out.marginRight = style.marginRight;
	if (style.marginBottom !== undefined) out.marginBottom = style.marginBottom;
	if (style.marginLeft !== undefined) out.marginLeft = style.marginLeft;

	if (style.backgroundColor) out.backgroundColor = style.backgroundColor;
	if (style.textColor) out.color = style.textColor;
	if (style.borderRadius !== undefined) out.borderRadius = style.borderRadius;
	if (style.borderWidth !== undefined) out.borderWidth = style.borderWidth;
	if (style.borderColor) out.borderColor = style.borderColor;

	if (style.fontSize !== undefined) out.fontSize = style.fontSize;
	if (style.fontWeight) out.fontWeight = style.fontWeight;
	if (style.textAlign) out.textAlign = style.textAlign;

	if (style.alignItems) out.alignItems = style.alignItems;
	if (style.justifyContent) out.justifyContent = style.justifyContent;

	return out;
}

// ─── The page component ──────────────────────────────────────────────────────

export const CustomTemplatePage = ({ pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const customTemplate = (data.metadata as { customTemplate?: CustomTemplateData }).customTemplate;
	const baseTemplate = customTemplate?.baseTemplate ?? data.metadata.template;
	const Frame = getTemplateFrame(baseTemplate);
	const metrics = getTemplateMetrics(data.metadata.page);
	const pageSize = getTemplatePageSize(data.metadata.page.format);
	const pageMinHeightStyle = getTemplatePageMinHeightStyle(data.metadata.page.format);

	// Page-break splits the node tree into pages. ResumeDocument mounts one
	// CustomTemplatePage per slice; render the slice for this index.
	const pages = useMemo(() => splitByPageBreak(customTemplate?.nodes ?? []), [customTemplate]);
	const nodesForThisPage = pages[pageIndex] ?? [];
	// Skip empty trailing slices, but always render page 0 so a blank template
	// (no nodes yet) still produces one page instead of an invalid empty document.
	if (nodesForThisPage.length === 0 && pageIndex > 0) return null;

	// Optional page overrides from the editor — only applied when explicitly set,
	// so an untouched template inherits the base template's page padding/colours.
	const pageStyle: Style = {};
	const cp = customTemplate?.page;
	if (cp?.paddingHorizontal !== undefined) pageStyle.paddingHorizontal = cp.paddingHorizontal;
	if (cp?.paddingVertical !== undefined) pageStyle.paddingVertical = cp.paddingVertical;
	if (cp?.backgroundColor) pageStyle.backgroundColor = cp.backgroundColor;

	return (
		<Frame pageSize={pageSize} pageMinHeightStyle={pageMinHeightStyle} pageStyle={pageStyle}>
			<View style={{ rowGap: metrics.sectionGap }}>
				{nodesForThisPage.map((node) => (
					<Fragment key={node.id}>
						<RenderNode node={node} />
					</Fragment>
				))}
			</View>
		</Frame>
	);
};

// ─── Per-node rendering ──────────────────────────────────────────────────────

function RenderNode({ node }: { node: TemplateNode }) {
	const style = nodeStyleToReactPdf(node.style);

	switch (node.type) {
		case "container":
			return (
				<View style={style}>
					{node.children?.map((child) => (
						<RenderNode key={child.id} node={child} />
					))}
				</View>
			);

		case "columns": {
			const count = node.props?.columnCount ?? 2;
			const gap = node.props?.gap ?? 8;
			const widths = (node.props?.columnWidths as number[] | undefined) ?? [];
			const cols = Array.from({ length: count }, (_, i) => node.children?.[i] ?? null);
			return (
				<View style={{ ...style, flexDirection: "row", columnGap: gap }}>
					{cols.map((col, i) => {
						const w = widths[i];
						const colStyle: Style = {
							flexBasis: w ? `${w}%` : `${100 / count}%`,
							flexGrow: 1,
							flexShrink: 1,
							rowGap: gap,
						};
						return (
							<View key={col?.id ?? `col-${i}`} style={colStyle}>
								{col?.children?.map((child) => (
									<RenderNode key={child.id} node={child} />
								))}
							</View>
						);
					})}
				</View>
			);
		}

		case "spacer":
			return <View style={{ ...style, height: node.props?.height ?? 16 }} />;

		case "page-break":
			return null;

		case "placeholder.name":
			return <NamePlaceholder style={style} />;

		case "placeholder.headline":
			return <HeadlinePlaceholder style={style} />;

		case "placeholder.picture":
			return (
				<PicturePlaceholder
					style={style}
					size={node.props?.pictureSize as number | undefined}
					borderRadiusPct={node.props?.pictureBorderRadius as number | undefined}
					align={node.props?.pictureAlign as PictureAlign | undefined}
				/>
			);

		case "placeholder.contact":
			return <ContactPlaceholder style={style} />;

		case "placeholder.summary":
		case "placeholder.profiles":
		case "placeholder.experience":
		case "placeholder.education":
		case "placeholder.projects":
		case "placeholder.skills":
		case "placeholder.languages":
		case "placeholder.interests":
		case "placeholder.awards":
		case "placeholder.certifications":
		case "placeholder.publications":
		case "placeholder.volunteer":
		case "placeholder.references": {
			const sectionId = node.type.replace("placeholder.", "");
			return (
				<View style={style}>
					<Section section={sectionId} placement="main" showHeading={node.props?.showHeading ?? true} />
				</View>
			);
		}

		default:
			return null;
	}
}

// ─── Header placeholders ─────────────────────────────────────────────────────
//
// Rendered with the shared primitives so they inherit the base template's
// heading font, colours, and icon styling from the active TemplateProvider.

function NamePlaceholder({ style }: { style: Style }) {
	const { basics, metadata } = useRender();
	const defaultSize = metadata.typography.heading.fontSize * 1.5;
	return <Heading style={{ fontSize: defaultSize, lineHeight: headerNameLineHeight, ...style }}>{basics.name}</Heading>;
}

function HeadlinePlaceholder({ style }: { style: Style }) {
	const { basics } = useRender();
	if (!basics.headline) return null;
	return <Text style={style}>{basics.headline}</Text>;
}

export type PictureAlign = "left" | "center" | "right";

const PICTURE_ALIGN_SELF: Record<PictureAlign, NonNullable<Style["alignSelf"]>> = {
	left: "flex-start",
	center: "center",
	right: "flex-end",
};

function PicturePlaceholder({
	style,
	size,
	borderRadiusPct,
	align,
}: {
	style: Style;
	size?: number | undefined;
	borderRadiusPct?: number | undefined;
	align?: PictureAlign | undefined;
}) {
	const { picture } = useRender();
	if (!hasTemplatePicture(picture)) return null;
	const finalSize = size ?? picture.size;
	const finalRadius = borderRadiusPct !== undefined ? (finalSize * borderRadiusPct) / 100 / 2 : picture.borderRadius;
	return (
		<Image
			src={picture.url}
			style={{
				width: finalSize,
				height: finalSize,
				borderRadius: finalRadius,
				objectFit: "cover",
				...(align ? { alignSelf: PICTURE_ALIGN_SELF[align] } : {}),
				...style,
			}}
		/>
	);
}

function ContactPlaceholder({ style }: { style: Style }) {
	const { basics } = useRender();
	const itemStyle: Style = { flexDirection: "row", alignItems: "center", columnGap: 4 };

	return (
		<View
			style={{
				flexDirection: "row",
				flexWrap: "wrap",
				rowGap: 2,
				columnGap: 8,
				justifyContent: "center",
				...style,
			}}
		>
			{basics.email && (
				<Link src={`mailto:${basics.email}`} style={itemStyle}>
					<Icon name="envelope" />
					<Text>{basics.email}</Text>
				</Link>
			)}
			{basics.phone && (
				<Link src={`tel:${basics.phone}`} style={itemStyle}>
					<Icon name="phone" />
					<Text>{basics.phone}</Text>
				</Link>
			)}
			{basics.location && (
				<View style={itemStyle}>
					<Icon name="map-pin" />
					<Text>{basics.location}</Text>
				</View>
			)}
			<WebsiteContactItem website={basics.website} style={itemStyle} />
			{basics.customFields.map((field) => (
				<CustomFieldContactItem key={field.id} field={field} style={itemStyle} />
			))}
		</View>
	);
}

// ─── Page-break splitting ────────────────────────────────────────────────────

function splitByPageBreak(nodes: TemplateNode[]): TemplateNode[][] {
	const pages: TemplateNode[][] = [[]];
	for (const node of nodes) {
		if (node.type === "page-break") {
			pages.push([]);
			continue;
		}
		const current = pages[pages.length - 1];
		if (current) current.push(node);
	}
	return pages;
}

// ─── How many pages does this custom template produce? ───────────────────────

export function getCustomTemplatePageCount(customTemplate: CustomTemplateData | undefined): number {
	if (!customTemplate) return 1;
	return splitByPageBreak(customTemplate.nodes).length;
}
