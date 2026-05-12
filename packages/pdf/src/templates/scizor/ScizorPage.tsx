import type { Style } from "@react-pdf/types";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
import { Image, Page, StyleSheet, View } from "@react-pdf/renderer";
import { useMemo } from "react";
import { rgbaStringToHex } from "@reactive-resume/utils/color";
import { useRender } from "../../context";
import { CustomFieldContactItem, WebsiteContactItem } from "../shared/contact-item";
import { TemplateProvider } from "../shared/context";
import { filterSections } from "../shared/filtering";
import { getTemplateMetrics } from "../shared/metrics";
import { getTemplatePageMinHeightStyle, getTemplatePageSize } from "../shared/page-size";
import { hasTemplatePicture } from "../shared/picture";
import { Heading, Icon, Link, Text } from "../shared/primitives";
import { Section } from "../shared/sections";
import { composeStyles, headerNameLineHeight } from "../shared/styles";

type ScizorStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	header: Style;
	headerIdentity: Style;
	headerName: Style;
	headerNameRule: Style;
	headerHeadline: Style;
	headerContactRow: Style;
	headerContactItem: Style;
	picture: Style;
	sections: Style;
};

type ScizorTemplate = {
	colors: TemplateColorRoles;
	styles: ScizorStyles;
};

export const ScizorPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata } = data;
	const { colors, styles } = useScizorTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const pageMinHeightStyle = getTemplatePageMinHeightStyle(metadata.page.format);
	const showHeader = pageIndex === 0;
	const mainSections = filterSections(page.main, data);
	const sidebarSections = page.fullWidth ? [] : filterSections(page.sidebar, data);
	const sections = [...mainSections, ...sidebarSections];

	return (
		<Page size={pageSize} style={composeStyles(styles.page, pageMinHeightStyle)}>
			<TemplateProvider styles={styles} colors={colors}>
				{showHeader && <Header styles={styles} />}

				<View style={composeStyles(styles.sections, { rowGap: metrics.sectionGap })}>
					{sections.map((section) => (
						<Section key={section} section={section} placement="main" />
					))}
				</View>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: { styles: ScizorStyles }) => {
	const { basics, picture } = useRender();
	const hasPicture = hasTemplatePicture(picture);

	return (
		<View style={styles.header}>
			<View style={styles.headerIdentity}>
				<Heading style={styles.headerName}>{basics.name}</Heading>
				<View style={styles.headerNameRule} />
				{basics.headline && <Text style={styles.headerHeadline}>{basics.headline}</Text>}

				<View style={styles.headerContactRow}>
					{basics.location && (
						<View style={styles.headerContactItem}>
							<Icon name="map-pin" />
							<Text>{basics.location}</Text>
						</View>
					)}
					{basics.email && (
						<Link src={`mailto:${basics.email}`} style={styles.headerContactItem}>
							<Icon name="envelope" />
							<Text>{basics.email}</Text>
						</Link>
					)}
					{basics.phone && (
						<Link src={`tel:${basics.phone}`} style={styles.headerContactItem}>
							<Icon name="phone" />
							<Text>{basics.phone}</Text>
						</Link>
					)}
					<WebsiteContactItem website={basics.website} style={styles.headerContactItem} />
					{basics.customFields.map((field) => (
						<CustomFieldContactItem key={field.id} field={field} style={styles.headerContactItem} />
					))}
				</View>
			</View>

			{hasPicture && <Image src={picture.url} style={styles.picture} />}
		</View>
	);
};

