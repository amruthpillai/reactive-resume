import type { SemanticNode } from "./types";
import { describe, expect, it } from "vitest";
import { analyzeStylesheet } from "./analyze";
import { compileStylesheet } from "./compile";

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

describe("RRSS semantic analysis", () => {
	it("warns about selectors that match no immutable semantic node", () => {
		const program = compile('@rr-version 1; section[type="education"] { color: red; }');
		const diagnostics = analyzeStylesheet(program, tree);

		expect(diagnostics).toContainEqual(expect.objectContaining({ code: "SELECTOR_NO_MATCH", severity: "warning" }));
	});

	it("warns when a known property cannot apply to any matched node kind", () => {
		const program = compile("@rr-version 1; picture { color: red; }");
		const diagnostics = analyzeStylesheet(program, tree);

		expect(diagnostics).toContainEqual(
			expect.objectContaining({ code: "PROPERTY_NOT_APPLICABLE", severity: "warning" }),
		);
	});

	it("does not warn for a selector and declaration with a real target", () => {
		const program = compile("@rr-version 1; name { color: red; }");

		expect(analyzeStylesheet(program, tree)).toEqual([]);
	});
});
