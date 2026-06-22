import type { Style } from "@react-pdf/types";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
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
import { composeStyles, headerNameLineHeight } from "../shared/styles";

type DittoStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	header: Style;
	headerBand: Style;
	pictureAnchor: Style;
	picture: Style;
	headerTitle: Style;
	headerIdentity: Style;
	headerName: Style;
	headerHeadline: Style;
	contactRow: Style;
	contactOffset: Style;
	contactList: Style;
	contactItem: Style;
	contentRow: Style;
	sidebarColumn: Style;
	mainColumn: Style;
};

type DittoTemplate = {
	colors: TemplateColorRoles;
	styles: DittoStyles;
};

type DittoHeaderProps = {
	styles: DittoStyles;
};

export const DittoPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata, picture } = data;
	const { colors, styles } = useDittoTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const pageMinHeightStyle = getTemplatePageMinHeightStyle(metadata.page.format);
	const hasPicture = hasTemplatePicture(picture);
	const showHeader = pageIndex === 0;
	const sidebarSections = filterSections(page.sidebar, data);
	const mainSections = filterSections(page.main, data);

	return (
		<Page size={pageSize} style={composeStyles(styles.page, pageMinHeightStyle)}>
			<TemplateProvider styles={styles} colors={colors}>
				{showHeader && <Header styles={styles} />}

				<View style={composeStyles(styles.contentRow, { paddingTop: metrics.headerGap })}>
					<View
						style={composeStyles(styles.sidebarColumn, {
							display: page.fullWidth ? "none" : "flex",
							width: `${metadata.layout.sidebarWidth}%`,
							paddingLeft: metrics.page.paddingHorizontal,
							paddingTop: showHeader && hasPicture ? metrics.page.paddingVertical : 0,
							rowGap: metrics.sectionGap,
						})}
					>
						{sidebarSections.map((section) => (
							<Fragment key={section}>
								<Section section={section} placement="sidebar" />
							</Fragment>
						))}
					</View>

					<View
						style={composeStyles(styles.mainColumn, {
							paddingLeft: metrics.columnGap,
							paddingRight: metrics.page.paddingHorizontal,
							rowGap: metrics.sectionGap,
						})}
					>
						{mainSections.map((section) => (
							<Section key={section} section={section} placement="main" />
						))}
					</View>
				</View>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: DittoHeaderProps) => {
	const { basics, picture } = useRender();
	const hasPicture = hasTemplatePicture(picture);

	return (
		<View style={styles.header}>
			<View style={styles.headerBand}>
				<View style={styles.pictureAnchor}>{hasPicture && <Image src={picture.url} style={styles.picture} />}</View>

				<View style={styles.headerTitle}>
					<View style={styles.headerIdentity}>
						<Heading style={styles.headerName}>{basics.name}</Heading>
						<Text style={styles.headerHeadline}>{basics.headline}</Text>
					</View>
				</View>
			</View>

			<View style={styles.contactRow}>
				<View style={styles.contactOffset} />

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
					<WebsiteContactItem website={basics.website} style={styles.contactItem} />
					{basics.customFields.map((field) => (
						<CustomFieldContactItem key={field.id} field={field} style={styles.contactItem} />
					))}
				</View>
			</View>
		</View>
	);
};

export const useDittoTemplate = (): DittoTemplate => {
	const { picture, metadata, rtl } = useRender();

	return useMemo(() => {
		const r = createRtlStyleHelpers(rtl);
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const colors: TemplateColorRoles = { foreground, background, primary };
		const metrics = getTemplateMetrics(metadata.page);
		const hasPicture = hasTemplatePicture(picture);

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
				color: foreground,
				backgroundColor: background,
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
			section: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.25),
			},
			sectionHeading: {
				color: primary,
			},
			item: {
				rowGap: metrics.gapY(0.125),
			},
			levelContainer: {
				width: "100%",
			},
			levelItem: {
				borderColor: primary,
			},
			levelItemActive: {
				backgroundColor: primary,
			},
			header: {
				position: "relative",
			},
			headerBand: {
				backgroundColor: primary,
				color: background,
				flexDirection: r.row,
				...(hasPicture ? { minHeight: picture.size * 0.6 } : {}),
			},
			pictureAnchor: {
				width: `${metadata.layout.sidebarWidth}%`,
				flexShrink: 0,
				position: "relative",
			},
			picture: {
				position: "absolute",
				top: metrics.page.paddingVertical * 0.75,
				left: "50%",
				marginLeft: -picture.size / 2,
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
				justifyContent: "center",
				rowGap: metrics.gapY(0.125),
				paddingLeft: metrics.page.paddingHorizontal,
				paddingTop: metrics.page.paddingVertical,
				paddingRight: metrics.page.paddingHorizontal,
				paddingBottom: metrics.page.paddingVertical,
				color: background,
			},
			headerIdentity: {
				...r.headerIdentity,
				rowGap: metrics.gapY(0.35),
			},
			headerName: {
				fontSize: metadata.typography.heading.fontSize * 1.5,
				color: background,
				lineHeight: headerNameLineHeight,
			},
			headerHeadline: {
				color: background,
			},
			contactRow: {
				flexDirection: r.row,
				alignItems: "flex-start",
			},
			contactOffset: {
				width: `${metadata.layout.sidebarWidth}%`,
				flexShrink: 0,
			},
			contactList: {
				flex: 1,
				flexDirection: r.row,
				flexWrap: "wrap",
				columnGap: metrics.gapX(2 / 3),
				rowGap: metrics.gapY(0.125),
				paddingLeft: metrics.page.paddingHorizontal,
				paddingTop: metrics.page.paddingVertical,
				paddingRight: metrics.page.paddingHorizontal,
				paddingBottom: 0,
			},
			contactItem: {
				flexDirection: r.row,
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
			},
			contentRow: {
				flexDirection: r.row,
			},
			sidebarColumn: {
				flexShrink: 0,
			},
			mainColumn: {
				flex: 1,
			},
		});

		const foregroundFor = ({ colors }: TemplateStyleContext) => colors.foreground;

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
				alignEnd: (context) => ({
					...baseStyles.alignEnd,
					...(context.placement === "sidebar" ? { textAlign: "left" } : {}),
				}),
				icon: {
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: primary,
				},
			} satisfies DittoStyles,
		};
	}, [picture, metadata, rtl]);
};
