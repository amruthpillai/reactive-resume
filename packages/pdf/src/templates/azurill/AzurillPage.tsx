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

export const AzurillPage = ({ page, pageSize, pageMinHeightStyle, showHeader, pageNumber }: TemplatePageProps) => {
	const data = useRender();
	const pageNodeKey = semanticNodeKeys.page(pageNumber);
	const { style: semanticPageStyle, size: semanticPageSize, ...semanticPageProps } = useResolvedNode(pageNodeKey);
	const { metadata } = data;
	const { colors, styles, featureStyles } = useAzurillTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const sidebarSections = useRenderedSectionIds(pageNodeKey, filterSections(page.sidebar, data));
	const mainSections = useRenderedSectionIds(pageNodeKey, filterSections(page.main, data));

	return (
		<Page
			{...semanticPageProps}
			size={semanticPageSize ?? pageSize}
			style={composeStyles(styles.page, pageMinHeightStyle, semanticPageStyle)}
		>
			<TemplateProvider
				pageNodeKey={pageNodeKey}
				styles={styles}
				featureStyles={featureStyles}
				colors={colors}
				features={azurillFeatures}
			>
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
		<SemanticHeaderView style={styles.header}>
			{hasPicture && <SemanticHeaderPicture src={picture.url} style={styles.picture} />}

			<View style={styles.headerTitle}>
				<View style={styles.headerIdentity}>
					<Heading style={styles.headerName}>{basics.name}</Heading>
					<Text>{basics.headline}</Text>
				</View>
			</View>

			<View style={styles.headerContactRow}>
				<EmailContactItem email={basics.email} style={styles.headerContactItem} />
				<PhoneContactItem phone={basics.phone} style={styles.headerContactItem} />
				<LocationContactItem location={basics.location} style={styles.headerContactItem} />
				<WebsiteContactItem website={basics.website} style={styles.headerContactItem} />
				{basics.customFields.map((field) => (
					<CustomFieldContactItem key={field.id} field={field} style={styles.headerContactItem} />
				))}
			</View>
		</SemanticHeaderView>
	);
};

const useAzurillTemplate = (): AzurillTemplate => {
	const { picture, metadata, rtl } = useRender();

	return useMemo(() => {
		const r = createRtlStyleHelpers(rtl);
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const colors: TemplateColorRoles = { foreground, background, primary };
		const metrics = getTemplateMetrics(metadata.page);

		const base = createBaseTemplateStyles({ metadata, foreground, background, r, metrics, picture });

		const baseStyles = StyleSheet.create({
			...base,
			page: {
				...base.page,
				flexDirection: "column",
				rowGap: metrics.headerGap,
				columnGap: metrics.columnGap,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
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
