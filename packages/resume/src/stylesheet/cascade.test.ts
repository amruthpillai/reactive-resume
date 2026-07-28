import type { BaseSettingsSnapshot, ResolvedNodeStyle, ResolveStylesheetContext, SemanticNode } from "./types";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { resolveStylesheet } from "./cascade";
import { compileStylesheet } from "./compile";

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

const items = node("items-experience", "section-items", {
	children: [node("item-1", "item"), node("item-2", "item"), node("item-3", "item")],
});
const tree = node("resume", "resume", {
	attributes: { template: "onyx" },
	children: [
		node("page-1", "page", {
			attributes: { "page-number": "1" },
			children: [
				node("region-main", "region", {
					attributes: { placement: "main", region: "body" },
					children: [
						node("section-experience", "section", {
							id: "experience",
							attributes: { type: "experience", placement: "main", origin: "native" },
							children: [node("heading-experience", "section-heading", { roles: ["section-title"] }), items],
						}),
					],
				}),
			],
		}),
	],
});

const baseSettings: BaseSettingsSnapshot = {
	picture: defaultResumeData.picture,
	template: defaultResumeData.metadata.template,
	design: defaultResumeData.metadata.design,
	typography: defaultResumeData.metadata.typography,
	page: defaultResumeData.metadata.page,
	layout: { sidebarWidth: defaultResumeData.metadata.layout.sidebarWidth },
};

const blankStyle: ResolvedNodeStyle = { style: {}, structural: {}, hidden: false, order: 0 };
const context: ResolveStylesheetContext = {
	baseStyles: {
		resume: blankStyle,
		"heading-experience": { ...blankStyle, style: { color: "black" } },
	},
	baseSettings,
	pages: [{ pageKey: "page-1", width: 595.28, height: 841.89 }],
};

function resolve(source: string, customContext: ResolveStylesheetContext = context) {
	const compiled = compileStylesheet({ languageVersion: 1, text: `@rr-version 1;${source}` });
	if (!compiled.program) throw new Error(compiled.diagnostics.map(({ code }) => code).join(","));
	return resolveStylesheet(compiled.program, tree, customContext);
}

function find(nodeToSearch: SemanticNode, key: string): SemanticNode | undefined {
	if (nodeToSearch.key === key) return nodeToSearch;
	for (const child of nodeToSearch.children) {
		const match = find(child, key);
		if (match) return match;
	}
}

