import type { SemanticNode, SemanticNodeKind } from "@reactive-resume/resume/stylesheet";
import { describe, expect, it } from "vitest";
import { SEMANTIC_REGISTRY_V1 } from "@reactive-resume/resume/stylesheet";
import { templateSchema } from "@reactive-resume/schema/templates";
import { buildAllTemplatesFixture, comprehensiveStylesheet } from "./all-templates-fixture";
import { STANDARD_FIELD_REGISTRY, STANDARD_ROLE_REGISTRY } from "./binding-inventory";
import { resolveResumeRuntime } from "./resolve";
import { getTemplateSemanticManifest } from "./template-manifest";

const flatten = (node: SemanticNode): SemanticNode[] => [node, ...node.children.flatMap(flatten)];

describe("Semantic CSS all-template presentation", () => {
	it.each(templateSchema.options)("snapshots the resolved %s presentation map", (template) => {
		const data = buildAllTemplatesFixture(template);
		const runtime = resolveResumeRuntime({
			data,
			template,
			source: comprehensiveStylesheet,
			mode: "semantic",
		});

		expect(runtime.diagnostics.filter(({ severity }) => severity === "error")).toEqual([]);
		expect(runtime.presentation).toMatchSnapshot();
	});

	it("exercises every semantic kind, conditional field, role, and template part", () => {
		const kinds = new Set<SemanticNodeKind>();
		const fields = new Set<string>();
		const roles = new Set<string>();
		const parts = new Map<string, Set<string>>();

		for (const template of templateSchema.options) {
			const data = buildAllTemplatesFixture(template);
			const { sourceTree } = resolveResumeRuntime({
				data,
				template,
				source: comprehensiveStylesheet,
				mode: "semantic",
			});
			const templateParts = new Set<string>();

			const visit = (node: SemanticNode, sectionType?: string, experienceRole = false) => {
				const nextSectionType = node.kind === "section" ? node.attributes.type : sectionType;
				const nextExperienceRole = experienceRole || node.roles.includes("experience-role");
				kinds.add(node.kind);
				for (const role of node.roles) roles.add(role);
				if (node.kind === "field" && nextSectionType && node.attributes.name) {
					fields.add(`${nextExperienceRole ? "experience-role" : nextSectionType}:${node.attributes.name}`);
				}
				if (node.kind === "template-part" && node.attributes.name) templateParts.add(node.attributes.name);
				for (const alias of node.attributes.part?.split(" ").filter(Boolean) ?? []) templateParts.add(alias);
				for (const child of node.children) visit(child, nextSectionType, nextExperienceRole);
			};

			visit(sourceTree);
			parts.set(template, templateParts);
		}

		expect([...kinds].sort()).toEqual(Object.keys(SEMANTIC_REGISTRY_V1).sort());
		expect([...STANDARD_ROLE_REGISTRY].filter((role) => !roles.has(role))).toEqual([]);

		const expectedFields = Object.entries(STANDARD_FIELD_REGISTRY).flatMap(([section, definitions]) =>
			Object.keys(definitions).map((field) => `${section}:${field}`),
		);
		expect(expectedFields.filter((field) => !fields.has(field))).toEqual([]);

		for (const template of templateSchema.options) {
			const expectedParts = getTemplateSemanticManifest(template)
				.parts.map(({ name }) => name)
				.sort();
			expect([...(parts.get(template) ?? [])].sort(), `${template} template parts`).toEqual(expectedParts);
		}
	});
});
