import type { Style } from "@react-pdf/types";
import type { IconName } from "phosphor-icons-react-pdf/dynamic";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateFeatures, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
import { Image, Page, StyleSheet, View } from "@react-pdf/renderer";
import { useMemo } from "react";
import { rgbaStringToHex } from "@reactive-resume/utils/color";
import { useRender } from "../../context";
import { TemplateProvider } from "../shared/context";
import { filterSections } from "../shared/filtering";
import { getTemplateMetrics } from "../shared/metrics";
import { getTemplatePageSize } from "../shared/page-size";
import { hasTemplatePicture } from "../shared/picture";
import { Heading, Icon, Link, Text } from "../shared/primitives";
import { Section } from "../shared/sections";
import { composeStyles, resolvePlacementColor } from "../shared/styles";

type PikachuStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	layout: Style;
	sidebarColumn: Style;
	sidebarContent: Style;
	mainColumn: Style;
	headerRow: Style;
	header: Style;
	headerDivider: Style;
	headerIdentity: Style;
	headerName: Style;
	headerText: Style;
	contactList: Style;
	contactItem: Style;
	picture: Style;
};

type PikachuTemplate = {
	colors: TemplateColorRoles;
	styles: PikachuStyles;
};

const pikachuFeatures = {
	stackSidebarItemHeader: true,
} satisfies TemplateFeatures;

export const PikachuPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata, picture } = data;
	const { colors, styles } = usePikachuTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const showHeader = pageIndex === 0;
	const showSidebar = !page.fullWidth;
	const hasPicture = hasTemplatePicture(picture);
	const mainSections = filterSections(page.main, data);
	const sidebarSections = filterSections(page.sidebar, data);

	return (
		<Page size={pageSize} style={styles.page}>
			<TemplateProvider styles={styles} colors={colors} features={pikachuFeatures}>
				<View style={styles.layout}>
					{showSidebar && (
						<View
							style={composeStyles(styles.sidebarColumn, {
								width: `${metadata.layout.sidebarWidth}%`,
								rowGap: metrics.sectionGap,
							})}
						>
							{showHeader && showSidebar && hasPicture && <Image src={picture.url} style={styles.picture} />}

							<View style={composeStyles(styles.sidebarContent, { rowGap: metrics.sectionGap })}>
								{sidebarSections.map((section, index) => (
									<Section key={index} section={section} placement="sidebar" />
								))}
							</View>
						</View>
					)}

					<View style={composeStyles(styles.mainColumn, { rowGap: metrics.sectionGap })}>
						{showHeader && (
							<View style={styles.headerRow}>
								{showHeader && !showSidebar && hasPicture && <Image src={picture.url} style={styles.picture} />}
								<Header styles={styles} colors={colors} />
							</View>
						)}

						<View style={{ rowGap: metrics.sectionGap }}>
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

const Header = ({ styles, colors }: { styles: PikachuStyles; colors: TemplateColorRoles }) => {
	const { basics } = useRender();

	return (
		<View style={styles.header}>
			<View style={styles.headerDivider}>
				<View style={styles.headerIdentity}>
					<Heading style={styles.headerName}>{basics.name}</Heading>
					<Text style={styles.headerText}>{basics.headline}</Text>
				</View>
			</View>

			<View style={styles.contactList}>
				{basics.email && (
					<Link src={`mailto:${basics.email}`} style={styles.contactItem}>
						<Icon name="envelope" color={colors.background} />
						<Text style={styles.headerText}>{basics.email}</Text>
					</Link>
				)}
				{basics.phone && (
					<Link src={`tel:${basics.phone}`} style={styles.contactItem}>
						<Icon name="phone" color={colors.background} />
						<Text style={styles.headerText}>{basics.phone}</Text>
					</Link>
				)}
				{basics.location && (
					<View style={styles.contactItem}>
						<Icon name="map-pin" color={colors.background} />
						<Text style={styles.headerText}>{basics.location}</Text>
					</View>
				)}
				{basics.website.url && (
					<Link src={basics.website.url} style={styles.contactItem}>
						<Icon name="globe" color={colors.background} />
						<Text style={styles.headerText}>{basics.website.label}</Text>
					</Link>
				)}
				{basics.customFields.map((field) => (
					<Link key={field.id} src={field.link} style={styles.contactItem}>
						<Icon name={field.icon as IconName} color={colors.background} />
						<Text style={styles.headerText}>{field.text}</Text>
					</Link>
				))}
			</View>
		</View>
	);
};

const usePikachuTemplate = (): PikachuTemplate => {
	const { picture, metadata } = useRender();

	return useMemo(() => {
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
		} satisfies Style;

		const baseStyles = StyleSheet.create({
			page: {
				color: foreground,
				backgroundColor: background,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
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
			layout: {
				flexDirection: "row",
				columnGap: metrics.columnGap,
			},
			sidebarColumn: {
				flexShrink: 0,
			},
			sidebarContent: { overflow: "hidden" },
			mainColumn: {
				flex: 1,
			},
			headerRow: {
				flexDirection: "row",
				alignItems: "center",
				columnGap: metrics.gapX(1),
			},
			header: {
				flex: 1,
				rowGap: metrics.gapY(0.5),
				backgroundColor: primary,
				color: background,
				borderRadius: picture.borderRadius,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
			},
			headerDivider: {
				rowGap: metrics.gapY(0.125),
				borderBottomWidth: 1,
				borderBottomColor: background,
				paddingBottom: metrics.gapY(0.5),
			},
			headerIdentity: {
				textAlign: "left",
				alignItems: "flex-start",
				rowGap: metrics.gapY(0.35),
			},
			headerName: {
				color: background,
				fontSize: metadata.typography.heading.fontSize * 1.5,
				lineHeight: 1,
			},
			headerText: { color: background },
			contactList: {
				flexDirection: "row",
				flexWrap: "wrap",
				rowGap: metrics.gapY(0.125),
				columnGap: metrics.gapX(0.75),
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
			} satisfies PikachuStyles,
		};
	}, [picture, metadata]);
};
