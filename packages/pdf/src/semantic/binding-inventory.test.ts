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
	});
});
