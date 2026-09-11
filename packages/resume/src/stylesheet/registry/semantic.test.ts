import { describe, expect, it } from "vitest";
import { sectionTypeSchema } from "@reactive-resume/schema/resume/data";
import { templateSchema } from "@reactive-resume/schema/templates";
import * as semanticRegistry from "./semantic";
import { canContainNode, SEMANTIC_NODE_KINDS, SEMANTIC_REGISTRY_V1, TEMPLATE_PART_CHILD_KINDS_V1 } from "./semantic";

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
	"combined-text": ["item-header", "template-part"],
	field: ["contact-item", "item", "item-header", "combined-text"],
	link: ["item", "item-header", "rich-text", "template-part", ...inlineParents],
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
	"template-part": [
		"page",
		"region",
		"header",
		"section",
		"section-heading",
		"section-items",
		"item",
		"item-header",
		"contact-list",
		"contact-item",
		"template-part",
	],
};

const expectedTemplatePartChildren = {
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
	"item-header-row": ["field", "link"],
	"inline-item-header-leading": ["field", "combined-text"],
	"inline-item-header-middle": ["field", "link"],
	"inline-item-header-trailing": ["field"],
	"education-grade-row": ["combined-text"],
	"header-divider": ["name", "headline"],
	"contact-item-content": ["link", "icon", "field"],
	"header-name-rule": [],
	"contact-row-primary": ["contact-item"],
	"contact-row-secondary": ["contact-item"],
} as const;

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

	it("publishes finite semantic attribute domains", () => {
		expect(SEMANTIC_REGISTRY_V1.resume.attributeValues?.template).toEqual(templateSchema.options);
		expect(SEMANTIC_REGISTRY_V1.section.attributeValues).toMatchObject({
			type: sectionTypeSchema.options,
			placement: ["main", "sidebar"],
			origin: ["main", "sidebar"],
		});
	});

	it("permits truthful contact and nested template parts without broadening unrelated parents", () => {
		expect(canContainNode("contact-item", "template-part")).toBe(true);
		expect(canContainNode("template-part", "template-part")).toBe(false);
		expect(canContainNode("template-part", "template-part", "timeline-marker")).toBe(true);
		expect(canContainNode("contact-list", "template-part")).toBe(true);
		expect(canContainNode("rich-text", "template-part")).toBe(false);
	});

	it("registers contact-list template parts and their child contracts", () => {
		expect(SEMANTIC_REGISTRY_V1["template-part"].parents).toContain("contact-list");
		expect(TEMPLATE_PART_CHILD_KINDS_V1["contact-row-primary"]).toEqual(["contact-item"]);
		expect(TEMPLATE_PART_CHILD_KINDS_V1["contact-row-secondary"]).toEqual(["contact-item"]);
	});

	it("freezes the exact child-kind allowlist for every existing primitive template part", () => {
		const registry = semanticRegistry as unknown as {
			TEMPLATE_PART_CHILD_KINDS_V1?: Readonly<Record<string, readonly string[]>>;
		};

		expect(registry.TEMPLATE_PART_CHILD_KINDS_V1).toEqual(expectedTemplatePartChildren);
		expect(Object.isFrozen(registry.TEMPLATE_PART_CHILD_KINDS_V1)).toBe(true);
		for (const children of Object.values(registry.TEMPLATE_PART_CHILD_KINDS_V1 ?? {})) {
			expect(Object.isFrozen(children)).toBe(true);
		}
	});

	it("allows only each named template part's exact child kinds", () => {
		for (const [part, allowed] of Object.entries(expectedTemplatePartChildren)) {
			for (const child of SEMANTIC_NODE_KINDS) {
				expect(canContainNode("template-part", child, part)).toBe((allowed as readonly string[]).includes(child));
			}
		}
	});

	it("rejects omitted and unknown template-part names without changing ordinary two-argument containment", () => {
		expect(canContainNode("template-part", "picture")).toBe(false);
		expect(canContainNode("template-part", "picture", "unknown-part")).toBe(false);
		expect(canContainNode("header", "picture")).toBe(true);
		expect(canContainNode("header", "field")).toBe(false);
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
