import { describe, expect, it } from "vitest";
import { resolveHighlightToolbarState } from "./rich-input";

describe("resolveHighlightToolbarState", () => {
	it("shows legacy colorless highlights as default yellow and clearable", () => {
		expect(resolveHighlightToolbarState(true, null)).toEqual({
			visibleHighlightColor: "rgba(255, 255, 0, 1)",
			canClearHighlight: true,
		});
	});

	it("does not show or clear a highlight when no highlight mark is active", () => {
		expect(resolveHighlightToolbarState(false, null)).toEqual({
			visibleHighlightColor: undefined,
			canClearHighlight: false,
		});
	});
});
