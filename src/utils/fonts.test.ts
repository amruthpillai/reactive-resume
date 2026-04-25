import { describe, expect, it } from "vite-plus/test";

import {
  buildResumeFontFamily,
  fontList,
  getFallbackWebFontFamilies,
  getFontDisplayName,
  getLoadableWebFontWeights,
  localFontList,
} from "./fonts";

function splitFontStack(fontStack: string) {
  return fontStack.split(", ").map((font) => font.replace(/^'(.*)'$/, "$1"));
}

describe("fontList", () => {
  it("sorts font families alphabetically by display label", () => {
    const labels = fontList.map((font) => getFontDisplayName(font.family));
    const sortedLabels = [...labels].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    expect(labels).toEqual(sortedLabels);
  });
});

describe("localFontList", () => {
  it("includes common local Chinese font families", () => {
    expect(localFontList.some((font) => font.family === "PingFang SC")).toBe(true);
    expect(localFontList.some((font) => font.family === "Microsoft YaHei")).toBe(true);
    expect(localFontList.some((font) => font.family === "KaiTi")).toBe(true);
    expect(localFontList.some((font) => font.family === "FangSong")).toBe(true);
  });
});

describe("getFontDisplayName", () => {
  it("returns Chinese display labels for curated Chinese fonts", () => {
    expect(getFontDisplayName("Noto Sans SC")).toBe("思源黑体");
    expect(getFontDisplayName("Microsoft YaHei")).toBe("微软雅黑");
    expect(getFontDisplayName("ZCOOL QingKe HuangYou")).toBe("站酷庆科黄油体");
  });
});

describe("buildResumeFontFamily", () => {
  it("uses serif-oriented Chinese fallbacks for serif body fonts", () => {
    const fonts = splitFontStack(buildResumeFontFamily("IBM Plex Serif"));

    expect(fonts.slice(0, 5)).toEqual([
      "IBM Plex Serif",
      "Noto Serif SC",
      "Songti SC",
      "SimSun",
      "Source Han Serif SC",
    ]);
    expect(fonts.at(-1)).toBe("serif");
  });

  it("uses sans-oriented Chinese fallbacks for sans body fonts", () => {
    const fonts = splitFontStack(buildResumeFontFamily("Inter"));

    expect(fonts.slice(0, 5)).toEqual(["Inter", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei"]);
    expect(fonts.at(-1)).toBe("sans-serif");
  });
});

describe("getFallbackWebFontFamilies", () => {
  it("loads Noto Serif SC as the web fallback for serif fonts", () => {
    expect(getFallbackWebFontFamilies("IBM Plex Serif")).toEqual(["Noto Serif SC"]);
  });

  it("does not duplicate the selected web fallback font", () => {
    expect(getFallbackWebFontFamilies("Noto Sans SC")).toEqual([]);
  });
});

describe("getLoadableWebFontWeights", () => {
  it("returns matching weights when the webfont provides them", () => {
    expect(getLoadableWebFontWeights("Noto Sans SC", ["400", "700"])).toEqual(["400", "700"]);
  });

  it("falls back to the nearest supported weight when needed", () => {
    expect(getLoadableWebFontWeights("ZCOOL QingKe HuangYou", ["600", "700"])).toEqual(["400"]);
  });
});
