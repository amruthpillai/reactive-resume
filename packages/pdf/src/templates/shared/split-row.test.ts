import { describe, expect, it } from "vitest";
import { hasSplitRowText, promoteBottomRightWhenTopRightMissing } from "./split-row";

describe("hasSplitRowText", () => {
	it("returns true only for non-empty text", () => {
		expect(hasSplitRowText("2019 - 2024")).toBe(true);
		expect(hasSplitRowText("   ")).toBe(false);
		expect(hasSplitRowText(undefined)).toBe(false);
	});
});

describe("promoteBottomRightWhenTopRightMissing", () => {
	it("keeps both right cells when the top-right cell has content", () => {
		expect(
			promoteBottomRightWhenTopRightMissing({
				topRight: "Remote",
				bottomRight: "2019 - 2024",
			}),
		).toEqual({
			topRight: "Remote",
			bottomRight: "2019 - 2024",
		});
	});

	it("moves bottom-right content to the top right when top-right content is missing", () => {
		expect(
			promoteBottomRightWhenTopRightMissing({
				topRight: "",
				bottomRight: "2019 - 2024",
			}),
		).toEqual({
			topRight: "2019 - 2024",
			bottomRight: "",
		});
	});

	it("treats whitespace-only cells as missing", () => {
		expect(
			promoteBottomRightWhenTopRightMissing({
				topRight: "   ",
				bottomRight: "\t",
			}),
		).toEqual({
			topRight: "",
			bottomRight: "",
		});
	});
});
