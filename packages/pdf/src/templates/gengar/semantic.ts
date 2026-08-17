import type { TemplateSemanticManifest } from "../../semantic/template-manifest";
import { itemHeaderRowPart } from "../../semantic/shared-parts";

export const gengarSemanticManifest = {
	template: "gengar",
	regions: [
		{ name: "header", placement: "sidebar", origins: [] },
		{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		{ name: "featured", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main"] },
	],
	header: { region: "header", placement: "sidebar" },
	specialSummary: { region: "featured", placement: "main", source: "main-with-header" },
	parts: [
		itemHeaderRowPart,
		{
			name: "featured-summary",
			key: "featured-summary",
			owner: { kind: "region", key: "featured" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "start", take: "all" },
		},
		{
			name: "sidebar-background",
			key: "sidebar-background",
			owner: { kind: "region", key: "sidebar" },
			binding: { type: "alias", canonicalKind: "region", token: "sidebar-background" },
		},
	],
} as const satisfies TemplateSemanticManifest;
