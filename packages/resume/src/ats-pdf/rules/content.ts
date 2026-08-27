import type { PdfCheck, PdfCheckContext } from "../types";
import { check, fail, failIf, hasNoText, pass, roundRatio, skip, snippet } from "./helpers";
import { THRESHOLDS } from "./thresholds";

/**
 * Content advice. Every rule in this file is a tip, and no tip moves any number in the report.
 *
 * These are human-preference items — how a reader reacts to a bullet, not whether software can
 * read it — and folding them into a score would be inventing precision that does not exist.
 */

function bulletBodies(context: PdfCheckContext): string[] {
	return context.doc.lines
		.map((line) => line.text.trim())
		.filter((text) => /^\s*(?:[•▪◦‣·∙●○■□▶▸*+]|[-–—]\s)/.test(text))
		.map((text) => text.replace(/^\s*(?:[•▪◦‣·∙●○■□▶▸*+]|[-–—])\s*/, "").trim())
		.filter(Boolean);
}

function guardBullets(context: PdfCheckContext) {
	if (hasNoText(context)) return skip("no-text");
	if (!context.semantics.quality.isEnglish) return skip("not-english");
	if (context.semantics.bulletLineCount < THRESHOLDS.content.minBulletsForContentAdvice) {
		return skip("insufficient-data");
	}
	return null;
}

export const contentChecks: readonly PdfCheck[] = [
	check("NO_QUANTIFIED_IMPACT", (context) => {
		const blocked = guardBullets(context);
		if (blocked) return blocked;

		const bullets = bulletBodies(context);
		if (bullets.length === 0) return skip("insufficient-data");

		const share = context.semantics.quantifiedBulletCount / bullets.length;
		return failIf(share < THRESHOLDS.content.quantifiedBulletShare, "NO_QUANTIFIED_IMPACT", {
			share: roundRatio(share),
		});
	}),

	check("WEAK_ACTION_VERBS", (context) => {
		const blocked = guardBullets(context);
		if (blocked) return blocked;

		const bullets = bulletBodies(context);
		if (bullets.length === 0) return skip("insufficient-data");

		const share = context.semantics.actionVerbBulletCount / bullets.length;
		return failIf(share < THRESHOLDS.content.actionVerbBulletShare, "WEAK_ACTION_VERBS", {
			share: roundRatio(share),
		});
	}),

	check("FIRST_PERSON_PRONOUNS", (context) => {
		if (hasNoText(context)) return skip("no-text");
		if (!context.semantics.quality.isEnglish) return skip("not-english");

		return failIf(
			context.semantics.firstPersonCount > THRESHOLDS.content.maxFirstPersonMentions,
			"FIRST_PERSON_PRONOUNS",
			{ count: context.semantics.firstPersonCount },
		);
	}),

	check("LONG_BULLETS", (context) => {
		const blocked = guardBullets(context);
		if (blocked) return blocked;

		return failIf(context.semantics.longBulletCount > 0, "LONG_BULLETS", {
			count: context.semantics.longBulletCount,
		});
	}),

	check("HIGH_PAGE_COUNT", (context) =>
		failIf(context.raw.pageCount > THRESHOLDS.pages.highPageCount, "HIGH_PAGE_COUNT", {
			pages: context.raw.pageCount,
		}),
	),

	check("EMPLOYMENT_GAP", (context) => {
		const gaps = context.semantics.employmentGapYears;
		const [gap] = gaps;
		if (!gap) return pass;

		return fail("EMPLOYMENT_GAP", { from: gap.from, to: gap.to, count: gaps.length });
	}),

	check("ALL_CAPS_RUNS", (context) => {
		if (hasNoText(context)) return skip("no-text");

		return failIf(context.semantics.allCapsLineCount > THRESHOLDS.content.allCapsLineCount, "ALL_CAPS_RUNS", {
			count: context.semantics.allCapsLineCount,
		});
	}),

	check("REPEATED_PHRASES", (context) => {
		const blocked = guardBullets(context);
		if (blocked) return blocked;

		const [repeated] = context.semantics.repeatedBulletOpenings;
		if (!repeated) return pass;

		return fail(
			"REPEATED_PHRASES",
			{ count: context.semantics.repeatedBulletOpenings.length },
			{
				snippet: snippet(repeated),
			},
		);
	}),
];
