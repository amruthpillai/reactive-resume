import { describe, expect, it } from "vitest";
import { matchJobDescription } from "./match";
import { buildNgrams } from "./ngrams";
import { stemFreeText } from "./stem";
import { splitIntoRuns, tokenize } from "./tokenize";

const JOB_DESCRIPTION = `
Senior Platform Engineer

About the team
We are a fast-paced, dynamic company and an equal opportunity employer.

Requirements
- Strong TypeScript and Node.js experience
- Hands-on Kubernetes and Terraform in production
- CI/CD pipelines, ideally GitHub Actions
- Experience designing distributed systems
- Familiarity with PostgreSQL
`;

describe("tokenize", () => {
	it("keeps technical surface forms intact", () => {
		expect(tokenize("c++ and c# with .net")).toEqual(["c++", "and", "c#", "with", ".net"]);
		expect(tokenize("node.js, ci/cd, back-end")).toEqual(["node.js", "ci/cd", "back-end"]);
	});

	it("does not glue a sentence-ending full stop onto the next word", () => {
		expect(tokenize("shipped react. built node services")).toEqual(["shipped", "react", "built", "node", "services"]);
	});

	it("splits phrases at the punctuation a phrase never crosses", () => {
		expect(splitIntoRuns("React. Node\n• Kubernetes, Terraform")).toEqual([
			"React.",
			"Node",
			"Kubernetes",
			"Terraform",
		]);
	});
});

describe("buildNgrams", () => {
	it("drops phrases made entirely of stopwords", () => {
		expect(buildNgrams(["with", "the", "team"])).toEqual([]);
	});

	it("keeps a phrase once, trimmed of its leading and trailing filler", () => {
		expect(buildNgrams(["experience", "with", "distributed", "systems"])).toContain("distributed systems");
		expect(buildNgrams(["experience", "with", "distributed", "systems"])).not.toContain(
			"experience with distributed systems",
		);
	});
});

describe("stemFreeText", () => {
	it("stems free vocabulary", () => {
		expect(stemFreeText("managing")).toBe(stemFreeText("managed"));
	});

	it("never touches a skill surface form", () => {
		expect(stemFreeText("kubernetes")).toBe("kubernetes");
		expect(stemFreeText("node.js")).toBe("node.js");
		expect(stemFreeText("c++")).toBe("c++");
	});
});

describe("matchJobDescription", () => {
	it("reports coverage rather than a score", () => {
		const report = matchJobDescription({
			jobDescription: JOB_DESCRIPTION,
			resumeText: "Built distributed systems in TypeScript on Kubernetes with Terraform and PostgreSQL.",
		});

		expect(report.matchedCount).toBeGreaterThan(0);
		expect(report.totalTerms).toBeGreaterThanOrEqual(report.matchedCount);
		expect(report.weightedCoverage).toBeGreaterThan(0);
		expect(report.weightedCoverage).toBeLessThanOrEqual(1);
		expect(report).not.toHaveProperty("score");
	});

	it("matches a posting's abbreviation against the resume's spelled-out form", () => {
		const report = matchJobDescription({
			jobDescription: "Requirements\n- Strong K8s experience\n- Solid JS fundamentals",
			resumeText: "Ran Kubernetes clusters and wrote JavaScript services.",
		});

		expect(report.missingTerms).not.toContain("kubernetes");
		expect(report.missingTerms).not.toContain("javascript");
	});

	it("lists what the resume never mentions", () => {
		const report = matchJobDescription({
			jobDescription: JOB_DESCRIPTION,
			resumeText: "Wrote TypeScript services and ran PostgreSQL.",
		});

		expect(report.missingTerms).toContain("terraform");
	});

	it("ignores the boilerplate every posting shares", () => {
		const report = matchJobDescription({
			jobDescription: "We are an equal opportunity employer offering a competitive salary and benefits package.",
			resumeText: "Engineer.",
		});

		expect(report.terms).toEqual([]);
		expect(report.weightedCoverage).toBe(0);
	});

	it("flags a term the resume repeats far past what the posting asks for", () => {
		const report = matchJobDescription({
			jobDescription: "Requirements\n- Kubernetes experience",
			resumeText: "kubernetes ".repeat(12),
		});

		expect(report.stuffedTerms).toContain("kubernetes");
	});

	it("does not accuse a specialist of stuffing their own field", () => {
		// A game developer writes "Unity" in every role; the posting writes it once. That is a
		// resume doing its job, not someone gaming a search.
		const resumeText = [
			"Senior Game Developer at Cascade Studios, building gameplay systems in Unity for console and PC.",
			"Led the Unity migration for two shipped titles and mentored four engineers through it.",
			"Built custom Unity editor tooling that cut level iteration time by forty percent.",
			"Earlier: Unity gameplay programmer on a mobile title with two million installs.",
			"Wrote the studio's internal Unity style guide and ran its onboarding sessions.",
		].join(" ");

		const report = matchJobDescription({
			jobDescription: "Requirements\n- Strong Unity experience",
			resumeText,
		});

		expect(report.missingTerms).not.toContain("unity");
		expect(report.stuffedTerms).toEqual([]);
	});

	it("drops recruiting filler from a phrase rather than reporting it as its own gap", () => {
		const report = matchJobDescription({
			jobDescription: "Requirements\n- Deep C# knowledge and strong C++ expertise",
			resumeText: "Shipped systems in C# and C++.",
		});

		expect(report.terms.map((term) => term.term)).not.toContain("c# knowledge");
		expect(report.missingTerms).toEqual([]);
	});

	it("passes the hidden-text warning through without attributing it to a term", () => {
		const report = matchJobDescription({
			jobDescription: JOB_DESCRIPTION,
			resumeText: "TypeScript.",
			documentHasHiddenText: true,
		});

		expect(report.documentHasHiddenText).toBe(true);
		for (const term of report.terms) expect(term).not.toHaveProperty("matchedInvisibly");
	});

	it("is deterministic", () => {
		const options = { jobDescription: JOB_DESCRIPTION, resumeText: "TypeScript, Kubernetes, Terraform." };
		expect(matchJobDescription(options)).toEqual(matchJobDescription(options));
	});

	it("returns an empty report for an empty posting", () => {
		const report = matchJobDescription({ jobDescription: "", resumeText: "Anything." });

		expect(report.totalTerms).toBe(0);
		expect(report.weightedCoverage).toBe(0);
	});
});
