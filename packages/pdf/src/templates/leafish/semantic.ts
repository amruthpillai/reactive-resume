import type { TemplateSemanticManifest } from "../../semantic/template-manifest";
import { itemHeaderRowPart } from "../../semantic/shared-parts";

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
		itemHeaderRowPart,
		{
			name: "header-intro",
			key: "header-intro",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: {
				parent: "owner",
				at: "start",
				take: [{ kind: "picture" }, { kind: "name" }, { kind: "headline" }, { kind: "section", name: "summary" }],
			},
		},
		{
			name: "header-body",
			key: "header-body",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "header-intro", at: "start", take: "all" },
		},
		{
			name: "header-contact-band",
			key: "header-contact-band",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "end", take: [{ kind: "contact-list" }] },
		},
	],
} as const satisfies TemplateSemanticManifest;
