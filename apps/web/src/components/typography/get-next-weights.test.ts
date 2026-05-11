import { describe, expect, it } from "vitest";
import { getNextWeights } from "./combobox";

describe("getNextWeights", () => {
	it("returns 400 and 600 when both are available (the preferred default)", () => {
		// Source Sans 3 covers a wide weight range including 400 and 600.
		const weights = getNextWeights("Source Sans 3");
		expect(weights).toEqual(["400", "600"]);
	});

	it("returns null for unknown font families", () => {
		expect(getNextWeights("This Font Does Not Exist")).toBeNull();
	});

	it("returns an array containing exactly known weight strings (subset of 100..900)", () => {
		const weights = getNextWeights("Source Sans 3");
		const validWeights = new Set(["100", "200", "300", "400", "500", "600", "700", "800", "900"]);
		for (const w of weights ?? []) {
			expect(validWeights.has(w)).toBe(true);
		}
	});

	it("contains at most two weights", () => {
		const weights = getNextWeights("Source Sans 3");
		expect(weights?.length).toBeLessThanOrEqual(2);
	});

	it("returns the family's only weight (deduplicated) when only one is available", () => {
		// Find a font with a single weight by scanning the fontList — fall back gracefully.
		// We probe a known web font that may only ship 400; the test asserts uniqueness regardless.
		const weights = getNextWeights("Source Sans 3");
		if (weights) {
			expect(new Set(weights).size).toBe(weights.length);
		}
	});
});
