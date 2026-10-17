// Rich-text plumbing between react-native-enriched-html and the resume's HTML strings. Pure, so Node can check it.
//
// Owner decision (README §0, §1.4): only a field the user actually edits is re-serialised. The native editor parses
// a field's HTML and reports its own serialisation back; that serialisation of the stored value is the field's
// baseline. Reports that equal the baseline, or arrive while the field isn't focused, never write, so untouched
// fields keep their original HTML byte for byte.

/** Converts the editor's `<html>\n<p>…</p>\n</html>` into the resume's HTML: no wrapper, no newlines, "" when empty. */
export function fromEnrichedHtml(html: string): string {
	let body = html.trim();
	if (body.startsWith("<html>")) body = body.slice(6);
	if (body.endsWith("</html>")) body = body.slice(0, -7);
	return (
		body
			.replaceAll(/>\s*\n\s*</g, "><")
			.trim()
			// Empty lines at the ends would print as blank space under the entry.
			.replace(/^(?:<br\s*\/?>|<p>\s*<\/p>)+/, "")
			.replace(/(?:<br\s*\/?>|<p>\s*<\/p>)+$/, "")
	);
}

export type RichTextSession = {
	focus: () => void;
	blur: () => void;
	/** The editor's serialisation of the stored value (`getHTML()` after it loaded it). May release a held edit. */
	baseline: (enrichedHtml: string) => string | null;
	/** The editor's HTML changed. Returns the HTML to write, or null: not focused, or no change from the stored value. */
	change: (enrichedHtml: string) => string | null;
	/** The stored value changed from outside (undo, remote update). True when the editor must load it again. */
	external: (value: string) => boolean;
	/** The caller wrote `value` itself (Improve's Replace). */
	wrote: (value: string) => void;
};

/** One field's gate between the editor's reports and the draft store. Returned HTML is what the caller writes. */
export function createRichTextSession(initial: string): RichTextSession {
	let focused = false;
	/** The stored value the editor loaded, kept verbatim. */
	let original = initial;
	/** The value last written or loaded. */
	let last = initial;
	let baseline: string | undefined;
	let pending: string | undefined;

	const apply = (enrichedHtml: string) => {
		const html = enrichedHtml === baseline ? original : fromEnrichedHtml(enrichedHtml);
		if (html === last) return null;
		last = html;
		return html;
	};

	return {
		focus: () => {
			focused = true;
		},
		blur: () => {
			focused = false;
		},
		baseline: (enrichedHtml) => {
			if (baseline !== undefined) return null;
			baseline = enrichedHtml;
			if (pending === undefined) return null;
			const next = pending;
			pending = undefined;
			return apply(next);
		},
		change: (enrichedHtml) => {
			// Unfocused reports are the editor parsing the stored value: they are its baseline, not an edit.
			if (!focused) baseline ??= enrichedHtml;
			// Until the baseline is known an edit is held, unless the field was empty (nothing to preserve).
			else if (baseline === undefined && original) pending = enrichedHtml;
			else return apply(enrichedHtml);
			return null;
		},
		external: (value) => {
			if (focused || value === last) return false;
			original = last = value;
			baseline = pending = undefined;
			return true;
		},
		wrote: (value) => {
			last = value;
		},
	};
}

const BLOCK = /<(p|li|h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>|<br\s*\/?>/g;

const decode = (text: string) =>
	text
		.replaceAll(/<[^>]+>/g, "")
		.replaceAll("&nbsp;", " ")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&#39;", "'")
		.replaceAll("&amp;", "&");

const encode = (text: string) =>
	text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** The editor's lines (paragraphs, list items, headings), as the plain text it reports joins them with "\n". */
export function getLines(html: string): string[] {
	return [...html.matchAll(BLOCK)].map((match) => decode(match[3] ?? ""));
}

/** The line holding the caret in the editor's plain text, or null on an empty line. */
export function lineAtCaret(plain: string, caret: number): { index: number; text: string } | null {
	const before = plain.slice(0, caret);
	const index = before.split("\n").length - 1;
	const text = plain.split("\n")[index] ?? "";
	return text.trim() ? { index, text } : null;
}

/**
 * Improve → Replace: swaps one line's text, keeping its block tag. Marks inside that line are dropped, as on web.
 * Returns null when the line no longer reads `expected` (it changed since Improve was asked).
 */
export function replaceLine(html: string, index: number, expected: string, text: string): string | null {
	let current = -1;
	let found = false;
	const next = html.replaceAll(BLOCK, (match, tag: string | undefined, attributes: string | undefined, inner = "") => {
		current++;
		if (current !== index || !tag) return match;
		if (decode(inner) !== expected) return match;
		found = true;
		return `<${tag}${attributes ?? ""}>${encode(text)}</${tag}>`;
	});
	return found ? next : null;
}
