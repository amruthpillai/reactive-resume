import type { SemanticNode } from "./types";
import { describe, expect, it } from "vitest";
import { analyzeStylesheet } from "./analyze";
import { compileStylesheet } from "./compile";
import { SEMANTIC_CSS_LIMITS_V1 } from "./limits";

const tree: SemanticNode = {
	key: "resume",
	kind: "resume",
	attributes: { template: "onyx" },
	roles: [],
	children: [
		{
			key: "name",
			kind: "name",
			attributes: {},
			roles: ["primary-text"],
			children: [],
		},
		{
			key: "picture",
			kind: "picture",
			attributes: {},
			roles: ["picture"],
			children: [],
		},
	],
};

function compile(source: string) {
	const result = compileStylesheet({ languageVersion: 1, text: source });
	if (!result.program) throw new Error(result.diagnostics.map(({ code }) => code).join(","));
	return result.program;
}

function semanticTreeOfSize(size: number, shape: "deep" | "wide"): SemanticNode {
	if (shape === "wide") {
		return {
			key: "root",
			kind: "resume",
			attributes: {},
			roles: [],
			children: Array.from({ length: size - 1 }, (_, index) => ({
				key: `item-${index}`,
				kind: "item",
				attributes: {},
				roles: [],
				children: [],
			})),
		};
	}

	let root: SemanticNode = { key: "node-0", kind: "item", attributes: {}, roles: [], children: [] };
	for (let index = 1; index < size; index++) {
		root = { key: `node-${index}`, kind: "item", attributes: {}, roles: [], children: [root] };
	}
	return root;
}

function oversizedFrontierTree(): { tree: SemanticNode; childReads: () => number } {
	let childReads = 0;
	const children = new Proxy({} as readonly SemanticNode[], {
		get: (_target, property) => {
			if (property === "length") return SEMANTIC_CSS_LIMITS_V1.maxSemanticNodes + 1;
			if (property === Symbol.iterator || (typeof property === "string" && /^\d+$/.test(property))) {
				childReads++;
				throw new Error("Oversized frontier entries must not be read.");
			}
		},
	});
	return {
		tree: { key: "oversized-root", kind: "resume", attributes: {}, roles: [], children },
		childReads: () => childReads,
	};
}

describe("Semantic CSS semantic analysis", () => {
	it("warns about selectors that match no immutable semantic node", () => {
		const program = compile('@version 1; section[type="education"] { color: red; }');
		const diagnostics = analyzeStylesheet(program, tree);

		expect(diagnostics).toContainEqual(expect.objectContaining({ code: "SELECTOR_NO_MATCH", severity: "warning" }));
	});

	it("warns when a known property cannot apply to any matched node kind", () => {
		const program = compile("@version 1; picture { color: red; }");
		const diagnostics = analyzeStylesheet(program, tree);

		expect(diagnostics).toContainEqual(
			expect.objectContaining({ code: "PROPERTY_NOT_APPLICABLE", severity: "warning" }),
		);
	});

	it("does not warn for a selector and declaration with a real target", () => {
		const program = compile("@version 1; name { color: red; }");

		expect(analyzeStylesheet(program, tree)).toEqual([]);
	});

	it("accepts the exact analysis node budget and rejects deep or wide trees one node over", () => {
		const program = { languageVersion: 1, rules: [] };
		expect(analyzeStylesheet(program, semanticTreeOfSize(SEMANTIC_CSS_LIMITS_V1.maxSemanticNodes, "wide"))).toEqual([]);

		for (const shape of ["deep", "wide"] as const) {
			expect(
				analyzeStylesheet(program, semanticTreeOfSize(SEMANTIC_CSS_LIMITS_V1.maxSemanticNodes + 1, shape)),
			).toContainEqual(expect.objectContaining({ code: "RESOURCE_LIMIT", severity: "error" }));
		}
	});

	it("rejects an oversized root frontier without reading or queueing child entries", () => {
		const frontier = oversizedFrontierTree();
		const diagnostics = analyzeStylesheet({ languageVersion: 1, rules: [] }, frontier.tree);

		expect(diagnostics).toContainEqual(expect.objectContaining({ code: "RESOURCE_LIMIT", severity: "error" }));
		expect(frontier.childReads()).toBe(0);
	});
});
