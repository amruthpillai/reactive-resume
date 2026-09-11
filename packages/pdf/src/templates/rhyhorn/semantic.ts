import type { TemplateSemanticManifest } from "../../semantic/template-manifest";
import { itemHeaderRowPart } from "../../semantic/shared-parts";

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
		itemHeaderRowPart,
		{
			name: "contact-item-content",
			key: "contact-item-content",
			owner: { kind: "contact-item", key: "contact-item" },
			binding: {
				type: "primitive",
				primitive: { ownerRole: "structured-link", present: "Link", absent: "View" },
				source: "existing",
			},
			route: { parent: "owner", at: "start", take: "all" },
		},
		{
			name: "contact-item-last",
			key: "contact-item-last",
			owner: { kind: "contact-item", key: "contact-item", position: "last" },
			binding: { type: "alias", canonicalKind: "contact-item", token: "contact-item-last" },
		},
	],
	canonicalBindings: [{ kind: "contact-item", binding: { type: "primitive", primitive: "View", source: "existing" } }],
} as const satisfies TemplateSemanticManifest;
