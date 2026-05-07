import type { Style } from "@react-pdf/types";
import type { IconName } from "phosphor-icons-react-pdf/dynamic";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleSlots } from "../shared/types";
import { Image, Page, StyleSheet, View } from "@react-pdf/renderer";
import { useMemo } from "react";
import { rgbaStringToHex } from "@reactive-resume/utils/color";
import { useRender } from "../../context";
import { TemplateProvider } from "../shared/context";
import { filterSections } from "../shared/filtering";
import { getTemplateMetrics } from "../shared/metrics";
import { getTemplatePageSize } from "../shared/page-size";
import { hasTemplatePicture } from "../shared/picture";
import { Heading, Icon, Link, Text } from "../shared/primitives";
import { Section } from "../shared/sections";
import { composeStyles } from "../shared/styles";

type BronzorStyles = Omit<TemplateStyleSlots, "page"> & {
	page: Style;
	header: Style;
	picture: Style;
	headerTitle: Style;
	headerIdentity: Style;
	headerName: Style;
	headerContactRow: Style;
	headerContactItem: Style;
	sections: Style;
};

type BronzorTemplate = {
	colors: TemplateColorRoles;
	styles: BronzorStyles;
};

const getBronzorSections = ({
	mainSections,
	sidebarSections,
	fullWidth,
}: {
	mainSections: string[];
	sidebarSections: string[];
	fullWidth: boolean;
}) => {
	if (fullWidth) return mainSections;

	return Array.from({ length: Math.max(mainSections.length, sidebarSections.length) }).flatMap((_, index) =>
		[sidebarSections[index], mainSections[index]].filter((section): section is string => Boolean(section)),
	);
};

export const BronzorPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { metadata } = data;
	const { styles, colors } = useBronzorTemplate();
	const metrics = getTemplateMetrics(metadata.page);
	const pageSize = getTemplatePageSize(metadata.page.format);
	const showHeader = pageIndex === 0;
	const sidebarSections = filterSections(page.sidebar, data);
	const mainSections = filterSections(page.main, data);
	const sections = getBronzorSections({ mainSections, sidebarSections, fullWidth: page.fullWidth });

	return (
		<Page size={pageSize} style={styles.page}>
			<TemplateProvider styles={styles} colors={colors}>
				{showHeader && <Header styles={styles} />}

				<View style={composeStyles(styles.sections, { rowGap: metrics.sectionGap })}>
					{sections.map((section) => (
						<Section key={section} section={section} placement="main" />
					))}
				</View>
			</TemplateProvider>
		</Page>
	);
};

const Header = ({ styles }: { styles: BronzorStyles }) => {
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
			</View>

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
	);
};

const useBronzorTemplate = (): BronzorTemplate => {
	const { picture, metadata } = useRender();

	return useMemo(() => {
		const foreground = rgbaStringToHex(metadata.design.colors.text);
		const background = rgbaStringToHex(metadata.design.colors.background);
		const primary = rgbaStringToHex(metadata.design.colors.primary);
		const colors: TemplateColorRoles = { foreground, background, primary };
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
				flexDirection: "column",
				rowGap: metrics.headerGap,
				color: foreground,
				backgroundColor: background,
				paddingHorizontal: metrics.page.paddingHorizontal,
				paddingVertical: metrics.page.paddingVertical,
				fontFamily: metadata.typography.body.fontFamily,
				fontSize: metadata.typography.body.fontSize,
				lineHeight: metadata.typography.body.lineHeight,
			},
			text: bodyText,
			heading: {
				fontFamily: metadata.typography.heading.fontFamily,
				fontSize: metadata.typography.heading.fontSize,
				fontWeight: metadata.typography.heading.fontWeights[0] ?? "500",
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
				flexDirection: "row",
				columnGap: metrics.columnGap,
				borderTopWidth: 1,
				borderTopColor: primary,
				paddingTop: metrics.gapY(0.5),
			},
			sectionHeading: {
				width: `${metadata.layout.sidebarWidth}%`,
				flexShrink: 0,
				fontSize: metadata.typography.heading.fontSize * 0.75,
				color: primary,
			},
			sectionItems: {
				flex: 1,
			},
			sections: {
				flexDirection: "column",
			},
			header: {
				alignItems: "center",
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
				lineHeight: 1,
			},
			headerContactRow: {
				justifyContent: "center",
				flexDirection: "row",
				flexWrap: "wrap",
				rowGap: metrics.gapY(0.125),
				columnGap: metrics.gapX(5 / 6),
			},
			headerContactItem: {
				flexDirection: "row",
				alignItems: "center",
				columnGap: metrics.gapX(0.25),
			},
			icon: {
				display: metadata.page.hideIcons ? "none" : "flex",
				size: metadata.typography.body.fontSize,
				color: primary,
			},
		});

		return { colors, styles: baseStyles satisfies BronzorStyles };
	}, [picture, metadata]);
};
