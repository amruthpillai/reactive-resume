import { describe, expect, it } from "vitest";
import { parseStyleFontSize, resolveIconSize, resolveStyleFontSize } from "./icon-size";

describe("parseStyleFontSize", () => {
	it("parses numeric and px font sizes", () => {
		expect(parseStyleFontSize(14)).toBe(14);
		expect(parseStyleFontSize("18px")).toBe(18);
		expect(parseStyleFontSize("invalid")).toBeUndefined();
	});
});

describe("resolveStyleFontSize", () => {
	it("returns the last font size across composed style inputs", () => {
		expect(resolveStyleFontSize({ fontSize: 10 }, [{ fontSize: 12 }, { fontSize: 16 }])).toBe(16);
	});
});

describe("resolveIconSize", () => {
	it("prefers an explicit size over custom style font sizes", () => {
		expect(
			resolveIconSize({
				size: 20,
				styles: [{ fontSize: 12 }],
			}),
		).toBe(20);
	});

	it("falls back to custom style font sizes when size is omitted", () => {
		expect(
			resolveIconSize({
				styles: [{ fontSize: 10 }, { fontSize: 18 }],
			}),
		).toBe(18);
	});

	it("allows a template default size to be supplied by the caller", () => {
		expect(
			resolveIconSize({
				styles: [{ fontSize: 12 }],
			}) ?? 10,
		).toBe(12);
		expect(resolveIconSize({ styles: [] }) ?? 10).toBe(10);
	});
});
