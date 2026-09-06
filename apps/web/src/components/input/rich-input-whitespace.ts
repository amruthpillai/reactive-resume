import type { Level } from "@tiptap/extension-heading";
import type { Node as ProseMirrorNode, TagParseRule } from "@tiptap/pm/model";
import { Heading } from "@tiptap/extension-heading";
import { Paragraph } from "@tiptap/extension-paragraph";
import { DOMSerializer, DOMParser as ProseMirrorDOMParser } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { ReplaceStep } from "@tiptap/pm/transform";
import { combineTransactionSteps, Extension, getChangedRanges } from "@tiptap/react";

export const whitespaceAttribute = "data-resume-whitespace";
export const whitespacePreserveValue = "preserve";

const preservedWhitespace = {
	default: null,
	parseHTML: (element: HTMLElement) =>
		element.getAttribute(whitespaceAttribute) === whitespacePreserveValue ? whitespacePreserveValue : null,
	renderHTML: (attributes: { resumeWhitespace?: string | null }) =>
		attributes.resumeWhitespace === whitespacePreserveValue ? { [whitespaceAttribute]: whitespacePreserveValue } : {},
};

export const LiteralParagraph = Paragraph.extend({
	addAttributes() {
		return { ...this.parent?.(), resumeWhitespace: preservedWhitespace };
	},
	parseHTML() {
		return [
			{ tag: `p[${whitespaceAttribute}="${whitespacePreserveValue}"]`, preserveWhitespace: "full" },
			{ tag: "p" },
		] as TagParseRule[];
	},
});

export const LiteralHeading = Heading.extend({
	addAttributes() {
		return { ...this.parent?.(), resumeWhitespace: preservedWhitespace };
	},
	parseHTML() {
		return this.options.levels.flatMap((level: Level) => [
			{
				tag: `h${level}[${whitespaceAttribute}="${whitespacePreserveValue}"]`,
				attrs: { level },
				preserveWhitespace: "full",
			},
			{ tag: `h${level}`, attrs: { level } },
		]) as TagParseRule[];
	},
});

const isPreservableTextBlock = (node: ProseMirrorNode) =>
	node.type.name === "paragraph" || node.type.name === "heading";

const markedOpeningTag = (tag: string, attributes = "") =>
	`<${tag}${attributes} ${whitespaceAttribute}="${whitespacePreserveValue}">`;

const markPastedHtml = (html: string) => {
	const marked = html.replace(/<(p|h[1-6])(\s[^>]*)?>/gi, (_match, tag: string, attributes = "") =>
		new RegExp(`\\b${whitespaceAttribute}\\s*=`, "i").test(attributes)
			? `<${tag}${attributes}>`
			: markedOpeningTag(tag, attributes),
	);
	return /<(?:p|h[1-6]|blockquote|ul|ol|table|pre|hr)\b/i.test(marked)
		? marked
		: `${markedOpeningTag("p")}${marked}</p>`;
};

export const LiteralWhitespaceInput = Extension.create({
	name: "literalWhitespaceInput",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					transformPastedHTML: markPastedHtml,
					clipboardTextParser(text, $context, _plain, view) {
						const wrapper = document.createElement("div");
						const serializer = DOMSerializer.fromSchema(view.state.schema);
						for (const block of text.split(/(?:\r\n?|\n)+/)) {
							const paragraph = document.createElement("p");
							paragraph.setAttribute(whitespaceAttribute, whitespacePreserveValue);
							if (block)
								paragraph.appendChild(serializer.serializeNode(view.state.schema.text(block, $context.marks())));
							wrapper.appendChild(paragraph);
						}
						return ProseMirrorDOMParser.fromSchema(view.state.schema).parseSlice(wrapper, {
							context: $context,
							preserveWhitespace: "full",
						});
					},
				},
				appendTransaction(transactions, oldState, newState) {
					if (transactions.some((transaction) => transaction.getMeta("preventUpdate"))) return null;
					const authored = transactions.some(
						(transaction) =>
							transaction.docChanged &&
							!transaction.getMeta("appendedTransaction") &&
							!transaction.getMeta("history$") &&
							transaction.steps.some((step) => step instanceof ReplaceStep),
					);
					if (!authored) return null;

					const changedRanges = getChangedRanges(combineTransactionSteps(oldState.doc, [...transactions])).map(
						({ newRange }) => newRange,
					);
					if (changedRanges.length === 0) return null;

					const transaction = newState.tr;
					newState.doc.descendants((node, position) => {
						if (!isPreservableTextBlock(node) || node.attrs.resumeWhitespace === whitespacePreserveValue) return;
						const nodeEnd = position + node.nodeSize;
						if (!changedRanges.some(({ from, to }) => from <= nodeEnd && to >= position)) return;
						transaction.setNodeMarkup(position, undefined, {
							...node.attrs,
							resumeWhitespace: whitespacePreserveValue,
						});
					});

					return transaction.steps.length > 0 ? transaction : null;
				},
			}),
		];
	},
});
