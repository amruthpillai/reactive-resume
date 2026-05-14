import { describe, expect, it } from "vitest";
import {
	buildResumeFontFamily,
	fontList,
	getFallbackWebFontFamilies,
	getFont,
	getFontDisplayName,
	getFontSearchKeywords,
	getLoadableWebFontWeights,
	getPdfCjkFallbackFontFamily,
	getWebFont,
	getWebFontSource,
	isStandardPdfFontFamily,
	resolveLegacyFontAlias,
	standardFontList,
	webFontList,
	webFontMap,
} from "./index";

const sortFontFamilies = (families: string[]) => {
	return [...families].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
};

describe("fontList", () => {
	it("is ordered by font family name instead of localized display name", () => {
		const families = fontList.map((font) => font.family);
		expect(families).toEqual(sortFontFamilies(families));
	});

	it("contains standard PDF fonts", () => {
		const families = fontList.map((font) => font.family);
		expect(families).toContain("Helvetica");
		expect(families).toContain("Courier");
		expect(families).toContain("Times-Roman");
	});

	it("merges standardFontList and webFontList without duplicates", () => {
		const expectedSize = standardFontList.length + webFontList.length;
		expect(fontList).toHaveLength(expectedSize);
	});
});

describe("standardFontList", () => {
	it("contains only fonts not present in webFontMap", () => {
		for (const font of standardFontList) {
			expect(webFontMap.has(font.family)).toBe(false);
		}
	});

	it("marks all standard fonts with type='standard'", () => {
		for (const font of standardFontList) {
			expect(font.type).toBe("standard");
		}
	});
});

describe("getFont", () => {
	it("returns a font record by family", () => {
		expect(getFont("Helvetica")).toBeDefined();
		expect(getFont("Helvetica")?.family).toBe("Helvetica");
	});

	it("returns undefined for unknown families", () => {
		expect(getFont("DefinitelyNotAFont")).toBeUndefined();
	});
});

describe("getFontDisplayName", () => {
	it("returns localized name when available", () => {
		expect(getFontDisplayName("Noto Sans SC")).toBe("思源黑体");
		expect(getFontDisplayName("PingFang SC")).toBe("苹方");
	});

	it("returns the family name when no localized name exists", () => {
		expect(getFontDisplayName("Helvetica")).toBe("Helvetica");
		expect(getFontDisplayName("Roboto")).toBe("Roboto");
	});
});

describe("getFontSearchKeywords", () => {
	it("returns family for non-CJK fonts", () => {
		const keywords = getFontSearchKeywords("Helvetica");
		expect(keywords).toContain("Helvetica");
		expect(keywords).not.toContain("中文");
	});

	it("includes localized display name and 中文 marker for CJK fonts", () => {
		const keywords = getFontSearchKeywords("Noto Sans SC");
		expect(keywords).toContain("Noto Sans SC");
		expect(keywords).toContain("思源黑体");
		expect(keywords).toContain("中文");
	});

	it("deduplicates entries", () => {
		const keywords = getFontSearchKeywords("Helvetica");
		expect(new Set(keywords).size).toBe(keywords.length);
	});
});

describe("isStandardPdfFontFamily", () => {
	it("returns true for Helvetica, Courier, Times-Roman", () => {
		expect(isStandardPdfFontFamily("Helvetica")).toBe(true);
		expect(isStandardPdfFontFamily("Courier")).toBe(true);
		expect(isStandardPdfFontFamily("Times-Roman")).toBe(true);
	});

	it("returns false for unknown families", () => {
		expect(isStandardPdfFontFamily("Not-A-Font")).toBe(false);
	});

	it("returns false for non-standard web fonts", () => {
		// Roboto is a web font, not a standard PDF font
		const roboto = getWebFont("Roboto");
		if (roboto) expect(isStandardPdfFontFamily("Roboto")).toBe(false);
	});
});

describe("getWebFont", () => {
	it("returns webFont record for known web font family", () => {
		// Spot-check a font that should be in the list
		const font = getWebFont("Roboto");
		if (font) {
			expect(font.type).toBe("web");
			expect(font.family).toBe("Roboto");
		}
	});

	it("returns undefined for non-web families", () => {
		expect(getWebFont("Helvetica")).toBeUndefined();
		expect(getWebFont("definitely-not-a-font")).toBeUndefined();
	});
});

describe("getWebFontSource", () => {
	it("uses the full normal font source when an italic variant is unavailable", () => {
		expect(getWebFontSource("Noto Serif SC", "400", true)).toBe(getWebFontSource("Noto Serif SC", "400", false));
	});

	it("returns null for unknown fonts", () => {
		expect(getWebFontSource("definitely-not-a-font", "400")).toBeNull();
	});

	it("defaults to weight 400 when not specified", () => {
		const roboto = getWebFont("Roboto");
		if (roboto) {
			const source = getWebFontSource("Roboto");
			expect(source).toBeTruthy();
		}
	});
});

describe("getPdfCjkFallbackFontFamily", () => {
	it("returns Noto Sans SC for sans-serif/standard PDF fonts", () => {
		expect(getPdfCjkFallbackFontFamily("Helvetica")).toBe("Noto Sans SC");
	});

	it("returns Noto Serif SC for serif fonts", () => {
		expect(getPdfCjkFallbackFontFamily("Times-Roman")).toBe("Noto Serif SC");
	});

	it("returns null when family already is the CJK fallback", () => {
		expect(getPdfCjkFallbackFontFamily("Noto Sans SC")).toBeNull();
	});
});

