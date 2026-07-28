import type { TemplateSemanticManifest } from "../../semantic/template-manifest";

export const dittoSemanticManifest = {
	template: "ditto",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main"] },
		{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
	],
	header: { region: "header", placement: "main" },
	specialSummary: null,
	parts: [
		{
			name: "header-band",
			key: "header-band",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		{
			name: "picture-anchor",
			key: "picture-anchor",
			owner: { kind: "header", key: "header" },
			parentPart: "header-band",
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		{
			name: "contact-offset",
			key: "contact-offset",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	],
} as const satisfies TemplateSemanticManifest;
