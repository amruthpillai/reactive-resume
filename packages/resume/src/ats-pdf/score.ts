import type { PdfRuleCode } from "./catalog";
import type { PdfCategory, PdfCategoryScore, PdfCheckResult } from "./types";
import { pdfRuleCap, pdfRuleDeduction } from "./catalog";

/** Contribution of each scored category to the overall score. Sums to 100 by construction. */
export const CATEGORY_WEIGHTS = {
	parseability: 35,
	layout: 20,
	sections: 20,
	contact: 15,
	dates: 10,
} as const satisfies Record<Exclude<PdfCategory, "content">, number>;

export const SCORED_CATEGORIES = Object.keys(CATEGORY_WEIGHTS) as readonly Exclude<PdfCategory, "content">[];

/** What a blocker costs its own category, on top of the ceiling it puts on the overall score. */
const BLOCKER_CATEGORY_PENALTY = 60;

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export type ScoreBreakdown = {
	/** 0–100 integer. Integers only: a parse check has no business reporting 82.4. */
	score: number;
	categories: PdfCategoryScore[];
	cappedBy: PdfRuleCode[];
	applicableChecks: number;
	passedChecks: number;
	skippedChecks: number;
};

/**
 * Turns check results into a score.
 *
 * Two rules make the number defensible. Warnings are charged once per code however many times
 * they fired, so a resume with nine malformed dates is not punished nine times for one habit.
 * And blockers put a hard ceiling on the total: a file with no text layer cannot average its way
 * to a respectable score on the strength of its margins.
 *
 * Tips are counted nowhere. They are reported beside the score, never inside it.
 */
export function scoreChecks(results: readonly PdfCheckResult[]): ScoreBreakdown {
	const scored = results.filter((result) => result.severity !== "tip");

	const categories = SCORED_CATEGORIES.map((category) => {
		const inCategory = scored.filter((result) => result.category === category);
		const failed = inCategory.filter((result) => result.status === "fail");

		const penalty = failed.reduce(
			(total, result) =>
				total + (result.severity === "blocker" ? BLOCKER_CATEGORY_PENALTY : pdfRuleDeduction(result.code)),
			0,
		);

		return {
			category,
			score: clamp(100 - penalty),
			weight: CATEGORY_WEIGHTS[category],
			applicableChecks: inCategory.filter((result) => result.status !== "skip").length,
			passedChecks: inCategory.filter((result) => result.status === "pass").length,
			skippedChecks: inCategory.filter((result) => result.status === "skip").length,
		} satisfies PdfCategoryScore;
	});

	const weighted = categories.reduce((total, entry) => total + entry.score * entry.weight, 0) / 100;

	const caps = scored
		.filter((result) => result.status === "fail" && result.severity === "blocker")
		.map((result) => ({ code: result.code, cap: pdfRuleCap(result.code) ?? 100 }))
		.sort((a, b) => a.cap - b.cap || a.code.localeCompare(b.code));

	const ceiling = caps.length === 0 ? 100 : Math.min(...caps.map((entry) => entry.cap));

	return {
		score: clamp(Math.min(Math.round(weighted), ceiling)),
		categories,
		cappedBy: caps.map((entry) => entry.code),
		applicableChecks: scored.filter((result) => result.status !== "skip").length,
		passedChecks: scored.filter((result) => result.status === "pass").length,
		skippedChecks: scored.filter((result) => result.status === "skip").length,
	};
}
