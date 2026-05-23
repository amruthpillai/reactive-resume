import type { Style } from "@react-pdf/types";
import type { ReactNode } from "react";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleContext, TemplateStyleSlots } from "../shared/types";
import { useMemo } from "react";
import { rgbaStringToHex } from "@reactive-resume/utils/color";
import { isRTL } from "@reactive-resume/utils/locale";
import { useRender } from "../../context";
import { Image, Page, StyleSheet, View } from "../../renderer";
import { CustomFieldContactItem, WebsiteContactItem } from "../shared/contact-item";
import { TemplateProvider } from "../shared/context";
import { filterSections } from "../shared/filtering";
import { getTemplateMetrics } from "../shared/metrics";
import { getTemplatePageMinHeightStyle, getTemplatePageSize } from "../shared/page-size";
import { hasTemplatePicture } from "../shared/picture";
import { Heading, Icon, Link, Text } from "../shared/primitives";
import { Section } from "../shared/sections";
import { composeStyles, headerNameLineHeight } from "../shared/styles";

type RhyhornStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	header: Style;
	headerTitle: Style;
	headerIdentity: Style;
	headerName: Style;
	contactList: Style;
	contactItem: Style;
	contactItemContent: Style;
	contactItemLast: Style;
	picture: Style;
	sectionGroup: Style;
};

type RhyhornTemplate = {
	colors: TemplateColorRoles;
	styles: RhyhornStyles;
};

export const RhyhornPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata } = data;
	const { colors, styles } = useRhyhornTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const pageMinHeightStyle = getTemplatePageMinHeightStyle(metadata.page.format);
	const showHeader = pageIndex === 0;
	const mainSections = filterSections(page.main, data);
	const sidebarSections = filterSections(page.sidebar, data);

	return (
		<Page size={pageSize} style={composeStyles(styles.page, pageMinHeightStyle)}>
			<TemplateProvider styles={styles} colors={colors}>
				{showHeader && <Header styles={styles} />}

				<View style={composeStyles(styles.sectionGroup, { rowGap: metrics.sectionGap })}>
					{mainSections.map((section) => (
						<Section key={section} section={section} placement="main" />
					))}
				</View>

				{!page.fullWidth && (
					<View style={composeStyles(styles.sectionGroup, { rowGap: metrics.sectionGap })}>
						{sidebarSections.map((section) => (
							<Section key={section} section={section} placement="sidebar" />
						))}
					</View>
				)}
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: { styles: RhyhornStyles }) => {
	const { basics, picture } = useRender();
	const hasPicture = hasTemplatePicture(picture);
	const contactItems: { id: string; content: ReactNode }[] = [];

	if (basics.email) {
		contactItems.push({
			id: "email",
			content: (
				<Link src={`mailto:${basics.email}`} style={styles.contactItemContent}>
					<Icon name="envelope" />
					<Text>{basics.email}</Text>
				</Link>
			),
		});
	}

	if (basics.phone) {
		contactItems.push({
			id: "phone",
			content: (
				<Link src={`tel:${basics.phone}`} style={styles.contactItemContent}>
					<Icon name="phone" />
					<Text>{basics.phone}</Text>
				</Link>
			),
		});
	}

	if (basics.location) {
		contactItems.push({
			id: "location",
			content: (
				<View style={styles.contactItemContent}>
					<Icon name="map-pin" />
					<Text>{basics.location}</Text>
				</View>
			),
		});
	}

	if (basics.website.url) {
		contactItems.push({
			id: "website",
			content: <WebsiteContactItem website={basics.website} style={styles.contactItemContent} />,
		});
	}

	contactItems.push(
		...basics.customFields.map((field) => ({
			id: `custom-${field.id}`,
			content: <CustomFieldContactItem field={field} style={styles.contactItemContent} />,
		})),
	);

	return (
		<View style={styles.header}>
			<View style={styles.headerTitle}>
				<View style={styles.headerIdentity}>
					<Heading style={styles.headerName}>{basics.name}</Heading>
					<Text>{basics.headline}</Text>
				</View>

				<View style={styles.contactList}>
					{contactItems.map((item, index) => (
						<View
							key={item.id}
							style={composeStyles(
								styles.contactItem,
								index === contactItems.length - 1 ? styles.contactItemLast : undefined,
							)}
						>
							{item.content}
						</View>
					))}
				</View>
			</View>

			{hasPicture && <Image src={picture.url} style={styles.picture} />}
		</View>
	);
};

