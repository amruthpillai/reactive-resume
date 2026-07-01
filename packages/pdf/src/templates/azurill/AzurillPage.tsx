import type { Style } from "@react-pdf/types";
import type { TemplatePageProps } from "../../document";
import type {
	TemplateColorRoles,
	TemplateFeatureStyleSlots,
	TemplateFeatures,
	TemplateStyleContext,
	TemplateStyleSlots,
} from "../shared/types";
import { Fragment, useMemo } from "react";
import { rgbaStringToHex } from "@reactive-resume/utils/color";
import { useRender } from "../../context";
import { Image, Page, StyleSheet, View } from "../../renderer";
import { CustomFieldContactItem, WebsiteContactItem } from "../shared/contact-item";
import { TemplateProvider } from "../shared/context";
import { filterSections } from "../shared/filtering";
import { getTemplateMetrics } from "../shared/metrics";
import { getTemplatePageMinHeightStyle, getTemplatePageSize } from "../shared/page-size";
import { hasTemplatePicture } from "../shared/picture";
import { Heading, Icon, Link, Text } from "../shared/primitives";
import { createRtlStyleHelpers } from "../shared/rtl";
import { Section } from "../shared/sections";
import { composeStyles, headerNameLineHeight, resolvePlacementColor } from "../shared/styles";

type AzurillStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	contentRow: Style;
	sidebarColumn: Style;
	mainColumn: Style;
	header: Style;
	picture: Style;
	headerTitle: Style;
	headerIdentity: Style;
	headerName: Style;
	headerContactRow: Style;
	headerContactItem: Style;
};

type AzurillTemplate = {
	colors: TemplateColorRoles;
	styles: AzurillStyles;
	featureStyles: TemplateFeatureStyleSlots;
};

type AzurillHeaderProps = {
	styles: AzurillStyles;
};

const azurillFeatures = {
	sectionTimeline: true,
} satisfies TemplateFeatures;

export const AzurillPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata } = data;
	const { colors, styles, featureStyles } = useAzurillTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const pageMinHeightStyle = getTemplatePageMinHeightStyle(metadata.page.format);
	const showHeader = pageIndex === 0;
	const sidebarSections = filterSections(page.sidebar, data);
	const mainSections = filterSections(page.main, data);

	return (
		<Page size={pageSize} style={composeStyles(styles.page, pageMinHeightStyle)}>
			<TemplateProvider styles={styles} featureStyles={featureStyles} colors={colors} features={azurillFeatures}>
				{showHeader && <Header styles={styles} />}

				<View style={composeStyles(styles.contentRow, { columnGap: metrics.columnGap })}>
					<View
						style={composeStyles(styles.sidebarColumn, {
							flexBasis: `${metadata.layout.sidebarWidth}%`,
							display: page.fullWidth ? "none" : "flex",
							rowGap: metrics.sectionGap,
						})}
					>
						{sidebarSections.map((section) => (
							<Fragment key={section}>
								<Section section={section} placement="sidebar" />
							</Fragment>
						))}
					</View>

					<View style={composeStyles(styles.mainColumn, { rowGap: metrics.sectionGap })}>
						{mainSections.map((section) => (
							<Section key={section} section={section} placement="main" />
						))}
					</View>
				</View>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: AzurillHeaderProps) => {
	const { basics, picture } = useRender();
	const hasPicture = hasTemplatePicture(picture);

	return (
		<View style={styles.header}>
			{hasPicture && <Image src={picture.url} style={styles.picture} />}

			<View style={styles.headerTitle}>
				<View style={styles.headerIdentity}>
					<Heading style={styles.headerName}>{basics.name}</Heading>
					<Text>{basics.headline}</Text>
				</View>
			</View>

			<View style={styles.headerContactRow}>
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
				{basics.location && (
					<View style={styles.headerContactItem}>
						<Icon name="map-pin" />
						<Text>{basics.location}</Text>
					</View>
				)}
				<WebsiteContactItem website={basics.website} style={styles.headerContactItem} />
				{basics.customFields.map((field) => (
					<CustomFieldContactItem key={field.id} field={field} style={styles.headerContactItem} />
				))}
			</View>
		</View>
	);
};

