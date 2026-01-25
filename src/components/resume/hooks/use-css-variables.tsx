import { useMemo } from "react";
import type z from "zod";
import { pageDimensionsAsMillimeters } from "@/schema/page";
import type { resumeDataSchema } from "@/schema/resume/data";

type UseCssVariablesProps = Pick<z.infer<typeof resumeDataSchema>, "picture" | "metadata">;

export const useCSSVariables = ({ picture, metadata }: UseCssVariablesProps) => {
	const fontWeightStyles = useMemo(() => {
		const lowestBodyFontWeight = Math.min(...metadata.typography.body.fontWeights.map(Number));
		const lowestHeadingFontWeight = Math.min(...metadata.typography.heading.fontWeights.map(Number));

		const highestBodyFontWeight = Math.max(...metadata.typography.body.fontWeights.map(Number));
		const highestHeadingFontWeight = Math.max(...metadata.typography.heading.fontWeights.map(Number));

		return { lowestBodyFontWeight, lowestHeadingFontWeight, highestBodyFontWeight, highestHeadingFontWeight };
	}, [metadata.typography.body.fontWeights, metadata.typography.heading.fontWeights]);

	return {
		"--picture-border-radius": `${picture.borderRadius}pt`,
		"--page-width": pageDimensionsAsMillimeters[metadata.page.format].width,
		"--page-height": pageDimensionsAsMillimeters[metadata.page.format].height,
		"--page-sidebar-width": `${metadata.layout.sidebarWidth}%`,
		"--page-text-color": metadata.design.colors.text,
		"--page-primary-color": metadata.design.colors.primary,
		"--page-background-color": metadata.design.colors.background,
		"--page-body-font-family": `'${metadata.typography.body.fontFamily}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
		"--page-body-font-weight": fontWeightStyles.lowestBodyFontWeight,
		"--page-body-font-weight-bold": fontWeightStyles.highestBodyFontWeight,
		"--page-body-font-size": metadata.typography.body.fontSize,
		"--page-body-line-height": metadata.typography.body.lineHeight,
		"--page-heading-font-family": `'${metadata.typography.heading.fontFamily}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
		"--page-heading-font-weight": fontWeightStyles.lowestHeadingFontWeight,
		"--page-heading-font-weight-bold": fontWeightStyles.highestHeadingFontWeight,
		"--page-heading-font-size": metadata.typography.heading.fontSize,
		"--page-heading-line-height": metadata.typography.heading.lineHeight,
		"--page-margin-x": `${metadata.page.marginX}pt`,
		"--page-margin-y": `${metadata.page.marginY}pt`,
		"--page-gap-x": `${metadata.page.gapX}pt`,
		"--page-gap-y": `${metadata.page.gapY}pt`,
	} as React.CSSProperties;
};
