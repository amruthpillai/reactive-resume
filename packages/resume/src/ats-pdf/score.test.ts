import type { PdfRuleCode } from "./catalog";
import type { PdfCheckResult } from "./types";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { PDF_ATS_RULE_CODES, pdfRuleCap, pdfRuleCategory, pdfRuleSeverity } from "./catalog";
import { CATEGORY_WEIGHTS, SCORED_CATEGORIES, scoreChecks } from "./score";

const result = (code: PdfRuleCode, status: PdfCheckResult["status"]): PdfCheckResult => ({
	code,
	category: pdfRuleCategory(code),
	severity: pdfRuleSeverity(code),
	status,
	findings: [],
});

const allPassing = () => PDF_ATS_RULE_CODES.map((code) => result(code, "pass"));

const statusArbitrary = fc.constantFrom<PdfCheckResult["status"]>("pass", "skip", "fail");

const resultsArbitrary = fc
	.array(statusArbitrary, { minLength: PDF_ATS_RULE_CODES.length, maxLength: PDF_ATS_RULE_CODES.length })
	.map((statuses) => PDF_ATS_RULE_CODES.map((code, index) => result(code, statuses[index] ?? "pass")));

describe("scoreChecks", () => {
	it("weights the scored categories to exactly 100", () => {
		expect(SCORED_CATEGORIES.reduce((total, category) => total + CATEGORY_WEIGHTS[category], 0)).toBe(100);
	});

	it("gives a fully passing document 100", () => {
		const breakdown = scoreChecks(allPassing());

		expect(breakdown.score).toBe(100);
		expect(breakdown.cappedBy).toEqual([]);
	});

	it("holds the score to the tightest cap among the blockers that fired", () => {
		const breakdown = scoreChecks([
			...allPassing().filter((entry) => entry.code !== "NO_EMAIL" && entry.code !== "NO_TEXT_LAYER"),
			result("NO_EMAIL", "fail"),
			result("NO_TEXT_LAYER", "fail"),
		]);

		expect(breakdown.score).toBeLessThanOrEqual(pdfRuleCap("NO_TEXT_LAYER") ?? 0);
		expect(breakdown.cappedBy).toEqual(["NO_TEXT_LAYER", "NO_EMAIL"]);
	});

	it("charges a warning once, however many findings it produced", () => {
		const once = scoreChecks([
			...allPassing().filter((entry) => entry.code !== "NO_PHONE"),
			result("NO_PHONE", "fail"),
		]);

		expect(once.score).toBe(100 - Math.round((15 * CATEGORY_WEIGHTS.contact) / 100));
	});

	it("counts tips nowhere", () => {
		const withTips = allPassing().map((entry) =>
			entry.severity === "tip" ? { ...entry, status: "fail" as const } : entry,
		);
		const breakdown = scoreChecks(withTips);

		expect(breakdown.score).toBe(100);
		expect(breakdown.applicableChecks).toBe(
			PDF_ATS_RULE_CODES.filter((code) => pdfRuleSeverity(code) !== "tip").length,
		);
	});

	it("reports a denominator that adds up", () => {
		fc.assert(
			fc.property(resultsArbitrary, (results) => {
				const breakdown = scoreChecks(results);
				const scored = results.filter((entry) => entry.severity !== "tip");

				expect(breakdown.applicableChecks + breakdown.skippedChecks).toBe(scored.length);
				expect(breakdown.passedChecks).toBeLessThanOrEqual(breakdown.applicableChecks);
			}),
		);
	});

	it("always produces an integer inside 0–100", () => {
		fc.assert(
			fc.property(resultsArbitrary, (results) => {
				const { score } = scoreChecks(results);

				expect(Number.isInteger(score)).toBe(true);
				expect(score).toBeGreaterThanOrEqual(0);
				expect(score).toBeLessThanOrEqual(100);
			}),
		);
	});

	it("never rewards a document for failing one more check", () => {
		fc.assert(
			fc.property(resultsArbitrary, fc.nat(), (results, seed) => {
				const target = results[seed % results.length];
				if (!target || target.status === "fail") return;

				const worse = results.map((entry) =>
					entry.code === target.code ? { ...entry, status: "fail" as const } : entry,
				);

				expect(scoreChecks(worse).score).toBeLessThanOrEqual(scoreChecks(results).score);
			}),
		);
	});
});
