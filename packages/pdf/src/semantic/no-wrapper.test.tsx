import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it, vi } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { templateSchema } from "@reactive-resume/schema/templates";
import { ResumeDocument } from "../document";

vi.mock("@react-pdf/renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
}));

type HostNode = {
	type: string;
	props?: Readonly<Record<string, unknown>>;
	children?: HostNode[];
	value?: string;
};

const semanticSource = (text = "@version 1;\n") => ({
	languageVersion: 1,
	text,
});

const buildFixture = (mode: "legacy" | "semantic"): ResumeData => {
	const data = structuredClone(sampleResumeData);
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.basics.headline = "Programmer";
	data.basics.email = "ada@example.com";
	data.summary.content = [
		"<h2>Computing pioneer</h2>",
		"<blockquote><p>Quote <strong>bold</strong> <em>emphasis</em> <u>underline</u> <s>strike</s>",
		'<code>code</code> <span>span</span> <mark>mark</mark> <a href="https://example.com">link</a><br>next</p></blockquote>',
		"<ul><li>Unordered</li></ul><ol><li>Ordered</li></ol><hr>",
	].join("");
	data.sections.experience.items = data.sections.experience.items.slice(0, 1);
	data.sections.education.items = data.sections.education.items.slice(0, 1);
	data.sections.projects.items = data.sections.projects.items.slice(0, 1);
	data.sections.skills.items = data.sections.skills.items.slice(0, 1);
	data.sections.languages.items = data.sections.languages.items.slice(0, 1);
	data.metadata.page.hideIcons = false;
	data.metadata.page.hideSectionIcons = false;
	data.metadata.layout.pages = [
		{
			fullWidth: false,
			main: ["summary", "experience", "education", "projects"],
			sidebar: ["skills", "languages"],
		},
	];
	if (mode === "semantic") {
		data.metadata.stylesheet = {
			mode,
			source: semanticSource(),
		};
	}
	return data;
};

const renderHostTree = async (data: ResumeData, template: Template): Promise<HostNode> => {
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await vi.waitFor(() => expect(instance.container.document).not.toBeNull());
	return instance.container.document as HostNode;
};

const primitiveTypes = (node: HostNode): string[] => [
	node.type,
	...(node.children ?? []).flatMap((child) => primitiveTypes(child)),
];
const textValues = (node: HostNode): string[] => [
	...(node.type === "TEXT_INSTANCE" && node.value ? [node.value] : []),
	...(node.children ?? []).flatMap((child) => textValues(child)),
];

describe("semantic PDF bindings do not add layout wrappers", () => {
	it("uses a split-page fixture with chrome, ordinary sections, rich lists, and levels", () => {
		const data = buildFixture("legacy");

		expect(data.metadata.layout.pages[0]).toMatchObject({
			fullWidth: false,
			main: ["summary", "experience", "education", "projects"],
			sidebar: ["skills", "languages"],
		});
		expect(data.summary.content).toContain("<blockquote>");
		expect(data.summary.content).toContain("<ul>");
		expect(data.sections.skills.items[0]?.level).toBeGreaterThan(0);
		expect(data.sections.languages.items[0]?.level).toBeGreaterThan(0);
		expect(data.basics.email).toBe("ada@example.com");
	});

	it.each(templateSchema.options)(
		"%s preserves primitive type, count, and order for an empty stylesheet",
		async (template) => {
			const legacy = await renderHostTree(buildFixture("legacy"), template);
			const semantic = await renderHostTree(buildFixture("semantic"), template);

			expect(textValues(semantic)).toEqual(textValues(legacy));
			expect(primitiveTypes(semantic)).toEqual(primitiveTypes(legacy));
		},
	);
});
