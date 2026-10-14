import type { InlineStyle, OdtBlock, OdtInline, OdtListItem } from "./types";
import type { HTMLElement, Node } from "node-html-parser";
import { parse, NodeType } from "node-html-parser";
import { isDarkColor, parseColorString } from "@reactive-resume/utils/color";
import { paragraph, text } from "./types";

const SAFE_LINK_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);

/** Keeps only links the document can open safely; drops `javascript:`, `data:` and relative URLs. */
export function toSafeLink(value: string): string | null {
	const input = value.trim();
	if (!input) return null;

	if (input.startsWith("mailto:")) {
		const email = input.slice("mailto:".length).trim();
		return email ? `mailto:${email}` : null;
	}

	try {
		const url = new URL(input);
		return SAFE_LINK_SCHEMES.has(url.protocol) ? url.toString() : null;
	} catch {
		return null;
	}
}

function toHex(value: string): string | null {
	const parsed = parseColorString(value);
	if (!parsed) return null;
	return [parsed.r, parsed.g, parsed.b].map((channel) => channel.toString(16).padStart(2, "0")).join("");
}

function styleProperty(element: HTMLElement | undefined, property: string): string | undefined {
	return element
		?.getAttribute("style")
		?.split(";")
		.reverse()
		.map((declaration) => {
			const colon = declaration.indexOf(":");
			return [declaration.slice(0, colon).trim().toLowerCase(), declaration.slice(colon + 1).trim()] as const;
		})
		.find(([name]) => name === property)?.[1];
}

function mergeStyle(parent: InlineStyle, tag: string, element?: HTMLElement): InlineStyle {
	const next: InlineStyle = { ...parent };

	switch (tag) {
		case "STRONG":
		case "B":
			next.bold = true;
			break;
		case "EM":
		case "I":
			next.italic = true;
			break;
		case "U":
			next.underline = true;
			break;
		case "S":
		case "STRIKE":
		case "DEL":
			next.strike = true;
			break;
		case "CODE":
			next.code = true;
			break;
	}

	const colorValue = styleProperty(element, "color");
	const color = colorValue ? toHex(colorValue) : null;
	if (color) next.color = color;

	const backgroundValue = styleProperty(element, "background-color");
	const background = backgroundValue ? toHex(backgroundValue) : null;

	if (tag === "MARK") {
		next.highlight = background ?? "ffff00";
		if (background && backgroundValue && isDarkColor(backgroundValue) && !next.color) next.color = "ffffff";
	} else if (background) {
		next.highlight = background;
	}

	return next;
}

function collectInline(node: Node, style: InlineStyle): OdtInline[] {
	const children: OdtInline[] = [];

	for (const child of node.childNodes) {
		if (child.nodeType === NodeType.TEXT_NODE) {
			const value = child.textContent ?? "";
			if (!value) continue;
			value.split("\t").forEach((part, index) => {
				if (index > 0) children.push({ type: "tab" });
				if (part) children.push({ type: "text", text: part, style });
			});
			continue;
		}

		if (child.nodeType !== NodeType.ELEMENT_NODE) continue;

		const element = child as HTMLElement;
		const tag = element.tagName;

		if (tag === "BR") {
			children.push({ type: "break" });
			continue;
		}

		if (tag === "A") {
			const href = toSafeLink(element.getAttribute("href") ?? "");
			const linkChildren = collectInline(element, style);
			if (href && linkChildren.length > 0) children.push({ type: "link", href, children: linkChildren });
			else children.push(...linkChildren);
			continue;
		}

		children.push(...collectInline(element, mergeStyle(style, tag, element)));
	}

	return children;
}

const BLOCK_TAGS = /^(UL|OL|LI|P|DIV|BLOCKQUOTE|PRE|HR|H[1-6])$/;

