import type { TemplateSemanticManifest } from "../../semantic/template-manifest";

export const pikachuSemanticManifest = {
	template: "pikachu",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main"] },
		{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
	],
	header: { region: "header", placement: "main" },
	specialSummary: null,
	parts: [
		{
			name: "header-divider",
			key: "header-divider",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	],
} as const satisfies TemplateSemanticManifest;
