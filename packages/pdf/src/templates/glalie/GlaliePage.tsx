import type { Style } from "@react-pdf/types";
import type { IconName } from "phosphor-icons-react-pdf/dynamic";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateFeatures, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
import { Image, Page, StyleSheet, View } from "@react-pdf/renderer";
import { useMemo } from "react";
import { parseColorString, rgbaStringToHex } from "@reactive-resume/utils/color";
import { useRender } from "../../context";
import { TemplateProvider } from "../shared/context";
import { filterSections } from "../shared/filtering";
import { getTemplateMetrics } from "../shared/metrics";
import { getTemplatePageSize } from "../shared/page-size";
import { hasTemplatePicture } from "../shared/picture";
import { Heading, Icon, Link, Text } from "../shared/primitives";
import { Section } from "../shared/sections";
import { composeStyles, resolvePlacementColor } from "../shared/styles";

type GlalieStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	layout: Style;
	sidebarBackground: Style;
	sidebarColumn: Style;
	sidebarContent: Style;
	mainColumn: Style;
	mainContent: Style;
	header: Style;
	picture: Style;
	headerTitle: Style;
	headerIdentity: Style;
	headerName: Style;
	contactList: Style;
	contactItem: Style;
};

type GlalieTemplate = {
	colors: TemplateColorRoles;
	styles: GlalieStyles;
};

const glalieFeatures = {
	stackSidebarItemHeader: true,
} satisfies TemplateFeatures;

export const GlaliePage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata } = data;
	const { colors, styles } = useGlalieTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const showHeader = pageIndex === 0;
	const showSidebar = !page.fullWidth || showHeader;
	const mainSections = filterSections(page.main, data);
	const sidebarSections = filterSections(page.sidebar, data);

	return (
		<Page size={pageSize} style={styles.page}>
			<TemplateProvider styles={styles} colors={colors} features={glalieFeatures}>
				{showSidebar && <View style={styles.sidebarBackground} />}

				<View style={styles.layout}>
					{showSidebar && (
						<View
							style={composeStyles(styles.sidebarColumn, {
								width: `${metadata.layout.sidebarWidth}%`,
							})}
						>
							{showHeader && <Header styles={styles} />}

							{!page.fullWidth && (
								<View style={composeStyles(styles.sidebarContent, { rowGap: metrics.sectionGap })}>
									{sidebarSections.map((section, index) => (
										<Section key={index} section={section} placement="sidebar" />
									))}
								</View>
							)}
						</View>
					)}

					<View style={styles.mainColumn}>
						<View style={composeStyles(styles.mainContent, { rowGap: metrics.sectionGap })}>
							{mainSections.map((section, index) => (
								<Section key={index} section={section} placement="main" />
							))}
						</View>
					</View>
				</View>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: { styles: GlalieStyles }) => {
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

			<View style={styles.contactList}>
				{basics.email && (
					<Link src={`mailto:${basics.email}`} style={styles.contactItem}>
						<Icon name="envelope" />
						<Text>{basics.email}</Text>
					</Link>
				)}
				{basics.phone && (
					<Link src={`tel:${basics.phone}`} style={styles.contactItem}>
						<Icon name="phone" />
						<Text>{basics.phone}</Text>
					</Link>
				)}
				{basics.location && (
					<View style={styles.contactItem}>
						<Icon name="map-pin" />
						<Text>{basics.location}</Text>
					</View>
				)}
				{basics.website.url && (
					<Link src={basics.website.url} style={styles.contactItem}>
						<Icon name="globe" />
						<Text>{basics.website.label}</Text>
					</Link>
				)}
				{basics.customFields.map((field) => (
					<Link key={field.id} src={field.link} style={styles.contactItem}>
						<Icon name={field.icon as IconName} />
						<Text>{field.text}</Text>
					</Link>
				))}
			</View>
		</View>
	);
};

const getPrimaryTint = (primaryColor: string, opacity: number): string => {
	const primary = parseColorString(primaryColor);

	if (!primary) return rgbaStringToHex(primaryColor);

	const alpha = Math.max(0, Math.min(1, primary.a * opacity));

	return `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${alpha})`;
};