const useRhyhornTemplate = (): RhyhornTemplate => {
	const { picture, metadata } = useRender();

	return useMemo(() => {
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const colors: TemplateColorRoles = { foreground, background, primary };
		const metrics = getTemplateMetrics(metadata.page);
		const rtl = isRTL(metadata.page.locale);

		const bodyText = {
			fontFamily: metadata.typography.body.fontFamily,
			fontSize: metadata.typography.body.fontSize,
			fontWeight: metadata.typography.body.fontWeights[0] ?? "400",
			lineHeight: metadata.typography.body.lineHeight,
			color: foreground,
			...(rtl ? { direction: "rtl" as const, textAlign: "right" as const } : {}),
		} satisfies Style;

		const baseStyles = StyleSheet.create({
			page: {
				color: foreground,
				backgroundColor: background,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
				rowGap: metrics.sectionGap,
				fontFamily: metadata.typography.body.fontFamily,
				fontSize: metadata.typography.body.fontSize,
				lineHeight: metadata.typography.body.lineHeight,
				direction: rtl ? "rtl" : "ltr",
			},
			text: bodyText,
			heading: {
				fontFamily: metadata.typography.heading.fontFamily,
				fontSize: metadata.typography.heading.fontSize,
				fontWeight: metadata.typography.heading.fontWeights.at(-1) ?? "600",
				lineHeight: metadata.typography.heading.lineHeight,
				color: foreground,
				...(rtl ? { direction: "rtl" as const, textAlign: "right" as const } : {}),
			},
			div: { rowGap: metrics.gapY(0.125), columnGap: metrics.gapX(1 / 3) },
			inline: { flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", columnGap: metrics.gapX(1 / 3) },
			link: { textDecoration: "none", color: foreground },
			small: { fontSize: metadata.typography.body.fontSize * 0.875 },
			bold: { fontWeight: metadata.typography.body.fontWeights.at(-1) ?? "600" },
			richParagraph: { margin: 0, ...bodyText },
			richListItemRow: {
				// Stays `row` for both LTR and RTL; the <li> renderer swaps DOM order for RTL.
				flexDirection: "row",
				columnGap: metrics.gapX(1 / 3),
				alignItems: "flex-start",
			},
			richListItemMarker: {
				// bodyText spread first so `textAlign` below isn't clobbered by bodyText.textAlign.
				...bodyText,
				width: metadata.typography.body.fontSize,
				textAlign: rtl ? "left" : "right",
			},
			richListItemContent: { flex: 1, ...bodyText },
			splitRow: {
				flexDirection: rtl ? "row-reverse" : "row",
				flexWrap: "wrap",
				alignItems: "flex-start",
				justifyContent: "space-between",
				columnGap: metrics.gapX(2 / 3),
			},
			alignRight: { textAlign: rtl ? "left" : "right", minWidth: 0, maxWidth: "100%", flexShrink: 1 },
			section: { flexDirection: "column", rowGap: metrics.gapY(0.25) },
			sectionHeading: {
				color: primary,
				borderBottomWidth: 1,
				borderBottomColor: primary,
				textAlign: rtl ? "right" : "left",
			},
			item: { rowGap: metrics.gapY(0.125) },
			levelContainer: { width: "100%" },
			levelItem: { borderColor: primary },
			levelItemActive: { backgroundColor: primary },
			header: { flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", columnGap: metrics.gapX(0.5) },
			headerTitle: { flex: 1, rowGap: metrics.gapY(0.5) },
			headerIdentity: {
				textAlign: rtl ? "right" : "left",
				alignItems: rtl ? "flex-end" : "flex-start",
				rowGap: metrics.gapY(0.35),
			},
			headerName: { fontSize: metadata.typography.heading.fontSize * 1.5, lineHeight: headerNameLineHeight },
			contactList: { flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", rowGap: metrics.gapY(0.125) },
			contactItem: {
				flexDirection: rtl ? "row-reverse" : "row",
				alignItems: "center",
				...(rtl
					? {
							borderLeftWidth: 1,
							borderLeftColor: primary,
							paddingLeft: metrics.gapX(0.5),
							marginLeft: metrics.gapX(0.5),
						}
					: {
							borderRightWidth: 1,
							borderRightColor: primary,
							paddingRight: metrics.gapX(0.5),
							marginRight: metrics.gapX(0.5),
						}),
			},
			contactItemContent: {
				flexDirection: rtl ? "row-reverse" : "row",
				alignItems: "center",
				columnGap: metrics.gapX(1 / 6),
			},
			contactItemLast: rtl
				? { borderLeftWidth: 0, paddingLeft: 0, marginLeft: 0 }
				: { borderRightWidth: 0, paddingRight: 0, marginRight: 0 },
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
			sectionGroup: {},
		});

		const accentFor = ({ colors }: TemplateStyleContext) => colors.primary;

		return {
			colors,
			styles: {
				...baseStyles,
				sectionHeading: (context) => ({ ...baseStyles.sectionHeading, color: accentFor(context) }),
				levelItem: (context) => ({ borderColor: accentFor(context) }),
				levelItemActive: (context) => ({ backgroundColor: accentFor(context) }),
				icon: (context) => ({
					display: metadata.page.hideIcons ? "none" : "flex",
					size: metadata.typography.body.fontSize,
					color: accentFor(context),
				}),
			} satisfies RhyhornStyles,
		};
	}, [picture, metadata]);
};
