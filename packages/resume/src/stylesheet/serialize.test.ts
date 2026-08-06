import { describe, expect, it } from "vitest";
import { escapeCssComment, escapeCssString, serializeGeneratedStylesheet } from "./serialize";

describe("generated Semantic CSS serialization", () => {
	it("serializes generated Semantic CSS deterministically and safely", () => {
		const output = serializeGeneratedStylesheet({
			languageVersion: 1,
			blocks: [
				{
					comment: "Bad */ label",
					selector: 'section[id="projects"] > section-heading',
					declarations: { fontSize: "12pt", color: "#123456" },
				},
			],
		});

		expect(output).toBe(
			'@version 1;\n\n/* Bad *\\/ label */\nsection[id="projects"] > section-heading {\n\tcolor: #123456;\n\tfont-size: 12pt;\n}\n',
		);
	});

	it("escapes labels and strings without creating CSS delimiters", () => {
		expect(escapeCssComment("*/ next")).toBe("*\\/ next");
		expect(escapeCssString('"\\\n')).toBe('"\\"\\\\\\a "');
	});

	it("rejects generated declarations that could escape their block", () => {
		expect(() =>
			serializeGeneratedStylesheet({
				languageVersion: 1,
				blocks: [{ selector: "field", declarations: { color: "red; page { color: blue" } }],
			}),
		).toThrow("unsafe CSS declaration value");
	});
});