const useGlalieTemplate = (): GlalieTemplate => {
	const { picture, metadata } = useRender();

	return useMemo(() => {
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const primaryTint = getPrimaryTint(metadata.design.colors.primary, 0.2);
		const colors: TemplateColorRoles = {
			foreground,
			background,
			primary,
			sidebarForeground: foreground,
			sidebarBackground: primaryTint,
		};
		const metrics = getTemplateMetrics(metadata.page);

		const bodyText = {
			fontFamily: metadata.typography.body.fontFamily,
			fontSize: metadata.typography.body.fontSize,
			fontWeight: metadata.typography.body.fontWeights[0] ?? "400",
			lineHeight: metadata.typography.body.lineHeight,
			color: foreground,
		} satisfies Style;

		const baseStyles = StyleSheet.create({
			page: {
				color: foreground,
				backgroundColor: background,
				fontFamily: metadata.typography.body.fontFamily,
				fontSize: metadata.typography.body.fontSize,
				lineHeight: metadata.typography.body.lineHeight,
			},
			text: bodyText,
			heading: {
				fontFamily: metadata.typography.heading.fontFamily,
				fontSize: metadata.typography.heading.fontSize,
				fontWeight: metadata.typography.heading.fontWeights.at(-1) ?? "600",
				lineHeight: metadata.typography.heading.lineHeight,
				color: foreground,
			},
			div: { rowGap: metrics.gapY(0.125), columnGap: metrics.gapX(1 / 3) },
			inline: { flexDirection: "row", alignItems: "center", columnGap: metrics.gapX(1 / 3) },
			link: { textDecoration: "none", color: foreground },
			small: { fontSize: metadata.typography.body.fontSize * 0.875 },
			bold: { fontWeight: metadata.typography.body.fontWeights.at(-1) ?? "600" },
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
			section: { flexDirection: "column", rowGap: metrics.gapY(0.25) },
			sectionHeading: { borderBottomWidth: 1, borderBottomColor: primary },
			item: { rowGap: metrics.gapY(0.125) },
			levelContainer: { width: "100%" },
			levelItem: { borderColor: primary },
			levelItemActive: { backgroundColor: primary },
			sidebarBackground: {
				position: "absolute",
				top: 0,
				bottom: 0,
				left: 0,
				width: `${metadata.layout.sidebarWidth}%`,
				backgroundColor: primaryTint,
			},
			layout: { flexDirection: "row", minHeight: "100%" },
			sidebarColumn: {
				zIndex: 1,
				backgroundColor: primaryTint,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingTop: metrics.page.paddingVertical,
				rowGap: metrics.sectionGap,
			},
			sidebarContent: { overflow: "hidden" },
			mainColumn: { flex: 1, zIndex: 1 },
			mainContent: {
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingTop: metrics.page.paddingVertical,
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
			headerTitle: { alignItems: "center", textAlign: "center" },
			headerIdentity: { alignItems: "center", textAlign: "center", rowGap: metrics.gapY(0.35) },
			headerName: { fontSize: metadata.typography.heading.fontSize * 1.5, lineHeight: 1 },
			contactList: {
				width: "100%",
				borderWidth: 1,
				borderColor: primary,
				borderRadius: picture.borderRadius / 4,
				padding: metrics.gapX(0.75),
				rowGap: metrics.gapY(0.125),
			},
			contactItem: { flexDirection: "row", alignItems: "center", columnGap: metrics.gapX(1 / 6) },
		});

		const accentFor = ({ colors }: TemplateStyleContext) => colors.primary;
		const foregroundFor = (context: TemplateStyleContext) =>
			resolvePlacementColor({
				placement: context.placement,
				defaultForeground: colors.foreground,
				sidebarForeground: colors.sidebarForeground,
			});

		return {
			colors,
			styles: {
				...baseStyles,
				text: (context) => ({ ...bodyText, color: foregroundFor(context) }),
				heading: (context) => ({ ...baseStyles.heading, color: foregroundFor(context) }),
				link: (context) => ({ ...baseStyles.link, color: foregroundFor(context) }),
				sectionHeading: (context) => ({ ...baseStyles.sectionHeading, color: accentFor(context) }),
				levelItem: (context) => ({ borderColor: accentFor(context) }),
				levelItemActive: (context) => ({ backgroundColor: accentFor(context) }),
				icon: (context) => ({
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: accentFor(context),
				}),
			} satisfies GlalieStyles,
		};
	}, [picture, metadata]);
};
