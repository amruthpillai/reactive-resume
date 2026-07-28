import type { SemanticNode } from "@reactive-resume/resume/stylesheet/types";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createBindingInventory, SHARED_BINDING_REGISTRY } from "./binding-inventory";
import { buildSemanticTree } from "./tree";

const node = (key: string, kind: SemanticNode["kind"], children: SemanticNode[] = []): SemanticNode => ({
	key,
	kind,
	attributes: {},
	roles: [],
	children,
});
const findNode = (tree: SemanticNode, predicate: (candidate: SemanticNode) => boolean): SemanticNode | undefined => {
	if (predicate(tree)) return tree;

	for (const child of tree.children) {
		const match = findNode(child, predicate);
		if (match) return match;
	}
};
const required = (candidate: SemanticNode | undefined, label: string): SemanticNode => {
	if (!candidate) throw new Error(`Missing ${label}`);
	return candidate;
};

describe("semantic binding inventory", () => {
	it("reports missing and synthetic bindings instead of claiming success", () => {
		const tree = node("resume", "resume", [node("resume/part", "template-part")]);
		const inventory = createBindingInventory(tree, {
			...SHARED_BINDING_REGISTRY,
			"template-part": { type: "primitive", primitive: "View", source: "synthetic" },
		});

		expect(inventory.unboundNodeKeys).toEqual(["resume/part"]);
		expect(inventory.syntheticWrapperCount).toBe(1);
	});

	it("reports an alias unbound when its canonical primitive owner is absent", () => {
		const inventory = createBindingInventory(node("rich", "rich-text"), {
			"rich-text": {
				type: "alias",
				canonicalKind: "field",
				canonicalNodeKey: "missing-field",
				token: "rich-text",
			},
		});

		expect(inventory.bindings).toEqual({});
		expect(inventory.unboundNodeKeys).toEqual(["rich"]);
	});

	it("resolves conditional bindings to the primitive the existing renderer uses", () => {
		const heading = node("heading", "section-heading", [node("heading/icon", "icon")]);
		const shape = { ...node("level/shape", "icon"), attributes: { type: "circle" }, roles: ["active"] };
		const icon = { ...node("level/icon", "icon"), attributes: { type: "icon" }, roles: ["inactive"] };
		const inventory = createBindingInventory(node("resume", "resume", [heading, shape, icon]));

		expect(inventory.bindings.heading).toMatchObject({ primitive: "View", source: "existing" });
		expect(inventory.bindings["level/shape"]).toMatchObject({ primitive: "View", source: "existing" });
		expect(inventory.bindings["level/icon"]).toMatchObject({ primitive: "Svg", source: "existing" });
	});

	it("binds every emitted shared node to one existing primitive without synthetic wrappers", () => {
		const data = structuredClone(defaultResumeData);
		data.picture.url = "/uploads/picture.png";
		data.basics = {
			name: "Ada",
			headline: "Engineer",
			email: "ada@example.com",
			phone: "",
			location: "Berlin",
			website: { url: "", label: "" },
			customFields: [],
		};
		data.summary.content =
			"<h1>Heading</h1><blockquote>Quote</blockquote><p><strong>Bold</strong><br></p><ul><li>Item</li></ul><hr>";
		data.sections.skills.items = [
			{
				id: "skill/1",
				hidden: false,
				icon: "code",
				iconColor: "",
				name: "TypeScript",
				proficiency: "Expert",
				level: 2,
				keywords: ["Types"],
			},
		];
		const page = { fullWidth: false, main: ["summary", "skills"], sidebar: [] };
		const tree = buildSemanticTree({ data, template: "onyx", page, pageNumber: 1, showHeader: true });
		const inventory = createBindingInventory(tree);
		const nodeCount = (candidate: SemanticNode): number =>
			1 + candidate.children.reduce((count, child) => count + nodeCount(child), 0);

		expect(inventory.unboundNodeKeys).toEqual([]);
		expect(inventory.syntheticWrapperCount).toBe(0);
		expect(Object.keys(inventory.bindings)).toHaveLength(nodeCount(tree));
		expect(
			Object.values(inventory.bindings).every((binding) => binding.type === "alias" || binding.source === "existing"),
		).toBe(true);
		for (const binding of Object.values(inventory.bindings)) {
			if (binding.type !== "alias") continue;

			expect(inventory.bindings[binding.canonicalNodeKey]).toMatchObject({
				type: "primitive",
				source: "existing",
			});
		}
	});

	it("aliases each rich-text identity to its field primitive without claiming a second root View", () => {
		const data = structuredClone(defaultResumeData);
		data.summary.content = "<p>Summary</p>";
		data.sections.experience.items = [
			{
				id: "experience/1",
				hidden: false,
				company: "Analytical Engines",
				position: "Engineer",
				location: "London",
				period: "1842",
				website: { url: "", label: "", inlineLink: false },
				description: "<p>Description</p>",
				roles: [],
			},
		];
		data.customSections = [
			{
				id: "cover",
				type: "cover-letter",
				title: "Cover Letter",
				icon: "article",
				columns: 1,
				hidden: false,
				keepTogether: false,
				startOnNewPage: false,
				items: [
					{
						id: "cover/1",
						hidden: false,
						recipient: "<p>Recipient</p>",
						content: "<p>Letter</p>",
					},
				],
			},
		];
		const tree = buildSemanticTree({
			data,
			template: "onyx",
			page: { fullWidth: true, main: ["summary", "experience", "cover"], sidebar: [] },
			pageNumber: 1,
			showHeader: false,
		});
		const inventory = createBindingInventory(tree);
		const cases = [
			["summary", "content"],
			["experience", "description"],
			["cover", "recipient"],
			["cover", "content"],
		] as const;

		for (const [sectionId, fieldName] of cases) {
			const section = required(
				findNode(tree, (candidate) => candidate.kind === "section" && candidate.id === sectionId),
				`${sectionId} section`,
			);
			const field = required(
				findNode(section, (candidate) => candidate.kind === "field" && candidate.attributes.name === fieldName),
				`${sectionId}.${fieldName} field`,
			);
			const richText = required(
				findNode(field, (candidate) => candidate.kind === "rich-text"),
				`${sectionId}.${fieldName} rich text`,
			);

			expect(inventory.bindings[field.key]).toEqual({
				type: "primitive",
				primitive: "View",
				source: "existing",
			});
			expect(inventory.bindings[richText.key]).toEqual({
				type: "alias",
				canonicalKind: "field",
				canonicalNodeKey: field.key,
				token: "rich-text",
			});
			expect([field.key, richText.key].filter((key) => inventory.bindings[key]?.type === "primitive")).toEqual([
				field.key,
			]);
		}
	});

	it.each([
		["en-US", "ltr", "View"],
		["ar-SA", "rtl", "Text"],
	] as const)("binds %s list item content through the renderer direction seam", (locale, direction, primitive) => {
		const data = structuredClone(defaultResumeData);
		data.metadata.page.locale = locale;
		data.summary.content = "<ul><li>Item</li></ul>";
		const tree = buildSemanticTree({
			data,
			template: "onyx",
			page: { fullWidth: true, main: ["summary"], sidebar: [] },
			pageNumber: 1,
			showHeader: false,
		});
		const content = required(
			findNode(tree, (candidate) => candidate.kind === "list-item-content"),
			`${direction} list item content`,
		);

		expect(content.attributes).toEqual({ direction });
		expect(createBindingInventory(tree).bindings[content.key]).toEqual({
			type: "primitive",
			primitive,
			source: "existing",
		});
	});

	it("uses the renderer's trimmed custom contact link decision", () => {
		const data = structuredClone(defaultResumeData);
		data.basics.customFields = [
			{ id: "whitespace", icon: "link", text: "No link", link: "   " },
			{ id: "linked", icon: "link", text: "Linked", link: " https://example.com " },
		];
		const tree = buildSemanticTree({
			data,
			template: "onyx",
			page: { fullWidth: true, main: [], sidebar: [] },
			pageNumber: 1,
			showHeader: true,
		});
		const inventory = createBindingInventory(tree);
		const whitespace = required(
			findNode(tree, (candidate) => candidate.id === "whitespace"),
			"whitespace contact",
		);
		const linked = required(
			findNode(tree, (candidate) => candidate.id === "linked"),
			"linked contact",
		);

		expect(whitespace.roles).toEqual([]);
		expect(inventory.bindings[whitespace.key]).toMatchObject({ type: "primitive", primitive: "View" });
		expect(linked.roles).toEqual(["structured-link"]);
		expect(inventory.bindings[linked.key]).toMatchObject({ type: "primitive", primitive: "Link" });
	});
});
