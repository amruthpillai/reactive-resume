import { describe, expect, it } from "vitest";
import { computeDelta, getSparklinePoints } from "./statistics";

describe("computeDelta", () => {
	it("returns null when the prior period had no activity", () => {
		// Prior 2 days are all zero -> no baseline to compare against.
		expect(computeDelta([0, 0, 5, 5], 2)).toBeNull();
	});

	it("returns a positive percentage when the recent period grew", () => {
		// previous sum = 2, recent sum = 4 -> +100%
		expect(computeDelta([1, 1, 2, 2], 2)).toBe(100);
	});

	it("returns a negative percentage when the recent period shrank", () => {
		// previous sum = 4, recent sum = 2 -> -50%
		expect(computeDelta([2, 2, 1, 1], 2)).toBe(-50);
	});
});

describe("getSparklinePoints", () => {
	it("returns null for a single point", () => {
		expect(getSparklinePoints([5], 80, 24)).toBeNull();
	});

	it("returns null for an all-zero series", () => {
		expect(getSparklinePoints([0, 0, 0], 80, 24)).toBeNull();
	});

	it("returns points for all-equal non-zero values (flat line at the top)", () => {
		// max === value, so every y is 0; x spans 0..width.
		expect(getSparklinePoints([3, 3, 3], 80, 24)).toBe("0.0,0.0 40.0,0.0 80.0,0.0");
	});
});
