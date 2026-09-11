import { describe, expect, it } from "vitest";
import { PDF_ATS_RULE_CODES, pdfRuleSeverity } from "./catalog";
import { analyzePdfResume } from "./index";
import { healthyResume, makeRawExtraction, scannedResume } from "./test-fixtures";

const NOW = new Date("2024-06-15T00:00:00Z");

describe("analyzePdfResume", () => {
	it("scores a clean single-column resume at the top of the range", () => {
		const report = analyzePdfResume(healthyResume(), { now: NOW });

		expect(report.score).toBe(100);
		expect(report.findings).toEqual([]);
		expect(report.cappedBy).toEqual([]);
	});

	it("returns an integer score, never a decimal", () => {
		for (const raw of [healthyResume(), scannedResume(), makeRawExtraction({ lines: ["short"] })]) {
			expect(Number.isInteger(analyzePdfResume(raw, { now: NOW }).score)).toBe(true);
		}
	});

	it("states a denominator that adds up, counting tips nowhere", () => {
		const report = analyzePdfResume(healthyResume(), { now: NOW });
		const scoredCodes = PDF_ATS_RULE_CODES.filter((code) => pdfRuleSeverity(code) !== "tip");

		expect(report.applicableChecks + report.skippedChecks).toBe(scoredCodes.length);
		expect(report.passedChecks).toBeLessThanOrEqual(report.applicableChecks);
		expect(report.checks).toHaveLength(PDF_ATS_RULE_CODES.length);
	});

	it("reports why each skipped check could not run", () => {
		const report = analyzePdfResume(scannedResume(), { now: NOW });

		for (const check of report.checks.filter((entry) => entry.status === "skip")) {
			expect(check.skipReason).toBeDefined();
		}
	});

	it("separates unscored tips from scored findings", () => {
		const report = analyzePdfResume(healthyResume({ file: { sizeBytes: 1_500_000 } }), { now: NOW });

		expect(report.tips.map((tip) => tip.code)).toContain("LARGE_FILE_SIZE");
		expect(report.findings.map((finding) => finding.code)).not.toContain("LARGE_FILE_SIZE");
		expect(report.findings.every((finding) => finding.severity !== "tip")).toBe(true);
	});

	it("orders findings by severity", () => {
		const report = analyzePdfResume(scannedResume(), { now: NOW });
		const severities = report.findings.map((finding) => finding.severity);

		expect(severities).toEqual([...severities].sort((a, b) => (a === b ? 0 : a === "blocker" ? -1 : 1)));
	});

	it("weights every scored category and reports its own denominator", () => {
		const report = analyzePdfResume(healthyResume(), { now: NOW });

		expect(report.categories.map((entry) => entry.category)).toEqual([
			"parseability",
			"layout",
			"sections",
			"contact",
			"dates",
		]);
		expect(report.categories.reduce((total, entry) => total + entry.weight, 0)).toBe(100);
	});

	it("attaches evidence a reader can check against the file", () => {
		const report = analyzePdfResume(
			makeRawExtraction({
				lines: ["Ada Lovelace analytical engineer at the engines", { text: "ada@example.com", y: 4 }],
			}),
			{ now: NOW },
		);

		const marginFinding = report.findings.find((finding) => finding.code === "TEXT_IN_MARGIN_ZONE");
		expect(marginFinding?.evidence?.snippet).toBe("ada@example.com");
		expect(marginFinding?.evidence?.page).toBe(1);
	});

	it("keeps job-description coverage out of the score", () => {
		const jobDescription = "Requirements\n- Strong Kubernetes and Terraform experience";

		const withJd = analyzePdfResume(healthyResume(), { now: NOW, jobDescription });
		const withoutJd = analyzePdfResume(healthyResume(), { now: NOW });

		expect(withJd.score).toBe(withoutJd.score);
		expect(withJd.jd?.missingTerms).toContain("kubernetes");
		expect(withoutJd.jd).toBeNull();
	});

	it("ignores a blank job description", () => {
		expect(analyzePdfResume(healthyResume(), { now: NOW, jobDescription: "   " }).jd).toBeNull();
	});

	it("is deterministic given the same bytes and the same clock", () => {
		expect(analyzePdfResume(healthyResume(), { now: NOW })).toEqual(analyzePdfResume(healthyResume(), { now: NOW }));
	});

	it("serialises to JSON without loss", () => {
		const report = analyzePdfResume(healthyResume(), { now: NOW, jobDescription: "Kubernetes" });
		expect(JSON.parse(JSON.stringify(report))).toEqual(report);
	});

	it("keeps going when a page is malformed rather than failing the whole report", () => {
		const broken = makeRawExtraction({ lines: ["Ada Lovelace analytical engineer at the engines"] });
		// A page the reader described with nonsense geometry.
		const mutated = {
			...broken,
			pages: broken.pages.map((page) => ({ ...page, width: Number.NaN, height: Number.NaN })),
		};

		const report = analyzePdfResume(mutated, { now: NOW });

		expect(Number.isInteger(report.score)).toBe(true);
		expect(report.checks).toHaveLength(PDF_ATS_RULE_CODES.length);
	});
});
