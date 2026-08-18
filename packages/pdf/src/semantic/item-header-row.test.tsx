import type { SemanticNode } from "@reactive-resume/resume/stylesheet/types";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { analyzeStylesheet, compileStylesheet } from "@reactive-resume/resume/stylesheet";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";
import { resolveResumeRuntime } from "./resolve";
import { buildSemanticTree } from "./tree";

type HostNode = { type: string; style?: unknown; value?: string; children?: HostNode[] };

const LONG_TITLE = "Belajar Membuat Aplikasi Android untuk Pemula";
const NOWRAP_STYLESHEET = `@version 1;\ntemplate-part[name="item-header-row"] { flex-wrap: nowrap; }`;

const mergedStyle = (node: HostNode): Record<string, unknown> =>
	Object.assign({}, ...(Array.isArray(node.style) ? node.style : node.style ? [node.style] : []));
const nodeText = (node: HostNode): string => node.value ?? (node.children ?? []).map(nodeText).join("");
const pathTo = (node: HostNode, predicate: (candidate: HostNode) => boolean): HostNode[] | undefined => {
	if (predicate(node)) return [node];
	for (const child of node.children ?? []) {
		const path = pathTo(child, predicate);
		if (path) return [node, ...path];
	}
};
const flatten = (node: SemanticNode): SemanticNode[] => [node, ...node.children.flatMap(flatten)];

const buildFixture = (): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.sections.certifications.items = [
		{
			id: "certification/1",
			hidden: false,
			title: LONG_TITLE,
			issuer: "Dicoding",
			date: "05 Sep 2023",
			website: { url: "", label: "", inlineLink: false },
			description: "",
		},
	];
	data.sections.experience.items = [
		{
			id: "experience/1",
			hidden: false,
			company: "Braincore",
			position: "Business Process Automation Engineer",
			location: "Jakarta, Indonesia",
			period: "Jan 2024 - Mar 2025",
			website: { url: "", label: "", inlineLink: false },
			description: "",
			roles: [],
		},
	];
	const page = data.metadata.layout.pages[0];
	if (!page) throw new Error("Missing authored page");
	page.main = ["certifications", "experience"];
	page.sidebar = [];

	return data;
};

const renderTitleRowStyles = async (template: Template, stylesheet?: string) => {
	const data = buildFixture();
	const semanticRuntime = stylesheet
		? resolveResumeRuntime({ data, template, mode: "semantic", source: { languageVersion: 1, text: stylesheet } })
		: undefined;
	const element = createElement(ResumeDocument, { data, template, semanticRuntime }) as unknown as Parameters<
		typeof pdf
	>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();
	const document = instance.container.document as unknown as HostNode;
	const path = pathTo(document, (node) => nodeText(node).trim() === LONG_TITLE);
	if (!path) throw new Error("Missing certification title in the rendered document");
	const row = path.at(-2);
	const title = path.at(-1);
	if (!row || !title) throw new Error("Missing the row wrapping the certification title");

	return { row: mergedStyle(row), title: mergedStyle(title) };
};

describe("item-header-row template part", () => {
	it("wraps the certification title and date, leaving the issuer outside", () => {
		const data = buildFixture();
		const page = data.metadata.layout.pages[0];
		if (!page) throw new Error("Missing authored page");
		const tree = buildSemanticTree({ data, template: "onyx", page, pageNumber: 1, showHeader: true });
		const itemHeader = flatten(tree).find((node) => node.kind === "item-header");
		if (!itemHeader) throw new Error("Missing item header");

		expect(itemHeader.children.map((child) => [child.kind, child.attributes.name])).toEqual([
			["template-part", "item-header-row"],
			["field", "issuer"],
		]);
		const [row] = itemHeader.children;
		expect(row?.children.map((child) => child.attributes.name)).toEqual(["title", "date"]);
	});

	it("is not routed into the stacked experience header", () => {
		const data = buildFixture();
		const page = data.metadata.layout.pages[0];
		if (!page) throw new Error("Missing authored page");
		const tree = buildSemanticTree({ data, template: "onyx", page, pageNumber: 1, showHeader: true });
		const experience = flatten(tree).find((node) => node.kind === "section" && node.attributes.type === "experience");
		if (!experience) throw new Error("Missing experience section");

		expect(flatten(experience).filter((node) => node.attributes.name === "item-header-row")).toEqual([]);
	});

	// The row ships with `flex-wrap: wrap`, which drops a long title's date onto its own line. This
	// is the whole point of exposing the part, so assert the override reaches the rendered row.
	it.each(["onyx", "ditgar", "meowth"] as const)("lets %s stylesheets turn off the row wrap", async (template) => {
		expect((await renderTitleRowStyles(template)).row).toMatchObject({ flexWrap: "wrap" });
		expect((await renderTitleRowStyles(template, NOWRAP_STYLESHEET)).row).toMatchObject({ flexWrap: "nowrap" });
	});

	// React PDF reuses the line layout a Text was first measured with, so a title Yoga shrinks after
	// that measurement draws its glyphs over the date. Under `nowrap` the title takes a zero flex
	// basis instead, which makes its first measurement its final width.
	it("gives the title a zero flex basis only when the row stops wrapping", async () => {
		expect((await renderTitleRowStyles("onyx")).title).not.toMatchObject({ flexBasis: 0 });
		expect((await renderTitleRowStyles("onyx", NOWRAP_STYLESHEET)).title).toMatchObject({
			flexBasis: 0,
			flexGrow: 1,
		});
	});

	it("reports no diagnostics for the selector", () => {
		const data = buildFixture();
		const page = data.metadata.layout.pages[0];
		if (!page) throw new Error("Missing authored page");
		const tree = buildSemanticTree({ data, template: "onyx", page, pageNumber: 1, showHeader: true });
		const compiled = compileStylesheet({ languageVersion: 1, text: NOWRAP_STYLESHEET });
		if (!compiled.program) throw new Error("Stylesheet failed to compile");

		expect(compiled.diagnostics).toEqual([]);
		expect(analyzeStylesheet(compiled.program, tree)).toEqual([]);
	});
});
