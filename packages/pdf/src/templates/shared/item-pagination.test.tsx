import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it, vi } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";

vi.mock("@react-pdf/renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
}));

type PdfTextItem = { str: string };
type ParsedPdfPage = { getTextContent: () => Promise<{ items: PdfTextItem[] }> };
type ParsedPdf = { numPages: number; getPage: (pageNumber: number) => Promise<ParsedPdfPage> };

const renderPdf = async (data: ResumeData, template: Template = "onyx"): Promise<Uint8Array> => {
	const renderer = await vi.importActual<typeof import("@react-pdf/renderer")>("@react-pdf/renderer");
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<
		typeof renderer.renderToBuffer
	>[0];
	return new Uint8Array(await renderer.renderToBuffer(element));
};

const parsePdf = (data: Uint8Array): Promise<ParsedPdf> => getDocument({ data }).promise as Promise<ParsedPdf>;

const readPhysicalPages = async (document: ParsedPdf): Promise<string[]> => {
	const pages: string[] = [];
	for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
		const page = await document.getPage(pageNumber);
		const content = await page.getTextContent();
		pages.push(content.items.map(({ str }) => str).join(" "));
	}
	return pages;
};

const makeItem = (id: string, description: string) => ({
	id,
	hidden: false,
	company: id,
	position: "Synthetic item",
	location: "",
	period: "",
	website: { url: "", label: "", inlineLink: false },
	description,
	roles: [],
});

const makeFixture = (items: ResumeData["sections"]["experience"]["items"]): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "ITEM PAGINATION HEADER";
	data.metadata.template = "onyx";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["experience"], sidebar: [] }];
	data.sections.experience.title = "Experience";
	data.sections.experience.items = items;
	return data;
};

const numberedTokens = (prefix: string, count: number) =>
	Array.from({ length: count }, (_value, index) => `${prefix}_${String(index + 1).padStart(3, "0")}`);

const numberedParagraphs = (prefix: string, count: number) =>
	numberedTokens(prefix, count)
		.map((token) => `<p>${token}</p>`)
		.join("");

const expectTokensExactlyOnce = (pages: string[], tokens: string[]) => {
	const renderedText = pages.join(" ");
	for (const token of tokens) expect(renderedText.split(token)).toHaveLength(2);
};

