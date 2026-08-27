import type { PageGeometry, PdfCheck, PdfCheckContext } from "../types";
import { check, fail, failIf, hasNoText, pass, roundRatio, skip, snippet } from "./helpers";
import { THRESHOLDS } from "./thresholds";

const BULLET_GLYPH_ALLOWLIST = new Set(["•", "-", "–", "—", "*", "▪", "◦", "‣", "·", "∙", "●", "○", "■", "□", "+"]);

type LayoutSignals = {
	/** A clear vertical band splits most pages, with real content on both sides. */
	gutterStrong: boolean;
	gutterSevere: boolean;
	/** Stored order and reading order disagree often enough to scramble extraction. */
	inversionStrong: boolean;
	inversionSevere: boolean;
	worstGutter: PageGeometry["gutter"];
	meanInversion: number;
};

/**
 * The two layout blockers only fire when *both* signals are strong.
 *
 * Either signal alone has a real false-positive rate — a wide right margin looks like a gutter,
 * and a decorative sidebar can invert a handful of pairs — and a false blocker caps the score at
 * 55, which destroys trust in the whole report. On its own, each signal is a warning instead.
 */
function layoutSignals(context: PdfCheckContext): LayoutSignals {
	const pages = context.doc.pages.filter((page) => page.lines.length > 0);

	const gutterPages = pages.filter(
		(page) =>
			page.gutter !== null &&
			page.gutter.coverage >= THRESHOLDS.layout.gutterCoverage &&
			page.gutter.splitRatio >= THRESHOLDS.layout.gutterSplitRatio,
	);

	const severeGutterPages = gutterPages.filter(
		(page) => (page.gutter?.coverage ?? 0) >= THRESHOLDS.layout.gutterSevereCoverage,
	);

	const share = pages.length === 0 ? 0 : gutterPages.length / pages.length;
	const severeShare = pages.length === 0 ? 0 : severeGutterPages.length / pages.length;

	const inversionPages = pages.filter((page) => page.lines.length >= THRESHOLDS.layout.minLinesForInversion);
	const meanInversion =
		inversionPages.length === 0
			? 0
			: inversionPages.reduce((total, page) => total + page.inversionRatio, 0) / inversionPages.length;

	const worstGutter =
		gutterPages.map((page) => page.gutter).sort((a, b) => (b?.coverage ?? 0) - (a?.coverage ?? 0))[0] ?? null;

	return {
		gutterStrong: share >= THRESHOLDS.layout.gutterPageShare,
		gutterSevere: severeShare >= THRESHOLDS.layout.gutterPageShare,
		inversionStrong: inversionPages.length > 0 && meanInversion >= THRESHOLDS.layout.inversionRatio,
		inversionSevere: inversionPages.length > 0 && meanInversion >= THRESHOLDS.layout.inversionSevereRatio,
		worstGutter,
		meanInversion,
	};
}

/** Lines whose spans sit in three or more aligned groups read as table rows, not sentences. */
function tableLikeLineCount(context: PdfCheckContext): number {
	return context.doc.lines.filter((line) => {
		if (line.spans.length < THRESHOLDS.layout.minTableColumns) return false;

		let groups = 1;
		for (let index = 1; index < line.spans.length; index += 1) {
			const previous = line.spans[index - 1];
			const span = line.spans[index];
			if (!previous || !span) continue;

			const gap = span.x - (previous.x + previous.width);
			if (gap > THRESHOLDS.layout.tableGapRatio * Math.max(span.fontSize, 1)) groups += 1;
		}

		return groups >= THRESHOLDS.layout.minTableColumns;
	}).length;
}

/** Median gap between consecutive baselines, used to spot lines packed tight enough to merge. */
function medianLineGap(page: PageGeometry): number | null {
	const sorted = [...page.lines].sort((a, b) => a.y - b.y);
	const gaps: number[] = [];

	for (let index = 1; index < sorted.length; index += 1) {
		const previous = sorted[index - 1];
		const line = sorted[index];
		if (!previous || !line) continue;

		const gap = line.y - previous.y;
		if (gap > 0.5) gaps.push(gap);
	}

	if (gaps.length === 0) return null;

	gaps.sort((a, b) => a - b);
	return gaps[Math.floor(gaps.length / 2)] ?? null;
}

