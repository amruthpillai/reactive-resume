import type { Locale, Script } from "@reactive-resume/utils/locale";
import { unique } from "@reactive-resume/utils/field";
import { getLocaleScript, isCjkScript } from "@reactive-resume/utils/locale";
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

// Per-script Noto web font, split by serif/sans category. These match the
// actual writing system: Hangul lives only in the KR fonts, Kana only in JP,
// Arabic glyphs only in the Arabic fonts, etc. — so a Latin or Simplified-
// Chinese font cannot render them and produces tofu. Where Noto ships no serif
// variant for a script (Hebrew, Thai), the serif slot reuses the sans font so
// serif resumes still render real glyphs instead of nothing. All entries are
// present in webfontlist.json.
const scriptFonts: Record<Script, { serif: string; sansSerif: string }> = {
	hangul: { serif: "Noto Serif KR", sansSerif: "Noto Sans KR" },
	kana: { serif: "Noto Serif JP", sansSerif: "Noto Sans JP" },
	"han-traditional": { serif: "Noto Serif TC", sansSerif: "Noto Sans TC" },
	"han-simplified": { serif: "Noto Serif SC", sansSerif: "Noto Sans SC" },
	arabic: { serif: "Noto Naskh Arabic", sansSerif: "Noto Sans Arabic" },
	hebrew: { serif: "Noto Sans Hebrew", sansSerif: "Noto Sans Hebrew" },
	thai: { serif: "Noto Sans Thai", sansSerif: "Noto Sans Thai" },
	armenian: { serif: "Noto Serif Armenian", sansSerif: "Noto Sans Armenian" },
};

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
	"Times New Roman": "Times-Roman",
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

function getScriptFont(script: Script, category: FontCategory | null) {
	const variants = scriptFonts[script];
	return category === "serif" ? variants.serif : variants.sansSerif;
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
 * Returns an ordered stack of Noto web fonts to register as glyph-level
 * fallbacks for PDF rendering. react-pdf resolves the font per-codepoint
 * left-to-right across the stack, so listing one font per writing system lets
 * a single resume mix Latin with Hangul, Kana, Han, Arabic, Hebrew or Thai.
 *
 * Ordering: the locale's primary script first (the dominant language), then
 * any other scripts actually detected in the content. When the stack contains
 * a CJK script, a Simplified Chinese entry is appended as a safety net for
 * stray CJK-Unified ideographs (preserving prior behavior); non-CJK scripts
 * get no such net. The result is deduped, has the primary family removed, and
 * only keeps fonts that exist in the webfontlist.
 */
export function getPdfFallbackFontFamilies(
	family: string,
	options: { locale?: Locale; scripts?: Iterable<Script> } = {},
): string[] {
	const category = getFontCategory(family);

	const ordered: Script[] = [];
	const localeScript = getLocaleScript(options.locale);
	if (localeScript) ordered.push(localeScript);
	if (options.scripts) ordered.push(...options.scripts);
	if (ordered.some(isCjkScript)) ordered.push("han-simplified");

	return unique(ordered.map((script) => getScriptFont(script, category)))
		.filter((candidate) => candidate !== family)
		.filter((candidate) => Boolean(getWebFont(candidate)));
}

/**
 * Back-compat single-font resolver kept for the public `@reactive-resume/fonts`
 * surface: returns the Simplified Chinese fallback (Noto Sans/Serif SC) for a
 * family, or `null` when the family already is that fallback.
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
