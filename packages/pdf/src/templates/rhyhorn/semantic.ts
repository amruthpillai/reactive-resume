import type { TemplateSemanticManifest } from "../../semantic/template-manifest";

export const rhyhornSemanticManifest = {
	template: "rhyhorn",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main"] },
		{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
	],
	header: { region: "header", placement: "main" },
	specialSummary: null,
	parts: [
		{
			name: "contact-item-content",
			key: "contact-item-content",
			owner: { kind: "contact-item", key: "contact-item" },
			binding: { type: "alias", canonicalKind: "contact-item", token: "contact-item-content" },
		},
		{
			name: "contact-item-last",
			key: "contact-item-last",
			owner: { kind: "contact-item", key: "contact-item", position: "last" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	],
} as const satisfies TemplateSemanticManifest;
