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
	picture: ["header", "template-part"],
	name: ["header", "template-part"],
	headline: ["header", "template-part"],
	"contact-list": ["header", "template-part"],
	"contact-item": ["contact-list"],
	section: ["region", "template-part"],
	"section-heading": ["section"],
	"section-items": ["section"],
	item: ["section-items", "item", "template-part"],
	"item-header": ["item", "template-part"],
	field: ["contact-item", "item", "item-header", "template-part"],
	link: ["item", "item-header", "rich-text", "template-part", ...inlineParents],
	icon: ["contact-item", "section-heading", "item", "item-header", "level", "template-part"],
	level: ["item", "item-header", "template-part"],
	"rich-text": ["item", "field", "template-part"],
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
	"template-part": [
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

	it("registers list content direction without broadening unrelated rich-text attributes", () => {
		expect(SEMANTIC_REGISTRY_V1["list-item-content"].attributes).toEqual(["direction"]);
		expect(SEMANTIC_REGISTRY_V1["list-item"].attributes).toEqual([]);
	});

	it("permits truthful contact and nested template parts without broadening unrelated parents", () => {
		expect(canContainNode("contact-item", "template-part")).toBe(true);
		expect(canContainNode("template-part", "template-part")).toBe(true);
		expect(canContainNode("contact-list", "template-part")).toBe(false);
		expect(canContainNode("rich-text", "template-part")).toBe(false);
	});

	it("allows alias tokens only on canonical owner kinds that use them", () => {
		expect(SEMANTIC_REGISTRY_V1.region.attributes).toContain("part");
		expect(SEMANTIC_REGISTRY_V1.section.attributes).toContain("part");
		expect(SEMANTIC_REGISTRY_V1["item-header"].attributes).toContain("part");
		expect(SEMANTIC_REGISTRY_V1["contact-item"].attributes).toContain("part");
		expect(SEMANTIC_REGISTRY_V1.header.attributes).not.toContain("part");
		expect(SEMANTIC_REGISTRY_V1.item.attributes).not.toContain("part");
		expect(SEMANTIC_REGISTRY_V1.field.attributes).not.toContain("part");
	});
});
