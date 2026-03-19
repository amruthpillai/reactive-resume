import {
  ExternalHyperlink,
  HeadingLevel,
  type IShadingAttributesProperties,
  type ISpacingProperties,
  Paragraph,
  TextRun,
} from "docx";

import { toSafeDocxLink } from "./link-utils";

export interface HtmlStyleConfig {
  font?: string;
  size?: number;
  color?: string;
  linkColor?: string;
}

interface InlineStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: Record<string, never>;
  strike?: boolean;
  font?: string;
  size?: number;
  color?: string;
  shading?: IShadingAttributesProperties;
}

type InlineChild = TextRun | ExternalHyperlink;

/** Module-level link color, set per htmlToParagraphs invocation. */
let currentLinkColor = "0563C1";

const HEADING_MAP: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  H1: HeadingLevel.HEADING_1,
  H2: HeadingLevel.HEADING_2,
  H3: HeadingLevel.HEADING_3,
  H4: HeadingLevel.HEADING_4,
  H5: HeadingLevel.HEADING_5,
  H6: HeadingLevel.HEADING_6,
};

function mergeStyle(parent: InlineStyle, tag: string): InlineStyle {
  const next = { ...parent };

  switch (tag) {
    case "STRONG":
    case "B":
      next.bold = true;
      break;
    case "EM":
    case "I":
      next.italics = true;
      break;
    case "U":
      next.underline = {};
      break;
    case "S":
    case "STRIKE":
      next.strike = true;
      break;
    case "CODE":
      next.font = "Courier New";
      break;
    case "MARK":
      next.shading = { fill: "FFFF00" };
      break;
  }

  return next;
}

function collectInlineChildren(node: Node, style: InlineStyle): InlineChild[] {
  const children: InlineChild[] = [];

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      if (text) {
        children.push(new TextRun({ text, ...style }));
      }
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const el = child as Element;
    const tag = el.tagName;

    if (tag === "BR") {
      children.push(new TextRun({ break: 1 }));
      continue;
    }

    if (tag === "A") {
      const href = toSafeDocxLink(el.getAttribute("href") ?? "");
      const linkChildren = collectInlineChildren(el, { ...style, color: currentLinkColor, underline: {} });
      if (linkChildren.length > 0 && href) {
        children.push(new ExternalHyperlink({ link: href, children: linkChildren as TextRun[] }));
      } else {
        children.push(...linkChildren);
      }
      continue;
    }

    const merged = mergeStyle(style, tag);
    children.push(...collectInlineChildren(el, merged));
  }

  return children;
}

function processBlockElement(
  el: Element,
  style: InlineStyle,
  paragraphs: Paragraph[],
  listLevel?: number,
  numberingRef?: string,
  listIndex?: number,
): void {
  const tag = el.tagName;

  if (HEADING_MAP[tag]) {
    const inlineChildren = collectInlineChildren(el, style);
    if (inlineChildren.length > 0) {
      paragraphs.push(new Paragraph({ heading: HEADING_MAP[tag], children: inlineChildren }));
    }
    return;
  }

  if (tag === "P" || tag === "DIV") {
    const inlineChildren = collectInlineChildren(el, style);
    if (inlineChildren.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: inlineChildren,
          ...(listLevel != null && numberingRef
            ? { numbering: { reference: numberingRef, level: listLevel, instance: listIndex } }
            : {}),
        }),
      );
    }
    return;
  }

  if (tag === "UL" || tag === "OL") {
    const isOrdered = tag === "OL";
    const level = listLevel != null ? listLevel + 1 : 0;

    for (const li of el.children) {
      if (li.tagName !== "LI") continue;

      const hasNestedBlocks = Array.from(li.children).some(
        (c) => c.tagName === "UL" || c.tagName === "OL" || c.tagName === "P",
      );

      if (hasNestedBlocks) {
        for (const liChild of li.childNodes) {
          if (liChild.nodeType === Node.TEXT_NODE) {
            const text = (liChild.textContent ?? "").trim();
            if (text) {
              paragraphs.push(
                new Paragraph({
                  children: [new TextRun({ text, ...style })],
                  ...(isOrdered && numberingRef
                    ? { numbering: { reference: numberingRef, level, instance: listIndex } }
                    : { bullet: { level } }),
                }),
              );
            }
          } else if (liChild.nodeType === Node.ELEMENT_NODE) {
            processBlockElement(liChild as Element, style, paragraphs, level, numberingRef, listIndex);
          }
        }
      } else {
        const inlineChildren = collectInlineChildren(li, style);
        if (inlineChildren.length > 0) {
          paragraphs.push(
            new Paragraph({
              children: inlineChildren,
              ...(isOrdered && numberingRef
                ? { numbering: { reference: numberingRef, level, instance: listIndex } }
                : { bullet: { level } }),
            }),
          );
        }
      }
    }
    return;
  }

  if (tag === "BLOCKQUOTE") {
    const indent: ISpacingProperties = {};
    const inlineChildren = collectInlineChildren(el, { ...style, italics: true });
    if (inlineChildren.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: inlineChildren,
          indent: { left: 720 },
          spacing: indent,
        }),
      );
    }
    return;
  }

  if (tag === "PRE") {
    const text = el.textContent ?? "";
    if (text) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text, font: "Courier New", ...style })],
        }),
      );
    }
    return;
  }

  if (tag === "HR") {
    paragraphs.push(new Paragraph({ children: [] }));
    return;
  }

  if (tag === "LI") {
    const inlineChildren = collectInlineChildren(el, style);
    if (inlineChildren.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: inlineChildren,
          bullet: { level: listLevel ?? 0 },
        }),
      );
    }
    return;
  }

  // Fallback: treat as inline container
  const inlineChildren = collectInlineChildren(el, style);
  if (inlineChildren.length > 0) {
    paragraphs.push(new Paragraph({ children: inlineChildren }));
  }
}

/**
 * Converts an HTML string (from TipTap rich text editor) into an array of docx Paragraphs.
 * Uses the browser's DOMParser to parse HTML, then walks the DOM tree to produce
 * structured docx content with proper formatting (bold, italic, lists, links, etc.).
 *
 * @param html - The HTML string to convert
 * @param styleConfig - Optional base typography (font, size, color) to apply to all text runs
 */
export function htmlToParagraphs(html: string, styleConfig?: HtmlStyleConfig): Paragraph[] {
  if (!html || !html.trim()) return [];

  currentLinkColor = styleConfig?.linkColor ?? "0563C1";

  const baseStyle: InlineStyle = {};
  if (styleConfig?.font) baseStyle.font = styleConfig.font;
  if (styleConfig?.size) baseStyle.size = styleConfig.size;
  if (styleConfig?.color) baseStyle.color = styleConfig.color;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const paragraphs: Paragraph[] = [];

  for (const child of doc.body.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? "").trim();
      if (text) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text, ...baseStyle })] }));
      }
      continue;
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      processBlockElement(child as Element, baseStyle, paragraphs);
    }
  }

  return paragraphs;
}
