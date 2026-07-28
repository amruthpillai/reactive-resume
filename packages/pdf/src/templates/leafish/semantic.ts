import type { TemplateSemanticManifest } from "../../semantic/template-manifest";

export const leafishSemanticManifest = {
	template: "leafish",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main"] },
		{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
	],
	header: { region: "header", placement: "main" },
	specialSummary: { region: "header", placement: "main", source: "always" },
	parts: [
		{
			name: "header-intro",
			key: "header-intro",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		{
			name: "header-body",
			key: "header-body",
			owner: { kind: "header", key: "header" },
			parentPart: "header-intro",
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		{
			name: "header-contact-band",
			key: "header-contact-band",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	],
} as const satisfies TemplateSemanticManifest;
