import type { TemplateSemanticManifest } from "../../semantic/template-manifest";
import { itemHeaderRowPart } from "../../semantic/shared-parts";

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
		itemHeaderRowPart,
		{
			name: "header-band",
			key: "header-band",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: {
				parent: "owner",
				at: "start",
				take: [{ kind: "picture" }, { kind: "name" }, { kind: "headline" }],
			},
		},
		{
			name: "picture-anchor",
			key: "picture-anchor",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "header-band", at: "start", take: [{ kind: "picture" }] },
		},
		{
			name: "contact-offset",
			key: "contact-offset",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: { before: { kind: "contact-list" } } },
		},
	],
} as const satisfies TemplateSemanticManifest;
