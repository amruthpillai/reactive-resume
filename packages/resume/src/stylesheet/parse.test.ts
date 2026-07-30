import { describe, expect, it } from "vitest";
import { parseStylesheet } from "./parse";

describe("parseStylesheet", () => {
	it("returns exact ranges for malformed declarations and keeps a recoverable parse tree", () => {
		const result = parseStylesheet("@version 1;\nsection { color red; }\nitem { opacity: .5; }");

		expect(result.diagnostics[0]?.range).toEqual({
			start: { line: 2, column: 17, offset: 31 },
			end: { line: 2, column: 17, offset: 31 },
		});
		expect(result.rules).toHaveLength(2);
	});

	it("keeps UTF-16 offsets aligned with the original source", () => {
		const result = parseStylesheet("/* 😀 */\nsection { color red; }");

		expect(result.diagnostics[0]?.range.start).toMatchObject({ line: 2, column: 17, offset: 25 });
	});
});
