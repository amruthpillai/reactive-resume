import type { PdfCheck, PdfCheckContext } from "../types";
import { check, fail, failIf, hasNoText, pass, roundRatio, skip, snippet } from "./helpers";
import { STANDARD_PAGE_SIZES, THRESHOLDS } from "./thresholds";

const wordsPerPage = (context: PdfCheckContext) =>
	context.doc.pages.length === 0 ? 0 : context.doc.wordCount / context.doc.pages.length;

const charsOnPage = (context: PdfCheckContext, pageNumber: number) =>
	(context.doc.pages.find((page) => page.pageNumber === pageNumber)?.lines ?? []).reduce(
		(total, line) => total + line.text.trim().length,
		0,
	);

/** The share of pages that are mostly artwork with almost nothing selectable behind them. */
function scannedPageShare(context: PdfCheckContext): number | null {
	const withOperators = context.raw.pages.filter((page) => page.operators !== null);
	if (withOperators.length === 0) return null;

	const scanned = withOperators.filter(
		(page) =>
			(page.operators?.imageAreaRatio ?? 0) >= THRESHOLDS.images.scanCoverageRatio &&
			charsOnPage(context, page.pageNumber) < THRESHOLDS.images.scanMaxCharsPerPage,
	);

	return scanned.length / withOperators.length;
}

const sumOperators = (context: PdfCheckContext, field: "invisibleTextItems" | "whiteFillTextItems") =>
	context.raw.pages.reduce((total, page) => total + (page.operators?.[field] ?? 0), 0);

/**
 * A rotated or sheared text run. Pure translation and scaling keep b and c at zero; anything
 * else means the baseline is not horizontal.
 */
function hasRotatedText(context: PdfCheckContext): boolean {
	for (const page of context.raw.pages) {
		for (const item of page.items) {
			if (item.str.trim().length === 0) continue;
			const [a, b, c, d] = item.transform;
			const scale = Math.max(Math.abs(a), Math.abs(d), 1e-6);
			if (Math.abs(b) > 0.3 * scale || Math.abs(c) > 0.3 * scale) return true;
		}
	}

	return context.raw.fonts.some((font) => font.vertical === true);
}

function matchesStandardPageSize(width: number, height: number): boolean {
	const tolerance = THRESHOLDS.pages.sizeTolerance;

	return STANDARD_PAGE_SIZES.some(
		(size) =>
			(Math.abs(width - size.width) <= tolerance && Math.abs(height - size.height) <= tolerance) ||
			(Math.abs(width - size.height) <= tolerance && Math.abs(height - size.width) <= tolerance),
	);
}

