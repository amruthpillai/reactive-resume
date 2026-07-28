import type { BaseSettingsSnapshot, ResolvedPageDimensions } from "../types";

export type SystemVariableDefinition = {
	description: string;
};

export type SystemVariableRegistry = Readonly<Record<string, SystemVariableDefinition>>;

export const SYSTEM_VARIABLE_REGISTRY_V1 = {
	"--rr-primary-color": { description: "Builder primary color." },
	"--rr-text-color": { description: "Builder text color." },
	"--rr-background-color": { description: "Builder background color." },
	"--rr-body-font-size": { description: "Builder body font size." },
	"--rr-body-line-height": { description: "Builder body line-height multiplier." },
	"--rr-heading-font-size": { description: "Builder heading font size." },
	"--rr-heading-line-height": { description: "Builder heading line-height multiplier." },
	"--rr-page-gap-x": { description: "Builder horizontal page gap." },
	"--rr-page-gap-y": { description: "Builder vertical page gap." },
	"--rr-page-margin-x": { description: "Builder horizontal page margin." },
	"--rr-page-margin-y": { description: "Builder vertical page margin." },
	"--rr-page-width": { description: "Resolved authored page width." },
	"--rr-page-height": { description: "Resolved authored page height." },
	"--rr-sidebar-width": { description: "Builder sidebar width." },
	"--rr-picture-size": { description: "Builder picture size." },
	"--rr-picture-rotation": { description: "Builder picture rotation." },
	"--rr-picture-aspect-ratio": { description: "Builder picture aspect ratio." },
	"--rr-picture-border-radius": { description: "Builder picture border radius." },
	"--rr-picture-border-width": { description: "Builder picture border width." },
	"--rr-picture-border-color": { description: "Builder picture border color." },
	"--rr-picture-shadow-width": { description: "Builder picture shadow width." },
	"--rr-picture-shadow-color": { description: "Builder picture shadow color." },
} as const satisfies SystemVariableRegistry;

export function createSystemVariables(
	base: BaseSettingsSnapshot,
	page: ResolvedPageDimensions,
): Readonly<Record<string, string>> {
	return {
		"--rr-primary-color": base.design.colors.primary,
		"--rr-text-color": base.design.colors.text,
		"--rr-background-color": base.design.colors.background,
		"--rr-body-font-size": `${base.typography.body.fontSize}pt`,
		"--rr-body-line-height": `${base.typography.body.lineHeight}`,
		"--rr-heading-font-size": `${base.typography.heading.fontSize}pt`,
		"--rr-heading-line-height": `${base.typography.heading.lineHeight}`,
		"--rr-page-gap-x": `${base.page.gapX}pt`,
		"--rr-page-gap-y": `${base.page.gapY}pt`,
		"--rr-page-margin-x": `${base.page.marginX}pt`,
		"--rr-page-margin-y": `${base.page.marginY}pt`,
		"--rr-page-width": `${page.width}pt`,
		"--rr-page-height": `${page.height}pt`,
		"--rr-sidebar-width": `${base.layout.sidebarWidth}%`,
		"--rr-picture-size": `${base.picture.size}pt`,
		"--rr-picture-rotation": `${base.picture.rotation}deg`,
		"--rr-picture-aspect-ratio": `${base.picture.aspectRatio}`,
		"--rr-picture-border-radius": `${base.picture.borderRadius}pt`,
		"--rr-picture-border-width": `${base.picture.borderWidth}pt`,
		"--rr-picture-border-color": base.picture.borderColor,
		"--rr-picture-shadow-width": `${base.picture.shadowWidth}pt`,
		"--rr-picture-shadow-color": base.picture.shadowColor,
	};
}