describe("RRSS cascade and structural resolution", () => {
	it("resolves base, normal and important rules by specificity then source order", () => {
		const result = resolve(`
			section-heading { color: red; }
			section[type="experience"] > section-heading { color: blue !important; }
			section#experience > section-heading { color: green; }
		`);

		expect(result.nodes["heading-experience"]?.style.color).toBe("blue");
	});

	it("resolves inherited custom properties, fallbacks, cycles, and CSS-wide keywords", () => {
		const valid = resolve(`
			:root { --accent: var(--rr-primary-color); color: red; }
			section { color: inherit; }
			section-heading { color: var(--missing, var(--accent)); }
		`);
		expect(valid.nodes["heading-experience"]?.style.color).toBe(baseSettings.design.colors.primary);

		const reverted = resolve("section { color: red; } section-heading { color: revert; }");
		expect(reverted.nodes["heading-experience"]?.style.color).toBe("black");

		const compiled = compileStylesheet({
			languageVersion: 1,
			text: "@rr-version 1; :root { --a: var(--b); --b: var(--a); } section { color: var(--a); }",
		});
		if (!compiled.program) throw new Error(compiled.diagnostics.map(({ code }) => code).join(","));
		const cycled = resolveStylesheet(compiled.program, tree, context);
		expect(cycled.nodes).toEqual({});
		expect(cycled.diagnostics).toContainEqual(expect.objectContaining({ code: "VARIABLE_CYCLE", severity: "error" }));
	});

	it("normalizes PDF lengths with the correct font-relative bases and expands spacing shorthands", () => {
		const result = resolve(`
			section-heading { font-size: 2em; margin: 96px 1em 1in 25.4mm; padding: 1rem 2cm; }
		`);

		expect(result.nodes["heading-experience"]?.style).toMatchObject({
			"font-size": 20,
			"margin-top": 72,
			"margin-right": 20,
			"margin-bottom": 72,
			"margin-left": 72,
			"padding-top": 10,
			"padding-right": 56.69291338582677,
			"padding-bottom": 10,
			"padding-left": 56.69291338582677,
		});
	});

	it("warns after variable expansion when a value is extreme but technically renderable", () => {
		const result = resolve(":root { --tiny: 3pt; } section-heading { font-size: var(--tiny); }");

		expect(result.nodes["heading-experience"]?.style["font-size"]).toBe(3);
		expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "EXTREME_VALUE", severity: "warning" }));
	});

	it("resolves authored size before media and rejects size inside media", () => {
		const result = resolve(
			`
				page { size: 400pt 600pt; padding-top: var(--rr-page-width); }
				@media (min-width: 390pt) and (orientation: portrait) { page { margin-top: 10pt; } }
			`,
			{ ...context, pages: [{ pageKey: "page-1", width: 800, height: 400 }] },
		);
		expect(result.nodes["page-1"]?.structural.pageSize).toEqual({ width: 400, height: 600 });
		expect(result.nodes["page-1"]?.style["margin-top"]).toBe(10);
		expect(result.nodes["page-1"]?.style["padding-top"]).toBe(400);

		const invalid = compileStylesheet({
			languageVersion: 1,
			text: "@rr-version 1; @media (width: 400pt) { page { size: A4; } }",
		});
		expect(invalid.program).toBeNull();
		expect(invalid.diagnostics).toContainEqual(expect.objectContaining({ code: "MEDIA_PAGE_SIZE", severity: "error" }));
	});

	it("bounds adversarial nested variable expansion without throwing", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 36 }), (depth) => {
				const variables = Array.from({ length: depth }, (_, index) => {
					const next = index === depth - 1 ? "red" : `var(--v${index + 1})`;
					return `--v${index}:${next};`;
				}).join("");
				const compiled = compileStylesheet({
					languageVersion: 1,
					text: `@rr-version 1;:root{${variables}}section-heading{color:var(--v0);}`,
				});
				if (!compiled.program) throw new Error(compiled.diagnostics.map(({ code }) => code).join(","));
				const result = resolveStylesheet(compiled.program, tree, context);
				if (depth <= 32) expect(result.nodes["heading-experience"]?.style.color).toBe("red");
				else
					expect(result.diagnostics).toContainEqual(
						expect.objectContaining({ code: "RESOURCE_LIMIT", severity: "error" }),
					);
			}),
			{ numRuns: 36 },
		);
	});

	it("matches positional selectors before applying display and stable order exactly once", () => {
		const result = resolve(`
			item:nth-child(2) { display: none; }
			item:last-child { order: -1; }
		`);
		const renderedItems = find(result.renderTree, "items-experience");

		expect(renderedItems?.children.map(({ key }) => key)).toEqual(["item-3", "item-1"]);
		expect(tree.children[0]?.children[0]?.children[0]?.children[1]?.children.map(({ key }) => key)).toEqual([
			"item-1",
			"item-2",
			"item-3",
		]);
	});

	it("maps structural declarations without mixing them into renderer styles", () => {
		const result = resolve(`
			section { break-before: page; break-inside: avoid; -rr-fixed: true; -rr-min-presence-ahead: 12pt; }
			section-heading { orphans: 2; widows: 3; order: 4; }
		`);

		expect(result.nodes["section-experience"]).toMatchObject({
			structural: { breakBefore: "page", breakInside: "avoid", fixed: true, minPresenceAhead: 12 },
		});
		expect(result.nodes["heading-experience"]).toMatchObject({
			structural: { orphans: 2, widows: 3 },
			order: 4,
		});
		expect(result.nodes["section-experience"]?.style["break-before"]).toBeUndefined();
	});

	it("rejects semantic trees beyond the frozen node budget", () => {
		let oversized = node("leaf", "item");
		for (let index = 0; index < 20_001; index++) {
			oversized = node(`node-${index}`, "item", { children: [oversized] });
		}
		const compiled = compileStylesheet({ languageVersion: 1, text: "@rr-version 1; item { color: red; }" });
		if (!compiled.program) throw new Error(compiled.diagnostics.map(({ code }) => code).join(","));
		const result = resolveStylesheet(compiled.program, oversized, context);

		expect(result.nodes).toEqual({});
		expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "RESOURCE_LIMIT", severity: "error" }));
	});
});
