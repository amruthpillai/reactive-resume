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
			route: {
				parent: "owner",
				at: "start",
				take: [
					{ kind: "field", name: "position", sectionTypes: ["experience", "volunteer"] },
					{ kind: "field", name: "location", sectionTypes: ["experience", "volunteer"] },
					{ kind: "field", name: "area", sectionTypes: ["education"] },
					{ kind: "field", name: "degree", sectionTypes: ["education"] },
				],
			},
		},
		{
			name: "inline-item-header-middle",
			key: "inline-item-header-middle",
			owner: { kind: "item-header", key: "item-header", sectionTypes: inlineHeaderSectionTypes },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: {
				parent: "owner",
				at: "start",
				take: [
					{ kind: "field", name: "company" },
					{ kind: "field", name: "school" },
					{ kind: "field", name: "organization" },
					{ kind: "link" },
				],
			},
		},
		{
			name: "inline-item-header-trailing",
			key: "inline-item-header-trailing",
			owner: { kind: "item-header", key: "item-header", sectionTypes: inlineHeaderSectionTypes },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "start", take: [{ kind: "field", name: "period" }] },
		},
		{
			name: "education-grade-row",
			key: "education-grade-row",
			owner: { kind: "item", key: "item" },
			binding: { type: "primitive", primitive: "Text", source: "existing" },
			route: {
				parent: "owner",
				at: { after: { kind: "item-header" } },
				take: [
					{ kind: "field", name: "grade", sectionTypes: ["education"] },
					{ kind: "field", name: "location", sectionTypes: ["education"] },
				],
				takeFrom: "item-header",
			},
		},
	],
} as const satisfies TemplateSemanticManifest;
