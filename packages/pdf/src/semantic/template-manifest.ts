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
import { SHARED_BINDING_REGISTRY, STANDARD_FIELD_REGISTRY } from "./binding-inventory";

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
			primitive:
				| PrimitiveBinding["primitive"]
				| {
						ownerRole: string;
						present: PrimitiveBinding["primitive"];
						absent: PrimitiveBinding["primitive"];
				  };
			source: "existing";
	  }
	| {
			type: "alias";
			canonicalKind: Exclude<SemanticNodeKind, "template-part">;
			token: string;
	  };

export type TemplateSemanticChildSelector = {
	kind: Exclude<SemanticNodeKind, "resume" | "page">;
	name?: string;
	sectionTypes?: readonly CustomSectionType[];
};

export type TemplateSemanticPartRoute = {
	parent: "owner" | string;
	at: "start" | "end" | { before: TemplateSemanticChildSelector } | { after: TemplateSemanticChildSelector };
	take?: "all" | readonly TemplateSemanticChildSelector[];
};

export type TemplateSemanticPrimitivePart = {
	name: string;
	key: string;
	owner: TemplateSemanticPartOwner;
	binding: Extract<TemplateSemanticPartBinding, { type: "primitive" }>;
	route: TemplateSemanticPartRoute;
};

export type TemplateSemanticAliasPart = {
	name: string;
	key: string;
	owner: TemplateSemanticPartOwner;
	binding: Extract<TemplateSemanticPartBinding, { type: "alias" }>;
	route?: never;
};

export type TemplateSemanticPart = TemplateSemanticPrimitivePart | TemplateSemanticAliasPart;

export type TemplateSemanticCanonicalBinding = {
	kind: Exclude<SemanticNodeKind, "template-part">;
	binding: PrimitiveBinding;
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
	canonicalBindings?: readonly TemplateSemanticCanonicalBinding[];
};

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
const SECTION_TYPES = new Set<CustomSectionType>(
	Object.keys(STANDARD_FIELD_REGISTRY).filter(
		(sectionType) => sectionType !== "experience-role",
	) as CustomSectionType[],
);
const MAX_PART_DEPTH = 1;

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
	if (!condition) throw new Error(message);
};
const isPrimitivePart = (part: TemplateSemanticPart): part is TemplateSemanticPrimitivePart =>
	part.binding.type === "primitive";

const deepFreeze = <T>(value: T): Readonly<T> => {
	if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;

	for (const child of Object.values(value)) deepFreeze(child);
	return Object.freeze(value);
};

