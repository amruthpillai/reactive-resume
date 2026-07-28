import type { SemanticNodeKind } from "@reactive-resume/resume/stylesheet/types";
import type { CustomSectionType } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { PrimitiveBinding, SemanticBindingRegistry } from "./binding-inventory";
import { templateSchema } from "@reactive-resume/schema/templates";
import { azurillSemanticManifest } from "../templates/azurill/semantic";
import { bronzorSemanticManifest } from "../templates/bronzor/semantic";
import { chikoritaSemanticManifest } from "../templates/chikorita/semantic";
import { ditgarSemanticManifest } from "../templates/ditgar/semantic";
import { dittoSemanticManifest } from "../templates/ditto/semantic";
import { gengarSemanticManifest } from "../templates/gengar/semantic";
import { glalieSemanticManifest } from "../templates/glalie/semantic";
import { kakunaSemanticManifest } from "../templates/kakuna/semantic";
import { laprasSemanticManifest } from "../templates/lapras/semantic";
import { leafishSemanticManifest } from "../templates/leafish/semantic";
import { meowthSemanticManifest } from "../templates/meowth/semantic";
import { onyxSemanticManifest } from "../templates/onyx/semantic";
import { pikachuSemanticManifest } from "../templates/pikachu/semantic";
import { rhyhornSemanticManifest } from "../templates/rhyhorn/semantic";
import { scizorSemanticManifest } from "../templates/scizor/semantic";
import { SHARED_BINDING_REGISTRY } from "./binding-inventory";

export type TemplateSemanticPlacement = "main" | "sidebar";
export type TemplateSemanticRegionName = "header" | "main" | "sidebar" | "featured";

export type TemplateSemanticRegion = {
	name: TemplateSemanticRegionName;
	placement: TemplateSemanticPlacement;
	origins: readonly TemplateSemanticPlacement[];
	flow?: "sequential" | "interleaved";
};

export type TemplateSemanticSpecialSummary = {
	region: "header" | "featured";
	placement: TemplateSemanticPlacement;
	source: "always" | "main-with-header";
};

export type TemplateSemanticPartOwner =
	| { kind: "header"; key: "header" }
	| { kind: "region"; key: TemplateSemanticRegionName }
	| {
			kind: "section";
			key: "section";
			origin?: TemplateSemanticPlacement;
			placement?: TemplateSemanticPlacement;
	  }
	| {
			kind: "section-items";
			key: "section-items";
			placement?: TemplateSemanticPlacement;
			columns?: 1;
	  }
	| {
			kind: "item";
			key: "item";
			placement?: TemplateSemanticPlacement;
			columns?: 1;
	  }
	| {
			kind: "item-header";
			key: "item-header";
			sectionTypes?: readonly CustomSectionType[];
	  }
	| { kind: "contact-item"; key: "contact-item"; position?: "last" };

export type TemplateSemanticPartBinding =
	| {
			type: "primitive";
			primitive: PrimitiveBinding["primitive"];
			source: "existing";
	  }
	| {
			type: "alias";
			canonicalKind: Exclude<SemanticNodeKind, "template-part">;
			token: string;
	  };

export type TemplateSemanticPart = {
	name: string;
	key: string;
	owner: TemplateSemanticPartOwner;
	parentPart?: string;
	binding: TemplateSemanticPartBinding;
};

export type TemplateSemanticManifest = {
	template: Template;
	regions: readonly TemplateSemanticRegion[];
	header: {
		region: "header";
		placement: TemplateSemanticPlacement;
	};
	specialSummary: TemplateSemanticSpecialSummary | null;
	parts: readonly TemplateSemanticPart[];
};

