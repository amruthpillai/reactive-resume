import type { Style } from "@react-pdf/types";
import type { IconName } from "phosphor-icons-react-pdf/dynamic";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
import { useMemo } from "react";
import { getNetworkIcon } from "@reactive-resume/resume/icons";
import { rgbaStringToHex } from "@reactive-resume/utils/color";
import { Page, StyleSheet, View } from "#react-pdf-renderer";
import { useRender } from "../../context";
import { SemanticNodeKeyProvider, useRenderedSectionIds, useResolvedNode } from "../../semantic/context";
import { semanticNodeKeys } from "../../semantic/node-keys";
import { createBaseTemplateStyles } from "../shared/base-template-styles";
import {
	CustomFieldContactItem,
	EmailContactItem,
	LocationContactItem,
	PhoneContactItem,
	WebsiteContactItem,
} from "../shared/contact-item";
import { TemplateProvider, useTemplateStyle } from "../shared/context";
import { filterItems, filterSections, hasVisibleItems } from "../shared/filtering";
import { getTemplateMetrics } from "../shared/metrics";
import { hasTemplatePicture } from "../shared/picture";
import {
	Heading,
	Icon,
	Link,
	SemanticContactListView,
	SemanticHeaderPicture,
	SemanticHeaderView,
	SemanticRegionView,
	Text,
} from "../shared/primitives";
import { createRtlStyleHelpers } from "../shared/rtl";
import { Section } from "../shared/sections";
import { composeStyles, headerNameLineHeight } from "../shared/styles";

type OnyxStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	header: Style;
	picture: Style;
	headerTitle: Style;
	headerIdentity: Style;
	headerName: Style;
	headerProfiles: Style;
	contactList: Style;
	contactItem: Style;
	sectionGroup: Style;
};

type OnyxTemplate = {
	colors: TemplateColorRoles;
	styles: OnyxStyles;
};

type OnyxHeaderProps = {
	styles: OnyxStyles;
	showProfiles: boolean;
};

export const OnyxPage = ({ page, pageSize, pageMinHeightStyle, showHeader, pageNumber }: TemplatePageProps) => {
	const data = useRender();
	const pageNodeKey = semanticNodeKeys.page(pageNumber);
	const { style: semanticPageStyle, size: semanticPageSize, ...semanticPageProps } = useResolvedNode(pageNodeKey);
	const { metadata } = data;
	const { colors, styles } = useOnyxTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const isProfilesInLayout = page.main.includes("profiles") || page.sidebar.includes("profiles");
	const showProfiles = hasVisibleItems(data.sections.profiles, "profiles") && isProfilesInLayout;
	const excludeFromBody = (section: string) => !showProfiles || section !== "profiles";
	const mainSections = useRenderedSectionIds(pageNodeKey, filterSections(page.main, data).filter(excludeFromBody));
	const sidebarSections = useRenderedSectionIds(
		pageNodeKey,
		filterSections(page.sidebar, data).filter(excludeFromBody),
	);

	return (
		<Page
			{...semanticPageProps}
			size={semanticPageSize ?? pageSize}
			style={composeStyles(styles.page, pageMinHeightStyle, semanticPageStyle)}
		>
			<TemplateProvider pageNodeKey={pageNodeKey} styles={styles} colors={colors}>
				{showHeader && <Header styles={styles} showProfiles={showProfiles} />}

				<SemanticRegionView region="main" style={composeStyles(styles.sectionGroup, { rowGap: metrics.sectionGap })}>
					{mainSections.map((section) => (
						<Section key={section} section={section} placement="main" />
					))}
				</SemanticRegionView>

				{!page.fullWidth && (
					<SemanticRegionView
						region="sidebar"
						style={composeStyles(styles.sectionGroup, { rowGap: metrics.sectionGap })}
					>
						{sidebarSections.map((section) => (
							<Section key={section} section={section} placement="sidebar" />
						))}
					</SemanticRegionView>
				)}
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles, showProfiles }: OnyxHeaderProps) => {
	const { basics, picture, sections } = useRender();
	const hasPicture = hasTemplatePicture(picture);
	const visibleProfiles = showProfiles ? filterItems(sections.profiles.items, "profiles") : [];
	const inlineStyle = useTemplateStyle("inline");

	return (
		<SemanticHeaderView style={styles.header}>
			{hasPicture && <SemanticHeaderPicture src={picture.url} style={styles.picture} />}

			<View style={styles.headerTitle}>
				<View style={styles.headerIdentity}>
					<Heading style={styles.headerName}>{basics.name}</Heading>
					<Text>{basics.headline}</Text>
				</View>

				<SemanticContactListView style={styles.contactList}>
					<EmailContactItem email={basics.email} style={styles.contactItem} />
					<PhoneContactItem phone={basics.phone} style={styles.contactItem} />
					<LocationContactItem location={basics.location} style={styles.contactItem} />
					<WebsiteContactItem website={basics.website} style={styles.contactItem} />
					{basics.customFields.map((field) => (
						<CustomFieldContactItem key={field.id} field={field} style={styles.contactItem} />
					))}
				</SemanticContactListView>
			</View>

			{showProfiles && (
				<SemanticNodeKeyProvider nodeKey={undefined}>
					<View style={styles.headerProfiles}>
						{visibleProfiles.map((item) => {
							const iconName = (item.icon as IconName) || (getNetworkIcon(item.network) as IconName);
							const label = item.website.label || item.username;
							const content = (
								<>
									<Icon name={iconName} {...(item.iconColor ? { color: item.iconColor } : {})} />
									<Text>{label}</Text>
								</>
							);

							return item.website.url ? (
								<Link key={item.id} src={item.website.url} style={composeStyles(inlineStyle)}>
									{content}
								</Link>
							) : (
								<View key={item.id} style={composeStyles(inlineStyle)}>
									{content}
								</View>
							);
						})}
					</View>
				</SemanticNodeKeyProvider>
			)}
		</SemanticHeaderView>
	);
};

const useOnyxTemplate = (): OnyxTemplate => {
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
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
				rowGap: metrics.sectionGap,
			},
			section: {
				flexDirection: "column",
				rowGap: metrics.gapY(0.25),
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
				alignItems: "center",
				columnGap: metrics.gapX(1),
				borderBottomWidth: 1,
				borderBottomColor: primary,
				paddingBottom: metrics.page.paddingVertical,
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
			headerProfiles: {
				flexDirection: "column",
				alignItems: r.rtl ? "flex-start" : "flex-end",
				rowGap: metrics.gapY(0.125),
			},
			contactList: {
				flexDirection: r.row,
				flexWrap: "wrap",
				rowGap: metrics.gapY(0.125),
				columnGap: metrics.gapX(0.75),
			},
			contactItem: {
				flexDirection: r.row,
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
			},
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
			} satisfies OnyxStyles,
		};
	}, [picture, metadata, rtl]);
};
