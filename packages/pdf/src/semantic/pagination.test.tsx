import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it, vi } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";

vi.mock("@react-pdf/renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
}));

type HostNode = {
	type: string;
	props?: Readonly<Record<string, unknown>>;
	children?: HostNode[];
};

const findFirst = (node: HostNode, type: string): HostNode | undefined => {
	if (node.type === type) return node;
	for (const child of node.children ?? []) {
		const match = findFirst(child, type);
		if (match) return match;
	}
};

const renderHostTree = async (data: ResumeData): Promise<HostNode> => {
	const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await vi.waitFor(() => expect(instance.container.document).not.toBeNull());
	return instance.container.document as HostNode;
};

const renderPdf = async (data: ResumeData, template: Template = "onyx"): Promise<Uint8Array> => {
	const renderer = await vi.importActual<typeof import("@react-pdf/renderer")>("@react-pdf/renderer");
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<
		typeof renderer.renderToBuffer
	>[0];
	return new Uint8Array(await renderer.renderToBuffer(element));
};

type PdfTextItem = {
	str: string;
	transform: readonly number[];
};

type ParsedPdfPage = {
	getTextContent: () => Promise<{ items: PdfTextItem[] }>;
	getViewport: (options: { scale: number }) => { width: number };
};

type ParsedPdf = {
	numPages: number;
	getPage: (pageNumber: number) => Promise<ParsedPdfPage>;
};

const parsePdf = (data: Uint8Array): Promise<ParsedPdf> => getDocument({ data }).promise as Promise<ParsedPdf>;

const overflowingFixture = (pageSize: "A4" | "LETTER"): ResumeData => {
	const data = structuredClone(defaultResumeData);
	const source = {
		languageVersion: 1,
		text: `
			@version 1;
			page[page-number="1"] { size: ${pageSize}; }
			header { -resume-fixed: true; }
			@media (max-width: 600pt) { section-heading { font-size: 9pt; } }
		`,
	};
	data.picture.hidden = true;
	data.basics.name = "FIXED HEADER TOKEN";
	data.summary.title = "Summary";
	data.summary.content = Array.from(
		{ length: 180 },
		(_value, index) => `<p>Overflow line ${index + 1} with enough text to occupy the authored page.</p>`,
	).join("");
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source };
	return data;
};

const azurillAuthoredOverflowFixture = () => {
	const data = structuredClone(defaultResumeData);
	const overflowTokens = Array.from(
		{ length: 180 },
		(_value, index) => `AZURILL_OVERFLOW_${String(index + 1).padStart(3, "0")}`,
	);
	data.picture.hidden = true;
	data.basics.name = "AZURILL HEADER";
	data.summary.title = "Long summary";
	data.summary.content = overflowTokens.map((token) => `<p>${token} generated PDF page content.</p>`).join("");
	data.sections.profiles.title = "Sidebar";
	data.sections.profiles.items = [
		{
			id: "sidebar-profile",
			hidden: false,
			icon: "github-logo",
			iconColor: "",
			network: "SIDEBAR TOKEN",
			username: "authored-page-one",
			website: { url: "", label: "", inlineLink: false },
		},
	];
	data.sections.experience.title = "Experience";
	data.sections.experience.items = [
		{
			id: "manual-continuation",
			hidden: false,
			company: "MANUAL FULL WIDTH TOKEN",
			position: "Independent authored page",
			location: "",
			period: "",
			website: { url: "", label: "", inlineLink: false },
			description: "<p>Second authored page content.</p>",
			roles: [],
		},
	];
	data.metadata.template = "azurill";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [
		{ fullWidth: false, main: ["summary"], sidebar: ["profiles"] },
		{ fullWidth: true, main: ["experience"], sidebar: [] },
	];

	return { data, overflowTokens };
};

const readPhysicalPages = async (document: ParsedPdf) => {
	const pages = [];
	for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
		const page = await document.getPage(pageNumber);
		const content = await page.getTextContent();
		pages.push({
			width: page.getViewport({ scale: 1 }).width,
			items: content.items,
			text: content.items.map(({ str }) => str).join(" "),
		});
	}
	return pages;
};

describe("semantic pagination bindings", () => {
	it("passes resolved authored-page size to the existing Page primitive", async () => {
		const data = structuredClone(defaultResumeData);
		const source = {
			languageVersion: 1,
			text: '@version 1;\npage[page-number="1"] { size: LETTER; }',
		};
		data.picture.hidden = true;
		data.basics.name = "Ada Lovelace";
		data.metadata.layout.pages = [{ fullWidth: true, main: [], sidebar: [] }];
		data.metadata.stylesheet = { mode: "semantic", source };

		const page = findFirst(await renderHostTree(data), "PAGE");

		expect(page?.props?.size).toBe("LETTER");
	});

	it("keeps authored-page selectors and media width stable across wrapped physical pages", async () => {
		const document = await parsePdf(await renderPdf(overflowingFixture("A4")));
		const pages = await readPhysicalPages(document);
		const heading = pages.flatMap(({ items }) => items).find(({ str }) => str === "Summary");

		expect(document.numPages).toBeGreaterThan(1);
		expect(pages.every(({ width }) => Math.abs(width - 595.28) < 0.1)).toBe(true);
		expect(pages.filter(({ text }) => text.includes("FIXED HEADER TOKEN"))).toHaveLength(document.numPages);
		expect(Math.abs((heading?.transform[3] ?? 0) - 9)).toBeLessThan(0.1);
	});

	it("resolves page size before evaluating media queries", async () => {
		const document = await parsePdf(await renderPdf(overflowingFixture("LETTER")));
		const pages = await readPhysicalPages(document);
		const heading = pages.flatMap(({ items }) => items).find(({ str }) => str === "Summary");

		expect(pages.every(({ width }) => Math.abs(width - 612) < 0.1)).toBe(true);
		expect(Math.abs((heading?.transform[3] ?? 0) - 9)).toBeGreaterThan(0.1);
	});

	it("keeps Azurill overflow lossless while preserving a manual full-width authored continuation", async () => {
		const { data, overflowTokens } = azurillAuthoredOverflowFixture();
		const authoredPagesBeforeRender = structuredClone(data.metadata.layout.pages);
		const document = await parsePdf(await renderPdf(data, "azurill"));
		const pages = await readPhysicalPages(document);
		const renderedText = pages.map(({ text }) => text).join(" ");

		expect(document.numPages).toBeGreaterThan(authoredPagesBeforeRender.length);
		for (const token of overflowTokens) {
			expect(renderedText.split(token)).toHaveLength(2);
		}
		expect(renderedText).toContain("SIDEBAR TOKEN");
		expect(renderedText).toContain("MANUAL FULL WIDTH TOKEN");
		expect(data.metadata.layout.pages).toEqual(authoredPagesBeforeRender);
		expect(data.metadata.layout.pages[1]).toEqual({
			fullWidth: true,
			main: ["experience"],
			sidebar: [],
		});
	});
});
