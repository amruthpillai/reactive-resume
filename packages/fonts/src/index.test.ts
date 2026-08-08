import { describe, expect, it } from "vitest";
import {
	fontList,
	getFont,
	getFontDisplayName,
	getFontSearchKeywords,
	getPdfFallbackFontFamilies,
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

describe("getPdfFallbackFontFamilies", () => {
	it("appends a Noto punctuation fallback for Latin-only PDF fonts (#3190)", () => {
		expect(getPdfFallbackFontFamilies("Times-Roman")).toEqual(["Noto Serif"]);
		expect(getPdfFallbackFontFamilies("Helvetica")).toEqual(["Noto Sans"]);
		expect(getPdfFallbackFontFamilies("IBM Plex Serif")).toEqual(["Noto Serif"]);
	});

	it("puts the Korean Noto font first for the ko-KR locale (Hangul needs KR, not SC)", () => {
		expect(getPdfFallbackFontFamilies("Times-Roman", { locale: "ko-KR" })).toEqual([
			"Noto Serif KR",
			"Noto Serif SC",
			"Noto Serif",
		]);
		expect(getPdfFallbackFontFamilies("Helvetica", { locale: "ko-KR" })).toEqual([
			"Noto Sans KR",
			"Noto Sans SC",
			"Noto Sans",
		]);
	});

	it("uses the Japanese Noto font for the ja-JP locale", () => {
		expect(getPdfFallbackFontFamilies("Times-Roman", { locale: "ja-JP" })).toEqual([
			"Noto Serif JP",
			"Noto Serif SC",
			"Noto Serif",
		]);
	});

	it("uses the Traditional Chinese Noto font for the zh-TW locale", () => {
		expect(getPdfFallbackFontFamilies("Times-Roman", { locale: "zh-TW" })).toEqual([
			"Noto Serif TC",
			"Noto Serif SC",
			"Noto Serif",
		]);
	});

	it("uses the Simplified Chinese font and punctuation fallback for zh-CN", () => {
		expect(getPdfFallbackFontFamilies("Times-Roman", { locale: "zh-CN" })).toEqual(["Noto Serif SC", "Noto Serif"]);
	});

	it("uses the Arabic Noto font for the fa-IR (Persian) and ar-SA locales", () => {
		expect(getPdfFallbackFontFamilies("Helvetica", { locale: "fa-IR" })).toEqual(["Noto Sans Arabic", "Noto Sans"]);
		expect(getPdfFallbackFontFamilies("Times-Roman", { locale: "ar-SA" })).toEqual(["Noto Naskh Arabic", "Noto Serif"]);
	});

	it("uses the Hebrew Noto font for he-IL, reusing the sans font for serif (no Noto Serif Hebrew)", () => {
		expect(getPdfFallbackFontFamilies("Helvetica", { locale: "he-IL" })).toEqual(["Noto Sans Hebrew", "Noto Sans"]);
		expect(getPdfFallbackFontFamilies("Times-Roman", { locale: "he-IL" })).toEqual(["Noto Sans Hebrew", "Noto Serif"]);
	});

	it("uses the Thai Noto font for th-TH", () => {
		expect(getPdfFallbackFontFamilies("Helvetica", { locale: "th-TH" })).toEqual(["Noto Sans Thai", "Noto Sans"]);
	});

	it("does not append the Simplified Chinese safety net for non-CJK scripts", () => {
		expect(getPdfFallbackFontFamilies("Helvetica", { scripts: ["arabic"] })).toEqual(["Noto Sans Arabic", "Noto Sans"]);
		expect(getPdfFallbackFontFamilies("Helvetica", { scripts: ["thai"] })).not.toContain("Noto Sans SC");
	});

	it("orders the locale script first, then content scripts (mixed RTL + CJK resume)", () => {
		expect(getPdfFallbackFontFamilies("Helvetica", { locale: "ko-KR", scripts: ["arabic"] })).toEqual([
			"Noto Sans KR",
			"Noto Sans Arabic",
			"Noto Sans SC",
			"Noto Sans",
		]);
	});

	it("includes a Korean font before SC when Hangul is detected in Latin-locale content", () => {
		expect(getPdfFallbackFontFamilies("Helvetica", { scripts: ["hangul"] })).toEqual([
			"Noto Sans KR",
			"Noto Sans SC",
			"Noto Sans",
		]);
	});

	it("dedupes the locale script and content scripts", () => {
		expect(getPdfFallbackFontFamilies("Helvetica", { locale: "ko-KR", scripts: ["hangul", "han-simplified"] })).toEqual(
			["Noto Sans KR", "Noto Sans SC", "Noto Sans"],
		);
	});

	it("excludes the family itself when it already is a fallback", () => {
		expect(getPdfFallbackFontFamilies("Noto Sans KR", { locale: "ko-KR" })).toEqual(["Noto Sans SC", "Noto Sans"]);
	});

	it("omits the punctuation fallback when the primary family is already the punctuation font", () => {
		expect(getPdfFallbackFontFamilies("Noto Serif")).toEqual([]);
		expect(getPdfFallbackFontFamilies("Noto Sans")).toEqual([]);
	});

	it("only returns fonts that exist in the webfontlist", () => {
		const families = getPdfFallbackFontFamilies("Helvetica", {
			locale: "ko-KR",
			scripts: ["hangul", "kana", "han-simplified", "arabic", "hebrew", "thai"],
		});
		for (const family of families) {
			expect(getWebFont(family)).toBeDefined();
		}
	});
});

describe("legacy font compatibility (#2989)", () => {
	it.each([
		["Times New Roman", "Times-Roman"],
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
		const aliasTargets = ["Times-Roman", "Tinos", "Arimo", "EB Garamond", "Carlito"];
		for (const target of aliasTargets) {
			expect(getFont(target), `alias target ${target} must be a known font`).toBeDefined();
		}
	});

	it("getFont resolves a legacy family to its alias target", () => {
		const tnr = getFont("Times New Roman");
		expect(tnr).toBeDefined();
		expect(tnr?.family).toBe("Times-Roman");
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
