import type { BaseSettingsSnapshot, ResolvedPageDimensions } from "../types";

export type SystemVariableDefinition = {
	description: string;
};

export type SystemVariableRegistry = Readonly<Record<string, SystemVariableDefinition>>;

export const SYSTEM_VARIABLE_REGISTRY_V1 = {
	"--resume-primary-color": { description: "Builder primary color." },
	"--resume-text-color": { description: "Builder text color." },
	"--resume-background-color": { description: "Builder background color." },
	"--resume-body-font-size": { description: "Builder body font size." },
	"--resume-body-line-height": { description: "Builder body line-height multiplier." },
	"--resume-heading-font-size": { description: "Builder heading font size." },
	"--resume-heading-line-height": { description: "Builder heading line-height multiplier." },
	"--resume-page-gap-x": { description: "Builder horizontal page gap." },
	"--resume-page-gap-y": { description: "Builder vertical page gap." },
	"--resume-page-margin-x": { description: "Builder horizontal page margin." },
	"--resume-page-margin-y": { description: "Builder vertical page margin." },
	"--resume-page-width": { description: "Resolved authored page width." },
	"--resume-page-height": { description: "Resolved authored page height." },
	"--resume-sidebar-width": { description: "Builder sidebar width." },
	"--resume-picture-size": { description: "Builder picture size." },
	"--resume-picture-rotation": { description: "Builder picture rotation." },
	"--resume-picture-aspect-ratio": { description: "Builder picture aspect ratio." },
	"--resume-picture-border-radius": { description: "Builder picture border radius." },
	"--resume-picture-border-width": { description: "Builder picture border width." },
	"--resume-picture-border-color": { description: "Builder picture border color." },
	"--resume-picture-shadow-width": { description: "Builder picture shadow width." },
	"--resume-picture-shadow-color": { description: "Builder picture shadow color." },
} as const satisfies SystemVariableRegistry;

export function createSystemVariables(
	base: BaseSettingsSnapshot,
	page: ResolvedPageDimensions,
): Readonly<Record<string, string>> {
	return {
		"--resume-primary-color": base.design.colors.primary,
		"--resume-text-color": base.design.colors.text,
		"--resume-background-color": base.design.colors.background,
		"--resume-body-font-size": `${base.typography.body.fontSize}pt`,
		"--resume-body-line-height": `${base.typography.body.lineHeight}`,
		"--resume-heading-font-size": `${base.typography.heading.fontSize}pt`,
		"--resume-heading-line-height": `${base.typography.heading.lineHeight}`,
		"--resume-page-gap-x": `${base.page.gapX}pt`,
		"--resume-page-gap-y": `${base.page.gapY}pt`,
		"--resume-page-margin-x": `${base.page.marginX}pt`,
		"--resume-page-margin-y": `${base.page.marginY}pt`,
		"--resume-page-width": `${page.width}pt`,
		"--resume-page-height": `${page.height}pt`,
		"--resume-sidebar-width": `${base.layout.sidebarWidth}%`,
		"--resume-picture-size": `${base.picture.size}pt`,
		"--resume-picture-rotation": `${base.picture.rotation}deg`,
		"--resume-picture-aspect-ratio": `${base.picture.aspectRatio}`,
		"--resume-picture-border-radius": `${base.picture.borderRadius}pt`,
		"--resume-picture-border-width": `${base.picture.borderWidth}pt`,
		"--resume-picture-border-color": base.picture.borderColor,
		"--resume-picture-shadow-width": `${base.picture.shadowWidth}pt`,
		"--resume-picture-shadow-color": base.picture.shadowColor,
	};
}