export const useAzurillTemplate = (): AzurillTemplate => {
	const { picture, metadata, rtl } = useRender();

	return useMemo(() => {
		const r = createRtlStyleHelpers(rtl);
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const colors: TemplateColorRoles = { foreground, background, primary };
		const metrics = getTemplateMetrics(metadata.page);

		const bodyText = {
			fontFamily: metadata.typography.body.fontFamily,
			fontSize: metadata.typography.body.fontSize,
			fontWeight: metadata.typography.body.fontWeights[0] ?? "400",
			lineHeight: metadata.typography.body.lineHeight,
			color: foreground,
			...r.text,
		} satisfies Style;

		const baseStyles = StyleSheet.create({
			page: {
				flexDirection: "column",
				rowGap: metrics.headerGap,
				columnGap: metrics.columnGap,
				color: foreground,
				backgroundColor: background,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
				fontFamily: metadata.typography.body.fontFamily,
				fontSize: metadata.typography.body.fontSize,
				lineHeight: metadata.typography.body.lineHeight,
				direction: r.pageDirection,
			},
			text: bodyText,
			heading: {
				fontFamily: metadata.typography.heading.fontFamily,
				fontSize: metadata.typography.heading.fontSize,
				fontWeight: metadata.typography.heading.fontWeights.at(-1) ?? "600",
				lineHeight: metadata.typography.heading.lineHeight,
				color: foreground,
				...r.text,
			},
			div: {
				rowGap: metrics.gapY(0.125),
				columnGap: metrics.gapX(1 / 3),
			},
			inline: {
				flexDirection: r.row,
				alignItems: "center",
				columnGap: metrics.gapX(1 / 3),
			},
			link: {
				textDecoration: "none",
				color: foreground,
			},
			small: {
				fontSize: metadata.typography.body.fontSize * 0.875,
			},
			bold: {
				fontWeight: metadata.typography.body.fontWeights.at(-1) ?? "600",
			},
			richParagraph: {
				margin: 0,
				...bodyText,
			},
			richListItemRow: {
				flexDirection: "row",
				columnGap: metrics.gapX(1 / 3),
				alignItems: "flex-start",
			},
			richListItemMarker: {
				...bodyText,
				width: metadata.typography.body.fontSize,
				textAlign: r.listMarkerTextAlign,
			},
			richListItemContent: {
				...bodyText,
				flex: 1,
			},
			splitRow: {
				flexDirection: r.row,
				flexWrap: "wrap",
				alignItems: "flex-start",
				justifyContent: "space-between",
				columnGap: metrics.gapX(2 / 3),
			},
			alignEnd: {
				...r.alignEnd,
			},
			sectionHeading: {
				color: primary,
			},
			contentRow: {
				flexDirection: r.row,
			},
			sidebarColumn: {},
			mainColumn: {
				flex: 1,
			},
			header: {
				alignItems: "center",
				rowGap: metrics.gapY(0.5),
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
			headerTitle: {
				alignItems: "center",
				textAlign: "center",
			},
			headerIdentity: {
				alignItems: "center",
				textAlign: "center",
				rowGap: metrics.gapY(0.35),
			},
			headerName: {
				fontSize: metadata.typography.heading.fontSize * 1.5,
				lineHeight: headerNameLineHeight,
			},
			headerContactRow: {
				justifyContent: "center",
				flexDirection: r.row,
				flexWrap: "wrap",
				rowGap: metrics.gapY(0.125),
				columnGap: metrics.gapX(0.5),
			},
			headerContactItem: {
				flexDirection: r.row,
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
			},
		});

		const sectionTimelineStyles = StyleSheet.create({
			items: {
				position: "relative",
			},
			line: {
				position: "absolute",
				top: 0,
				bottom: 0,
				left: 7.5,
				width: 1,
				backgroundColor: primary,
			},
			item: {
				flexDirection: "row",
				columnGap: metrics.gapX(1 / 2),
				position: "relative",
			},
			marker: {
				width: 16,
				alignItems: "center",
			},
			dot: {
				width: 9,
				height: 9,
				marginTop: 10,
				borderRadius: 999,
				borderWidth: 1,
				borderColor: primary,
				backgroundColor: background,
			},
			content: {
				flex: 1,
			},
		});

		const foregroundFor = ({ placement, colors }: TemplateStyleContext) =>
			resolvePlacementColor({
				placement,
				defaultForeground: colors.foreground,
				sidebarForeground: colors.sidebarForeground,
			});

		const accentFor = ({ placement, colors }: TemplateStyleContext) =>
			resolvePlacementColor({
				placement,
				defaultForeground: colors.primary,
				sidebarForeground: colors.sidebarForeground,
			});

		const featureStyles = {
			sectionTimeline: {
				...sectionTimelineStyles,
				line: (context) => ({
					...sectionTimelineStyles.line,
					backgroundColor: accentFor(context),
				}),
				dot: (context) => ({
					...sectionTimelineStyles.dot,
					borderColor: accentFor(context),
					backgroundColor: context.colors.background,
				}),
			},
		} satisfies TemplateFeatureStyleSlots;

		return {
			colors,
			featureStyles,
			styles: {
				...baseStyles,
				text: (context) => ({ ...baseStyles.text, color: foregroundFor(context) }),
				heading: (context) => ({ ...baseStyles.heading, color: foregroundFor(context) }),
				link: (context) => ({ ...baseStyles.link, color: foregroundFor(context) }),
				richParagraph: (context) => ({ ...baseStyles.richParagraph, color: foregroundFor(context) }),
				richListItemMarker: (context) => ({ ...baseStyles.richListItemMarker, color: foregroundFor(context) }),
				richListItemContent: (context) => ({ ...baseStyles.richListItemContent, color: foregroundFor(context) }),
				sectionHeading: (context) => ({ ...baseStyles.sectionHeading, color: accentFor(context) }),
				icon: (context) => ({
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: accentFor(context),
				}),
			} satisfies AzurillStyles,
		};
	}, [picture, metadata, rtl]);
};