export const parseabilityChecks: readonly PdfCheck[] = [
	check("FILE_TOO_LARGE", (context) => {
		const { sizeBytes } = context.raw.file;
		return failIf(sizeBytes > THRESHOLDS.file.maxBytes, "FILE_TOO_LARGE", {
			sizeMb: Math.round((sizeBytes / 1_000_000) * 10) / 10,
			limitMb: THRESHOLDS.file.maxBytes / 1_000_000,
		});
	}),

	check("LARGE_FILE_SIZE", (context) => {
		const { sizeBytes } = context.raw.file;
		if (sizeBytes > THRESHOLDS.file.maxBytes) return skip("not-applicable");

		return failIf(sizeBytes > THRESHOLDS.file.largeBytes, "LARGE_FILE_SIZE", {
			sizeMb: Math.round((sizeBytes / 1_000_000) * 10) / 10,
		});
	}),

	check("ENCRYPTED_PDF", (context) => failIf(context.raw.metadata.isEncrypted, "ENCRYPTED_PDF")),

	check("XFA_FORM", (context) => failIf(context.raw.metadata.isXfa, "XFA_FORM")),

	check("PDF_PORTFOLIO", (context) => failIf(context.raw.metadata.isCollection, "PDF_PORTFOLIO")),

	check("ACROFORM_FIELDS", (context) => failIf(context.raw.metadata.hasAcroForm, "ACROFORM_FIELDS")),

	check("NO_TEXT_LAYER", (context) =>
		failIf(context.doc.charCount < THRESHOLDS.text.minCharacters, "NO_TEXT_LAYER", {
			characters: context.doc.charCount,
		}),
	),

	check("IMAGE_ONLY_DOCUMENT", (context) => {
		const share = scannedPageShare(context);
		if (share === null) return skip("no-operators");

		return failIf(share >= THRESHOLDS.images.scanPageShare, "IMAGE_ONLY_DOCUMENT", {
			pages: roundRatio(share),
		});
	}),

	check("HIGH_IMAGE_COVERAGE", (context) => {
		const ratios = context.raw.pages
			.map((page) => page.operators?.imageAreaRatio)
			.filter((ratio): ratio is number => ratio !== undefined);

		if (ratios.length === 0) return skip("no-operators");

		const worst = Math.max(...ratios);
		return failIf(worst >= THRESHOLDS.images.highCoverageRatio, "HIGH_IMAGE_COVERAGE", {
			coverage: roundRatio(worst),
		});
	}),

	check("GARBLED_TEXT", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const { quality } = context.semantics;

		// The replacement character and the private-use area mean the same thing in every language.
		if (quality.replacementRatio >= THRESHOLDS.quality.replacementRatio) {
			return fail("GARBLED_TEXT", { reason: "replacement", ratio: roundRatio(quality.replacementRatio) });
		}
		if (quality.puaRatio >= THRESHOLDS.quality.privateUseRatio) {
			return fail("GARBLED_TEXT", { reason: "private-use", ratio: roundRatio(quality.puaRatio) });
		}

		// Everything below reads English word shapes, so it is only trustworthy on English text.
		if (!quality.isEnglish) return skip("not-english");

		const looksScrambled =
			quality.lexiconHitRatio < THRESHOLDS.quality.garbledLexiconRatio &&
			quality.vowellessRatio > THRESHOLDS.quality.garbledVowellessRatio;

		return failIf(looksScrambled, "GARBLED_TEXT", {
			reason: "unreadable",
			ratio: roundRatio(quality.vowellessRatio),
		});
	}),

	check("REPLACEMENT_CHARACTERS", (context) => {
		if (hasNoText(context)) return skip("no-text");
		const { replacementRatio } = context.semantics.quality;

		return failIf(
			replacementRatio > 0 && replacementRatio < THRESHOLDS.quality.replacementRatio,
			"REPLACEMENT_CHARACTERS",
			{
				ratio: roundRatio(replacementRatio),
			},
		);
	}),

	check("PRIVATE_USE_CHARACTERS", (context) => {
		if (hasNoText(context)) return skip("no-text");
		const { puaRatio } = context.semantics.quality;

		return failIf(puaRatio > 0 && puaRatio < THRESHOLDS.quality.privateUseRatio, "PRIVATE_USE_CHARACTERS", {
			ratio: roundRatio(puaRatio),
		});
	}),

	check("LIGATURE_CHARACTERS", (context) => {
		if (hasNoText(context)) return skip("no-text");

		return failIf(context.semantics.quality.ligatureCount >= THRESHOLDS.quality.ligatureCount, "LIGATURE_CHARACTERS", {
			count: context.semantics.quality.ligatureCount,
		});
	}),

	check("TYPE3_FONT", (context) => {
		if (context.raw.fonts.length === 0) return skip("insufficient-data");

		const offender = context.raw.fonts.find((font) => font.isType3);
		return offender ? fail("TYPE3_FONT", { font: offender.name ?? offender.ref }) : pass;
	}),

	check("INVALID_EMBEDDED_FONT", (context) => {
		if (context.raw.fonts.length === 0) return skip("insufficient-data");

		const offender = context.raw.fonts.find((font) => font.isInvalid);
		return offender ? fail("INVALID_EMBEDDED_FONT", { font: offender.name ?? offender.ref }) : pass;
	}),

	check("NON_EMBEDDED_FONTS", (context) => {
		if (context.raw.fonts.length === 0) return skip("insufficient-data");

		const missing = context.raw.fonts.filter((font) => font.missingFile);
		return failIf(missing.length > 0, "NON_EMBEDDED_FONTS", {
			count: missing.length,
			font: missing[0]?.name ?? missing[0]?.ref ?? "",
		});
	}),

	check("INVISIBLE_TEXT", (context) => {
		if (!context.raw.operatorsAvailable) return skip("no-operators");

		const count = sumOperators(context, "invisibleTextItems");
		return failIf(count > 0, "INVISIBLE_TEXT", { count });
	}),

	check("WHITE_TEXT", (context) => {
		if (!context.raw.operatorsAvailable) return skip("no-operators");

		const count = sumOperators(context, "whiteFillTextItems");
		return failIf(count > 0, "WHITE_TEXT", { count });
	}),

	check("LOW_TEXT_DENSITY", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const perPage = wordsPerPage(context);
		return failIf(perPage < THRESHOLDS.text.lowDensityWordsPerPage, "LOW_TEXT_DENSITY", {
			wordsPerPage: Math.round(perPage),
		});
	}),

	check("LOST_WORD_SPACING", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const { runOnTokenRatio } = context.semantics.quality;
		if (runOnTokenRatio < THRESHOLDS.quality.runOnTokenRatio) return pass;

		const example = context.doc.fullText.split(/\s+/).find((token) => token.length >= 25);
		return fail(
			"LOST_WORD_SPACING",
			{ ratio: roundRatio(runOnTokenRatio) },
			example ? { snippet: snippet(example) } : undefined,
		);
	}),

	check("SPLIT_CHARACTER_SPACING", (context) => {
		const itemCount = context.raw.pages.reduce((total, page) => total + page.items.length, 0);
		if (itemCount < THRESHOLDS.quality.minItemsForSpacingSignal) return skip("insufficient-data");

		return failIf(
			context.semantics.quality.singleCharItemRatio >= THRESHOLDS.quality.singleCharItemRatio,
			"SPLIT_CHARACTER_SPACING",
			{ ratio: roundRatio(context.semantics.quality.singleCharItemRatio) },
		);
	}),

	check("VERTICAL_TEXT", (context) => {
		if (hasNoText(context)) return skip("no-text");
		return failIf(hasRotatedText(context), "VERTICAL_TEXT");
	}),

	check("ROTATED_PAGES", (context) => {
		const [offender, ...rest] = context.raw.pages.filter((page) => page.rotation % 360 !== 0);
		if (!offender) return pass;

		return fail("ROTATED_PAGES", { pages: rest.length + 1 }, { page: offender.pageNumber });
	}),

	check("NON_STANDARD_PAGE_SIZE", (context) => {
		if (context.raw.pages.length === 0) return skip("insufficient-data");

		const offender = context.raw.pages.find((page) => !matchesStandardPageSize(page.width, page.height));
		if (!offender) return pass;

		return fail(
			"NON_STANDARD_PAGE_SIZE",
			{ width: Math.round(offender.width), height: Math.round(offender.height) },
			{ page: offender.pageNumber },
		);
	}),

	check("UNTAGGED_PDF", (context) => failIf(!context.raw.metadata.isTagged, "UNTAGGED_PDF")),

	check("MISSING_DOCUMENT_LANGUAGE", (context) => failIf(!context.raw.metadata.language, "MISSING_DOCUMENT_LANGUAGE")),

	check("TRUNCATED_ANALYSIS", (context) =>
		failIf(context.raw.truncated, "TRUNCATED_ANALYSIS", {
			analyzed: context.raw.pages.length,
			total: context.raw.pageCount,
		}),
	),
];
