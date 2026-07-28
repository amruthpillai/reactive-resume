import type { Style } from "@react-pdf/types";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateFeatures, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
import { useMemo } from "react";
import { rgbaStringToHex } from "@reactive-resume/utils/color";
import { Page, StyleSheet, View } from "#react-pdf-renderer";
import { useRender } from "../../context";
import { useRenderedSectionIds, useResolvedNode } from "../../semantic/context";
import { semanticNodeKeys } from "../../semantic/node-keys";
import { createBaseTemplateStyles } from "../shared/base-template-styles";
import { getPrimaryTint } from "../shared/color-helpers";
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

type GlalieHeaderProps = {
	styles: GlalieStyles;
};

const glalieFeatures = {
	stackSidebarItemHeader: true,
} satisfies TemplateFeatures;

export const GlaliePage = ({ page, pageSize, pageMinHeightStyle, showHeader, pageNumber }: TemplatePageProps) => {
	const data = useRender();
	const pageNodeKey = semanticNodeKeys.page(pageNumber);
	const { style: semanticPageStyle, size: semanticPageSize, ...semanticPageProps } = useResolvedNode(pageNodeKey);
	const { metadata } = data;
	const { colors, styles } = useGlalieTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const showSidebar = !page.fullWidth || showHeader;
	const mainSections = useRenderedSectionIds(pageNodeKey, filterSections(page.main, data));
	const sidebarSections = useRenderedSectionIds(pageNodeKey, filterSections(page.sidebar, data));

	return (
		<Page
			{...semanticPageProps}
			size={semanticPageSize ?? pageSize}
			style={composeStyles(styles.page, pageMinHeightStyle, semanticPageStyle)}
		>
			<TemplateProvider pageNodeKey={pageNodeKey} styles={styles} colors={colors} features={glalieFeatures}>
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
									{sidebarSections.map((section) => (
										<Section key={section} section={section} placement="sidebar" />
									))}
								</View>
							)}
						</View>
					)}

					<View style={styles.mainColumn}>
						<View style={composeStyles(styles.mainContent, { rowGap: metrics.sectionGap })}>
							{mainSections.map((section) => (
								<Section key={section} section={section} placement="main" />
							))}
						</View>
					</View>
				</View>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: GlalieHeaderProps) => {
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

			<View style={styles.contactList}>
				<EmailContactItem email={basics.email} style={styles.contactItem} />
				<PhoneContactItem phone={basics.phone} style={styles.contactItem} />
				<LocationContactItem location={basics.location} style={styles.contactItem} />
				<WebsiteContactItem website={basics.website} style={styles.contactItem} />
				{basics.customFields.map((field) => (
					<CustomFieldContactItem key={field.id} field={field} style={styles.contactItem} />
				))}
			</View>
		</SemanticHeaderView>
	);
};

const useGlalieTemplate = (): GlalieTemplate => {
	const { picture, metadata, rtl } = useRender();

	return useMemo(() => {
		const r = createRtlStyleHelpers(rtl);
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

		const base = createBaseTemplateStyles({ metadata, foreground, background, r, metrics, picture });

		const baseStyles = StyleSheet.create({
			...base,
			section: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.25),
			},
			sectionHeading: {
				borderBottomWidth: 1,
				borderBottomColor: primary,
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
			sidebarBackground: {
				position: "absolute",
				top: 0,
				bottom: 0,
				...r.anchorToStart(0),
				width: `${metadata.layout.sidebarWidth}%`,
				backgroundColor: primaryTint,
			},
			layout: {
				flexDirection: r.row,
				minHeight: "100%",
			},
			sidebarColumn: {
				zIndex: 1,
				backgroundColor: primaryTint,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingTop: metrics.page.paddingVertical,
				rowGap: metrics.sectionGap,
			},
			sidebarContent: {
				overflow: "hidden",
			},
			mainColumn: {
				flex: 1,
				zIndex: 1,
			},
			mainContent: {
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingTop: metrics.page.paddingVertical,
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
			contactList: {
				width: "100%",
				borderWidth: 1,
				borderColor: primary,
				borderRadius: 0,
				padding: metrics.gapX(0.75),
				rowGap: metrics.gapY(0.125),
			},
			contactItem: {
				flexDirection: r.row,
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
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
				text: (context) => ({ ...base.text, color: foregroundFor(context) }),
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
	}, [picture, metadata, rtl]);
};
