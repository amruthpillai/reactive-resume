import type { Style } from "@react-pdf/types";
import type { IconName } from "phosphor-icons-react-pdf/dynamic";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
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
import { composeStyles } from "../shared/styles";

type LeafishStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	header: Style;
	headerIntro: Style;
	headerBody: Style;
	headerTitle: Style;
	headerIdentity: Style;
	headerName: Style;
	headerContactBand: Style;
	contactList: Style;
	contactItem: Style;
	picture: Style;
	body: Style;
	mainColumn: Style;
	sidebarColumn: Style;
};

type LeafishTemplate = {
	colors: TemplateColorRoles;
	styles: LeafishStyles;
};

export const LeafishPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata } = data;
	const { colors, styles } = useLeafishTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const showHeader = pageIndex === 0;
	const mainSections = filterSections(page.main, data).filter((section) => section !== "summary");
	const sidebarSections = filterSections(page.sidebar, data).filter((section) => section !== "summary");

	return (
		<Page size={pageSize} style={styles.page}>
			<TemplateProvider styles={styles} colors={colors}>
				{showHeader && <Header styles={styles} />}

				<View style={styles.body}>
					<View style={composeStyles(styles.mainColumn, { rowGap: metrics.sectionGap })}>
						{mainSections.map((section, index) => (
							<Section key={index} section={section} placement="main" />
						))}
					</View>

					{!page.fullWidth && (
						<View
							style={composeStyles(styles.sidebarColumn, {
								width: `${metadata.layout.sidebarWidth}%`,
								rowGap: metrics.sectionGap,
							})}
						>
							{sidebarSections.map((section, index) => (
								<Section key={index} section={section} placement="sidebar" />
							))}
						</View>
					)}
				</View>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: { styles: LeafishStyles }) => {
	const { basics, picture } = useRender();
	const hasPicture = hasTemplatePicture(picture);

	return (
		<View style={styles.header}>
			<View style={styles.headerIntro}>
				<View style={styles.headerBody}>
					{hasPicture && <Image src={picture.url} style={styles.picture} />}

					<View style={styles.headerTitle}>
						<View style={styles.headerIdentity}>
							<Heading style={styles.headerName}>{basics.name}</Heading>
							<Text>{basics.headline}</Text>
						</View>

						<Section section="summary" placement="main" showHeading={false} />
					</View>
				</View>
			</View>

			<View style={styles.headerContactBand}>
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
		</View>
	);
};

const getPrimaryAlpha = (primaryColor: string, opacity: number): string => {
	const primary = parseColorString(primaryColor);

	if (!primary) return rgbaStringToHex(primaryColor);

	const alpha = Math.max(0, Math.min(1, primary.a * opacity));

	return `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${alpha})`;
};

const useLeafishTemplate = (): LeafishTemplate => {
	const { picture, metadata } = useRender();

	return useMemo(() => {
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const primaryTintLight = getPrimaryAlpha(metadata.design.colors.primary, 0.1);
		const primaryTintDark = getPrimaryAlpha(metadata.design.colors.primary, 0.2);
		const colors: TemplateColorRoles = { foreground, background, primary };
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
			header: {},
			headerIntro: {
				backgroundColor: primaryTintLight,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
			},
			headerBody: {
				flexDirection: "row",
				alignItems: "center",
				columnGap: metrics.gapX(1),
			},
			headerTitle: {
				flex: 1,
				rowGap: metrics.gapY(0.5),
			},
			headerIdentity: { textAlign: "left", alignItems: "flex-start", rowGap: metrics.gapY(0.35) },
			headerName: { fontSize: metadata.typography.heading.fontSize * 1.5, lineHeight: 1 },
			headerContactBand: {
				backgroundColor: primaryTintDark,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
			},
			contactList: {
				flexDirection: "row",
				flexWrap: "wrap",
				rowGap: metrics.gapY(0.125),
				columnGap: metrics.gapX(1),
			},
			contactItem: {
				flexDirection: "row",
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
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
			body: {
				flexDirection: "row",
				columnGap: metrics.columnGap,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingTop: metrics.page.paddingVertical,
			},
			mainColumn: { flex: 1 },
			sidebarColumn: { flexShrink: 0 },
		});

		const accentFor = ({ colors }: TemplateStyleContext) => colors.primary;

		return {
			colors,
			styles: {
				...baseStyles,
				sectionHeading: (context) => ({ ...baseStyles.sectionHeading, color: accentFor(context) }),
				levelItem: (context) => ({ borderColor: accentFor(context) }),
				levelItemActive: (context) => ({ backgroundColor: accentFor(context) }),
				icon: (context) => ({
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: accentFor(context),
				}),
			} satisfies LeafishStyles,
		};
	}, [picture, metadata]);
};