describe("getFallbackWebFontFamilies", () => {
	it("returns empty array for standard PDF fonts", () => {
		expect(getFallbackWebFontFamilies("Helvetica")).toEqual([]);
		expect(getFallbackWebFontFamilies("Courier")).toEqual([]);
		expect(getFallbackWebFontFamilies("Times-Roman")).toEqual([]);
	});

	it("returns the primary CJK web font for non-standard, non-CJK families", () => {
		// e.g. Roboto (sans-serif) → Noto Sans SC fallback
		const roboto = getWebFont("Roboto");
		if (roboto) {
			expect(getFallbackWebFontFamilies("Roboto")).toEqual(["Noto Sans SC"]);
		}
	});

	it("returns empty when family is already its primary CJK fallback", () => {
		expect(getFallbackWebFontFamilies("Noto Sans SC")).toEqual([]);
	});
});

describe("getLoadableWebFontWeights", () => {
	it("returns empty array for unknown fonts", () => {
		expect(getLoadableWebFontWeights("definitely-not-a-font", ["400"])).toEqual([]);
	});

	it("returns matching weights when preferred weights are available", () => {
		const roboto = getWebFont("Roboto");
		if (roboto) {
			const result = getLoadableWebFontWeights("Roboto", ["400", "700"]);
			for (const weight of result) {
				expect(roboto.weights).toContain(weight);
			}
		}
	});

	it("falls back to default weights when no preferences match", () => {
		const roboto = getWebFont("Roboto");
		if (roboto) {
			const result = getLoadableWebFontWeights("Roboto", ["999"]);
			expect(result.length).toBeGreaterThan(0);
		}
	});

	it("deduplicates preferred weights", () => {
		const roboto = getWebFont("Roboto");
		if (roboto?.weights.includes("400")) {
			const result = getLoadableWebFontWeights("Roboto", ["400", "400"]);
			expect(result).toEqual(["400"]);
		}
	});
});

describe("buildResumeFontFamily", () => {
	it("wraps the primary family in single quotes", () => {
		const result = buildResumeFontFamily("Roboto");
		expect(result.startsWith("'Roboto',")).toBe(true);
	});

	it("includes generic sans-serif fallback by default", () => {
		const result = buildResumeFontFamily("Roboto");
		expect(result.endsWith("sans-serif")).toBe(true);
	});

	it("uses serif fallback for serif-category fonts", () => {
		expect(buildResumeFontFamily("Times-Roman").endsWith("serif")).toBe(true);
	});

	it("includes system-ui and Segoe UI fallbacks", () => {
		const result = buildResumeFontFamily("Roboto");
		expect(result).toContain("system-ui");
		expect(result).toContain("Segoe UI");
	});

	it("includes CJK fallbacks for sans-serif fonts", () => {
		const result = buildResumeFontFamily("Roboto");
		expect(result).toContain("Noto Sans SC");
	});

	it("includes CJK serif fallbacks for serif fonts", () => {
		const result = buildResumeFontFamily("Times-Roman");
		expect(result).toContain("Noto Serif SC");
	});

	it("does not duplicate primary family in fallback list", () => {
		const result = buildResumeFontFamily("Noto Sans SC");
		// Family should appear once
		const occurrences = result.split("Noto Sans SC").length - 1;
		expect(occurrences).toBe(1);
	});

	it("escapes single quotes in family names", () => {
		const result = buildResumeFontFamily("Bob's Font");
		expect(result).toContain("Bob\\'s Font");
	});
});

describe("legacy font compatibility (#2989)", () => {
	it.each([
		["Times New Roman", "Tinos"],
		["Arial", "Arimo"],
		["Garamond", "EB Garamond"],
		["Calibri", "Carlito"],
		["Cambria", "Tinos"],
	])("aliases %s → %s", (legacy, target) => {
		expect(resolveLegacyFontAlias(legacy)).toBe(target);
	});

	it("returns null for non-aliased families", () => {
		expect(resolveLegacyFontAlias("Roboto")).toBeNull();
		expect(resolveLegacyFontAlias("IBM Plex Serif")).toBeNull();
		expect(resolveLegacyFontAlias("UnknownFont")).toBeNull();
	});

	it("every alias target is actually registered as a known font", () => {
		const aliasTargets = ["Tinos", "Arimo", "EB Garamond", "Carlito"];
		for (const target of aliasTargets) {
			expect(getFont(target), `alias target ${target} must be a known font`).toBeDefined();
		}
	});

	it("getFont resolves a legacy family to its alias target", () => {
		const tnr = getFont("Times New Roman");
		expect(tnr).toBeDefined();
		expect(tnr?.family).toBe("Tinos");
	});

	it("getFont still returns the direct font when both legacy and direct lookup would succeed", () => {
		// Sanity check: for non-aliased families the direct path is used.
		expect(getFont("Roboto")?.family).toBe("Roboto");
	});

	it("getFontDisplayName preserves the legacy family name (UI is not rewritten)", () => {
		// Users who picked "Times New Roman" should keep seeing that label
		// in the typography sidebar — the alias is a render-time concern only.
		expect(getFontDisplayName("Times New Roman")).toBe("Times New Roman");
	});
});
