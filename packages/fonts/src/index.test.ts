import { describe, expect, it } from "vitest";
import { getFont, getPdfFallbackFontFamilies, resolveBoldFontWeight, resolveLegacyFontAlias } from "./index";

describe("getPdfFallbackFontFamilies", () => {
	it("uses separate fonts for arrows and other text symbols", () => {
		expect(getPdfFallbackFontFamilies("Times-Roman", { scripts: ["arrows"] })).toEqual([
			"Noto Sans Symbols",
			"Noto Serif",
		]);
	});
	it("orders the locale script first, then content scripts (mixed RTL + CJK resume)", () => {
		expect(getPdfFallbackFontFamilies("Helvetica", { locale: "ko-KR", scripts: ["arabic"] })).toEqual([
			"Noto Sans KR",
			"Noto Sans Arabic",
			"Noto Sans SC",
			"Noto Sans",
		]);
	});

	it("uses the Hebrew Noto font for he-IL, reusing the sans font for serif (no Noto Serif Hebrew)", () => {
		expect(getPdfFallbackFontFamilies("Helvetica", { locale: "he-IL" })).toEqual(["Noto Sans Hebrew", "Noto Sans"]);
		expect(getPdfFallbackFontFamilies("Times-Roman", { locale: "he-IL" })).toEqual(["Noto Sans Hebrew", "Noto Serif"]);
	});

	it("uses the Thai Noto font for th-TH, reusing the sans font for serif (no Noto Serif Thai)", () => {
		expect(getPdfFallbackFontFamilies("Helvetica", { locale: "th-TH" })).toEqual(["Noto Sans Thai", "Noto Sans"]);
		expect(getPdfFallbackFontFamilies("Times-Roman", { locale: "th-TH" })).toEqual(["Noto Sans Thai", "Noto Serif"]);
	});
});

describe("legacy font compatibility (#2989)", () => {
	it("getFont resolves a legacy family to its alias target", () => {
		expect(resolveLegacyFontAlias("Times New Roman")).toBe("Times-Roman");
		const tnr = getFont("Times New Roman");
		expect(tnr).toBeDefined();
		expect(tnr?.family).toBe("Times-Roman");
	});
});

describe("resolveBoldFontWeight (#3310)", () => {
	it("keeps a deliberate bold-class stored weight (>= 700)", () => {
		expect(resolveBoldFontWeight("Open Sans", ["400", "800"])).toBe("800");
	});

	it("uses the heaviest face at or above SemiBold when the family has no Bold face", () => {
		// Londrina Solid ships 100/300/400/900 — no 700, so its 900 is the
		// only bold-class face available.
		expect(resolveBoldFontWeight("Londrina Solid", ["300", "400"])).toBe("900");
	});

	it("resolves a PDF fallback stack by its primary family", () => {
		// CJK fallback stacks widen fontFamily to string[] (#2986); the
		// user-chosen primary family decides the bold weight.
		expect(resolveBoldFontWeight(["Open Sans", "Noto Sans"], ["400", "600"])).toBe("700");
	});
});