const useScizorTemplate = (): ScizorTemplate => {
	const { picture, metadata } = useRender();

	return useMemo(() => {
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const divider = "#D8DCE2";
		const muted = "#536174";
		const colors: TemplateColorRoles = { foreground, background, primary };
		const metrics = getTemplateMetrics(metadata.page);
		const bodyText = {
			fontFamily: metadata.typography.body.fontFamily,
			fontSize: metadata.typography.body.fontSize,
			fontWeight: metadata.typography.body.fontWeights[0] ?? "400",
			lineHeight: metadata.typography.body.lineHeight,
			color: muted,
		} satisfies Style;

		const baseStyles = StyleSheet.create({
			page: {
				color: foreground,
				backgroundColor: background,
				borderTopWidth: metrics.gapY(0.45),
				borderTopColor: primary,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
				rowGap: metrics.sectionGap,
				fontFamily: metadata.typography.body.fontFamily,
				fontSize: metadata.typography.body.fontSize,
				lineHeight: metadata.typography.body.lineHeight,
			},
			text: bodyText,
			heading: {
				fontFamily: metadata.typography.heading.fontFamily,
				fontSize: metadata.typography.heading.fontSize,
				fontWeight: metadata.typography.heading.fontWeights.at(-1) ?? "700",
				lineHeight: metadata.typography.heading.lineHeight,
				color: foreground,
			},
			div: { rowGap: metrics.gapY(0.125), columnGap: metrics.gapX(1 / 3) },
			inline: { flexDirection: "row", alignItems: "center", columnGap: metrics.gapX(1 / 3) },
			link: { textDecoration: "none", color: muted },
			small: { fontSize: metadata.typography.body.fontSize * 0.875 },
			bold: { fontWeight: metadata.typography.body.fontWeights.at(-1) ?? "700", color: foreground },
			richParagraph: { margin: 0, ...bodyText },
			richListItemRow: { flexDirection: "row", columnGap: metrics.gapX(1 / 3), alignItems: "flex-start" },
			richListItemMarker: { width: metadata.typography.body.fontSize, textAlign: "right", ...bodyText },
			richListItemContent: { flex: 1, ...bodyText },
			splitRow: {
				flexDirection: "row",
				flexWrap: "wrap",
				alignItems: "flex-start",
				justifyContent: "space-between",
				columnGap: metrics.gapX(2 / 3),
			},
			alignRight: { textAlign: "right", minWidth: 0, maxWidth: "100%", flexShrink: 1 },
			section: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.25),
				borderTopWidth: 1,
				borderTopColor: divider,
				paddingTop: metrics.gapY(0.65),
			},
			sectionHeading: {
				color: foreground,
				fontSize: metadata.typography.heading.fontSize * 0.9,
				fontWeight: metadata.typography.heading.fontWeights.at(-1) ?? "700",
				textTransform: "uppercase",
			},
			sectionItems: { rowGap: metrics.itemGapY },
			item: { rowGap: metrics.gapY(0.125) },
			levelContainer: { width: "100%" },
			levelItem: { borderColor: primary },
			levelItemActive: { backgroundColor: primary },
			header: {
				flexDirection: "row",
				alignItems: "flex-start",
				columnGap: metrics.gapX(1),
				paddingBottom: metrics.gapY(0.35),
			},
			headerIdentity: { flex: 1, alignItems: "flex-start", rowGap: metrics.gapY(0.45) },
			headerName: {
				color: foreground,
				fontSize: metadata.typography.heading.fontSize * 1.85,
				lineHeight: headerNameLineHeight,
			},
			headerNameRule: {
				width: "72%",
				borderBottomWidth: 2,
				borderBottomColor: divider,
			},
			headerHeadline: { color: muted },
			headerContactRow: {
				flexDirection: "row",
				flexWrap: "wrap",
				rowGap: metrics.gapY(0.125),
				columnGap: metrics.gapX(0.55),
			},
			headerContactItem: {
				flexDirection: "row",
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
				color: muted,
			},
			picture: {
				width: picture.size,
				height: picture.size,
				objectFit: "cover",
				aspectRatio: picture.aspectRatio,
				borderRadius: picture.borderRadius,
				borderColor: rgbaStringToHex(picture.borderColor),
				borderWidth: picture.borderWidth,
				shadowColor: rgbaStringToHex(picture.shadowColor),
				shadowWidth: picture.shadowWidth,
				transform: `rotate(${picture.rotation}deg)`,
			},
			sections: { flexDirection: "column" },
		});

		const accentFor = ({ colors }: TemplateStyleContext) => colors.primary;

		return {
			colors,
			styles: {
				...baseStyles,
				page: {
					...baseStyles.page,
					borderTopColor: primary,
				},
				levelItem: (context) => ({ borderColor: accentFor(context) }),
				levelItemActive: (context) => ({ backgroundColor: accentFor(context) }),
				icon: (context) => ({
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: accentFor(context),
				}),
			} satisfies ScizorStyles,
		};
	}, [picture, metadata]);
};
