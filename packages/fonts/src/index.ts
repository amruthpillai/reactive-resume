import { unique } from "@reactive-resume/utils/field";
import webFontListJSON from "./webfontlist.json";

export type FontCategory = "display" | "handwriting" | "monospace" | "serif" | "sans-serif";
export type FontWeight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
export type FontFileWeight = FontWeight | `${FontWeight}italic`;

export type StandardFont = {
	type: "standard";
	category: FontCategory;
	family: string;
	weights: FontWeight[];
};

export type WebFont = {
	type: "web";
	category: FontCategory;
	family: string;
	weights: FontWeight[];
	preview: string;
	files: Record<FontFileWeight, string>;
};

export type FontRecord = StandardFont | WebFont;

const preferredChineseFontFamilies = [
	"Noto Sans SC",
	"Noto Serif SC",
	"PingFang SC",
	"Microsoft YaHei",
	"Source Han Sans SC",
	"Source Han Serif SC",
	"Songti SC",
	"SimSun",
	"SimHei",
	"KaiTi",
	"FangSong",
	"ZCOOL QingKe HuangYou",
] as const;

const standardPdfFontList = [
	{ type: "standard", category: "sans-serif", family: "Helvetica", weights: ["400", "700"] },
	{ type: "standard", category: "monospace", family: "Courier", weights: ["400", "700"] },
	{ type: "standard", category: "serif", family: "Times-Roman", weights: ["400", "700"] },
] satisfies StandardFont[];

const fontDisplayNames: Partial<Record<string, string>> = {
	FangSong: "仿宋",
	"Hiragino Sans GB": "冬青黑体简体中文",
	KaiTi: "楷体",
	"Microsoft YaHei": "微软雅黑",
	"Noto Sans SC": "思源黑体",
	"Noto Sans TC": "思源黑体（繁中）",
	"Noto Serif SC": "思源宋体",
	"Noto Serif TC": "思源宋体（繁中）",
	"PingFang SC": "苹方",
	SimHei: "黑体",
	SimSun: "宋体",
	"Songti SC": "华文宋体",
	"Source Han Sans SC": "思源黑体（本地）",
	"Source Han Serif SC": "思源宋体（本地）",
	"ZCOOL QingKe HuangYou": "站酷庆科黄油体",
};

const resumeCjkSansFontFallbacks = [
	"Noto Sans SC",
	"PingFang SC",
	"Hiragino Sans GB",
	"Microsoft YaHei",
	"SimHei",
	"Source Han Sans SC",
	"WenQuanYi Micro Hei",
] as const;

const resumeCjkSerifFontFallbacks = [
	"Noto Serif SC",
	"Songti SC",
	"SimSun",
	"Source Han Serif SC",
	"KaiTi",
	"FangSong",
] as const;

const genericFontFamilies = new Set([
	"-apple-system",
	"BlinkMacSystemFont",
	"cursive",
	"emoji",
	"fantasy",
	"fangsong",
	"math",
	"monospace",
	"sans-serif",
	"serif",
	"system-ui",
	"ui-monospace",
	"ui-rounded",
	"ui-sans-serif",
	"ui-serif",
]);

export const webFontList = webFontListJSON as WebFont[];
export const webFontMap = new Map<string, WebFont>(webFontList.map((font) => [font.family, font]));
export const standardFontList = standardPdfFontList.filter((font) => !webFontMap.has(font.family));

const fontMap = new Map<string, FontRecord>();
const chinesePrioritySet = new Set<string>(preferredChineseFontFamilies);

function orderFonts(fonts: FontRecord[]) {
	return [...fonts].sort((a, b) => {
		return a.family.localeCompare(b.family, undefined, { sensitivity: "base" });
	});
}

