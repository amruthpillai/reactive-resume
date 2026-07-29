import type { SemanticNodeKind } from "../semantic-types";

export type SemanticNodeDefinition = {
	parents: readonly SemanticNodeKind[];
	attributes: readonly string[];
	roles: readonly string[];
};

export type SemanticRegistry = Readonly<Record<SemanticNodeKind, SemanticNodeDefinition>>;

export const SEMANTIC_NODE_KINDS = [
	"resume",
	"page",
	"region",
	"header",
	"picture",
	"name",
	"headline",
	"contact-list",
	"contact-item",
	"section",
	"section-heading",
	"section-items",
	"item",
	"item-header",
	"combined-text",
	"field",
	"link",
	"icon",
	"level",
	"rich-text",
	"rich-heading",
	"blockquote",
	"paragraph",
	"list",
	"list-item",
	"list-item-content",
	"list-marker",
	"strong",
	"emphasis",
	"underline",
	"strike",
	"code",
	"text-span",
	"mark",
	"hard-break",
	"horizontal-rule",
	"template-part",
] as const satisfies readonly SemanticNodeKind[];

const inlineParents = [
	"contact-item",
	"field",
	"link",
	"rich-heading",
	"blockquote",
	"paragraph",
	"list-item-content",
	"strong",
	"emphasis",
	"underline",
	"strike",
	"code",
	"text-span",
	"mark",
] as const satisfies readonly SemanticNodeKind[];

export const SEMANTIC_REGISTRY_V1 = {
	resume: { parents: [], attributes: ["template"], roles: [] },
	page: { parents: ["resume"], attributes: ["page-number"], roles: [] },
	region: { parents: ["page"], attributes: ["placement", "region", "part"], roles: [] },
	header: { parents: ["region"], attributes: ["region"], roles: [] },
	picture: { parents: ["header"], attributes: [], roles: ["picture"] },
	name: { parents: ["header"], attributes: [], roles: ["primary-text"] },
	headline: { parents: ["header"], attributes: [], roles: ["secondary-text"] },
	"contact-list": { parents: ["header"], attributes: [], roles: [] },
	"contact-item": {
		parents: ["contact-list"],
		attributes: ["name", "part"],
		roles: ["primary-text", "secondary-text", "structured-link"],
	},
	section: {
		parents: ["region"],
		attributes: ["type", "placement", "origin", "part"],
		roles: ["featured-summary"],
	},
	"section-heading": { parents: ["section"], attributes: [], roles: ["section-title"] },
	"section-items": { parents: ["section"], attributes: [], roles: [] },
	item: {
		parents: ["section-items", "item"],
		attributes: [],
		roles: ["experience-role", "nested-role"],
	},
	"item-header": { parents: ["item"], attributes: ["part"], roles: [] },
	"combined-text": {
		parents: ["item-header", "template-part"],
		attributes: ["name", "owner"],
		roles: [],
	},
	field: {
		parents: ["contact-item", "item", "item-header", "combined-text"],
		attributes: ["name"],
		roles: ["primary-text", "secondary-text", "structured-link"],
	},
	link: {
		parents: ["item", "item-header", "rich-text", "template-part", ...inlineParents],
		attributes: [],
		roles: ["structured-link"],
	},
	icon: {
		parents: ["contact-item", "section-heading", "item", "item-header", "level"],
		attributes: ["type"],
		roles: ["decoration", "active", "inactive"],
	},
	level: { parents: ["item", "item-header"], attributes: [], roles: ["decoration"] },
	"rich-text": { parents: ["item", "field"], attributes: [], roles: [] },
	"rich-heading": { parents: ["rich-text"], attributes: ["level"], roles: [] },
	blockquote: { parents: ["rich-text", "list-item-content"], attributes: [], roles: [] },
	paragraph: { parents: ["rich-text", "list-item-content"], attributes: [], roles: [] },
	list: { parents: ["rich-text", "list-item-content"], attributes: [], roles: [] },
	"list-item": { parents: ["list"], attributes: [], roles: [] },
	"list-item-content": { parents: ["list-item"], attributes: ["direction"], roles: [] },
	"list-marker": { parents: ["list-item"], attributes: [], roles: ["decoration"] },
	strong: { parents: inlineParents, attributes: [], roles: [] },
	emphasis: { parents: inlineParents, attributes: [], roles: [] },
	underline: { parents: inlineParents, attributes: [], roles: [] },
	strike: { parents: inlineParents, attributes: [], roles: [] },
	code: { parents: inlineParents, attributes: [], roles: [] },
	"text-span": { parents: inlineParents, attributes: [], roles: [] },
	mark: { parents: inlineParents, attributes: [], roles: [] },
	"hard-break": { parents: inlineParents, attributes: [], roles: [] },
	"horizontal-rule": { parents: ["rich-text", "list-item-content"], attributes: [], roles: [] },
	"template-part": {
		parents: [
			"page",
			"region",
			"header",
			"section",
			"section-heading",
			"section-items",
			"item",
			"item-header",
			"contact-item",
			"template-part",
		],
		attributes: ["name"],
		roles: ["decoration"],
	},
} as const satisfies SemanticRegistry;

const templatePartChildKinds = {
	"timeline-line": [],
	"timeline-marker": ["template-part"],
	"timeline-dot": [],
	"timeline-content": ["item-header", "field", "link", "item", "level"],
	"featured-summary": ["section"],
	"sidebar-background": [],
	"header-band": ["template-part", "name", "headline"],
	"picture-anchor": ["picture"],
	"contact-offset": [],
	"header-intro": ["template-part"],
	"header-body": ["picture", "name", "headline", "section"],
	"header-contact-band": ["contact-list"],
	"inline-item-header-leading": ["field", "combined-text"],
	"inline-item-header-middle": ["field", "link"],
	"inline-item-header-trailing": ["field"],
	"education-grade-row": ["combined-text"],
	"header-divider": ["name", "headline"],
	"contact-item-content": ["link", "icon", "field"],
	"header-name-rule": [],
} as const satisfies Readonly<Record<string, readonly SemanticNodeKind[]>>;

for (const childKinds of Object.values(templatePartChildKinds)) Object.freeze(childKinds);
export const TEMPLATE_PART_CHILD_KINDS_V1 = Object.freeze(templatePartChildKinds);

export function canContainNode(parent: SemanticNodeKind, child: SemanticNodeKind, parentPart?: string): boolean {
	if (parent === "template-part") {
		if (!parentPart || !(parentPart in TEMPLATE_PART_CHILD_KINDS_V1)) return false;
		return (
			TEMPLATE_PART_CHILD_KINDS_V1[
				parentPart as keyof typeof TEMPLATE_PART_CHILD_KINDS_V1
			] as readonly SemanticNodeKind[]
		).includes(child);
	}

	return (SEMANTIC_REGISTRY_V1[child].parents as readonly SemanticNodeKind[]).includes(parent);
}
