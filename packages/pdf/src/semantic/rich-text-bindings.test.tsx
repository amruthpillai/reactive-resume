import type { SemanticNode } from "@reactive-resume/resume/stylesheet/types";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it, vi } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";
import { parseNormalizedRichTextHtml, richTextMarkClassName } from "../templates/shared/rich-text-html";
import { getRichTextSemanticNodeKey } from "./rich-text-keys";
import { buildSemanticTree } from "./tree";

vi.mock("@react-pdf/renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
}));

type HostNode = {
	type: string;
	style?: unknown;
	props?: { style?: unknown };
	children?: HostNode[];
};

const collectStyles = (node: HostNode): Record<string, unknown>[] => {
	const style = node.style ?? node.props?.style;
	const current = Array.isArray(style) ? style : style ? [style] : [];
	return [...(current as Record<string, unknown>[]), ...(node.children ?? []).flatMap(collectStyles)];
};

const collectNodeKinds = (node: SemanticNode): SemanticNode["kind"][] => [
	node.kind,
	...node.children.flatMap(collectNodeKinds),
];

const collectNodeKeys = (node: SemanticNode): string[] => [node.key, ...node.children.flatMap(collectNodeKeys)];

const findSemanticNode = (
	node: SemanticNode,
	predicate: (candidate: SemanticNode) => boolean,
): SemanticNode | undefined => {
	if (predicate(node)) return node;

	for (const child of node.children) {
		const match = findSemanticNode(child, predicate);
		if (match) return match;
	}
};

const buildFixture = (): ResumeData => {
	const data = structuredClone(defaultResumeData);
	const applied = {
		languageVersion: 1,
		text: `
			@version 1;
			paragraph { color: #123456; }
			strong { color: #654321; }
			list-marker { color: #abcdef; }
		`,
	};
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.summary.content = "<p>First <strong>bold</strong></p><ul><li>Item</li></ul>";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source: applied, applied };
	return data;
};

describe("semantic rich-text bindings", () => {
	it("applies occurrence-specific paragraph, strong, and marker styles to existing primitives", async () => {
		const element = createElement(ResumeDocument, {
			data: buildFixture(),
			template: "onyx",
		}) as unknown as Parameters<typeof pdf>[0];
		const instance = pdf(element);
		await vi.waitFor(() => expect(instance.container.document).not.toBeNull());

		const colors = collectStyles(instance.container.document as HostNode).map(({ color }) => color);
		expect(colors).toEqual(expect.arrayContaining(["#123456", "#654321", "#abcdef"]));
	});

	it.each([
		["ltr", "en-US", "<p>- Alpha<br>- Beta</p>", ["paragraph", "hard-break"]],
		["rtl", "he-IL", "<p>‏- אלפא<br>‏- בטא</p>", ["list", "list-item", "list-marker", "list-item-content"]],
	] as const)(
		"builds the %s descriptor from the same normalized rich-text elements rendered by the PDF",
		(_direction, locale, content, expectedKinds) => {
			const data = buildFixture();
			data.metadata.page.locale = locale;
			data.summary.content = content;
			const page = data.metadata.layout.pages[0];
			if (!page) throw new Error("Expected a page fixture.");

			const tree = buildSemanticTree({
				data,
				template: "onyx",
				page,
				pageNumber: 1,
				showHeader: false,
			});
			const kinds = collectNodeKinds(tree);

			for (const kind of expectedKinds) expect(kinds).toContain(kind);
			if (locale === "he-IL") {
				expect(kinds).not.toContain("paragraph");
				expect(kinds).not.toContain("hard-break");
			}
		},
	);

	it.each([
		["ltr", "en-US", ""],
		["rtl", "he-IL", "<p>‏- אלפא<br>‏- בטא</p>"],
	] as const)("keeps every %s descriptor key aligned with the renderer traversal", (direction, locale, suffix) => {
		const content = [
			"<h2>Heading</h2>",
			"<blockquote><p>Quote <strong>bold</strong> <em>em</em> <u>u</u> <s>s</s> <code>c</code>",
			'<span>span</span> <mark>mark</mark> <a href="https://example.com">link</a><br>next</p></blockquote>',
			"<ul><li>Item</li></ul><ol><li>One</li></ol><hr>",
			suffix,
		].join("");
		const data = buildFixture();
		data.metadata.page.locale = locale;
		data.summary.content = content;
		const page = data.metadata.layout.pages[0];
		if (!page) throw new Error("Expected a page fixture.");
		const tree = buildSemanticTree({ data, template: "onyx", page, pageNumber: 1, showHeader: false });
		const richText = findSemanticNode(tree, (candidate) => candidate.kind === "rich-text");
		if (!richText) throw new Error("Expected a rich-text descriptor.");

		const parsed = parseNormalizedRichTextHtml(content, { direction });
		const rendererKeys = parsed.querySelectorAll("*").flatMap((element) => {
			const key = getRichTextSemanticNodeKey(richText.key, element, richTextMarkClassName);
			if (element.rawTagName.toLowerCase() !== "li") return [key];

			return [`${key}/list-marker-0`, `${key}/list-item-content-0`, key];
		});

		expect(new Set(rendererKeys)).toEqual(new Set(collectNodeKeys(richText).slice(1)));
	});
});