function convertListItem(item: HTMLElement): OdtBlock[] {
	const blocks: OdtBlock[] = [];
	const hasNestedBlocks = item.children.some((child) => BLOCK_TAGS.test(child.tagName));

	if (!hasNestedBlocks) {
		const children = collectInline(item, {});
		if (children.length > 0) blocks.push(paragraph(children));
		return blocks;
	}

	let pending: OdtInline[] = [];
	const flush = () => {
		if (pending.length > 0) blocks.push(paragraph(pending));
		pending = [];
	};

	for (const child of item.childNodes) {
		if (child.nodeType === NodeType.TEXT_NODE) {
			const value = (child.textContent ?? "").trim();
			if (value) pending.push(text(value));
			continue;
		}

		if (child.nodeType !== NodeType.ELEMENT_NODE) continue;

		const element = child as HTMLElement;
		if (BLOCK_TAGS.test(element.tagName)) {
			flush();
			processBlock(element, blocks);
		} else {
			pending.push(...collectInline(element, {}));
		}
	}

	flush();
	return blocks;
}

function convertList(list: HTMLElement, ordered: boolean): OdtBlock {
	const items: OdtListItem[] = [];
	for (const child of list.children) {
		if (child.tagName !== "LI") continue;
		items.push({ blocks: convertListItem(child) });
	}
	return { type: "list", ordered, items };
}

function processBlock(element: HTMLElement, blocks: OdtBlock[]): void {
	const tag = element.tagName;

	if (/^H[1-6]$/.test(tag)) {
		const children = collectInline(element, {});
		if (children.length > 0) blocks.push({ type: "heading", level: Number(tag[1]), children });
		return;
	}

	if (tag === "P" || tag === "DIV") {
		const children = collectInline(element, {});
		if (children.length > 0) {
			const indent = Number(element.getAttribute("data-indent"));
			const validIndent = Number.isInteger(indent) && indent > 0 && indent <= 8 ? indent : undefined;
			blocks.push(paragraph(children, undefined, validIndent));
		}
		return;
	}

	if (tag === "UL" || tag === "OL") {
		blocks.push(convertList(element, tag === "OL"));
		return;
	}

	if (tag === "BLOCKQUOTE") {
		const inner: OdtBlock[] = [];
		for (const child of element.childNodes) {
			if (child.nodeType === NodeType.TEXT_NODE) {
				const value = (child.textContent ?? "").trim();
				if (value) inner.push(paragraph([text(value)], "quote"));
			} else if (child.nodeType === NodeType.ELEMENT_NODE) {
				processBlock(child as HTMLElement, inner);
			}
		}
		for (const block of inner) if (block.type === "paragraph") block.preset = "quote";
		blocks.push(...inner);
		return;
	}

	if (tag === "PRE") {
		const value = element.textContent ?? "";
		if (value) blocks.push({ type: "paragraph", children: [text(value)], preset: "code" });
		return;
	}

	if (tag === "HR") {
		blocks.push({ type: "rule" });
		return;
	}

	if (tag === "LI") {
		const children = collectInline(element, {});
		if (children.length > 0) blocks.push(paragraph(children));
		return;
	}

	// Fallback: an unknown element that carries inline content is treated as a paragraph.
	const children = collectInline(element, {});
	if (children.length > 0) blocks.push(paragraph(children));
}

/** Converts the constrained TipTap rich-text HTML stored on resume fields into ODT blocks. */
export function htmlToOdtBlocks(html: string): OdtBlock[] {
	if (!html?.trim()) return [];

	const root = parse(html);
	// Script and style text is code, not content: drop it before the walk below can print it.
	for (const element of root.querySelectorAll("script, style")) element.remove();

	const blocks: OdtBlock[] = [];
	for (const child of root.childNodes) {
		if (child.nodeType === NodeType.TEXT_NODE) {
			const value = (child.textContent ?? "").trim();
			if (value) blocks.push(paragraph([text(value)]));
			continue;
		}

		if (child.nodeType === NodeType.ELEMENT_NODE) processBlock(child as HTMLElement, blocks);
	}

	return blocks;
}
