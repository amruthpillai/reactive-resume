import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { pdf } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";
import { createBindingInventory } from "./binding-inventory";
import { getTemplateSemanticBindingRegistry } from "./template-manifest";
import { buildSemanticTree } from "./tree";

type HostNode = {
	type: string;
	style?: unknown;
	value?: string;
	children?: HostNode[];
};

const nodeText = (node: HostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

const mergedStyle = (node: HostNode): Record<string, unknown> =>
	Object.assign({}, ...(Array.isArray(node.style) ? node.style : node.style ? [node.style] : []));

const findTexts = (node: HostNode, text: string): HostNode[] => [
	...(node.type === "TEXT" && nodeText(node) === text ? [node] : []),
	...(node.children ?? []).flatMap((child) => findTexts(child, text)),
];

const fixture = (mode: "legacy" | "semantic", section: "experience" | "education", rule = ""): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.basics.email = "";
	data.sections.experience.items = [
		{
			id: "experience-1",
			hidden: false,
			company: "Analytical Engines",
			position: "Engineer",
			location: "London",
			period: "1842",
			website: { url: "", label: "", inlineLink: false },
			description: "",
			roles: [],
		},
	];
	data.sections.education.items = [
		{
			id: "education-1",
			hidden: false,
			school: "Cambridge",
			area: "Mathematics",
			degree: "BSc",
			grade: "First",
			location: "Cambridge",
			period: "1835",
			website: { url: "", label: "", inlineLink: false },
			description: "",
		},
	];
	data.metadata.layout.pages = [{ fullWidth: true, main: [section], sidebar: [] }];
	if (mode === "semantic") {
		const stylesheet = { languageVersion: 1, text: `@rr-version 1; ${rule}` };
		data.metadata.stylesheet = { mode, source: stylesheet, applied: stylesheet };
	}
	return data;
};

const renderHost = async (template: Template, data: ResumeData): Promise<HostNode> => {
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();
	return instance.container.document as HostNode;
};

const renderPdf = async (template: Template, data: ResumeData): Promise<Uint8Array> => {
	const renderer = await vi.importActual<typeof import("@react-pdf/renderer")>("@react-pdf/renderer");
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<
		typeof renderer.renderToBuffer
	>[0];
	return new Uint8Array(await renderer.renderToBuffer(element));
};

const rasterizeFirstPage = async (bytes: Uint8Array): Promise<Buffer> => {
	const document = await getDocument({ data: bytes }).promise;
	const page = await document.getPage(1);
	const viewport = page.getViewport({ scale: 1.5 });
	const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
	const context = canvas.getContext("2d");
	await page.render({
		canvas: canvas as unknown as HTMLCanvasElement,
		canvasContext: context as unknown as CanvasRenderingContext2D,
		viewport,
	}).promise;
	return canvas.toBuffer("image/png");
};

const expectColor = (document: HostNode, text: string, color: string) => {
	expect(findTexts(document, text).some((node) => mergedStyle(node).color === color)).toBe(true);
};

describe("combined PDF field bindings", () => {
	it("splits all five combined variants into separately styleable existing Text runs", async () => {
		const colors = `
			field[name="position"] { color: #110000; }
			field[name="location"] { color: #220000; }
			field[name="area"] { color: #330000; }
			field[name="degree"] { color: #440000; }
			field[name="grade"] { color: #550000; }
			field[name="period"] { color: #660000; }
		`;
		const experience = await renderHost("meowth", fixture("semantic", "experience", colors));
		const inlineEducation = await renderHost("meowth", fixture("semantic", "education", colors));
		const splitEducation = await renderHost("onyx", fixture("semantic", "education", colors));

		expect(nodeText(experience)).toContain("Engineer (London)");
		expectColor(experience, "Engineer", "#110000");
		expectColor(experience, "(London)", "#220000");

		expect(nodeText(inlineEducation)).toContain("Mathematics (BSc)");
		expect(nodeText(inlineEducation)).toContain("First • Cambridge");
		expectColor(inlineEducation, "Mathematics", "#330000");
		expectColor(inlineEducation, "(BSc)", "#440000");
		expectColor(inlineEducation, "First", "#550000");
		expectColor(inlineEducation, "Cambridge", "#220000");

		expect(nodeText(splitEducation)).toContain("BSc • First");
		expect(nodeText(splitEducation)).toContain("Cambridge • 1835");
		expectColor(splitEducation, "BSc", "#440000");
		expectColor(splitEducation, "First", "#550000");
		expectColor(splitEducation, "Cambridge", "#220000");
		expectColor(splitEducation, "1835", "#660000");
	});

	it("uses the promoted single field's real semantic key", async () => {
		const experienceData = fixture(
			"semantic",
			"experience",
			'field[name="period"] { color: #660000; } field[name="location"] { color: #220000; }',
		);
		const experience = experienceData.sections.experience.items[0];
		if (!experience) throw new Error("Expected experience fixture.");
		experience.location = "";

		const educationData = fixture(
			"semantic",
			"education",
			'field[name="period"] { color: #660000; } field[name="degree"] { color: #440000; }',
		);
		const education = educationData.sections.education.items[0];
		if (!education) throw new Error("Expected education fixture.");
		education.degree = "";
		education.grade = "";
		education.location = "";

		expectColor(await renderHost("onyx", experienceData), "1842", "#660000");
		expectColor(await renderHost("onyx", educationData), "1835", "#660000");
	});

	it("publishes one existing Text binding for every split field key", () => {
		const data = fixture("semantic", "education");
		const tree = buildSemanticTree({
			data,
			template: "meowth",
			page: data.metadata.layout.pages[0] as NonNullable<(typeof data.metadata.layout.pages)[number]>,
			pageNumber: 1,
			showHeader: true,
		});
		const inventory = createBindingInventory(tree, getTemplateSemanticBindingRegistry("meowth"));
		const fieldBindings = Object.entries(inventory.bindings).filter(([key]) =>
			["area", "degree", "grade", "location", "period"].some((field) => key.endsWith(`/field-${field}`)),
		);

		expect(fieldBindings).toHaveLength(5);
		expect(fieldBindings.map(([, binding]) => binding)).toEqual(
			Array.from({ length: 5 }, () => ({ type: "primitive", primitive: "Text", source: "existing" })),
		);
	});

	it.each([
		["meowth", "experience"],
		["meowth", "education"],
		["onyx", "education"],
	] as const)(
		"keeps the real %s %s section raster-identical between legacy and empty semantic mode",
		async (template, section) => {
			const legacy = await rasterizeFirstPage(await renderPdf(template, fixture("legacy", section)));
			const semantic = await rasterizeFirstPage(await renderPdf(template, fixture("semantic", section)));

			expect(semantic.equals(legacy)).toBe(true);
		},
	);
});
