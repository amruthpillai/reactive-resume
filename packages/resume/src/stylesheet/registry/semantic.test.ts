import { describe, expect, it } from "vitest";
import { canContainNode, SEMANTIC_REGISTRY_V1 } from "./semantic";

describe("semantic registry", () => {
	it("registers every stable semantic node and relationship", () => {
		expect(Object.keys(SEMANTIC_REGISTRY_V1)).toEqual([
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
		]);
		expect(canContainNode("resume", "page")).toBe(true);
		expect(canContainNode("section", "item")).toBe(false);
		expect(canContainNode("section-items", "item")).toBe(true);
		expect(canContainNode("list-item", "list-item-content")).toBe(true);
	});
});
