import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it, vi } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
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

const semanticSource = (text = "@rr-version 1;\n") => ({
	languageVersion: 1,
	text,
});

const buildFixture = (mode: "legacy" | "semantic"): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.basics.headline = "Programmer";
	data.basics.email = "ada@example.com";
	data.summary.content = "<p>Computing pioneer.</p>";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	if (mode === "semantic") {
		data.metadata.stylesheet = {
			mode,
			source: semanticSource(),
			applied: semanticSource(),
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

describe("semantic PDF bindings do not add layout wrappers", () => {
	it.each(templateSchema.options)(
		"%s preserves primitive type, count, and order for an empty stylesheet",
		async (template) => {
			const legacy = await renderHostTree(buildFixture("legacy"), template);
			const semantic = await renderHostTree(buildFixture("semantic"), template);

			expect(primitiveTypes(semantic)).toEqual(primitiveTypes(legacy));
		},
	);
});
