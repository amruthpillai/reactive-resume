import type { Style } from "@react-pdf/types";
import type { IconName } from "phosphor-icons-react-pdf/dynamic";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
import { Image, Page, StyleSheet, View } from "@react-pdf/renderer";
import { Fragment, useMemo } from "react";
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

type ChikoritaStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	mainColumn: Style;
	sidebarColumn: Style;
	header: Style;
	picture: Style;
	headerTitle: Style;
	headerIdentity: Style;
	headerName: Style;
	headerContactList: Style;
	headerContactRow: Style;
	headerContactItem: Style;
};

type ChikoritaTemplate = {
	colors: TemplateColorRoles;
	styles: ChikoritaStyles;
};

export const ChikoritaPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata, picture } = data;
	const { colors, styles } = useChikoritaTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const hasPicture = hasTemplatePicture(picture);
	const showHeader = pageIndex === 0;
	const sidebarSections = filterSections(page.sidebar, data);
	const mainSections = filterSections(page.main, data);

	return (
		<Page size={pageSize} style={styles.page}>
			<TemplateProvider styles={styles} colors={colors}>
				<View
					style={composeStyles(styles.mainColumn, {
						paddingTop: metrics.page.paddingVertical,
						paddingRight: page.fullWidth ? metrics.page.paddingHorizontal : metrics.columnGap,
						paddingBottom: metrics.page.paddingVertical,
						paddingLeft: metrics.page.paddingHorizontal,
						rowGap: metrics.sectionGap,
					})}
				>
					{showHeader && <Header styles={styles} />}

					{mainSections.map((section, index) => (
						<Section key={index} section={section} placement="main" />
					))}
				</View>

				<View
					style={composeStyles(styles.sidebarColumn, {
						display: page.fullWidth ? "none" : "flex",
						flexBasis: `${metadata.layout.sidebarWidth}%`,
						paddingTop:
							showHeader && hasPicture
								? metrics.page.paddingVertical + picture.size + metrics.itemGapY * 3
								: metrics.page.paddingVertical,
						paddingRight: metrics.page.paddingHorizontal,
						paddingBottom: metrics.page.paddingVertical,
						paddingLeft: metrics.columnGap,
						rowGap: metrics.sectionGap,
					})}
				>
					{sidebarSections.map((section, index) => (
						<Fragment key={index}>
							<Section section={section} placement="sidebar" />
						</Fragment>
					))}
				</View>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: { styles: ChikoritaStyles }) => {
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

				<View style={styles.headerContactList}>
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
					</View>

					<View style={styles.headerContactRow}>
						{basics.website.url && (
							<Link src={basics.website.url} style={styles.headerContactItem}>
								<Icon name="globe" />
								<Text>{basics.website.label}</Text>
							</Link>
						)}
						{basics.customFields.map((field) => (
							<Link key={field.id} src={field.link} style={styles.headerContactItem}>
								<Icon name={field.icon as IconName} />
								<Text>{field.text}</Text>
							</Link>
						))}
					</View>
				</View>
			</View>
		</View>
	);
};

const useChikoritaTemplate = (): ChikoritaTemplate => {
	const { picture, metadata } = useRender();

	return useMemo(() => {
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const colors: TemplateColorRoles = {
			foreground,
			background,
			primary,
			sidebarForeground: background,
			sidebarBackground: primary,
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
			div: {
				rowGap: metrics.gapY(0.125),
				columnGap: metrics.gapX(1 / 3),
			},
			inline: {
				flexDirection: "row",
				alignItems: "center",
				columnGap: metrics.gapX(0.25),
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
				width: metadata.typography.body.fontSize,
				textAlign: "right",
				...bodyText,
			},
			richListItemContent: {
				flex: 1,
				...bodyText,
			},
			splitRow: {
				flexDirection: "row",
				flexWrap: "wrap",
				alignItems: "flex-start",
				justifyContent: "space-between",
				columnGap: metrics.gapX(2 / 3),
			},
			alignRight: {
				textAlign: "right",
				minWidth: 0,
				maxWidth: "100%",
				flexShrink: 1,
			},
			section: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.25),
			},
			sectionHeading: {
				fontSize: metadata.typography.heading.fontSize * 0.85,
				color: primary,
				borderBottomWidth: 1,
				borderBottomColor: primary,
				paddingBottom: metrics.gapY(0.125),
			},
			sectionItems: {
				paddingTop: metrics.gapY(0.375),
			},
			item: {
				rowGap: metrics.gapY(0.125),
			},
			levelContainer: {
				width: "70%",
			},
			mainColumn: {
				flex: 1,
			},
			sidebarColumn: {
				backgroundColor: primary,
			},
			header: {
				flexDirection: "row",
				alignItems: "flex-start",
				columnGap: metrics.gapX(0.5),
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
				flex: 1,
				rowGap: metrics.gapY(0.5),
			},
			headerIdentity: {
				textAlign: "left",
				alignItems: "flex-start",
				rowGap: metrics.gapY(0.35),
			},
			headerName: {
				fontSize: metadata.typography.heading.fontSize * 1.5,
				lineHeight: 1,
			},
			headerContactList: {
				rowGap: metrics.gapY(0.125),
			},
			headerContactRow: {
				flexDirection: "row",
				flexWrap: "wrap",
				columnGap: metrics.gapX(2 / 3),
				rowGap: metrics.gapY(0.125),
			},
			headerContactItem: {
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
		const accentFor = ({ placement, colors }: TemplateStyleContext) =>
			resolvePlacementColor({
				placement,
				defaultForeground: colors.primary,
				sidebarForeground: colors.sidebarForeground,
			});

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
				splitRow: (context) => ({
					...baseStyles.splitRow,
					...(context.placement === "sidebar"
						? { flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start" }
						: {}),
				}),
				alignRight: (context) => ({
					...baseStyles.alignRight,
					...(context.placement === "sidebar" ? { textAlign: "left" } : {}),
				}),
				sectionHeading: (context) => ({
					...baseStyles.sectionHeading,
					color: accentFor(context),
					borderBottomColor: accentFor(context),
				}),
				levelItem: (context) => ({ borderColor: accentFor(context) }),
				levelItemActive: (context) => ({ backgroundColor: accentFor(context) }),
				icon: (context) => ({
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: accentFor(context),
				}),
			} satisfies ChikoritaStyles,
		};
	}, [picture, metadata]);
};