const REQUIRED_TEMPLATE_CHROME = {
	azurill: ["timeline-line", "timeline-dot", "timeline-marker", "timeline-content"],
	bronzor: ["interleaved-section-row"],
	chikorita: [],
	ditgar: ["featured-summary", "sidebar-background", "item-header-border"],
	ditto: ["header-band", "picture-anchor", "contact-offset"],
	gengar: ["featured-summary", "sidebar-background"],
	glalie: ["sidebar-background"],
	kakuna: [],
	lapras: [],
	leafish: ["header-intro", "header-body", "header-contact-band"],
	meowth: ["inline-item-header-leading", "inline-item-header-middle", "inline-item-header-trailing"],
	onyx: [],
	pikachu: ["header-divider"],
	rhyhorn: ["contact-item-content", "contact-item-last"],
	scizor: ["header-name-rule"],
} as const satisfies Readonly<Record<Template, readonly string[]>>;

const OWNER_KEYS = {
	header: "header",
	region: undefined,
	section: "section",
	"section-items": "section-items",
	item: "item",
	"item-header": "item-header",
	"contact-item": "contact-item",
} as const satisfies Readonly<Record<TemplateSemanticPartOwner["kind"], string | undefined>>;

const PLACEMENTS = new Set<TemplateSemanticPlacement>(["main", "sidebar"]);
const REGION_NAMES = new Set<TemplateSemanticRegionName>(["header", "main", "sidebar", "featured"]);
const PRIMITIVES = new Set<PrimitiveBinding["primitive"]>(["Document", "Page", "View", "Text", "Link", "Image", "Svg"]);

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
	if (!condition) throw new Error(message);
};

const deepFreeze = <T>(value: T): Readonly<T> => {
	if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;

	for (const child of Object.values(value)) deepFreeze(child);
	return Object.freeze(value);
};

export function validateTemplateSemanticManifest(manifest: TemplateSemanticManifest): void {
	const regionNames = new Set<string>();
	const partNames = new Set<string>();
	const partKeys = new Set<string>();

	assert(templateSchema.options.includes(manifest.template), `Unknown template: ${manifest.template}`);
	for (const region of manifest.regions) {
		assert(REGION_NAMES.has(region.name), `${manifest.template}: unknown region ${region.name}`);
		assert(!regionNames.has(region.name), `${manifest.template}: duplicate region ${region.name}`);
		assert(PLACEMENTS.has(region.placement), `${manifest.template}: unknown region placement ${region.placement}`);
		assert(
			region.origins.every((origin) => PLACEMENTS.has(origin)),
			`${manifest.template}: unknown origin in region ${region.name}`,
		);
		assert(
			region.flow !== "interleaved" || region.origins.length === 2,
			`${manifest.template}: interleaved regions require two origins`,
		);
		regionNames.add(region.name);
	}

	assert(regionNames.has(manifest.header.region), `${manifest.template}: header region is not registered`);
	assert(PLACEMENTS.has(manifest.header.placement), `${manifest.template}: unknown header placement`);
	const headerRegion = manifest.regions.find((region) => region.name === manifest.header.region);
	assert(
		headerRegion?.placement === manifest.header.placement,
		`${manifest.template}: header placement disagrees with region`,
	);

	if (manifest.specialSummary) {
		const summaryRegion = manifest.regions.find((region) => region.name === manifest.specialSummary?.region);
		assert(summaryRegion, `${manifest.template}: special summary region is not registered`);
		assert(
			summaryRegion.placement === manifest.specialSummary.placement,
			`${manifest.template}: special summary placement disagrees with region`,
		);
	}

	for (const part of manifest.parts) {
		assert(!partNames.has(part.name), `${manifest.template}: duplicate part name ${part.name}`);
		assert(!partKeys.has(part.key), `${manifest.template}: duplicate part key ${part.key}`);
		assert(part.name.length > 0 && part.key.length > 0, `${manifest.template}: part names and keys must not be empty`);

		const expectedOwnerKey = OWNER_KEYS[part.owner.kind];
		if (part.owner.kind === "region") {
			assert(regionNames.has(part.owner.key), `${manifest.template}: part ${part.name} owns an unknown region`);
		} else {
			assert(part.owner.key === expectedOwnerKey, `${manifest.template}: part ${part.name} has an invalid owner key`);
		}

		if ("placement" in part.owner && part.owner.placement !== undefined) {
			assert(PLACEMENTS.has(part.owner.placement), `${manifest.template}: part ${part.name} has an unknown placement`);
		}

		if (part.binding.type === "primitive") {
			assert(part.binding.source === "existing", `${manifest.template}: part ${part.name} claims a synthetic wrapper`);
			assert(
				PRIMITIVES.has(part.binding.primitive),
				`${manifest.template}: part ${part.name} has an unknown primitive`,
			);
		} else {
			assert(
				part.binding.canonicalKind === part.owner.kind,
				`${manifest.template}: part ${part.name} aliases a non-owner primitive`,
			);
			assert(part.binding.token.length > 0, `${manifest.template}: part ${part.name} has an empty alias token`);
		}

		partNames.add(part.name);
		partKeys.add(part.key);
	}

	for (const part of manifest.parts) {
		if (!part.parentPart) continue;
		const parentPart = manifest.parts.find((candidate) => candidate.name === part.parentPart);
		assert(parentPart, `${manifest.template}: part ${part.name} owns an unknown parent part`);
		assert(!parentPart.parentPart, `${manifest.template}: nested part ownership is limited to one existing primitive`);
		assert(
			parentPart.binding.type === "primitive",
			`${manifest.template}: nested part ${part.name} requires an existing primitive parent`,
		);
		assert(
			part.binding.type === "primitive",
			`${manifest.template}: aliases must stay on their canonical semantic owner`,
		);
		assert(
			JSON.stringify(parentPart.owner) === JSON.stringify(part.owner),
			`${manifest.template}: nested part ${part.name} disagrees with its semantic owner`,
		);
	}

	const expectedParts = [...REQUIRED_TEMPLATE_CHROME[manifest.template]].sort();
	const actualParts = [...partNames].sort();
	assert(
		JSON.stringify(actualParts) === JSON.stringify(expectedParts),
		`${manifest.template}: registered chrome does not match its existing template parts`,
	);
}

