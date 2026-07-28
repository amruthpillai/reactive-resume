import type { SemanticNode, SemanticNodeKind } from "@reactive-resume/resume/stylesheet/types";

export type StandardFieldRole = "primary-text" | "secondary-text" | "structured-link";
export type StandardFieldDefinition = Readonly<Record<string, readonly StandardFieldRole[]>>;

export const STANDARD_FIELD_REGISTRY = {
	summary: { content: [] },
	profiles: { network: ["primary-text"], username: ["secondary-text", "structured-link"] },
	experience: {
		company: ["primary-text"],
		position: ["secondary-text"],
		location: ["secondary-text"],
		period: ["secondary-text"],
		description: [],
	},
	"experience-role": { position: ["primary-text"], period: ["secondary-text"], description: [] },
	education: {
		school: ["primary-text"],
		area: ["secondary-text"],
		degree: ["secondary-text"],
		grade: ["secondary-text"],
		location: ["secondary-text"],
		period: ["secondary-text"],
		description: [],
	},
	projects: { name: ["primary-text"], period: ["secondary-text"], description: [] },
	skills: { name: ["primary-text"], proficiency: ["secondary-text"], keywords: ["secondary-text"] },
	languages: { language: ["primary-text"], fluency: ["secondary-text"] },
	interests: { name: ["primary-text"], keywords: ["secondary-text"] },
	awards: { title: ["primary-text"], date: ["secondary-text"], awarder: ["secondary-text"], description: [] },
	certifications: { title: ["primary-text"], date: ["secondary-text"], issuer: ["secondary-text"], description: [] },
	publications: { title: ["primary-text"], date: ["secondary-text"], publisher: ["secondary-text"], description: [] },
	volunteer: {
		organization: ["primary-text"],
		location: ["secondary-text"],
		period: ["secondary-text"],
		description: [],
	},
	references: {
		name: ["primary-text"],
		position: ["secondary-text"],
		phone: ["secondary-text"],
		description: [],
	},
	"cover-letter": { recipient: [], content: [] },
} as const satisfies Readonly<Record<string, StandardFieldDefinition>>;

export const STANDARD_ROLE_REGISTRY = [
	"primary-text",
	"secondary-text",
	"structured-link",
	"decoration",
	"section-title",
	"picture",
	"experience-role",
	"nested-role",
	"active",
	"inactive",
] as const;

export type PrimitiveBinding = {
	type: "primitive";
	primitive: "Document" | "Page" | "View" | "Text" | "Link" | "Image" | "Svg";
	source: "existing" | "synthetic";
};

export type AliasBinding = {
	type: "alias";
	canonicalKind: SemanticNodeKind;
	canonicalNodeKey: string;
	token: string;
};

export type SemanticBinding = PrimitiveBinding | AliasBinding;
type SemanticBindingContext = {
	parent: SemanticNode | undefined;
};
export type SemanticBindingRegistry = Readonly<
	Partial<
		Record<
			SemanticNodeKind,
			SemanticBinding | ((node: SemanticNode, context: SemanticBindingContext) => SemanticBinding | undefined)
		>
	>
>;

export type BindingInventory = {
	bindings: Readonly<Record<string, SemanticBinding>>;
	aliasTokensByNodeKey: Readonly<Record<string, readonly string[]>>;
	unboundNodeKeys: readonly string[];
	syntheticWrapperCount: number;
};

const existing = (primitive: PrimitiveBinding["primitive"]): PrimitiveBinding => ({
	type: "primitive",
	primitive,
	source: "existing",
});

export const SHARED_BINDING_REGISTRY = {
	resume: existing("Document"),
	page: existing("Page"),
	region: existing("View"),
	header: existing("View"),
	picture: existing("Image"),
	name: existing("Text"),
	headline: existing("Text"),
	"contact-list": existing("View"),
	"contact-item": (node) => existing(node.roles.includes("structured-link") ? "Link" : "View"),
	section: existing("View"),
	"section-heading": (node) => existing(node.children.some((child) => child.kind === "icon") ? "View" : "Text"),
	"section-items": existing("View"),
	item: existing("View"),
	"item-header": existing("View"),
	field: (node) => existing(node.children.some((child) => child.kind === "rich-text") ? "View" : "Text"),
	link: existing("Link"),
	icon: (node) => existing(node.attributes.type && node.attributes.type !== "icon" ? "View" : "Svg"),
	level: existing("View"),
	"rich-text": (_node, { parent }) =>
		parent?.kind === "field"
			? {
					type: "alias",
					canonicalKind: "field",
					canonicalNodeKey: parent.key,
					token: "rich-text",
				}
			: undefined,
	"rich-heading": existing("Text"),
	blockquote: existing("View"),
	paragraph: existing("Text"),
	list: existing("View"),
	"list-item": existing("View"),
	"list-item-content": (node) => existing(node.attributes.direction === "rtl" ? "Text" : "View"),
	"list-marker": existing("Text"),
	strong: existing("Text"),
	emphasis: existing("Text"),
	underline: existing("Text"),
	strike: existing("Text"),
	code: existing("Text"),
	"text-span": existing("Text"),
	mark: existing("Text"),
	"hard-break": existing("Text"),
	"horizontal-rule": existing("View"),
} as const satisfies SemanticBindingRegistry;

export function createBindingInventory(
	tree: SemanticNode,
	registry: SemanticBindingRegistry = SHARED_BINDING_REGISTRY,
): BindingInventory {
	const bindings: Record<string, SemanticBinding> = {};
	const aliasTokensByNodeKey: Record<string, readonly string[]> = {};
	const unboundNodeKeys: string[] = [];
	const nodes = new Map<string, SemanticNode>();
	let syntheticWrapperCount = 0;

	const visit = (node: SemanticNode, parent?: SemanticNode) => {
		nodes.set(node.key, node);
		const aliasTokens = node.attributes.part?.split(" ").filter(Boolean);
		if (aliasTokens?.length) aliasTokensByNodeKey[node.key] = aliasTokens;
		const declaration = registry[node.kind];
		const binding = typeof declaration === "function" ? declaration(node, { parent }) : declaration;

		if (!binding) {
			unboundNodeKeys.push(node.key);
		} else {
			bindings[node.key] = binding;

			if (binding.type === "primitive" && binding.source === "synthetic") {
				syntheticWrapperCount += 1;
				unboundNodeKeys.push(node.key);
			}
		}

		for (const child of node.children) visit(child, node);
	};

	visit(tree);

	for (const [nodeKey, binding] of Object.entries(bindings)) {
		if (binding.type !== "alias") continue;

		const canonicalNode = nodes.get(binding.canonicalNodeKey);
		const canonicalBinding = bindings[binding.canonicalNodeKey];
		if (
			canonicalNode?.kind !== binding.canonicalKind ||
			canonicalBinding?.type !== "primitive" ||
			canonicalBinding.source !== "existing"
		) {
			delete bindings[nodeKey];
			unboundNodeKeys.push(nodeKey);
		}
	}

	return { bindings, aliasTokensByNodeKey, unboundNodeKeys, syntheticWrapperCount };
}
