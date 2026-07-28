import type { Style } from "@react-pdf/types";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
import { useMemo } from "react";
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
	SemanticTemplatePartView,
	Text,
} from "../shared/primitives";
import { createRtlStyleHelpers } from "../shared/rtl";
import { Section } from "../shared/sections";
import { composeStyles, headerNameLineHeight } from "../shared/styles";

type ScizorStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	header: Style;
	headerIdentity: Style;
	headerName: Style;
	headerNameRule: Style;
	headerHeadline: Style;
	headerContactRow: Style;
	headerContactItem: Style;
	picture: Style;
	sections: Style;
};

type ScizorTemplate = {
	colors: TemplateColorRoles;
	styles: ScizorStyles;
};

type ScizorHeaderProps = {
	styles: ScizorStyles;
};

export const ScizorPage = ({ page, pageSize, pageMinHeightStyle, showHeader, pageNumber }: TemplatePageProps) => {
	const data = useRender();
	const pageNodeKey = semanticNodeKeys.page(pageNumber);
	const { style: semanticPageStyle, size: semanticPageSize, ...semanticPageProps } = useResolvedNode(pageNodeKey);
	const { metadata } = data;
	const { colors, styles } = useScizorTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const mainSections = useRenderedSectionIds(pageNodeKey, filterSections(page.main, data));
	const sidebarSections = useRenderedSectionIds(pageNodeKey, page.fullWidth ? [] : filterSections(page.sidebar, data));
	const sections = [...mainSections, ...sidebarSections];

	return (
		<Page
			{...semanticPageProps}
			size={semanticPageSize ?? pageSize}
			style={composeStyles(styles.page, pageMinHeightStyle, semanticPageStyle)}
		>
			<TemplateProvider pageNodeKey={pageNodeKey} styles={styles} colors={colors}>
				{showHeader && <Header styles={styles} />}

				<SemanticRegionView region="main" style={composeStyles(styles.sections, { rowGap: metrics.sectionGap })}>
					{sections.map((section) => (
						<Section key={section} section={section} placement="main" />
					))}
				</SemanticRegionView>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: ScizorHeaderProps) => {
	const { basics, picture } = useRender();
	const hasPicture = hasTemplatePicture(picture);

	return (
		<SemanticHeaderView style={styles.header}>
			<View style={styles.headerIdentity}>
				<Heading style={styles.headerName}>{basics.name}</Heading>
				<SemanticTemplatePartView partKeys={["header-name-rule"]} style={styles.headerNameRule} />
				{basics.headline && <Text style={styles.headerHeadline}>{basics.headline}</Text>}

				<SemanticContactListView style={styles.headerContactRow}>
					<LocationContactItem location={basics.location} style={styles.headerContactItem} />
					<EmailContactItem email={basics.email} style={styles.headerContactItem} />
					<PhoneContactItem phone={basics.phone} style={styles.headerContactItem} />
					<WebsiteContactItem website={basics.website} style={styles.headerContactItem} />
					{basics.customFields.map((field) => (
						<CustomFieldContactItem key={field.id} field={field} style={styles.headerContactItem} />
					))}
				</SemanticContactListView>
			</View>

			{hasPicture && <SemanticHeaderPicture src={picture.url} style={styles.picture} />}
		</SemanticHeaderView>
	);
};

const useScizorTemplate = (): ScizorTemplate => {
	const { picture, metadata, rtl } = useRender();

	return useMemo(() => {
		const r = createRtlStyleHelpers(rtl);
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const divider = "#D8DCE2";
		const colors: TemplateColorRoles = { foreground, background, primary };
		const metrics = getTemplateMetrics(metadata.page);
		const base = createBaseTemplateStyles({ metadata, foreground, background, r, metrics, picture });

		const baseStyles = StyleSheet.create({
			...base,
			page: {
				...base.page,
				borderTopWidth: metrics.gapY(0.45),
				borderTopColor: primary,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
				rowGap: metrics.sectionGap,
			},
			heading: { ...base.heading, fontWeight: metadata.typography.heading.fontWeights.at(-1) ?? "700" },
			bold: { fontWeight: metadata.typography.body.fontWeights.at(-1) ?? "700", color: foreground },
			section: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.25),
				borderTopWidth: 1,
				borderTopColor: divider,
				paddingTop: metrics.gapY(0.65),
			},
			sectionHeading: {
				color: foreground,
				fontSize: metadata.typography.heading.fontSize * 0.9,
				fontWeight: metadata.typography.heading.fontWeights.at(-1) ?? "700",
				textTransform: "uppercase",
			},
			sectionItems: {
				rowGap: metrics.itemGapY,
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
				flexDirection: r.row,
				alignItems: "flex-start",
				columnGap: metrics.gapX(1),
				paddingBottom: metrics.gapY(0.35),
			},
			headerIdentity: {
				flex: 1,
				...r.headerIdentity,
				rowGap: metrics.gapY(0.45),
			},
			headerName: {
				color: foreground,
				fontSize: metadata.typography.heading.fontSize * 1.85,
				lineHeight: headerNameLineHeight,
			},
			headerNameRule: {
				width: "72%",
				borderBottomWidth: 2,
				borderBottomColor: divider,
			},
			headerHeadline: {
				color: foreground,
			},
			headerContactRow: {
				flexDirection: r.row,
				flexWrap: "wrap",
				rowGap: metrics.gapY(0.125),
				columnGap: metrics.gapX(0.55),
			},
			headerContactItem: {
				flexDirection: r.row,
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
				color: foreground,
			},
			sections: {
				flexDirection: "column",
			},
		});

		const accentFor = ({ colors }: TemplateStyleContext) => colors.primary;

		return {
			colors,
			styles: {
				...baseStyles,
				page: {
					...baseStyles.page,
					borderTopColor: primary,
				},
				levelItem: (context) => ({ borderColor: accentFor(context) }),
				levelItemActive: (context) => ({ backgroundColor: accentFor(context) }),
				icon: (context) => ({
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: accentFor(context),
				}),
			} satisfies ScizorStyles,
		};
	}, [picture, metadata, rtl]);
};
