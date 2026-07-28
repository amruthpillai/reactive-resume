import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";

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

const findPath = (node: HostNode, predicate: (candidate: HostNode) => boolean): HostNode[] | undefined => {
	if (predicate(node)) return [node];
	for (const child of node.children ?? []) {
		const path = findPath(child, predicate);
		if (path) return [node, ...path];
	}
};

const nodesWithStyle = (node: HostNode, property: string, value: unknown): HostNode[] => [
	...(mergedStyle(node)[property] === value ? [node] : []),
	...(node.children ?? []).flatMap((child) => nodesWithStyle(child, property, value)),
];

const buildFixture = (text: string, section: "summary" | "skills" | "experience" = "summary"): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.basics.headline = "Programmer";
	data.basics.email = "ada@example.com";
	data.basics.phone = "";
	data.basics.location = "";
	data.basics.website = { url: "", label: "" };
	data.basics.customFields = [];
	data.summary.content = "<p>Computing pioneer.</p>";
	data.sections.skills.title = "Expertise";
	data.sections.skills.items = [
		{
			id: "skill-1",
			hidden: false,
			icon: "brain",
			iconColor: "",
			name: "TypeScript",
			proficiency: "Expert",
			level: 0,
			keywords: [],
		},
	];
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
			roles: [
				{
					id: "role-1",
					position: "Architect",
					period: "1843",
					description: "<p>Designed the engine.</p>",
				},
			],
		},
	];
	data.metadata.page.hideSectionIcons = false;
	data.metadata.page.hideIcons = false;
	data.metadata.layout.pages = [{ fullWidth: true, main: [section], sidebar: [] }];
	const stylesheet = { languageVersion: 1, text: `@rr-version 1; ${text}` };
	data.metadata.stylesheet = { mode: "semantic", source: stylesheet, applied: stylesheet };
	return data;
};

const renderFixture = async (template: Template, data: ResumeData): Promise<HostNode> => {
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();
	return instance.container.document as HostNode;
};

describe("semantic binding host fidelity", () => {
	it("attaches region, contact-list, icon-row heading, no-border item-header, and item-icon styles", async () => {
		const document = await renderFixture(
			"onyx",
			buildFixture(
				`
					region[region="main"] { background-color: #101010; }
					contact-list { background-color: #202020; }
					section-heading { background-color: #303030; }
					item-header { background-color: #404040; }
					icon { opacity: 0.25; }
				`,
				"skills",
			),
		);
		const emailPath = findPath(document, (node) => node.type === "LINK" && nodeText(node) === "ada@example.com");
		const headingPath = findPath(document, (node) => node.type === "TEXT" && nodeText(node) === "Expertise");
		const skillPath = findPath(document, (node) => node.type === "TEXT" && nodeText(node) === "TypeScript");

		expect(emailPath?.some((node) => mergedStyle(node).backgroundColor === "#202020")).toBe(true);
		expect(headingPath?.some((node) => node.type === "VIEW" && mergedStyle(node).backgroundColor === "#303030")).toBe(
			true,
		);
		expect(mergedStyle(headingPath?.at(-1) as HostNode).backgroundColor).toBeUndefined();
		expect(skillPath?.some((node) => mergedStyle(node).backgroundColor === "#404040")).toBe(true);
		expect(skillPath?.some((node) => mergedStyle(node).backgroundColor === "#101010")).toBe(true);
		expect(nodesWithStyle(document, "opacity", 0.25).some(({ type }) => type === "SVG")).toBe(true);
	});

	it("binds nested experience-role item and item-header styles to their existing Views", async () => {
		const document = await renderFixture(
			"onyx",
			buildFixture(
				`
					item[role~="nested-role"] { background-color: #515151; }
					item[role~="nested-role"] > item-header { border-top-width: 7pt; }
				`,
				"experience",
			),
		);
		const rolePath = findPath(document, (node) => node.type === "TEXT" && nodeText(node) === "Architect");

		expect(rolePath?.some((node) => node.type === "VIEW" && mergedStyle(node).backgroundColor === "#515151")).toBe(
			true,
		);
		expect(rolePath?.some((node) => node.type === "VIEW" && mergedStyle(node).borderTopWidth === 7)).toBe(true);
	});

	it("binds Rhyhorn's outer contact owner, nested content primitive, link alias, and last-owner alias separately", async () => {
		const document = await renderFixture(
			"rhyhorn",
			buildFixture(`
				contact-item { background-color: #616161; }
				template-part[name="contact-item-content"] { color: #717171; }
				link { text-decoration: none; }
				contact-item[part~="contact-item-last"] { border-bottom-width: 9pt; }
			`),
		);
		const emailPath = findPath(document, (node) => node.type === "LINK" && nodeText(node) === "ada@example.com");
		const link = emailPath?.at(-1);

		expect(link && mergedStyle(link)).toMatchObject({ color: "#717171", textDecoration: "none" });
		expect(emailPath?.some((node) => node.type === "VIEW" && mergedStyle(node).backgroundColor === "#616161")).toBe(
			true,
		);
		expect(emailPath?.some((node) => node.type === "VIEW" && mergedStyle(node).borderBottomWidth === 9)).toBe(true);
	});

	it.each([
		["azurill", 4],
		["ditgar", 1],
		["ditto", 3],
		["gengar", 1],
		["glalie", 1],
		["leafish", 3],
		["meowth", 3],
		["pikachu", 1],
		["rhyhorn", 1],
		["scizor", 1],
	] as const)("%s attaches every visible primitive template part to an existing host", async (template, expected) => {
		const section = template === "meowth" ? "experience" : "summary";
		const document = await renderFixture(template, buildFixture("template-part { opacity: 0.37; }", section));

		expect(nodesWithStyle(document, "opacity", 0.37)).toHaveLength(expected);
	});

	it("honors primitive template-part visibility on the exact existing host", async () => {
		const document = await renderFixture(
			"pikachu",
			buildFixture('template-part[name="header-divider"] { display: none; }'),
		);

		expect(nodeText(document)).not.toContain("Ada Lovelace");
		expect(nodeText(document)).toContain("ada@example.com");
	});
});
