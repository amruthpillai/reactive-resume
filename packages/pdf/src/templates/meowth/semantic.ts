import type { TemplateSemanticManifest } from "../../semantic/template-manifest";

const inlineHeaderSectionTypes = ["experience", "education", "volunteer"] as const;

export const meowthSemanticManifest = {
	template: "meowth",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main"] },
		{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
	],
	header: { region: "header", placement: "main" },
	specialSummary: null,
	parts: [
		{
			name: "inline-item-header-leading",
			key: "inline-item-header-leading",
			owner: { kind: "item-header", key: "item-header", sectionTypes: inlineHeaderSectionTypes },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		{
			name: "inline-item-header-middle",
			key: "inline-item-header-middle",
			owner: { kind: "item-header", key: "item-header", sectionTypes: inlineHeaderSectionTypes },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		{
			name: "inline-item-header-trailing",
			key: "inline-item-header-trailing",
			owner: { kind: "item-header", key: "item-header", sectionTypes: inlineHeaderSectionTypes },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	],
} as const satisfies TemplateSemanticManifest;
