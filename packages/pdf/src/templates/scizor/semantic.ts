import type { TemplateSemanticManifest } from "../../semantic/template-manifest";

export const scizorSemanticManifest = {
	template: "scizor",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main", "sidebar"] },
	],
	header: { region: "header", placement: "main" },
	specialSummary: null,
	parts: [
		{
			name: "header-name-rule",
			key: "header-name-rule",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	],
} as const satisfies TemplateSemanticManifest;
