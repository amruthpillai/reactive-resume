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

type DitgarStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	sidebarColumn: Style;
	sidebarContent: Style;
	mainColumn: Style;
	mainContent: Style;
	specialContainer: Style;
	header: Style;
	picture: Style;
	headerTitle: Style;
	headerIdentity: Style;
	headerName: Style;
	headerText: Style;
	contactList: Style;
	contactItem: Style;
};

type DitgarTemplate = {
	colors: TemplateColorRoles;
	styles: DitgarStyles;
};

const ditgarFeatures = {
	stackSidebarItemHeader: true,
	mainItemHeaderBorder: true,
} satisfies TemplateFeatures;

export const DitgarPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata } = data;
	const { colors, styles } = useDitgarTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const showHeader = pageIndex === 0;
	const showSidebar = !page.fullWidth || showHeader;
	const sidebarSections = filterSections(page.sidebar, data);
	const mainSections = filterSections(page.main, data);
	const specialMainSection = showHeader ? mainSections[0] : undefined;
	const regularMainSections = showHeader ? mainSections.slice(1) : mainSections;

	return (
		<Page size={pageSize} style={styles.page}>
			<TemplateProvider styles={styles} colors={colors} features={ditgarFeatures}>
				{showSidebar && (
					<View
						style={composeStyles(styles.sidebarColumn, {
							width: `${metadata.layout.sidebarWidth}%`,
						})}
					>
						{showHeader && <Header styles={styles} colors={colors} />}

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
					{specialMainSection && (
						<View style={styles.specialContainer}>
							<Section section={specialMainSection} placement="main" showHeading={specialMainSection !== "summary"} />
						</View>
					)}

					<View style={composeStyles(styles.mainContent, { rowGap: metrics.sectionGap })}>
						{regularMainSections.map((section, index) => (
							<Section key={index} section={section} placement="main" />
						))}
					</View>
				</View>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles, colors }: { styles: DitgarStyles; colors: TemplateColorRoles }) => {
	const { basics, picture } = useRender();
	const hasPicture = hasTemplatePicture(picture);

	return (
		<View style={styles.header}>
			{hasPicture && <Image src={picture.url} style={styles.picture} />}

			<View style={styles.headerTitle}>
				<View style={styles.headerIdentity}>
					<Heading style={styles.headerName}>{basics.name}</Heading>
					<Text style={styles.headerText}>{basics.headline}</Text>
				</View>
			</View>

			<View style={styles.contactList}>
				{basics.email && (
					<Link src={`mailto:${basics.email}`} style={styles.contactItem}>
						<Icon name="at" color={colors.background} />
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

const getPrimaryTint = (primaryColor: string, opacity: number): string => {
	const primary = parseColorString(primaryColor);

	if (!primary) return rgbaStringToHex(primaryColor);

	const alpha = Math.max(0, Math.min(1, primary.a * opacity));

	return `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${alpha})`;
};

const useDitgarTemplate = (): DitgarTemplate => {
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
				flexDirection: "row",
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
			sectionHeading: {
				fontSize: metadata.typography.heading.fontSize * 0.9,
				color: primary,
				borderBottomWidth: 1,
				borderBottomColor: primary,
				paddingBottom: metrics.gapY(0.125),
			},
			item: { rowGap: metrics.gapY(0.125) },
			levelContainer: { width: "70%" },
			levelItem: { borderColor: primary },
			levelItemActive: { backgroundColor: primary },
			sidebarColumn: {
				flexShrink: 0,
				backgroundColor: primaryTint,
			},
			sidebarContent: {
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingTop: metrics.page.paddingVertical,
				paddingBottom: metrics.page.paddingVertical,
			},
			mainColumn: { flex: 1 },
			mainContent: {
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingTop: metrics.page.paddingVertical,
				paddingBottom: metrics.page.paddingVertical,
			},
			specialContainer: {
				backgroundColor: primaryTint,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
			},
			header: {
				backgroundColor: primary,
				color: background,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
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
			headerTitle: {},
			headerIdentity: {
				textAlign: "left",
				alignItems: "flex-start",
				rowGap: metrics.gapY(0.35),
			},
			headerName: {
				fontSize: metadata.typography.heading.fontSize * 1.5,
				lineHeight: 1,
				color: background,
			},
			headerText: { color: background },
			contactList: { rowGap: metrics.gapY(0.125) },
			contactItem: {
				flexDirection: "row",
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
			},
		});

		const foregroundFor = ({ placement, colors }: TemplateStyleContext) =>
			resolvePlacementColor({
				placement,
				defaultForeground: colors.foreground,
				sidebarForeground: colors.sidebarForeground,
			});

		const accentFor = ({ colors }: TemplateStyleContext) => colors.primary;

		return {
			colors,
			styles: {
				...baseStyles,
				text: (context) => ({ ...baseStyles.text, color: foregroundFor(context) }),
				heading: (context) => ({ ...baseStyles.heading, color: foregroundFor(context) }),
				link: (context) => ({ ...baseStyles.link, color: foregroundFor(context) }),
				richParagraph: (context) => ({ ...baseStyles.richParagraph, color: foregroundFor(context) }),
				richListItemMarker: (context) => ({ ...baseStyles.richListItemMarker, color: foregroundFor(context) }),
				richListItemContent: (context) => ({ ...baseStyles.richListItemContent, color: foregroundFor(context) }),
				alignRight: (context) => ({
					...baseStyles.alignRight,
					...(context.placement === "sidebar" ? { textAlign: "left" } : {}),
				}),
				sectionHeading: (context) => ({
					...baseStyles.sectionHeading,
					color: accentFor(context),
					borderBottomColor: accentFor(context),
				}),
				sectionItemHeader: (context) => ({
					...(context.placement === "main"
						? {
								borderLeftWidth: 2,
								borderLeftColor: accentFor(context),
								paddingLeft: metrics.gapX(0.5),
								paddingVertical: metrics.gapY(0.125),
								marginLeft: -metrics.gapX(0.625),
							}
						: {}),
				}),
				levelItem: (context) => ({ borderColor: accentFor(context) }),
				levelItemActive: (context) => ({ backgroundColor: accentFor(context) }),
				icon: (context) => ({
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: context.placement === "sidebar" ? foreground : primary,
				}),
			} satisfies DitgarStyles,
		};
	}, [picture, metadata]);
};
