import type { SemanticNode } from "./types";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileStylesheet } from "./compile";
import { compileSelector, getSpecificity, matchesSelector } from "./selector";

const experienceId = "229ad766-cb9a-4f16-aaf0-fdd8394a9b95";

const node = (
	key: string,
	kind: SemanticNode["kind"],
	options: Partial<Omit<SemanticNode, "key" | "kind">> = {},
): SemanticNode =>
	Object.freeze({
		key,
		kind,
		attributes: Object.freeze(options.attributes ?? {}),
		roles: Object.freeze(options.roles ?? []),
		children: Object.freeze(options.children ?? []),
		...(options.id ? { id: options.id } : {}),
	});

const itemFirst = node("item-first", "item", { roles: ["experience-role"] });
const itemSecond = node("item-second", "item", { roles: ["experience-role", "nested-role"] });
const itemThird = node("item-third", "item", { roles: ["experience-role"] });
const experience = node("section-experience", "section", {
	id: experienceId,
	attributes: { type: "experience", placement: "main", origin: "custom-import" },
	children: [
		node("heading-experience", "section-heading", { roles: ["section-title"] }),
		node("items-experience", "section-items", { children: [itemFirst, itemSecond, itemThird] }),
	],
});
const education = node("section-education", "section", {
	id: "1abc",
	attributes: { type: "education", placement: "main", origin: "native" },
});
const fixtureTree = node("resume", "resume", {
	attributes: { template: "rhyhorn" },
	children: [
		node("page-1", "page", {
			attributes: { "page-number": "1" },
			children: [
				node("region-main", "region", {
					attributes: { placement: "main", region: "body" },
					children: [experience, education],
				}),
				node("region-sidebar", "region", {
					attributes: { placement: "sidebar", region: "body" },
					children: [
						node("section-skills-sidebar", "section", {
							attributes: { type: "skills", placement: "sidebar", origin: "native" },
						}),
					],
				}),
			],
		}),
	],
});

function matches(source: string, nodeKey: string): boolean {
	const result = compileSelector(source);
	return result.selector ? matchesSelector(result.selector, fixtureTree, nodeKey) : false;
}

describe("semantic selector compilation", () => {
	it.each([
		['section[type="experience"] > section-heading', "heading-experience", true],
		['region[placement="sidebar"] section', "section-skills-sidebar", true],
		['section:is([type="experience"], [type="education"])', "section-education", true],
		["item:nth-child(2)", "item-second", true],
		["section:hover", "section-experience", false],
		["section, item:nth-child(2)", "item-second", true],
		["* > page", "page-1", true],
		['section[type="experience"] + section', "section-education", true],
		['section[type="experience"] ~ section', "section-education", true],
		[":root > page", "page-1", true],
		['section:not([type="education"])', "section-experience", true],
		['section:where([type="education"])', "section-education", true],
		["section:is(:where([type='education']))", "section-education", true],
		["item:first-child", "item-first", true],
		["item:last-child", "item-third", true],
		["section:only-child", "section-skills-sidebar", true],
		["item:nth-child(2n + 1)", "item-third", true],
		["item:nth-of-type(even)", "item-second", true],
	])("matches %s against the immutable semantic tree", (selector, nodeKey, expected) => {
		expect(matches(selector, nodeKey)).toBe(expected);
	});

	it("reflects IDs, roles, and lowercase registry attributes with case-sensitive values", () => {
		expect(matches(`#${experienceId}`, "section-experience")).toBe(true);
		expect(matches(`[id="${experienceId}"]`, "section-experience")).toBe(true);
		expect(matches("#\\31 abc", "section-education")).toBe(true);
		expect(matches("sect\\69 on[\\74 ype='experience']", "section-experience")).toBe(true);
		expect(matches("[role~='nested-role']", "item-second")).toBe(true);
		expect(matches('[type="Experience"]', "section-experience")).toBe(false);
		expect(matches('[TYPE="experience"]', "section-experience")).toBe(false);
	});

	it("implements every supported attribute operator", () => {
		expect(matches("[type]", "section-experience")).toBe(true);
		expect(matches('[type="experience"]', "section-experience")).toBe(true);
		expect(matches('[role~="nested-role"]', "item-second")).toBe(true);
		expect(matches('[origin|="custom"]', "section-experience")).toBe(true);
		expect(matches('[type^="exp"]', "section-experience")).toBe(true);
		expect(matches('[type$="ence"]', "section-experience")).toBe(true);
		expect(matches('[type*="per"]', "section-experience")).toBe(true);
	});

	it("gives functional pseudo-classes their Selectors Level 4 specificity", () => {
		expect(getSpecificity(":where(#one) section")).toEqual([0, 0, 1]);
		expect(getSpecificity(":is(#one, section)")).toEqual([1, 0, 0]);
		expect(getSpecificity(":not([type]) section")).toEqual([0, 1, 1]);
		expect(getSpecificity("item:nth-child(2 of #one, section)")).toEqual([1, 1, 1]);
	});

	it.each([
		".custom",
		"section::before",
		"section:hover",
		":ROOT",
		":IS(section)",
		"item:NTH-CHILD(2)",
		"section:has(item)",
		"unknown-element",
		"[unknown]",
		"[TYPE]",
		'[role~="unknown-role"]',
		'section[role~="primary-text"]',
		"page[type]",
		'[type="experience" i]',
		"svg|section",
	])("rejects unsupported or unknown selector %s", (selector) => {
		expect(compileSelector(selector).selector).toBeNull();
	});

	it("enforces selector resource limits", () => {
		expect(compileSelector(new Array(66).fill("section").join(",")).selector).toBeNull();
		expect(compileSelector(new Array(19).fill("resume").join(" > ")).selector).toBeNull();
		expect(compileSelector(`${" ".repeat(2_042)}section`).selector).toBeNull();
		expect(compileSelector(`${"😀".repeat(2_042)}section`).selector).toBeNull();
		expect(compileSelector(`${":is(".repeat(17)}section${")".repeat(17)}`).selector).toBeNull();
	});

	it("keeps compiled selectors cloneable and leaves source order untouched", () => {
		const result = compileSelector("item:nth-child(2)");
		expect(result.selector).not.toBeNull();
		expect(() => structuredClone(result.selector)).not.toThrow();
		expect(matches("item:nth-child(2)", "item-second")).toBe(true);
		expect(experience.children[1]?.children).toEqual([itemFirst, itemSecond, itemThird]);
	});

	it("does not treat the parentless resume root as a structural child", () => {
		expect(matches("resume:first-child", "resume")).toBe(false);
		expect(matches("resume:last-child", "resume")).toBe(false);
		expect(matches("resume:only-child", "resume")).toBe(false);
	});

	it("validates selectors while compiling a stylesheet", () => {
		const fixture = readFileSync(new URL("./__fixtures__/v1/selectors.css", import.meta.url), "utf8");
		expect(compileStylesheet({ languageVersion: 1, text: fixture }).program).not.toBeNull();

		const invalid = compileStylesheet({ languageVersion: 1, text: "@rr-version 1;\nsection:hover { color: red; }" });
		expect(invalid.program).toBeNull();
		expect(invalid.diagnostics).toContainEqual(expect.objectContaining({ code: "INVALID_SELECTOR" }));
	});

	it("rejects uppercase pseudo names while compiling a stylesheet", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "@rr-version 1;\n:ROOT { color: red; }" });
		expect(result.program).toBeNull();
		expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "INVALID_SELECTOR" }));
	});
});
