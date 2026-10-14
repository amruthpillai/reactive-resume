/** Inline formatting collected while walking rich-text HTML. Colors are lowercase `rrggbb` (no leading `#`). */
export type InlineStyle = {
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strike?: boolean;
	code?: boolean;
	color?: string;
	highlight?: string;
};

export type OdtInline =
	| { type: "text"; text: string; style: InlineStyle }
	| { type: "tab" }
	| { type: "break" }
	| { type: "link"; href: string; children: OdtInline[] };

/** Named paragraph layouts the builder maps to ODF styles. */
export type ParagraphPreset = "body" | "title" | "subtitle" | "contact" | "entryHeading" | "meta" | "quote" | "code";

export type OdtListItem = { blocks: OdtBlock[] };

export type OdtBlock =
	| { type: "paragraph"; children: OdtInline[]; preset?: ParagraphPreset; indent?: number }
	| { type: "heading"; level: number; children: OdtInline[] }
	| { type: "list"; ordered: boolean; items: OdtListItem[] }
	| { type: "rule" };

export function text(value: string, style: InlineStyle = {}): OdtInline {
	return { type: "text", text: value, style };
}

export function paragraph(children: OdtInline[], preset?: ParagraphPreset, indent?: number): OdtBlock {
	return {
		type: "paragraph",
		children,
		...(preset ? { preset } : {}),
		...(indent ? { indent } : {}),
	};
}

/** A section heading: `## Title` in the same hierarchy as the PDF/Markdown exports. */
export function sectionHeading(title: string): OdtBlock {
	return { type: "heading", level: 1, children: [text(title)] };
}

/** `Primary — Secondary` with an optional right-aligned meta suffix (period, date). */
export function entryHeading(primary: string, secondary?: string, meta?: string, bold = true): OdtBlock {
	const children: OdtInline[] = [text(primary, bold ? { bold: true } : {})];
	if (secondary) children.push(text(` — ${secondary}`));
	if (meta) children.push({ type: "tab" }, text(meta, { italic: true }));
	return paragraph(children, "entryHeading");
}

/** An external link paragraph (website) — the label, or the URL when no label was set. */
export function linkParagraph(href: string, label: string): OdtBlock {
	return paragraph([{ type: "link", href, children: [text(label || href)] }]);
}
