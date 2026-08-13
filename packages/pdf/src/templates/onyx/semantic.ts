import type { TemplateSemanticManifest } from "../../semantic/template-manifest";

export const onyxSemanticManifest = {
	template: "onyx",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main"] },
		{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
	],
	header: { region: "header", placement: "main" },
	specialSummary: null,
	parts: [],
} as const satisfies TemplateSemanticManifest;
