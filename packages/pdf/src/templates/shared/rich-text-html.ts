import type { Node } from "node-html-parser";
import { NodeType, parse } from "node-html-parser";

const inlineTags = new Set([
	"a",
	"abbr",
	"b",
	"br",
	"button",
	"cite",
	"code",
	"dfn",
	"em",
	"i",
	"label",
	"q",
	"s",
	"span",
	"strong",
	"sub",
	"sup",
	"u",
]);

const getTagName = (node: Node) => node.rawTagName.toLowerCase();

const hasBlockDescendant = (node: Node): boolean =>
	node.childNodes.some((child) => child.nodeType === NodeType.ELEMENT_NODE && !isInlineNode(child));

const isInlineNode = (node: Node): boolean => {
	if (node.nodeType === NodeType.TEXT_NODE || node.nodeType === NodeType.COMMENT_NODE) return true;
	if (node.nodeType !== NodeType.ELEMENT_NODE) return false;

	return inlineTags.has(getTagName(node)) && !hasBlockDescendant(node);
};

export const normalizeRichTextHtml = (html: string): string => {
	const root = parse(html.trim(), { comment: false });
	const normalized: string[] = [];
	let inlineNodes: string[] = [];

	const flushInlineNodes = () => {
		const inlineHtml = inlineNodes.join("").trim();

		if (inlineHtml) normalized.push(`<p>${inlineHtml}</p>`);

		inlineNodes = [];
	};

	for (const node of root.childNodes) {
		const nodeHtml = node.toString();

		if (isInlineNode(node)) {
			inlineNodes.push(nodeHtml);
			continue;
		}

		flushInlineNodes();
		normalized.push(nodeHtml);
	}

	flushInlineNodes();

	return normalized.join("");
};
