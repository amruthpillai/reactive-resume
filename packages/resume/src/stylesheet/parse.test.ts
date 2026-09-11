import { describe, expect, it } from "vitest";
import { parseStylesheet } from "./parse";

describe("parseStylesheet", () => {
	it("returns exact ranges for malformed declarations and keeps a recoverable parse tree", () => {
		const source = "@version 1;\nsection { color red; }\nitem { opacity: .5; }";
		const result = parseStylesheet(source);

		expect(result.diagnostics[0]?.range).toEqual({
			start: { line: 2, column: 17, offset: 28 },
			end: { line: 2, column: 17, offset: 28 },
		});
		// Anchor the offset to the source it must point at, so a parser change that shifts it fails
		// loudly instead of leaving line/column and offset disagreeing.
		expect(source.slice(28, 31)).toBe("red");
		expect(result.rules).toHaveLength(2);
	});

	it("keeps UTF-16 offsets aligned with the original source", () => {
		const result = parseStylesheet("/* 😀 */\nsection { color red; }");

		expect(result.diagnostics[0]?.range.start).toMatchObject({ line: 2, column: 17, offset: 25 });
	});
});
