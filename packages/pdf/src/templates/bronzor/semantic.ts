import type { TemplateSemanticManifest } from "../../semantic/template-manifest";

export const bronzorSemanticManifest = {
	template: "bronzor",
	regions: [
		{ name: "header", placement: "main", origins: [] },
		{ name: "main", placement: "main", origins: ["sidebar", "main"], flow: "interleaved" },
	],
	header: { region: "header", placement: "main" },
	specialSummary: null,
	parts: [
		{
			name: "interleaved-section-row",
			key: "interleaved-section-row",
			owner: { kind: "section", key: "section", placement: "main" },
			binding: {
				type: "alias",
				canonicalKind: "section",
				token: "interleaved-section-row",
			},
		},
	],
} as const satisfies TemplateSemanticManifest;
