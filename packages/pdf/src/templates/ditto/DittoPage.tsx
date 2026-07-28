import type { Style } from "@react-pdf/types";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
import { Fragment, useMemo } from "react";
import { rgbaStringToHex } from "@reactive-resume/utils/color";
import { Page, StyleSheet, View } from "#react-pdf-renderer";
import { useRender } from "../../context";
import { useRenderedSectionIds, useResolvedNode } from "../../semantic/context";
import { semanticNodeKeys } from "../../semantic/node-keys";
import { createBaseTemplateStyles } from "../shared/base-template-styles";
import {
	CustomFieldContactItem,
	EmailContactItem,
	LocationContactItem,
	PhoneContactItem,
	WebsiteContactItem,
} from "../shared/contact-item";
import { TemplateProvider } from "../shared/context";
import { filterSections } from "../shared/filtering";
import { getTemplateMetrics } from "../shared/metrics";
import { hasTemplatePicture } from "../shared/picture";
import { Heading, SemanticHeaderPicture, SemanticHeaderView, Text } from "../shared/primitives";
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

export const DittoPage = ({ page, pageSize, pageMinHeightStyle, showHeader, pageNumber }: TemplatePageProps) => {
	const data = useRender();
	const pageNodeKey = semanticNodeKeys.page(pageNumber);
	const { style: semanticPageStyle, size: semanticPageSize, ...semanticPageProps } = useResolvedNode(pageNodeKey);
	const { metadata, picture } = data;
	const { colors, styles } = useDittoTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const hasPicture = hasTemplatePicture(picture);
	const sidebarSections = useRenderedSectionIds(pageNodeKey, filterSections(page.sidebar, data));
	const mainSections = useRenderedSectionIds(pageNodeKey, filterSections(page.main, data));

	return (
		<Page
			{...semanticPageProps}
			size={semanticPageSize ?? pageSize}
			style={composeStyles(styles.page, pageMinHeightStyle, semanticPageStyle)}
		>
			<TemplateProvider pageNodeKey={pageNodeKey} styles={styles} colors={colors}>
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
		<SemanticHeaderView style={styles.header}>
			<View style={styles.headerBand}>
				<View style={styles.pictureAnchor}>
					{hasPicture && <SemanticHeaderPicture src={picture.url} style={styles.picture} />}
				</View>

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
					<EmailContactItem email={basics.email} style={styles.contactItem} />
					<PhoneContactItem phone={basics.phone} style={styles.contactItem} />
					<LocationContactItem location={basics.location} style={styles.contactItem} />
					<WebsiteContactItem website={basics.website} style={styles.contactItem} />
					{basics.customFields.map((field) => (
						<CustomFieldContactItem key={field.id} field={field} style={styles.contactItem} />
					))}
				</View>
			</View>
		</SemanticHeaderView>
	);
};

const useDittoTemplate = (): DittoTemplate => {
	const { picture, metadata, rtl } = useRender();

	return useMemo(() => {
		const r = createRtlStyleHelpers(rtl);
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const colors: TemplateColorRoles = { foreground, background, primary };
		const metrics = getTemplateMetrics(metadata.page);
		const hasPicture = hasTemplatePicture(picture);

		const base = createBaseTemplateStyles({ metadata, foreground, background, r, metrics, picture });

		const baseStyles = StyleSheet.create({
			...base,
			picture: {
				...base.picture,
				position: "absolute",
				top: metrics.page.paddingVertical * 0.75,
				left: "50%",
				marginLeft: -picture.size / 2,
			},
			page: {
				...base.page,
				flexDirection: "column",
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