function toCSSFontFamilyToken(fontFamily: string) {
	if (genericFontFamilies.has(fontFamily)) return fontFamily;
	return `'${fontFamily.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

export const fontList = orderFonts([...standardFontList, ...webFontList]);

for (const font of fontList) {
	fontMap.set(font.family, font);
}

// Compatibility aliases for fonts that v5.0.x resolved via the browser
// (Arial, Times New Roman, ...) but that aren't registered with
// @react-pdf/renderer in v5.1+. Targets are metric-compatible web fonts
// already shipped in webfontlist (#2989).
const legacyFontAliases: Record<string, string> = {
	Arial: "Arimo",
	Cambria: "Tinos",
	Calibri: "Carlito",
	Garamond: "EB Garamond",
	"Times New Roman": "Tinos",
};

export function resolveLegacyFontAlias(family: string): string | null {
	return legacyFontAliases[family] ?? null;
}

export function getFont(family: string) {
	const direct = fontMap.get(family);
	if (direct) return direct;

	const alias = legacyFontAliases[family];
	return alias ? fontMap.get(alias) : undefined;
}

function getFontCategory(family: string): FontCategory | null {
	return getFont(family)?.category ?? null;
}

export function getFontDisplayName(family: string) {
	return fontDisplayNames[family] ?? family;
}

export function getFontSearchKeywords(family: string) {
	return unique(
		[family, fontDisplayNames[family], chinesePrioritySet.has(family) ? "中文" : undefined].filter(
			(keyword): keyword is string => Boolean(keyword),
		),
	);
}

function getCjkFallbacksByCategory(category: FontCategory | null) {
	return category === "serif" ? resumeCjkSerifFontFallbacks : resumeCjkSansFontFallbacks;
}

function getPrimaryCjkWebFont(family: string) {
	const category = getFontCategory(family);
	return category === "serif" ? "Noto Serif SC" : "Noto Sans SC";
}

export function isStandardPdfFontFamily(family: string) {
	return standardFontList.some((font) => font.family === family);
}

export function getWebFont(family: string) {
	return webFontMap.get(family);
}

export function getWebFontSource(family: string, weight: FontWeight = "400", italic = false) {
	const webFont = getWebFont(family);
	if (!webFont) return null;

	const key = `${weight}${italic ? "italic" : ""}` as FontFileWeight;
	return webFont.files[key] ?? (italic ? webFont.files[weight] : undefined) ?? webFont.preview;
}

export function sortFontWeights<T extends string>(fontWeights: T[]): T[] {
	return [...fontWeights].sort((a, b) => Number(a) - Number(b));
}

export function getFallbackWebFontFamilies(family: string) {
	if (isStandardPdfFontFamily(family)) return [];

	const fallback = getPrimaryCjkWebFont(family);
	return fallback === family ? [] : [fallback];
}

/**
 * Returns a CJK web font (Noto Sans/Serif SC) to register as a glyph-level
 * fallback for PDF rendering, or `null` when no fallback is needed
 * (primary already is the fallback).
 *
 * Source Han Sans/Serif SC covers all CJK-Unified ideographs, so a single
 * font handles Simplified/Traditional Chinese, Japanese kanji and Korean
 * hanja — the locales reporting #2986 / #3006.
 */
export function getPdfCjkFallbackFontFamily(family: string): string | null {
	const fallback = getPrimaryCjkWebFont(family);
	if (fallback === family) return null;
	if (!getWebFont(fallback)) return null;

	return fallback;
}

export function getLoadableWebFontWeights(family: string, preferredWeights: string[]) {
	const font = webFontMap.get(family);
	if (!font) return [];

	const availableWeights = new Set<FontWeight>(font.weights);
	const matchingWeights = unique(preferredWeights).filter((weight): weight is FontWeight =>
		availableWeights.has(weight as FontWeight),
	);

	if (matchingWeights.length > 0) return matchingWeights;

	const defaultWeights = ["400", "500", "600", "700"].filter((weight): weight is FontWeight =>
		availableWeights.has(weight as FontWeight),
	);
	if (defaultWeights.length > 0) return defaultWeights.slice(0, 2);

	return font.weights.slice(0, 2);
}

export function buildResumeFontFamily(fontFamily: string) {
	const category = getFontCategory(fontFamily);
	const genericFallback = category === "serif" ? "serif" : "sans-serif";

	return unique([
		fontFamily,
		...getCjkFallbacksByCategory(category),
		"system-ui",
		"-apple-system",
		"BlinkMacSystemFont",
		"Segoe UI",
		genericFallback,
	])
		.map(toCSSFontFamilyToken)
		.join(", ");
}
