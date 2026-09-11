import type { TemplateSemanticManifest } from "../../semantic/template-manifest";
import { itemHeaderRowPart } from "../../semantic/shared-parts";

export const kakunaSemanticManifest = {
	template: "kakuna",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["main"] },
		{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
	],
	header: { region: "header", placement: "main" },
	specialSummary: null,
	parts: [itemHeaderRowPart],
} as const satisfies TemplateSemanticManifest;
