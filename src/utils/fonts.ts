import type { LocalFont, WebFont } from "@/components/typography/types";

import webFontListJSON from "@/components/typography/webfontlist.json";

type FontCategory = LocalFont["category"];
type FontWeight = LocalFont["weights"][number];
type FontRecord = LocalFont | WebFont;

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

const baseLocalFontList = [
  { type: "local", category: "sans-serif", family: "Arial", weights: ["400", "600", "700"] },
  { type: "local", category: "sans-serif", family: "Calibri", weights: ["400", "600", "700"] },
  { type: "local", category: "sans-serif", family: "Helvetica", weights: ["400", "600", "700"] },
  { type: "local", category: "sans-serif", family: "Tahoma", weights: ["400", "600", "700"] },
  { type: "local", category: "sans-serif", family: "Trebuchet MS", weights: ["400", "600", "700"] },
  { type: "local", category: "sans-serif", family: "Verdana", weights: ["400", "600", "700"] },
  { type: "local", category: "sans-serif", family: "PingFang SC", weights: ["300", "400", "500", "600", "700"] },
  { type: "local", category: "sans-serif", family: "Hiragino Sans GB", weights: ["300", "400", "500", "600", "700"] },
  { type: "local", category: "sans-serif", family: "Microsoft YaHei", weights: ["400", "700"] },
  { type: "local", category: "sans-serif", family: "SimHei", weights: ["400", "700"] },
  { type: "local", category: "sans-serif", family: "Source Han Sans SC", weights: ["400", "500", "700"] },
  { type: "local", category: "serif", family: "Bookman", weights: ["400", "600", "700"] },
  { type: "local", category: "serif", family: "Cambria", weights: ["400", "600", "700"] },
  { type: "local", category: "serif", family: "Garamond", weights: ["400", "600", "700"] },
  { type: "local", category: "serif", family: "Georgia", weights: ["400", "600", "700"] },
  { type: "local", category: "serif", family: "Palatino", weights: ["400", "600", "700"] },
  { type: "local", category: "serif", family: "Times New Roman", weights: ["400", "600", "700"] },
  { type: "local", category: "serif", family: "Songti SC", weights: ["400", "600", "700"] },
  { type: "local", category: "serif", family: "SimSun", weights: ["400", "700"] },
  { type: "local", category: "serif", family: "KaiTi", weights: ["400", "700"] },
  { type: "local", category: "serif", family: "FangSong", weights: ["400", "700"] },
  { type: "local", category: "serif", family: "Source Han Serif SC", weights: ["400", "600", "700"] },
] satisfies LocalFont[];

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

const webFontList = webFontListJSON as WebFont[];
export const webFontMap = new Map<string, WebFont>(webFontList.map((font) => [font.family, font]));

const webFontFamilies = new Set(webFontList.map((font) => font.family));
const chinesePrioritySet = new Set<string>(preferredChineseFontFamilies);

export const localFontList = baseLocalFontList.filter((font) => !webFontFamilies.has(font.family));

function orderFonts(fonts: FontRecord[]) {
  return [...fonts].sort((a, b) => {
    const aLabel = getFontDisplayName(a.family);
    const bLabel = getFontDisplayName(b.family);
    const labelComparison = aLabel.localeCompare(bLabel, undefined, { sensitivity: "base" });

    if (labelComparison !== 0) return labelComparison;

    return a.family.localeCompare(b.family, undefined, { sensitivity: "base" });
  });
}

export const fontList = orderFonts([...webFontList, ...localFontList]);

const fontMap = new Map(fontList.map((font) => [font.family, font]));

function unique<T>(items: T[]) {
  return items.filter((item, index) => items.indexOf(item) === index);
}

function toCSSFontFamilyToken(fontFamily: string) {
  if (genericFontFamilies.has(fontFamily)) return fontFamily;
  return `'${fontFamily.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

export function getFont(family: string) {
  return fontMap.get(family);
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

export function getFallbackWebFontFamilies(family: string) {
  const fallback = getPrimaryCjkWebFont(family);
  return fallback === family ? [] : [fallback];
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