export const layoutChecks: readonly PdfCheck[] = [
	check("MULTI_COLUMN_LAYOUT", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const signals = layoutSignals(context);
		if (!(signals.gutterStrong && signals.inversionStrong)) return pass;

		return fail("MULTI_COLUMN_LAYOUT", {
			inversion: roundRatio(signals.meanInversion),
			gutterWidth: Math.round(signals.worstGutter?.width ?? 0),
		});
	}),

	check("READING_ORDER_INVERSION", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const signals = layoutSignals(context);
		if (!(signals.gutterSevere && signals.inversionSevere)) return pass;

		return fail("READING_ORDER_INVERSION", { inversion: roundRatio(signals.meanInversion) });
	}),

	check("COLUMN_GUTTER", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const signals = layoutSignals(context);
		// The blocker already owns this case; reporting both would double-count one problem.
		if (signals.gutterStrong && signals.inversionStrong) return skip("not-applicable");

		return failIf(signals.gutterStrong, "COLUMN_GUTTER", {
			gutterWidth: Math.round(signals.worstGutter?.width ?? 0),
		});
	}),

	check("READING_ORDER_RISK", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const signals = layoutSignals(context);
		if (signals.gutterStrong && signals.inversionStrong) return skip("not-applicable");

		return failIf(signals.inversionStrong, "READING_ORDER_RISK", { inversion: roundRatio(signals.meanInversion) });
	}),

	check("TABLE_LIKE_LAYOUT", (context) => {
		if (hasNoText(context)) return skip("no-text");
		if (context.doc.lines.length === 0) return skip("insufficient-data");

		const count = tableLikeLineCount(context);
		const share = count / context.doc.lines.length;

		return failIf(
			count >= THRESHOLDS.layout.minTableLines && share >= THRESHOLDS.layout.tableLineShare,
			"TABLE_LIKE_LAYOUT",
			{ rows: count },
		);
	}),

	/**
	 * Scoped to contact details on purpose. A name at the very top of page one is where a name
	 * belongs, and flagging it would make the report wrong about almost every well-made resume.
	 * What actually costs a candidate is an email or phone number sitting in the strip some
	 * parsers treat as a running header or footer and discard.
	 */
	check("TEXT_IN_MARGIN_ZONE", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const { emails, phones } = context.semantics.contact;
		if (emails.length === 0 && phones.length === 0) return skip("not-applicable");

		const zone = THRESHOLDS.layout.marginZonePoints;
		const offender = context.doc.pages
			.flatMap((page) =>
				page.lines
					.filter((line) => line.y < zone || line.y + line.height > page.height - zone)
					.filter((line) => [...emails, ...phones].some((detail) => line.text.includes(detail)))
					.map((line) => ({ line, page })),
			)
			.at(0);

		if (!offender) return pass;

		return fail("TEXT_IN_MARGIN_ZONE", undefined, {
			page: offender.page.pageNumber,
			snippet: snippet(offender.line.text),
		});
	}),

	check("TIGHT_LINE_SPACING", (context) => {
		const modal = context.doc.modalFontSize;
		if (!modal || hasNoText(context)) return skip("insufficient-data");

		const gaps = context.doc.pages.map(medianLineGap).filter((gap): gap is number => gap !== null);
		if (gaps.length === 0) return skip("insufficient-data");

		const tightest = Math.min(...gaps);
		return failIf(tightest < modal * THRESHOLDS.layout.lineSpacingRatio, "TIGHT_LINE_SPACING", {
			spacing: Math.round(tightest * 10) / 10,
			fontSize: modal,
		});
	}),

	check("SMALL_BODY_TEXT", (context) => {
		const modal = context.doc.modalFontSize;
		if (!modal) return skip("insufficient-data");

		return failIf(modal < THRESHOLDS.layout.minBodyFontSize, "SMALL_BODY_TEXT", {
			fontSize: Math.round(modal * 10) / 10,
			minimum: THRESHOLDS.layout.minBodyFontSize,
		});
	}),

	check("MANY_DISTINCT_FONTS", (context) =>
		failIf(context.doc.distinctFontRefs > THRESHOLDS.layout.maxDistinctFonts, "MANY_DISTINCT_FONTS", {
			count: context.doc.distinctFontRefs,
		}),
	),

	/**
	 * Only the leading and top margins are measured. A run's reported width regularly overshoots
	 * its ink by a few points, so a trailing margin derived from extracted geometry can read as
	 * 2pt on a page that plainly has sixteen — and the last line of a page says nothing at all
	 * about the bottom margin. What can be measured honestly is measured; the rest is left to
	 * TEXT_OUTSIDE_PAGE, which does not need a margin to be right.
	 */
	check("NARROW_PAGE_MARGINS", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const measurable = (page: PageGeometry) => Math.min(page.margins.top, page.margins.left);

		const offender = context.doc.pages.find((page) => measurable(page) < THRESHOLDS.layout.marginPoints);
		if (!offender) return pass;

		return fail("NARROW_PAGE_MARGINS", { margin: Math.round(measurable(offender)) }, { page: offender.pageNumber });
	}),

	check("TEXT_OUTSIDE_PAGE", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const tolerance = THRESHOLDS.layout.outsidePageTolerance;
		const offender = context.doc.pages
			.flatMap((page) =>
				page.lines
					.filter(
						(line) =>
							line.x < -tolerance ||
							line.y < -tolerance ||
							line.x + line.width > page.width + tolerance ||
							line.y + line.height > page.height + tolerance,
					)
					.map((line) => ({ line, page })),
			)
			.at(0);

		if (!offender) return pass;

		return fail("TEXT_OUTSIDE_PAGE", undefined, {
			page: offender.page.pageNumber,
			snippet: snippet(offender.line.text),
		});
	}),

	check("NON_STANDARD_BULLET_GLYPHS", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const offenders = context.doc.lines
			.map((line) => line.text.trim())
			.filter((text) => /^[\u{E000}-\u{F8FF}\u{2700}-\u{27BF}\u{FFFD}]/u.test(text))
			.filter((text) => {
				const [glyph] = text;
				return glyph !== undefined && !BULLET_GLYPH_ALLOWLIST.has(glyph);
			});

		if (offenders.length === 0) return pass;

		return fail("NON_STANDARD_BULLET_GLYPHS", { count: offenders.length }, { snippet: snippet(offenders[0] ?? "") });
	}),

	check("REPEATED_HEADER_FOOTER", (context) => {
		if (context.doc.pages.length < 2) return skip("not-applicable");

		const [repeated] = context.semantics.repeatedRunningHeads;
		return failIf(repeated !== undefined, "REPEATED_HEADER_FOOTER", undefined, { snippet: snippet(repeated ?? "") });
	}),

	check("DENSE_PAGE", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const densest = context.doc.pages
			.map((page) => page.textAreaRatio)
			.reduce((worst, ratio) => Math.max(worst, ratio), 0);

		return failIf(densest >= THRESHOLDS.layout.densePageTextRatio, "DENSE_PAGE", { coverage: roundRatio(densest) });
	}),
];
