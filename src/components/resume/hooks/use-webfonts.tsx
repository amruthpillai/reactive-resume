import type z from "zod";

import { useEffect } from "react";
import { useIsMounted } from "usehooks-ts";

import type { typographySchema } from "@/schema/resume/data";

import { getFallbackWebFontFamilies, getLoadableWebFontWeights, webFontMap } from "@/utils/fonts";

export function useWebfonts(typography: z.infer<typeof typographySchema>) {
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!isMounted()) return;

    const body = document.body;
    if (body) body.setAttribute("data-wf-loaded", "false");

    async function loadFont(family: string, weights: string[]) {
      const font = webFontMap.get(family);
      if (!font) return;

      type FontUrl = { url: string; weight: string; style: "italic" | "normal" };

      const fontUrls: FontUrl[] = [];

      for (const weight of weights) {
        for (const [fileWeight, url] of Object.entries(font.files)) {
          if (weight === fileWeight) {
            fontUrls.push({ url, weight, style: "normal" });
          }
          if (fileWeight === `${weight}italic`) {
            fontUrls.push({ url, weight, style: "italic" });
          }
        }
      }

      for (const { url, weight, style } of fontUrls) {
        const fontFace = new FontFace(family, `url("${url}")`, { style, weight, display: "swap" });
        if (!document.fonts.has(fontFace)) {
          try {
            document.fonts.add(await fontFace.load());
          } catch {
            // Fail open for printer/headless environments where remote fonts may be blocked by CSP.
          }
        }
      }
    }

    const bodyTypography = typography.body;
    const headingTypography = typography.heading;
    const fontWeightsByFamily = new Map<string, Set<string>>();

    const addFontLoadPlan = (family: string, weights: string[]) => {
      const loadableWeights = getLoadableWebFontWeights(family, weights);
      if (loadableWeights.length === 0) return;

      const existingWeights = fontWeightsByFamily.get(family) ?? new Set<string>();

      for (const weight of loadableWeights) {
        existingWeights.add(weight);
      }

      fontWeightsByFamily.set(family, existingWeights);
    };

    addFontLoadPlan(bodyTypography.fontFamily, bodyTypography.fontWeights);
    addFontLoadPlan(headingTypography.fontFamily, headingTypography.fontWeights);

    for (const fallbackFamily of getFallbackWebFontFamilies(bodyTypography.fontFamily)) {
      addFontLoadPlan(fallbackFamily, bodyTypography.fontWeights);
    }

    for (const fallbackFamily of getFallbackWebFontFamilies(headingTypography.fontFamily)) {
      addFontLoadPlan(fallbackFamily, headingTypography.fontWeights);
    }

    void Promise.all(
      Array.from(fontWeightsByFamily.entries()).map(([family, weights]) => loadFont(family, Array.from(weights))),
    ).then(() => {
      if (isMounted() && body) body.setAttribute("data-wf-loaded", "true");
    });

    return () => {
      if (isMounted()) {
        if (body) body.removeAttribute("data-wf-loaded");
      }
    };
  }, [isMounted, typography]);
}