function validateTemplateSemanticManifestShape(manifest: TemplateSemanticManifest): void {
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

		if (isPrimitivePart(part)) {
			assert(part.binding.source === "existing", `${manifest.template}: part ${part.name} claims a synthetic wrapper`);
			const primitives =
				typeof part.binding.primitive === "string"
					? [part.binding.primitive]
					: [part.binding.primitive.present, part.binding.primitive.absent];
			assert(
				primitives.every((primitive) => PRIMITIVES.has(primitive)),
				`${manifest.template}: unknown primitive`,
			);
			assert(part.route.parent.length > 0, `${manifest.template}: part ${part.name} has no routing parent`);
			const selectors: readonly TemplateSemanticChildSelector[] = [
				...(Array.isArray(part.route.take) ? part.route.take : []),
				...(typeof part.route.at === "object"
					? ["before" in part.route.at ? part.route.at.before : part.route.at.after]
					: []),
			];
			for (const selector of selectors) {
				if (!selector.sectionTypes) continue;
				assert(selector.sectionTypes.length > 0, `${manifest.template}: selector section types must not be empty`);
				assert(
					selector.sectionTypes.every((sectionType) => SECTION_TYPES.has(sectionType)),
					`${manifest.template}: selector has an unknown section type`,
				);
			}
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
		if (!isPrimitivePart(part) || part.route.parent === "owner") continue;
		const parentPart = manifest.parts.find((candidate) => candidate.name === part.route.parent);
		assert(parentPart, `${manifest.template}: part ${part.name} owns an unknown parent part`);
		assert(
			parentPart.binding.type === "primitive",
			`${manifest.template}: nested part ${part.name} requires an existing primitive parent`,
		);
		assert(
			JSON.stringify(parentPart.owner) === JSON.stringify(part.owner),
			`${manifest.template}: nested part ${part.name} disagrees with its semantic owner`,
		);
	}

	for (const part of manifest.parts) {
		if (!isPrimitivePart(part)) continue;
		const seen = new Set<string>([part.name]);
		let parent = part.route.parent;
		let depth = 0;
		while (parent !== "owner") {
			assert(!seen.has(parent), `${manifest.template}: cyclic part routing`);
			seen.add(parent);
			const parentPart = manifest.parts.find((candidate) => candidate.name === parent);
			assert(parentPart && isPrimitivePart(parentPart), `${manifest.template}: unknown part routing parent`);
			depth += 1;
			assert(depth <= MAX_PART_DEPTH, `${manifest.template}: unsupported part routing depth`);
			parent = parentPart.route.parent;
		}
	}

	for (const override of manifest.canonicalBindings ?? []) {
		assert(override.binding.source === "existing", `${manifest.template}: canonical binding must be existing`);
		assert(PRIMITIVES.has(override.binding.primitive), `${manifest.template}: canonical binding has unknown primitive`);
	}
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

for (const manifest of Object.values(TEMPLATE_SEMANTIC_MANIFESTS)) validateTemplateSemanticManifestShape(manifest);
deepFreeze(TEMPLATE_SEMANTIC_MANIFESTS);

export function validateTemplateSemanticManifest(manifest: TemplateSemanticManifest): void {
	validateTemplateSemanticManifestShape(manifest);
	const expected = TEMPLATE_SEMANTIC_MANIFESTS[manifest.template];
	assert(
		JSON.stringify(manifest) === JSON.stringify(expected),
		`${manifest.template}: manifest differs from its frozen renderer contract`,
	);
}

export function getTemplateSemanticManifest(template: Template): TemplateSemanticManifest {
	return TEMPLATE_SEMANTIC_MANIFESTS[template];
}

export function getTemplateSemanticRegistryFingerprintInput(): Readonly<Record<Template, TemplateSemanticManifest>> {
	return TEMPLATE_SEMANTIC_MANIFESTS;
}

export function getTemplateSemanticBindingRegistry(template: Template): SemanticBindingRegistry {
	const manifest = getTemplateSemanticManifest(template);
	const canonicalBindings = Object.fromEntries(
		(manifest.canonicalBindings ?? []).map(({ kind, binding }) => [kind, binding]),
	) as SemanticBindingRegistry;

	return {
		...SHARED_BINDING_REGISTRY,
		...canonicalBindings,
		link: (node, context) => {
			if (context.parent?.kind === "template-part") {
				const part = manifest.parts.find((candidate) => candidate.name === context.parent?.attributes.name);
				if (
					part?.binding.type === "primitive" &&
					(part.binding.primitive === "Link" ||
						(typeof part.binding.primitive === "object" && part.binding.primitive.present === "Link"))
				) {
					return {
						type: "alias",
						canonicalKind: "template-part",
						canonicalNodeKey: context.parent.key,
						token: "structured-link",
					};
				}
			}

			const shared = SHARED_BINDING_REGISTRY.link;
			return typeof shared === "function" ? shared(node, context) : shared;
		},
		"template-part": (node, { parent }) => {
			const part = manifest.parts.find((candidate) => candidate.name === node.attributes.name);
			if (part?.binding.type !== "primitive") return undefined;
			if (typeof part.binding.primitive === "string") return part.binding as PrimitiveBinding;

			return {
				type: "primitive",
				primitive: parent?.roles.includes(part.binding.primitive.ownerRole)
					? part.binding.primitive.present
					: part.binding.primitive.absent,
				source: "existing",
			};
		},
	};
}
