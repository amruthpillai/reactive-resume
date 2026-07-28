import { describe, expect, it } from "vitest";
import { canContainNode, SEMANTIC_REGISTRY_V1 } from "./semantic";

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
];

const expectedParents = {
	resume: [],
	page: ["resume"],
	region: ["page"],
	header: ["region"],
	picture: ["header"],
	name: ["header"],
	headline: ["header"],
	"contact-list": ["header"],
	"contact-item": ["contact-list"],
	section: ["region"],
	"section-heading": ["section"],
	"section-items": ["section"],
	item: ["section-items", "item"],
	"item-header": ["item"],
	field: ["contact-item", "item", "item-header"],
	link: ["item", "item-header", "rich-text", ...inlineParents],
	icon: ["contact-item", "section-heading", "item", "item-header", "level"],
	level: ["item", "item-header"],
	"rich-text": ["item", "field"],
	"rich-heading": ["rich-text"],
	blockquote: ["rich-text", "list-item-content"],
	paragraph: ["rich-text", "list-item-content"],
	list: ["rich-text", "list-item-content"],
	"list-item": ["list"],
	"list-item-content": ["list-item"],
	"list-marker": ["list-item"],
	strong: inlineParents,
	emphasis: inlineParents,
	underline: inlineParents,
	strike: inlineParents,
	code: inlineParents,
	"text-span": inlineParents,
	mark: inlineParents,
	"hard-break": inlineParents,
	"horizontal-rule": ["rich-text", "list-item-content"],
	"template-part": ["page", "region", "header", "section", "section-heading", "section-items", "item", "item-header"],
};

describe("semantic registry", () => {
	it("registers every stable semantic node and parentage contract", () => {
		expect(Object.keys(SEMANTIC_REGISTRY_V1)).toEqual(Object.keys(expectedParents));

		for (const [kind, parents] of Object.entries(expectedParents)) {
			expect(SEMANTIC_REGISTRY_V1[kind as keyof typeof SEMANTIC_REGISTRY_V1].parents).toEqual(parents);
		}
	});

	it("keeps list rows separate from their inner content", () => {
		expect(canContainNode("resume", "page")).toBe(true);
		expect(canContainNode("section", "item")).toBe(false);
		expect(canContainNode("section-items", "item")).toBe(true);
		expect(canContainNode("item", "item")).toBe(true);
		expect(canContainNode("list-item", "list-item-content")).toBe(true);
		expect(canContainNode("list-item-content", "list-marker")).toBe(false);
	});

	it("permits only the registered level decoration ancestry and state roles", () => {
		expect(canContainNode("level", "icon")).toBe(true);
		expect(canContainNode("level", "field")).toBe(false);
		expect(SEMANTIC_REGISTRY_V1.icon.attributes).toEqual(["type"]);
		expect(SEMANTIC_REGISTRY_V1.icon.roles).toEqual(["decoration", "active", "inactive"]);
		expect(SEMANTIC_REGISTRY_V1.icon.roles).not.toContain("primary-text");
	});
});
