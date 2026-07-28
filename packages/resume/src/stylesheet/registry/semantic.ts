import type { SemanticNodeKind } from "../types";

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
	region: { parents: ["page"], attributes: ["placement", "region"], roles: [] },
	header: { parents: ["region"], attributes: ["region"], roles: [] },
	picture: { parents: ["header"], attributes: [], roles: ["picture"] },
	name: { parents: ["header"], attributes: [], roles: ["primary-text"] },
	headline: { parents: ["header"], attributes: [], roles: ["secondary-text"] },
	"contact-list": { parents: ["header"], attributes: [], roles: [] },
	"contact-item": {
		parents: ["contact-list"],
		attributes: ["name"],
		roles: ["primary-text", "secondary-text", "structured-link"],
	},
	section: { parents: ["region"], attributes: ["type", "placement", "origin"], roles: ["featured-summary"] },
	"section-heading": { parents: ["section"], attributes: [], roles: ["section-title"] },
	"section-items": { parents: ["section"], attributes: [], roles: [] },
	item: { parents: ["section-items"], attributes: [], roles: ["experience-role", "nested-role"] },
	"item-header": { parents: ["item"], attributes: [], roles: [] },
	field: {
		parents: ["contact-item", "item", "item-header"],
		attributes: ["name"],
		roles: ["primary-text", "secondary-text", "structured-link"],
	},
	link: {
		parents: ["item", "item-header", "rich-text", ...inlineParents],
		attributes: [],
		roles: ["structured-link"],
	},
	icon: { parents: ["contact-item", "section-heading", "item", "item-header"], attributes: [], roles: ["decoration"] },
	level: { parents: ["item", "item-header"], attributes: [], roles: ["decoration"] },
	"rich-text": { parents: ["item", "field"], attributes: [], roles: [] },
	"rich-heading": { parents: ["rich-text"], attributes: ["level"], roles: [] },
	blockquote: { parents: ["rich-text", "list-item-content"], attributes: [], roles: [] },
	paragraph: { parents: ["rich-text", "list-item-content"], attributes: [], roles: [] },
	list: { parents: ["rich-text", "list-item-content"], attributes: [], roles: [] },
	"list-item": { parents: ["list"], attributes: [], roles: [] },
	"list-item-content": { parents: ["list-item"], attributes: [], roles: [] },
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
		parents: ["page", "region", "header", "section", "section-heading", "section-items", "item", "item-header"],
		attributes: ["name"],
		roles: ["decoration"],
	},
} as const satisfies SemanticRegistry;

export function canContainNode(parent: SemanticNodeKind, child: SemanticNodeKind): boolean {
	return (SEMANTIC_REGISTRY_V1[child].parents as readonly SemanticNodeKind[]).includes(parent);
}
