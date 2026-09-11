// @vitest-environment happy-dom

import type { SectionTitleResolver } from "@reactive-resume/pdf/section-title";
import type { ExportVariant } from "./fixture";
import type { ExportMetrics } from "./metrics";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDocx } from "@reactive-resume/docx";
import { createResumePdfFile } from "@reactive-resume/pdf/server";
import { extractDocx, extractPdf } from "./extract";
import { createSyntheticCorpus } from "./fixture";
import { evaluateExport, tokenize } from "./metrics";

const outputDirectory = resolve(process.cwd(), "ats-export-evaluation/test-results");

const pdfTitleResolver: SectionTitleResolver = ({ defaultEnglishTitle, sectionId }) => defaultEnglishTitle ?? sectionId;
const docxTitleResolver = (sectionId: string) => sectionId;

type FormatResult = {
	format: "pdf" | "docx";
	metrics: ExportMetrics;
	links: readonly string[];
	paragraphs: number;
	pageCount?: number;
	fontCount?: number;
	numberingDefinitions?: number;
	numberedParagraphs?: number;
	hiddenLeaks: readonly string[];
};

type VariantResult = {
	variant: ExportVariant;
	formats: FormatResult[];
};

function hiddenLeaks(
	paragraphs: readonly string[],
	hiddenTokens: readonly string[],
	links: readonly string[] = [],
): string[] {
	const observed = [...paragraphs, ...links].flatMap(tokenize);
	return hiddenTokens.filter((value) => {
		const expected = tokenize(value);
		return observed.some((_, index) => expected.every((token, offset) => observed[index + offset] === token));
	});
}

async function measureVariant(variant: ExportVariant): Promise<VariantResult> {
	const corpus = createSyntheticCorpus(variant);
	const before = JSON.stringify(corpus.data);
	const pdfFile = await createResumePdfFile({
		data: corpus.data,
		filename: `${corpus.name}.pdf`,
		template: corpus.data.metadata.template,
		resolveSectionTitle: pdfTitleResolver,
	});
	const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());
	const pdf = await extractPdf(pdfBytes);
	await writeFile(join(outputDirectory, `${corpus.name}.pdf`), pdfBytes);

	const docxBlob = await buildDocx(corpus.data, docxTitleResolver);
	const docxBytes = new Uint8Array(await docxBlob.arrayBuffer());
	const docx = await extractDocx(docxBytes);
	await writeFile(join(outputDirectory, `${corpus.name}.docx`), docxBytes);

	expect(JSON.stringify(corpus.data)).toBe(before);

	return {
		variant,
		formats: [
			{
				format: "pdf",
				metrics: evaluateExport(corpus, { paragraphs: pdf.paragraphs, links: pdf.links }),
				links: pdf.links,
				paragraphs: pdf.paragraphs.length,
				pageCount: pdf.raw.pageCount,
				fontCount: pdf.raw.fonts.length,
				hiddenLeaks: hiddenLeaks(pdf.paragraphs, corpus.hiddenTokens, pdf.links),
			},
			{
				format: "docx",
				metrics: evaluateExport(corpus, {
					paragraphs: docx.paragraphs.map((paragraph) => paragraph.text),
					links: docx.links,
				}),
				links: docx.links,
				paragraphs: docx.paragraphs.length,
				numberingDefinitions: docx.numberingDefinitions,
				numberedParagraphs: docx.numberedParagraphs,
				hiddenLeaks: hiddenLeaks(
					docx.paragraphs.map((paragraph) => paragraph.text),
					corpus.hiddenTokens,
					docx.links,
				),
			},
		],
	};
}

function percentage(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}

