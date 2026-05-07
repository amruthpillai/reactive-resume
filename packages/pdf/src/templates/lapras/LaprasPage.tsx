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

type LaprasStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	header: Style;
	picture: Style;
	headerTitle: Style;
	headerIdentity: Style;
	headerName: Style;
	contactList: Style;
	contactItem: Style;
	sectionGroup: Style;
};

type LaprasTemplate = {
	colors: TemplateColorRoles;
	styles: LaprasStyles;
};

export const LaprasPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata } = data;
	const { colors, styles } = useLaprasTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const showHeader = pageIndex === 0;
	const mainSections = filterSections(page.main, data);
	const sidebarSections = filterSections(page.sidebar, data);

	return (
		<Page size={pageSize} style={styles.page}>
			<TemplateProvider styles={styles} colors={colors}>
				{showHeader && <Header styles={styles} />}

				<View style={composeStyles(styles.sectionGroup, { rowGap: metrics.gapY(1.5) })}>
					{mainSections.map((section, index) => (
						<Section key={index} section={section} placement="main" />
					))}
				</View>

				{!page.fullWidth && (
					<View style={composeStyles(styles.sectionGroup, { rowGap: metrics.gapY(1.5) })}>
						{sidebarSections.map((section, index) => (
							<Section key={index} section={section} placement="sidebar" />
						))}
					</View>
				)}
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: { styles: LaprasStyles }) => {
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

const getAlphaColor = (color: string, alpha: number): string => {
	const parsed = parseColorString(color);

	if (!parsed) return rgbaStringToHex(color);

	return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${Math.max(0, Math.min(1, alpha))})`;
};

const useLaprasTemplate = (): LaprasTemplate => {
	const { picture, metadata } = useRender();

	return useMemo(() => {
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const borderColor = getAlphaColor(metadata.design.colors.text, 0.1);
		const pictureBorderRadius = Math.min(picture.borderRadius, 30);
		const headingNegativeMargin = metadata.typography.heading.fontSize + 6;
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
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
				rowGap: metrics.gapY(1.5),
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
			section: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.25),
				borderWidth: 1,
				borderColor: borderColor,
				borderRadius: pictureBorderRadius,
				backgroundColor: background,
				padding: metrics.gapX(1),
			},
			sectionHeading: {
				alignSelf: "flex-start",
				marginTop: -headingNegativeMargin,
				backgroundColor: background,
				paddingHorizontal: metrics.gapX(1),
			},
			item: { rowGap: metrics.gapY(0.125) },
			levelContainer: { width: "100%" },
			levelItem: { borderColor: primary },
			levelItemActive: { backgroundColor: primary },
			header: {
				flexDirection: "row",
				alignItems: "center",
				columnGap: metrics.gapX(1),
				borderWidth: 1,
				borderColor: borderColor,
				borderRadius: pictureBorderRadius,
				backgroundColor: background,
				padding: metrics.gapX(1),
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
			headerTitle: { rowGap: metrics.gapY(0.5) },
			headerIdentity: { textAlign: "left", alignItems: "flex-start", rowGap: metrics.gapY(0.35) },
			headerName: { fontSize: metadata.typography.heading.fontSize * 1.5, lineHeight: 1 },
			contactList: {
				flexDirection: "row",
				flexWrap: "wrap",
				rowGap: metrics.gapY(0.125),
				columnGap: metrics.gapX(0.5),
			},
			contactItem: { flexDirection: "row", alignItems: "center", columnGap: metrics.gapX(1 / 6) },
			sectionGroup: {},
		});

		const accentFor = ({ colors }: TemplateStyleContext) => colors.primary;

		return {
			colors,
			styles: {
				...baseStyles,
				levelItem: (context) => ({ borderColor: accentFor(context) }),
				levelItemActive: (context) => ({ backgroundColor: accentFor(context) }),
				icon: (context) => ({
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: accentFor(context),
				}),
			} satisfies LaprasStyles,
		};
	}, [picture, metadata]);
};