const TEMPLATE_SEMANTIC_MANIFESTS = {
	azurill: azurillSemanticManifest,
	bronzor: bronzorSemanticManifest,
	chikorita: chikoritaSemanticManifest,
	ditgar: ditgarSemanticManifest,
	ditto: dittoSemanticManifest,
	gengar: gengarSemanticManifest,
	glalie: glalieSemanticManifest,
	kakuna: kakunaSemanticManifest,
	lapras: laprasSemanticManifest,
	leafish: leafishSemanticManifest,
	meowth: meowthSemanticManifest,
	onyx: onyxSemanticManifest,
	pikachu: pikachuSemanticManifest,
	rhyhorn: rhyhornSemanticManifest,
	scizor: scizorSemanticManifest,
} as const satisfies Readonly<Record<Template, TemplateSemanticManifest>>;

for (const manifest of Object.values(TEMPLATE_SEMANTIC_MANIFESTS)) validateTemplateSemanticManifest(manifest);
deepFreeze(TEMPLATE_SEMANTIC_MANIFESTS);

export function getTemplateSemanticManifest(template: Template): TemplateSemanticManifest {
	return TEMPLATE_SEMANTIC_MANIFESTS[template];
}

export function getTemplateSemanticRegistryFingerprintInput(): Readonly<Record<Template, TemplateSemanticManifest>> {
	return TEMPLATE_SEMANTIC_MANIFESTS;
}

export function getTemplateSemanticBindingRegistry(_template: Template): SemanticBindingRegistry {
	const manifest = getTemplateSemanticManifest(_template);

	return {
		...SHARED_BINDING_REGISTRY,
		"template-part": (node, { parent }) => {
			const part = manifest.parts.find((candidate) => candidate.name === node.attributes.name);
			if (!part) return undefined;
			if (part.binding.type === "primitive") return part.binding;
			if (parent?.kind !== part.binding.canonicalKind) return undefined;

			return {
				...part.binding,
				canonicalNodeKey: parent.key,
			};
		},
	};
}