function reportMarkdown(results: readonly VariantResult[]): string {
	const lines = [
		"# ATS export evaluation",
		"",
		"Synthetic extraction measurements only. These are not vendor parsing accuracy claims.",
		"",
		"Token rules: NFC normalization, case-folding with `en-US`, and Unicode letter/number runs; punctuation separates tokens. Recall numerator is distinct expected tokens recovered; duplicate counts report matching occurrences separately. Order uses adjacent distinct expected-token pairs; grouping uses same-group expected occurrence pairs and recovered in the same extracted paragraph/line. Link targets are normalized before expected/observed set comparison.",
		"",
		"Corpus: one deterministic resume fixture per layout variant, covering header/contact, two roles, free-text dates, education, skills, project, custom section, long lines, links, hidden item, and CJK text. Hidden item tokens are intentionally excluded from expected recall and checked for leakage.",
		"",
		"| Variant | Format | Recall raw | Order raw | Duplicate raw | Grouping raw | Pages/paragraphs | Links | Numbering defs/paragraphs | Hidden leaks |",
		"| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |",
	];
	for (const result of results) {
		for (const format of result.formats) {
			const m = format.metrics;
			lines.push(
				`| ${result.variant} | ${format.format} | ${m.recall.numerator}/${m.recall.denominator} (${percentage(m.recall.value)}) | ${m.order.numerator}/${m.order.denominator} (${percentage(m.order.value)}) | expected ${m.duplicates.expected}, observed ${m.duplicates.observed}, extra ${m.duplicates.extra} | ${m.grouping.numerator}/${m.grouping.denominator} (${percentage(m.grouping.value)}) | ${format.pageCount ?? "—"}/${format.paragraphs} | expected ${m.links.expected.length}, observed ${m.links.observed.length}, dropped ${m.links.missing.length}, changed/extra ${m.links.unexpected.length} | ${format.numberingDefinitions ?? "—"}/${format.numberedParagraphs ?? "—"} | ${format.hiddenLeaks.length === 0 ? "none" : format.hiddenLeaks.join(", ")} |`,
			);
		}
	}
	lines.push(
		"",
		"PDF font objects and raw link targets are recorded in adjacent JSON output.",
		"",
		"## Concrete loss/order evidence",
		"",
	);
	for (const result of results) {
		for (const format of result.formats) {
			const m = format.metrics;
			lines.push(
				`- ${result.variant} ${format.format}: missing tokens = ${m.missingTokens.length === 0 ? "none" : m.missingTokens.join(", ")}; out-of-order adjacent pairs = ${m.outOfOrderPairs.length === 0 ? "none" : m.outOfOrderPairs.map(([left, right]) => `${left} → ${right}`).join(", ")}; dropped links = ${m.links.missing.length === 0 ? "none" : m.links.missing.join(", ")}; changed/extra links = ${m.links.unexpected.length === 0 ? "none" : m.links.unexpected.join(", ")}.`,
			);
		}
	}
	lines.push("");
	return lines.join("\n");
}

describe("current unchanged PDF and DOCX exports", () => {
	it("detects hidden content emitted through link targets", () => {
		expect(hiddenLeaks(["Visible"], ["https://hidden.example"], ["https://hidden.example"])).toEqual([
			"https://hidden.example",
		]);
	});

	it("measures two-column and full-width synthetic corpus without mutating input", { timeout: 120_000 }, async () => {
		await mkdir(outputDirectory, { recursive: true });
		const results = [await measureVariant("two-column"), await measureVariant("full-width")];
		const report = {
			claimBoundary: "Local extraction metrics only; no vendor parsing accuracy claim.",
			tokenRules: "NFC, en-US case-folding, Unicode letter/number runs; punctuation separates tokens.",
			corpus: {
				variants: results.map((result) => result.variant),
				expectedDistinctTokens: createSyntheticCorpus("full-width")
					.tokens.flatMap((entry) => tokenize(entry.value))
					.filter((value, index, values) => values.indexOf(value) === index).length,
			},
			results,
		};
		await writeFile(join(outputDirectory, "ats-export-report.json"), `${JSON.stringify(report, null, 2)}\n`);
		await writeFile(join(outputDirectory, "ats-export-report.md"), reportMarkdown(results));

		for (const result of results) {
			const pdf = result.formats.find((format) => format.format === "pdf");
			const docx = result.formats.find((format) => format.format === "docx");
			if (!pdf || !docx) throw new Error(`Missing measured format for ${result.variant}`);
			expect(pdf.metrics.recall.denominator).toBeGreaterThan(20);
			expect(docx.metrics.recall.denominator).toBe(pdf.metrics.recall.denominator);
			expect(pdf.metrics.links.missing).toEqual([]);
			expect(pdf.metrics.links.unexpected).toEqual([]);
			// DOCX currently emits email but not telephone hyperlinks; retain this known loss in the measurement.
			expect(docx.metrics.links.missing).toEqual(["tel:+49 30 555 0142"]);
			expect(docx.metrics.links.unexpected).toEqual([]);
			expect(pdf.hiddenLeaks).toEqual([]);
			expect(docx.hiddenLeaks).toEqual([]);
			expect(pdf.fontCount).toBeGreaterThan(0);
			expect(docx.numberingDefinitions).toBeGreaterThan(0);
			expect(docx.numberedParagraphs).toBe(0);
		}
	});
});
