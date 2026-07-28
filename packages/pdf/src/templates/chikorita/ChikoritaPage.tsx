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
import {
	Heading,
	SemanticContactListView,
	SemanticHeaderPicture,
	SemanticHeaderView,
	SemanticRegionView,
	Text,
} from "../shared/primitives";
import { createRtlStyleHelpers } from "../shared/rtl";
import { Section } from "../shared/sections";
import { composeStyles, headerNameLineHeight, resolvePlacementColor } from "../shared/styles";

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

type ChikoritaHeaderProps = {
	styles: ChikoritaStyles;
};

export const ChikoritaPage = ({ page, pageSize, pageMinHeightStyle, showHeader, pageNumber }: TemplatePageProps) => {
	const data = useRender();
	const pageNodeKey = semanticNodeKeys.page(pageNumber);
	const { style: semanticPageStyle, size: semanticPageSize, ...semanticPageProps } = useResolvedNode(pageNodeKey);
	const { metadata, picture } = data;
	const { colors, styles } = useChikoritaTemplate();
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
				<SemanticRegionView
					region="main"
					style={composeStyles(styles.mainColumn, {
						paddingTop: metrics.page.paddingVertical,
						paddingRight: page.fullWidth ? metrics.page.paddingHorizontal : metrics.columnGap,
						paddingBottom: metrics.page.paddingVertical,
						paddingLeft: metrics.page.paddingHorizontal,
						rowGap: metrics.sectionGap,
					})}
				>
					{showHeader && <Header styles={styles} />}

					{mainSections.map((section) => (
						<Section key={section} section={section} placement="main" />
					))}
				</SemanticRegionView>

				<SemanticRegionView
					region="sidebar"
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
					{sidebarSections.map((section) => (
						<Fragment key={section}>
							<Section section={section} placement="sidebar" />
						</Fragment>
					))}
				</SemanticRegionView>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: ChikoritaHeaderProps) => {
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

				<SemanticContactListView style={styles.headerContactList}>
					<View style={styles.headerContactRow}>
						<EmailContactItem email={basics.email} style={styles.headerContactItem} />
						<PhoneContactItem phone={basics.phone} style={styles.headerContactItem} />
						<LocationContactItem location={basics.location} style={styles.headerContactItem} />
					</View>

					<View style={styles.headerContactRow}>
						<WebsiteContactItem website={basics.website} style={styles.headerContactItem} />
						{basics.customFields.map((field) => (
							<CustomFieldContactItem key={field.id} field={field} style={styles.headerContactItem} />
						))}
					</View>
				</SemanticContactListView>
			</View>
		</SemanticHeaderView>
	);
};

const useChikoritaTemplate = (): ChikoritaTemplate => {
	const { picture, metadata, rtl } = useRender();

	return useMemo(() => {
		const r = createRtlStyleHelpers(rtl);
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

		const base = createBaseTemplateStyles({ metadata, foreground, background, r, metrics, picture });

		const baseStyles = StyleSheet.create({
			...base,
			inline: { ...base.inline, columnGap: metrics.gapX(0.25) },
			page: {
				...base.page,
				flexDirection: r.row,
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
				flexDirection: r.row,
				alignItems: "flex-start",
				columnGap: metrics.gapX(0.5),
			},
			headerTitle: {
				flex: 1,
				rowGap: metrics.gapY(0.5),
			},
			headerIdentity: {
				...r.headerIdentity,
				rowGap: metrics.gapY(0.35),
			},
			headerName: {
				fontSize: metadata.typography.heading.fontSize * 1.5,
				lineHeight: headerNameLineHeight,
			},
			headerContactList: {
				rowGap: metrics.gapY(0.125),
			},
			headerContactRow: {
				flexDirection: r.row,
				flexWrap: "wrap",
				columnGap: metrics.gapX(2 / 3),
				rowGap: metrics.gapY(0.125),
			},
			headerContactItem: {
				flexDirection: r.row,
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
				alignEnd: (context) => ({
					...baseStyles.alignEnd,
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
	}, [picture, metadata, rtl]);
};
