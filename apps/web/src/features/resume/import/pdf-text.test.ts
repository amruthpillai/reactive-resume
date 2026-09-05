import type { RawExtraction } from "@reactive-resume/resume/ats-pdf";
import { describe, expect, it } from "vitest";
import { buildExtractedDocument } from "@reactive-resume/resume/ats-pdf";
import { documentToLines } from "./pdf-text";

const PAGE = { width: 595, height: 842 };
const FONT_SIZE = 10;
const CHAR_WIDTH = 5;

type FixtureItem = { text: string; x: number; y: number; width?: number };

/** `y` is measured from the top of the page; the builder flips it into the PDF's own space. */
function rawExtraction(pages: FixtureItem[][]): RawExtraction {
	return {
		version: 1,
		file: { name: "resume.pdf", sizeBytes: 1024, magicBytesOk: true },
		pageCount: pages.length,
		truncated: false,
		pages: pages.map((items, index) => ({
			pageNumber: index + 1,
			width: PAGE.width,
			height: PAGE.height,
			rotation: 0,
			items: items.map((item) => ({
				str: item.text,
				transform: [FONT_SIZE, 0, 0, FONT_SIZE, item.x, PAGE.height - item.y - FONT_SIZE] as const,
				width: item.width ?? item.text.length * CHAR_WIDTH,
				height: FONT_SIZE,
				fontRef: "f1",
				hasEol: false,
			})),
			operators: null,
		})),
		fonts: [],
		links: [],
		metadata: {
			producer: null,
			creator: null,
			title: null,
			author: null,
			language: null,
			pdfVersion: null,
			isEncrypted: false,
			isXfa: false,
			isCollection: false,
			isTagged: false,
			hasAcroForm: false,
		},
		operatorsAvailable: false,
	};
}

const linesOf = (...pages: FixtureItem[][]) => documentToLines(buildExtractedDocument(rawExtraction(pages)));

describe("documentToLines", () => {
	it("groups items on the same baseline into one line", () => {
		expect(
			linesOf([
				{ text: "Ada", x: 40, y: 60 },
				{ text: "Lovelace", x: 58, y: 60 },
			]),
		).toEqual(["Ada Lovelace"]);
	});

	it("orders lines from the top of the page down", () => {
		expect(
			linesOf([
				{ text: "Second", x: 40, y: 80 },
				{ text: "First", x: 40, y: 60 },
			]),
		).toEqual(["First", "Second"]);
	});

	it("turns a wide field gap into a double space the parser can split on", () => {
		expect(
			linesOf([
				{ text: "Acme", x: 40, y: 60 },
				{ text: "Engineer", x: 120, y: 60 },
			]),
		).toEqual(["Acme  Engineer"]);
	});

	it("reads every page in order", () => {
		expect(linesOf([{ text: "Page one", x: 40, y: 60 }], [{ text: "Page two", x: 40, y: 60 }])).toEqual([
			"Page one",
			"Page two",
		]);
	});

	it("drops blank items and blank lines", () => {
		expect(
			linesOf([
				{ text: "   ", x: 40, y: 60 },
				{ text: "Ada", x: 40, y: 80 },
			]),
		).toEqual(["Ada"]);
	});

	it("reads each column of a sidebar layout in full instead of interleaving them", () => {
		const sidebar = ["SKILLS", "TypeScript", "Rust", "PostgreSQL", "Docker", "Figma"];
		const main = [
			"EXPERIENCE",
			"Acme Corp",
			"Senior Engineer",
			"Jan 2020 - Present",
			"Led the rewrite",
			"Grew the team",
		];

		expect(
			linesOf([
				...sidebar.map((text, index) => ({ text, x: 40, y: 60 + index * 20 })),
				...main.map((text, index) => ({ text, x: 220, y: 70 + index * 20 })),
			]),
		).toEqual([...sidebar, ...main]);
	});
});
