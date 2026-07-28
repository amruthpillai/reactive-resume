import type { TemplateSemanticManifest } from "../../semantic/template-manifest";

export const azurillSemanticManifest = {
	template: "azurill",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main"] },
		{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
	],
	header: { region: "header", placement: "main" },
	specialSummary: null,
	parts: [
		{
			name: "timeline-line",
			key: "timeline-line",
			owner: { kind: "section-items", key: "section-items", placement: "main", columns: 1 },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		{
			name: "timeline-marker",
			key: "timeline-marker",
			owner: { kind: "item", key: "item", placement: "main", columns: 1 },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		{
			name: "timeline-dot",
			key: "timeline-dot",
			owner: { kind: "item", key: "item", placement: "main", columns: 1 },
			parentPart: "timeline-marker",
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		{
			name: "timeline-content",
			key: "timeline-content",
			owner: { kind: "item", key: "item", placement: "main", columns: 1 },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	],
} as const satisfies TemplateSemanticManifest;
