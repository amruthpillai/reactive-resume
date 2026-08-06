import type { TemplateSemanticManifest } from "../../semantic/template-manifest";

export const chikoritaSemanticManifest = {
	template: "chikorita",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main"] },
		{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
	],
	header: { region: "header", placement: "main" },
	specialSummary: null,
	parts: [
		{
			name: "contact-row-primary",
			key: "contact-row-primary",
			owner: { kind: "contact-list", key: "contact-list" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: {
				parent: "owner",
				at: "start",
				take: [
					{ kind: "contact-item", name: "email" },
					{ kind: "contact-item", name: "phone" },
					{ kind: "contact-item", name: "location" },
				],
			},
		},
		{
			name: "contact-row-secondary",
			key: "contact-row-secondary",
			owner: { kind: "contact-list", key: "contact-list" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: {
				parent: "owner",
				at: "end",
				take: [
					{ kind: "contact-item", name: "website" },
					{ kind: "contact-item", name: "custom" },
				],
			},
		},
	],
} as const satisfies TemplateSemanticManifest;
