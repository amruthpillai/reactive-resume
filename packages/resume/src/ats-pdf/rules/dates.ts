import type { DateToken, PdfCheck, PdfCheckContext } from "../types";
import { check, fail, failIf, hasNoText, pass, skip, snippet } from "./helpers";
import { THRESHOLDS } from "./thresholds";

const parsedRanges = (context: PdfCheckContext): DateToken[] =>
	context.semantics.dates.filter((token) => token.kind === "range" && token.parsed);

export const dateChecks: readonly PdfCheck[] = [
	check("NO_DATES_FOUND", (context) => {
		if (hasNoText(context)) return skip("no-text");

		return failIf(context.semantics.dates.length === 0, "NO_DATES_FOUND");
	}),

	check("FEW_DATES", (context) => {
		if (hasNoText(context)) return skip("no-text");
		if (context.semantics.dates.length === 0) return skip("not-applicable");
		// A one-page fragment legitimately carries one date; a full resume does not.
		if (context.doc.wordCount < THRESHOLDS.text.shortDocumentWords) return skip("insufficient-data");

		const ranges = parsedRanges(context);
		return failIf(ranges.length < THRESHOLDS.dates.minRanges, "FEW_DATES", { found: ranges.length });
	}),

	check("UNPARSEABLE_DATE_RANGE", (context) => {
		if (hasNoText(context)) return skip("no-text");

		const [offender] = context.semantics.unparseableRanges;
		if (!offender) return pass;

		return fail(
			"UNPARSEABLE_DATE_RANGE",
			{ count: context.semantics.unparseableRanges.length },
			{ snippet: snippet(offender) },
		);
	}),

	check("REVERSED_DATE_RANGE", (context) => {
		if (context.semantics.dates.length === 0) return skip("not-applicable");

		const offender = context.semantics.dates.find((token) => token.reversed);
		if (!offender) return pass;

		return fail("REVERSED_DATE_RANGE", undefined, { snippet: snippet(offender.raw), page: offender.page });
	}),

	check("FUTURE_DATED_ENTRY", (context) => {
		if (context.semantics.dates.length === 0) return skip("not-applicable");

		const offender = context.semantics.dates.find((token) => token.future);
		if (!offender) return pass;

		return fail("FUTURE_DATED_ENTRY", undefined, { snippet: snippet(offender.raw), page: offender.page });
	}),

	check("MIXED_DATE_FORMATS", (context) => {
		const ranges = parsedRanges(context);
		if (ranges.length < THRESHOLDS.dates.minRanges) return skip("insufficient-data");

		const counts = new Map<DateToken["shape"], number>();
		for (const token of ranges) counts.set(token.shape, (counts.get(token.shape) ?? 0) + 1);

		const established = [...counts.entries()].filter(([, count]) => count >= THRESHOLDS.dates.minShapeOccurrences);

		return failIf(established.length >= THRESHOLDS.dates.minMixedShapes, "MIXED_DATE_FORMATS", {
			formats: established.length,
		});
	}),

	check("NO_CURRENT_ROLE_MARKER", (context) => {
		const ranges = parsedRanges(context);
		if (ranges.length === 0) return skip("not-applicable");

		return failIf(!ranges.some((token) => token.ongoing), "NO_CURRENT_ROLE_MARKER");
	}),

	check("AMBIGUOUS_NUMERIC_DATE", (context) => {
		const [offender] = context.semantics.ambiguousNumericDates;
		if (!offender) return pass;

		return fail(
			"AMBIGUOUS_NUMERIC_DATE",
			{ count: context.semantics.ambiguousNumericDates.length },
			{ snippet: snippet(offender) },
		);
	}),
];
