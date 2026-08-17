import type { TemplateSemanticManifest } from "../../semantic/template-manifest";
import { itemHeaderRowPart } from "../../semantic/shared-parts";

const borderedItemHeaderSectionTypes = [
	"profiles",
	"experience",
	"education",
	"projects",
	"skills",
	"languages",
	"interests",
	"awards",
	"certifications",
	"publications",
	"volunteer",
	"references",
] as const;

export const ditgarSemanticManifest = {
	template: "ditgar",
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
		{
			name: "item-header-border",
			key: "item-header-border",
			owner: {
				kind: "item-header",
				key: "item-header",
				sectionTypes: borderedItemHeaderSectionTypes,
			},
			binding: { type: "alias", canonicalKind: "item-header", token: "item-header-border" },
		},
	],
} as const satisfies TemplateSemanticManifest;
