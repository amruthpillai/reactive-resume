import { describe, expect, it } from "vitest";
import { buildExtractedDocument } from "../extract";
import { makeRawExtraction } from "../test-fixtures";
import { detectHeadings } from "./sections";

const textsOf = (raw: Parameters<typeof buildExtractedDocument>[0]) =>
	detectHeadings(buildExtractedDocument(raw)).map((heading) => heading.text);

describe("detectHeadings", () => {
	/**
	 * Regression for #3642: a section split into columns puts every cell's bold lead-in on the
	 * same baseline. Each piece passes the heading cues — but a heading that only *looks* the
	 * part (font, size, case, no known section name) and shares its baseline with identical
	 * twins is a grid cell, not a section title. The parser view used to keep just the last of
	 * them and drop the row's text, so only the right-most column's content appeared.
	 */
	it("does not read a row of multi-column cells as headings", () => {
		const raw = makeRawExtraction({
			lines: [
				{ text: "Ada Lovelace", size: 18 },
				"ada@example.com · +44 20 7946 0100 · London, UK",
				{ text: "Skills", x: 56, y: 200, fontRef: "g_d0_f2" },
				{ text: "Unity Engine", x: 56, y: 230, fontRef: "g_d0_f2" },
				{ text: "Unreal Engine", x: 250, y: 230, fontRef: "g_d0_f2" },
				{ text: "Programming Languages", x: 440, y: 230, fontRef: "g_d0_f2" },
				{ text: "C#, Editor Tools, Performance Profiling", x: 56, y: 248 },
				{ text: "C++, Blueprints, UE5 Features", x: 250, y: 248 },
				{ text: "C#, C++, Python, HLSL/GLSL", x: 440, y: 248 },
			],
		});

		const headings = textsOf(raw);
		expect(headings).toContain("Skills");
		expect(headings).not.toContain("Unity Engine");
		expect(headings).not.toContain("Unreal Engine");
		expect(headings).not.toContain("Programming Languages");
	});

	/**
	 * The reason `columnSegments` exists: a bronzor-style title set in its own narrow column
	 * shares a baseline with the section's first line of content, and the content is not a
	 * heading candidate — so the title stands alone and still counts, even when its words are
	 * not a name the alias table knows.
	 */
	it("still finds a lone distinguished heading beside its content", () => {
		const raw = makeRawExtraction({
			lines: [
				{ text: "Ada Lovelace", size: 18 },
				"ada@example.com · +44 20 7946 0100 · London, UK",
				{ text: "My Craft", x: 33, y: 200, fontRef: "g_d0_f2" },
				{ text: "Analytical engineer who builds calculation systems.", x: 201, y: 200 },
				{ text: "Ten years designing programmes for mechanical computers.", x: 201, y: 216 },
			],
		});

		expect(textsOf(raw)).toContain("My Craft");
	});

	/**
	 * Two real section titles can share a baseline where a page's columns begin together
	 * (a sidebar's first section beside the main column's first). Pieces naming a known
	 * section are trusted however many share the line — only styling guesses need solitude.
	 */
	it("keeps recognised section titles that share a baseline", () => {
		const raw = makeRawExtraction({
			lines: [
				{ text: "Ada Lovelace", size: 18 },
				"ada@example.com · +44 20 7946 0100 · London, UK",
				{ text: "Experience", x: 56, y: 200, fontRef: "g_d0_f2" },
				{ text: "Skills", x: 340, y: 200, fontRef: "g_d0_f2" },
				{ text: "Principal Engineer | Analytical Engines, London", x: 56, y: 218 },
				{ text: "Algorithms, numerical analysis, technical writing", x: 340, y: 218 },
			],
		});

		const headings = textsOf(raw);
		expect(headings).toContain("Experience");
		expect(headings).toContain("Skills");
	});
});