describe("item pagination token matrix", () => {
	it.each([
		{
			name: "item fits remaining space",
			data: makeFixture([
				makeItem("boundary", numberedParagraphs("BOUNDARY", 26)),
				makeItem("fit", numberedParagraphs("FIT", 4)),
			]),
			allTokens: [...numberedTokens("BOUNDARY", 26), ...numberedTokens("FIT", 4)],
			sampledTokens: ["FIT_001", "FIT_002", "FIT_003", "FIT_004"],
			expectedPages: 1,
			expectedTokenPages: [0, 0, 0, 0],
			expectsPhysicalOverflow: false,
		},
		{
			name: "item fits a full page but not remaining space",
			data: makeFixture([
				makeItem("boundary", numberedParagraphs("BOUNDARY", 48)),
				makeItem("full-page", numberedParagraphs("FULL_PAGE", 42)),
			]),
			allTokens: [...numberedTokens("BOUNDARY", 48), ...numberedTokens("FULL_PAGE", 42)],
			sampledTokens: ["FULL_PAGE_001", "FULL_PAGE_021", "FULL_PAGE_042"],
			expectedPages: 3,
			expectedTokenPages: [1, 1, 2],
			expectsPhysicalOverflow: true,
		},
		{
			name: "item taller than a page",
			data: makeFixture([makeItem("oversized", numberedParagraphs("OVERSIZED", 180))]),
			allTokens: numberedTokens("OVERSIZED", 180),
			sampledTokens: ["OVERSIZED_001", "OVERSIZED_090", "OVERSIZED_180"],
			expectedPages: 5,
			expectedTokenPages: [0, 2, 4],
			expectsPhysicalOverflow: true,
		},
		{
			name: "two-line paragraph near boundary",
			data: makeFixture([
				makeItem("boundary", numberedParagraphs("BOUNDARY", 52)),
				makeItem("paragraph", "<p>PARAGRAPH_001 first line<br />PARAGRAPH_002 second line</p>"),
			]),
			allTokens: [...numberedTokens("BOUNDARY", 52), "PARAGRAPH_001", "PARAGRAPH_002"],
			sampledTokens: ["PARAGRAPH_001", "PARAGRAPH_002"],
			expectedPages: 2,
			expectedTokenPages: [1, 1],
			expectsPhysicalOverflow: true,
		},
		{
			name: "nested bullets",
			data: makeFixture([
				makeItem(
					"nested",
					"<ul><li><p>NESTED_001</p><ul><li><p>NESTED_002</p></li><li><p>NESTED_003</p></li></ul></li></ul>",
				),
			]),
			allTokens: ["NESTED_001", "NESTED_002", "NESTED_003"],
			sampledTokens: ["NESTED_001", "NESTED_002", "NESTED_003"],
			expectedPages: 1,
			expectedTokenPages: [0, 0, 0],
			expectsPhysicalOverflow: false,
		},
	])(
		"preserves every token exactly once: $name",
		async ({ data, allTokens, sampledTokens, expectedPages, expectedTokenPages, expectsPhysicalOverflow }) => {
			const authoredPagesBeforeRender = structuredClone(data.metadata.layout.pages);
			const pages = await readPhysicalPages(await parsePdf(await renderPdf(data)));
			expect(pages).toHaveLength(expectedPages);
			expect(sampledTokens.map((token) => pages.findIndex((page) => page.includes(token)))).toEqual(expectedTokenPages);
			expectTokensExactlyOnce(pages, allTokens);
			expect(data.metadata.layout.pages).toEqual(authoredPagesBeforeRender);
			if (expectsPhysicalOverflow) expect(pages.length).toBeGreaterThan(authoredPagesBeforeRender.length);
		},
	);

	it("preserves built-in and custom items across an Azurill sidebar and main-column overflow", async () => {
		const data = makeFixture([makeItem("builtin", numberedParagraphs("BUILTIN", 150))]);
		data.metadata.template = "azurill";
		data.metadata.layout.pages = [{ fullWidth: false, main: ["experience"], sidebar: ["profiles"] }];
		data.sections.profiles.items = [
			{
				id: "sidebar",
				hidden: false,
				icon: "github-logo",
				iconColor: "",
				network: "SIDEBAR_001",
				username: "sidebar",
				website: { url: "", label: "", inlineLink: false },
			},
		];
		data.customSections = [
			{
				id: "custom-experience",
				type: "experience",
				title: "Custom Experience",
				icon: "",
				columns: 1,
				hidden: false,
				showHeading: true,
				keepTogether: false,
				startOnNewPage: false,
				items: [makeItem("custom", numberedParagraphs("CUSTOM", 30))],
			},
		];
		data.metadata.layout.pages[0]?.main.push("custom-experience");

		const authoredPagesBeforeRender = structuredClone(data.metadata.layout.pages);
		const pages = await readPhysicalPages(await parsePdf(await renderPdf(data, "azurill")));
		expect(pages).toHaveLength(5);
		expect(
			["BUILTIN_001", "BUILTIN_150", "CUSTOM_001", "CUSTOM_030", "SIDEBAR_001"].map((token) =>
				pages.findIndex((page) => page.includes(token)),
			),
		).toEqual([0, 3, 4, 4, 0]);
		expectTokensExactlyOnce(pages, [...numberedTokens("BUILTIN", 150), ...numberedTokens("CUSTOM", 30), "SIDEBAR_001"]);
		expect(data.metadata.layout.pages).toEqual(authoredPagesBeforeRender);
		expect(pages.length).toBeGreaterThan(authoredPagesBeforeRender.length);
	});

	it("records unsafe renderer fallback for an oversized non-wrapping item", async () => {
		const renderer = await vi.importActual<typeof import("@react-pdf/renderer")>("@react-pdf/renderer");
		const tokens = Array.from({ length: 180 }, (_value, index) => `UNSAFE_${String(index + 1).padStart(3, "0")}`);
		const item = createElement(
			renderer.View,
			{ wrap: false },
			...tokens.map((token) => createElement(renderer.View, { key: token }, createElement(renderer.Text, null, token))),
		);
		const element = createElement(
			renderer.Document,
			null,
			createElement(renderer.Page, { size: "A4" }, item),
		) as Parameters<typeof renderer.renderToBuffer>[0];
		const pages = await readPhysicalPages(await parsePdf(new Uint8Array(await renderer.renderToBuffer(element))));

		// React PDF warns that an oversized View cannot wrap and drops content; this is the blocker for item Keep together.
		expect(pages.join(" ")).toContain("UNSAFE_001");
		expect(pages.join(" ")).not.toContain("UNSAFE_180");
	});
});
