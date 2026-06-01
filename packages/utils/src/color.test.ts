import { describe, expect, it } from "vitest";
import { isDarkColor, parseColorString, rgbaStringToHex } from "./color";

describe("rgbaStringToHex", () => {
	it("converts opaque rgb to hex", () => {
		expect(rgbaStringToHex("rgb(255, 0, 0)")).toBe("#ff0000");
	});

	it("converts opaque rgba to hex (alpha not represented)", () => {
		expect(rgbaStringToHex("rgba(0, 255, 0, 1)")).toBe("#00ff00");
	});

	it("converts black", () => {
		expect(rgbaStringToHex("rgb(0, 0, 0)")).toBe("#000000");
	});

	it("converts white", () => {
		expect(rgbaStringToHex("rgb(255, 255, 255)")).toBe("#ffffff");
	});

	it("converts arbitrary mid-range color", () => {
		expect(rgbaStringToHex("rgb(128, 64, 200)")).toBe("#8040c8");
	});

	it("preserves 6-digit hex colors", () => {
		expect(rgbaStringToHex("#F1F5F9")).toBe("#f1f5f9");
		expect(rgbaStringToHex("#0F172A")).toBe("#0f172a");
	});
});

describe("isDarkColor", () => {
	it("classifies opaque dark colors as dark", () => {
		expect(isDarkColor("rgba(0, 0, 0, 1)")).toBe(true);
	});

	it("composites transparent colors over white before checking darkness", () => {
		expect(isDarkColor("rgba(0, 0, 0, 0.1)")).toBe(false);
	});
});

describe("parseColorString", () => {
	describe("rgb format", () => {
		it("parses rgb without alpha as alpha=1", () => {
			expect(parseColorString("rgb(255, 128, 64)")).toEqual({ r: 255, g: 128, b: 64, a: 1 });
		});

		it("parses rgba with alpha", () => {
			expect(parseColorString("rgba(10, 20, 30, 0.5)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
		});

		it("parses rgba with alpha=0", () => {
			expect(parseColorString("rgba(0, 0, 0, 0)")).toEqual({ r: 0, g: 0, b: 0, a: 0 });
		});

		it("handles extra whitespace in rgb", () => {
			expect(parseColorString("rgb(  255 ,  0 ,  0  )")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
		});

		it("trims surrounding whitespace", () => {
			expect(parseColorString("   rgb(1, 2, 3)   ")).toEqual({ r: 1, g: 2, b: 3, a: 1 });
		});

		it("returns null for malformed rgb", () => {
			expect(parseColorString("rgb(255, 0)")).toBeNull();
			expect(parseColorString("rgb(a, b, c)")).toBeNull();
		});
	});

	describe("hex format", () => {
		it("parses 6-digit hex", () => {
			expect(parseColorString("#ff8040")).toEqual({ r: 255, g: 128, b: 64, a: 1 });
		});

		it("parses 6-digit hex uppercase", () => {
			expect(parseColorString("#FF8040")).toEqual({ r: 255, g: 128, b: 64, a: 1 });
		});

		it("parses 3-digit hex by doubling each digit", () => {
			expect(parseColorString("#f80")).toEqual({ r: 0xff, g: 0x88, b: 0x00, a: 1 });
		});

		it("parses #000 as black", () => {
			expect(parseColorString("#000")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
		});

		it("parses #fff as white", () => {
			expect(parseColorString("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
		});

		it("returns null for hex without #", () => {
			expect(parseColorString("ff0000")).toBeNull();
		});

		it("returns null for invalid hex length", () => {
			expect(parseColorString("#ff00")).toBeNull();
			expect(parseColorString("#ff00ff00")).toBeNull();
		});

		it("returns null for hex with non-hex chars", () => {
			expect(parseColorString("#zz0000")).toBeNull();
		});
	});

	describe("invalid input", () => {
		it("returns null for empty string", () => {
			expect(parseColorString("")).toBeNull();
		});

		it("returns null for plain color names", () => {
			expect(parseColorString("red")).toBeNull();
		});

		it("returns null for hsl format", () => {
			expect(parseColorString("hsl(0, 100%, 50%)")).toBeNull();
		});
	});
});
