import type { Node } from "node-html-parser";
import { NodeType, parse } from "node-html-parser";

export const richTextMarkClassName = "rr-pdf-mark";

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
  node.childNodes.some(
    (child) => child.nodeType === NodeType.ELEMENT_NODE && !isInlineNode(child),
  );

const mergeClassNames = (...classNames: (string | undefined)[]): string => {
  const uniqueClassNames = new Set<string>();

  for (const className of classNames) {
    if (!className) continue;

    for (const part of className.split(/\s+/)) {
      if (part) uniqueClassNames.add(part);
    }
  }

  return [...uniqueClassNames].join(" ");
};

const normalizeMarkElements = (root: ReturnType<typeof parse>) => {
  for (const mark of root.querySelectorAll("mark")) {
    mark.tagName = "span";
    mark.setAttribute(
      "class",
      mergeClassNames(mark.getAttribute("class"), richTextMarkClassName),
    );
  }
};

const isInlineNode = (node: Node): boolean => {
  if (
    node.nodeType === NodeType.TEXT_NODE ||
    node.nodeType === NodeType.COMMENT_NODE
  )
    return true;
  if (node.nodeType !== NodeType.ELEMENT_NODE) return false;

  return inlineTags.has(getTagName(node)) && !hasBlockDescendant(node);
};

// Allow optional leading whitespace + LRM/RLM marks before the bullet character.
const PSEUDO_BULLET_LEAD = /^[\s‎‏]*[-•*]\s+/;

const stripEmptyInlineWrappers = (html: string): string =>
  html.replace(/<(strong|b|em|i|u|span)\b[^>]*>\s*<\/\1>/gi, "");

// Treat a bare <br> or one wrapped in an inline tag (e.g. `<strong><br></strong>` from
// the editor) as the segment separator.
const splitByBreaks = (html: string): string[] =>
  html.split(
    /(?:<(?:strong|b|em|i|u|span)\b[^>]*>\s*<br\b[^>]*\/?>\s*<\/(?:strong|b|em|i|u|span)>)|<br\b[^>]*\/?>/gi,
  );

const tryConvertPseudoBulletParagraph = (
  paragraphInnerHtml: string,
): string | null => {
  const cleaned = stripEmptyInlineWrappers(paragraphInnerHtml);
  if (!/<br\b/i.test(cleaned)) return null;

  const segments = splitByBreaks(cleaned)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length < 2) return null;
  if (!segments.every((segment) => PSEUDO_BULLET_LEAD.test(segment)))
    return null;

  const items = segments.map((segment) =>
    segment.replace(PSEUDO_BULLET_LEAD, ""),
  );

  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
};

export const convertPseudoBulletParagraphs = (html: string): string =>
  html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (full, _attrs, inner) => {
    const converted = tryConvertPseudoBulletParagraph(inner);
    return converted ?? full;
  });

export const normalizeRichTextHtml = (html: string): string => {
  const root = parse(html.trim(), { comment: false });
  const normalized: string[] = [];
  let inlineNodes: string[] = [];

  normalizeMarkElements(root);

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
