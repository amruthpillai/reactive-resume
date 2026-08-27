import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildExtractedDocument } from "./extract";
import { A4, healthyResume, healthyResumeLines, makeRawExtraction, twoColumnResume } from "./test-fixtures";

describe("buildExtractedDocument", () => {
	it("clusters spans on the same baseline into one line, in left-to-right order", () => {
		const raw = makeRawExtraction({
			lines: [
				{ text: "Principal Engineer", x: 56, y: 60 },
				{ text: "Jan 2020 - Present", x: 400, y: 60 },
			],
		});

		const [line] = buildExtractedDocument(raw).lines;

		expect(line?.text).toBe("Principal Engineer Jan 2020 - Present");
		expect(line?.spans).toHaveLength(2);
	});

	it("flips PDF bottom-left coordinates into top-left points", () => {
		const raw = makeRawExtraction({ lines: [{ text: "Ada Lovelace", x: 56, y: 60, size: 20 }] });
		const [line] = buildExtractedDocument(raw).lines;

		expect(line?.x).toBeCloseTo(56, 5);
		expect(line?.y).toBeCloseTo(60, 5);
		expect(line?.height).toBeCloseTo(20, 5);
	});

	it("reads a two-column page as inverted, and a single-column page as threaded", () => {
		const columns = buildExtractedDocument(twoColumnResume());
		const single = buildExtractedDocument(healthyResume());

		expect(columns.pages[0]?.inversionRatio).toBeGreaterThan(0.4);
		expect(single.pages[0]?.inversionRatio).toBeLessThan(0.05);
	});

	it("finds the gutter of a two-column page and none on a single-column one", () => {
		const gutter = buildExtractedDocument(twoColumnResume()).pages[0]?.gutter;

		expect(gutter?.coverage).toBeGreaterThan(0.9);
		expect(gutter?.splitRatio).toBeGreaterThan(0.25);
		expect(buildExtractedDocument(healthyResume()).pages[0]?.gutter).toBeNull();
	});

	it("reports the modal body size, not the largest heading", () => {
		expect(buildExtractedDocument(healthyResume()).modalFontSize).toBe(10);
	});

	it("separates pages with a blank line in the extracted text", () => {
		const raw = makeRawExtraction({
			lines: [
				{ text: "Page one line", page: 1 },
				{ text: "Page two line", page: 2 },
			],
			pageCount: 2,
		});

		expect(buildExtractedDocument(raw).fullText).toBe("Page one line\n\nPage two line");
	});

	it("survives a page whose box is degenerate", () => {
		const raw = makeRawExtraction({ lines: ["Ada Lovelace"], pages: { 1: { width: 0, height: 0 } } });
		const document = buildExtractedDocument(raw);

		expect(document.pages[0]?.textAreaRatio).toBe(0);
		expect(Number.isFinite(document.pages[0]?.inversionRatio ?? Number.NaN)).toBe(true);
	});

	/**
	 * Geometry must not depend on the order the reader happened to emit items in. Stream order is
	 * measured separately, as inversion; everything else has to be a pure function of the page.
	 */
	it("derives the same lines however the content stream was ordered", () => {
		const baseline = buildExtractedDocument(healthyResume());
		const indices = [...healthyResumeLines.keys()];

		fc.assert(
			fc.property(fc.shuffledSubarray(indices, { minLength: indices.length }), (permutation) => {
				const shuffled = healthyResume({
					streamOrder: (lines) => permutation.map((index) => lines[index]).filter((line) => line !== undefined),
				});

				const document = buildExtractedDocument(shuffled);

				expect(document.fullText).toBe(baseline.fullText);
				expect(document.lines.map((line) => [line.x, line.y, line.width, line.height])).toEqual(
					baseline.lines.map((line) => [line.x, line.y, line.width, line.height]),
				);
			}),
			{ numRuns: 25 },
		);
	});

	it("keeps every line inside the page box for a well-formed export", () => {
		const document = buildExtractedDocument(healthyResume());

		for (const line of document.lines) {
			expect(line.x).toBeGreaterThanOrEqual(0);
			expect(line.y).toBeGreaterThanOrEqual(0);
			expect(line.x + line.width).toBeLessThanOrEqual(A4.width);
		}
	});
});
