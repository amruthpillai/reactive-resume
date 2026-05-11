import { describe, expect, it } from "vitest";
import { hasSplitRowText, promoteSplitRowRight } from "./split-row";

describe("hasSplitRowText", () => {
	it("returns true only for non-empty text", () => {
		expect(hasSplitRowText("2019 - 2024")).toBe(true);
		expect(hasSplitRowText("   ")).toBe(false);
		expect(hasSplitRowText(undefined)).toBe(false);
	});
});

describe("promoteSplitRowRight", () => {
	it("keeps both right cells when the top-right cell has content", () => {
		expect(promoteSplitRowRight({ top: "Remote", bottom: "2019 - 2024" })).toEqual({
			top: "Remote",
			bottom: "2019 - 2024",
		});
	});

	it("moves bottom-right content to the top right when top-right content is missing", () => {
		expect(promoteSplitRowRight({ top: "", bottom: "2019 - 2024" })).toEqual({ top: "2019 - 2024", bottom: "" });
	});

	it("treats whitespace-only cells as missing", () => {
		expect(promoteSplitRowRight({ top: "   ", bottom: "\t" })).toEqual({ top: "", bottom: "" });
	});
});
