import type { FontWeight } from "@reactive-resume/fonts";
import type { ResumeData, Typography } from "@reactive-resume/schema/resume/data";
import type { Locale } from "@reactive-resume/utils/locale";
import { Font } from "@react-pdf/renderer";
import { letters as cjkLetters } from "cjk-regex";
import {
	getFont,
	getPdfCjkFallbackFontFamily,
	getWebFontSource,
	isStandardPdfFontFamily,
	resolveLegacyFontAlias,
	sortFontWeights,
} from "@reactive-resume/fonts";
import { isCJKLocale } from "@reactive-resume/utils/locale";

type FontWeightRange = {
	lowest: number;
	highest: number;
};

const registeredFontVariants = new Set<string>();
const fallbackFontFamily = "IBM Plex Serif";
const cjkLetterRegex = cjkLetters().toRegExp();

// `fontFamily` is widened to `string | string[]` so react-pdf can do
// glyph-level font fallback for CJK characters (#2986).
export type PdfTypography = Omit<Typography, "body" | "heading"> & {
	body: Omit<Typography["body"], "fontFamily"> & { fontFamily: string | string[] };
	heading: Omit<Typography["heading"], "fontFamily"> & { fontFamily: string | string[] };
};

const getFontWeightRange = (fontWeights: string[]): FontWeightRange => {
	const numericWeights = fontWeights.map(Number).filter((weight) => Number.isFinite(weight));
	if (numericWeights.length === 0) return { lowest: 400, highest: 700 };

	const lowest = Math.min(...numericWeights);
	const rawHighest = Math.max(...numericWeights);
	const highest = rawHighest <= lowest ? 700 : rawHighest;

	return { lowest, highest };
};

const toFontWeight = (weight: number): FontWeight => {
	if (weight <= 100) return "100";
	if (weight <= 200) return "200";
	if (weight <= 300) return "300";
	if (weight <= 400) return "400";
	if (weight <= 500) return "500";
	if (weight <= 600) return "600";
	if (weight <= 700) return "700";
	if (weight <= 800) return "800";
	return "900";
};

// Resolves the user-stored family to the one we hand to Font.register:
// direct match → legacy alias (#2989) → IBM Plex Serif fallback.
const resolvePdfFontFamily = (family: string) => {
	if (getFont(family)) {
		const alias = resolveLegacyFontAlias(family);
		return alias ?? family;
	}
	return fallbackFontFamily;
};

const resolvePdfTypography = (typography: Typography): Typography => {
	const bodyFontFamily = resolvePdfFontFamily(typography.body.fontFamily);
	const headingFontFamily = resolvePdfFontFamily(typography.heading.fontFamily);
	const bodyFontWeights = sortFontWeights(typography.body.fontWeights);
	const headingFontWeights = sortFontWeights(typography.heading.fontWeights);

	return {
		...typography,
		body: { ...typography.body, fontFamily: bodyFontFamily, fontWeights: bodyFontWeights },
		heading: { ...typography.heading, fontFamily: headingFontFamily, fontWeights: headingFontWeights },
	};
};

const containsCjkLetters = (value: unknown): boolean => {
	if (typeof value === "string") return cjkLetterRegex.test(value);
	if (!value || typeof value !== "object") return false;
	if (Array.isArray(value)) return value.some(containsCjkLetters);

	return Object.values(value as Record<string, unknown>).some(containsCjkLetters);
};

export const resumeContentContainsCJK = (data: ResumeData): boolean => {
	return containsCjkLetters({
		basics: data.basics,
		summary: data.summary,
		sections: data.sections,
		customSections: data.customSections,
	});
};

export const registerFonts = (typography: Typography, locale: Locale, hasCjkContent = false): PdfTypography => {
	const needsCjkTextSupport = isCJKLocale(locale) || hasCjkContent;

	Font.registerHyphenationCallback((word) => {
		if (needsCjkTextSupport) {
			if (word === " ") return ["\u200C "];
			return [...word].flatMap((l) => [l, ""]);
		}

		return [word];
	});

	const pdfTypography = resolvePdfTypography(typography);
	const bodyFontFamily = pdfTypography.body.fontFamily;
	const headingFontFamily = pdfTypography.heading.fontFamily;
	const bodyRange = getFontWeightRange(pdfTypography.body.fontWeights);
	const headingRange = getFontWeightRange(pdfTypography.heading.fontWeights);

	const registerFont = (family: string, weight: number, italic = false) => {
		if (isStandardPdfFontFamily(family)) return;

		const normalizedWeight = toFontWeight(weight);
		const fontStyle = italic ? "italic" : "normal";
		const key = `${family}:${normalizedWeight}:${fontStyle}`;
		if (registeredFontVariants.has(key)) return;

		const source = getWebFontSource(family, normalizedWeight, italic);
		if (!source) return;

		Font.register({ family, src: source, fontWeight: Number(normalizedWeight), fontStyle });
		registeredFontVariants.add(key);
	};

	for (const italic of [false, true]) {
		registerFont(bodyFontFamily, bodyRange.lowest, italic);
		registerFont(bodyFontFamily, bodyRange.highest, italic);
		registerFont(headingFontFamily, headingRange.lowest, italic);
		registerFont(headingFontFamily, headingRange.highest, italic);
	}

	// Register a CJK fallback so textkit can substitute per-codepoint for
	// characters the primary font lacks (#2986). One weight per style is
	// enough — substitution is per-codepoint, not per-weight.
	const bodyCjkFallback = needsCjkTextSupport ? getPdfCjkFallbackFontFamily(bodyFontFamily) : null;
	const headingCjkFallback = needsCjkTextSupport ? getPdfCjkFallbackFontFamily(headingFontFamily) : null;

	if (bodyCjkFallback) {
		registerFont(bodyCjkFallback, 400, false);
		registerFont(bodyCjkFallback, 400, true);
	}

	if (headingCjkFallback && headingCjkFallback !== bodyCjkFallback) {
		registerFont(headingCjkFallback, 400, false);
		registerFont(headingCjkFallback, 400, true);
	}

	// Latin-only path: no fallback registered, return as-is.
	if (!bodyCjkFallback && !headingCjkFallback) {
		return pdfTypography as PdfTypography;
	}

	const bodyStack: string | string[] = bodyCjkFallback ? [bodyFontFamily, bodyCjkFallback] : bodyFontFamily;
	const headingStack: string | string[] = headingCjkFallback
		? [headingFontFamily, headingCjkFallback]
		: headingFontFamily;

	return {
		body: { ...pdfTypography.body, fontFamily: bodyStack },
		heading: { ...pdfTypography.heading, fontFamily: headingStack },
	};
};
