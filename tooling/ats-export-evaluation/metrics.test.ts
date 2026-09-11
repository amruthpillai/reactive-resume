import { describe, expect, it } from "vitest";
import { createSyntheticCorpus } from "./fixture";
import { evaluateExport, tokenize } from "./metrics";

const corpus = {
	name: "synthetic",
	tokens: [
		{ value: "Alpha", group: "experience" },
		{ value: "Bravo", group: "experience" },
		{ value: "Charlie", group: "education" },
	] as const,
};

describe("evaluateExport", () => {
	it("counts distinct recall, order, duplicate, and grouping losses from raw tokens", () => {
		const result = evaluateExport(corpus, {
			paragraphs: ["Alpha Bravo Bravo", "Charlie"],
			links: [],
		});

		expect(result.recall).toEqual({ numerator: 3, denominator: 3, value: 1 });
		expect(result.order).toEqual({ numerator: 2, denominator: 2, value: 1 });
		expect(result.duplicates).toEqual({ expected: 3, observed: 4, extra: 1 });
		expect(result.missingTokens).toEqual([]);
		expect(result.outOfOrderPairs).toEqual([]);
		expect(result.grouping).toEqual({ numerator: 1, denominator: 1, value: 1 });
	});

	it("keeps repeated expected values tied to their authored groups", () => {
		const repeatedCorpus = {
			name: "repeated",
			tokens: [
				{ value: "Alpha Bravo", group: "first" },
				{ value: "Alpha Charlie", group: "second" },
			],
		} as const;

		const result = evaluateExport(repeatedCorpus, {
			paragraphs: ["Alpha Bravo", "Alpha Charlie"],
			links: [],
		});

		expect(result.grouping).toEqual({ numerator: 2, denominator: 2, value: 1 });
	});

	it("reports dropped and changed link targets", () => {
		const result = evaluateExport(
			{
				name: "links",
				tokens: [],
				links: ["HTTPS://Example.com/profile/", "https://example.com/jobs"],
			},
			{ paragraphs: [], links: ["https://example.com/profile", "https://changed.example/jobs"] },
		);

		expect(result.links).toEqual({
			expected: ["https://example.com/profile", "https://example.com/jobs"],
			observed: ["https://example.com/profile", "https://changed.example/jobs"],
			missing: ["https://example.com/jobs"],
			unexpected: ["https://changed.example/jobs"],
		});
	});

	it.each(["orbit.example/profile", "northstar.example/jobs", "u-tokyo.example/program"] as const)(
		"fails when visible website label %s drops while link targets remain correct",
		(label) => {
			const corpus = createSyntheticCorpus("full-width");
			const paragraphs = corpus.tokens.map((entry) => entry.value);
			const baseline = evaluateExport(corpus, { paragraphs, links: corpus.links });
			const dropped = evaluateExport(corpus, {
				paragraphs: paragraphs.map((paragraph) => (paragraph === label ? "" : paragraph)),
				links: corpus.links,
			});

			expect(baseline.links.missing).toEqual([]);
			expect(baseline.links.unexpected).toEqual([]);
			expect(dropped.links).toEqual(baseline.links);
			expect(dropped.duplicates.observed).toBe(baseline.duplicates.observed - tokenize(label).length);
		},
	);

	it("detects a dropped token and an inverted pair", () => {
		const result = evaluateExport(corpus, {
			paragraphs: ["Bravo", "Alpha"],
			links: [],
		});

		expect(result.recall).toEqual({ numerator: 2, denominator: 3, value: 2 / 3 });
		expect(result.order).toEqual({ numerator: 0, denominator: 2, value: 0 });
		expect(result.duplicates).toEqual({ expected: 3, observed: 2, extra: 0 });
		expect(result.missingTokens).toEqual(["charlie"]);
		expect(result.outOfOrderPairs).toEqual([
			["alpha", "bravo"],
			["bravo", "charlie"],
		]);
	});
});
