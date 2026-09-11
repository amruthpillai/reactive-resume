import { describe, expect, it } from "vitest";
import {
	PDF_ATS_RULE_CATALOG_V1,
	PDF_ATS_RULE_CODES,
	pdfRuleCap,
	pdfRuleCategory,
	pdfRuleDeduction,
	pdfRuleSeverity,
} from "./catalog";

const CATEGORIES = ["parseability", "layout", "sections", "contact", "dates", "content"];

describe("PDF_ATS_RULE_CATALOG_V1", () => {
	it("gives every rule a category, a meaning and an action", () => {
		for (const code of PDF_ATS_RULE_CODES) {
			const rule = PDF_ATS_RULE_CATALOG_V1[code];
			expect(CATEGORIES).toContain(rule.category);
			expect(rule.meaning.length).toBeGreaterThan(0);
			expect(rule.action.length).toBeGreaterThan(0);
		}
	});

	it("caps every blocker and only blockers", () => {
		for (const code of PDF_ATS_RULE_CODES) {
			const cap = pdfRuleCap(code);

			if (pdfRuleSeverity(code) === "blocker") {
				expect(cap).not.toBeNull();
				expect(cap).toBeGreaterThanOrEqual(0);
				expect(cap).toBeLessThan(100);
			} else {
				expect(cap).toBeNull();
			}
		}
	});

	it("gives every warning a deduction of 5, 10 or 15, and nothing else a deduction", () => {
		for (const code of PDF_ATS_RULE_CODES) {
			const deduction = pdfRuleDeduction(code);

			if (pdfRuleSeverity(code) === "warning") {
				expect([5, 10, 15]).toContain(deduction);
			} else {
				expect(deduction).toBe(0);
			}
		}
	});

	it("keeps the content category unscored", () => {
		const content = PDF_ATS_RULE_CODES.filter((code) => pdfRuleCategory(code) === "content");

		expect(content.length).toBeGreaterThan(0);
		for (const code of content) expect(pdfRuleSeverity(code)).toBe("tip");
	});

	it("puts at least one blocker in every scored category", () => {
		for (const category of CATEGORIES.filter((value) => value !== "content")) {
			const blockers = PDF_ATS_RULE_CODES.filter(
				(code) => pdfRuleCategory(code) === category && pdfRuleSeverity(code) === "blocker",
			);
			expect(blockers.length).toBeGreaterThan(0);
		}
	});

	it("uses screaming snake case codes", () => {
		for (const code of PDF_ATS_RULE_CODES) expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
	});
});
