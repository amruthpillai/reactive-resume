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

// The editor's own tag set. Anything else is unwrapped to its text when the editor loads it.
const ENRICHED_TAGS = new Set([
	"p",
	"br",
	"b",
	"i",
	"u",
	"s",
	"code",
	"a",
	"ul",
	"ol",
	"li",
	"blockquote",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
]);
const RENAMED: Record<string, string> = { strong: "b", em: "i", del: "s", strike: "s" };

// Elements whose `style` marks become tags around their content: inline ones, and the blocks that hold inline content
// directly (paragraphs, list items, headings). Tags open after the element's start tag and close before its end tag.
const STYLED = new Set([
	"span",
	"b",
	"strong",
	"i",
	"em",
	"u",
	"s",
	"del",
	"strike",
	"mark",
	"font",
	"a",
	"code",
	"p",
	"li",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
]);

const styleOf = (attributes: string) => {
	const style = /\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attributes);
	return style ? (style[2] ?? style[3] ?? "") : "";
};

/** TipTap wraps list items in paragraphs; the editor's items hold text directly. Both elements' marks move to the item. */
const collapseListParagraphs = (html: string) =>
	html.replaceAll(
		/<li(\s[^>]*)?>\s*<p(\s[^>]*)?>([\s\S]*?)<\/p>\s*<\/li>/gi,
		(_match, item: string | undefined, paragraph: string | undefined, content: string) => {
			// Each element's marks are read on their own, then united: joined styles would let one element's
			// text-decoration hide the other's.
			const marks = new Set([...styleMarks(styleOf(item ?? "")), ...styleMarks(styleOf(paragraph ?? ""))]);
			const order = ["b", "i", "u", "s"].filter((mark) => marks.has(mark));
			return `<li>${order.map((mark) => `<${mark}>`).join("")}${content}${order
				.map((mark) => `</${mark}>`)
				.reverse()
				.join("")}</li>`;
		},
	);

/** The marks an inline `style` declares: bold, italic, underline and strikethrough, as the native normaliser reads. */
function styleMarks(style: string): string[] {
	const marks: string[] = [];
	if (/font-weight\s*:\s*(bold|bolder|[6-9]00)\b/i.test(style)) marks.push("b");
	if (/font-style\s*:\s*(italic|oblique)\b/i.test(style)) marks.push("i");
	const decoration = /text-decoration(?:-line)?\s*:\s*([^;]*)/i.exec(style)?.[1] ?? "";
	if (/underline/i.test(decoration)) marks.push("u");
	if (/line-through/i.test(decoration)) marks.push("s");
	return marks;
}

/**
 * Turns CSS-encoded marks (`<span style="font-weight:700">`, `<p style="font-style:italic">`, `text-decoration`)
 * into tags before attributes are stripped, so editing one character doesn't drop them. A `<b>`/`<strong>` styled
 * `font-weight: normal` (Google Docs' wrapper) is not bold and is removed.
 */
function styleMarksToTags(html: string): string {
	const open: Record<string, string[][]> = {};
	return html.replaceAll(
		/<(\/?)([a-z][a-z0-9]*)(\s[^>]*)?>/gi,
		(match, close: string, rawName: string, attributes = "") => {
			const name = rawName.toLowerCase();
			if (!STYLED.has(name)) return match;
			const stack = (open[name] ??= []);
			if (close) {
				const [drop, ...marks] = stack.pop() ?? [""];
				return `${marks
					.map((mark) => `</${mark}>`)
					.reverse()
					.join("")}${drop === "drop" ? "" : match}`;
			}
			const css = styleOf(attributes);
			const normal = (name === "b" || name === "strong") && /font-weight\s*:\s*(normal|[1-4]00)\b/i.test(css);
			const marks = styleMarks(css).filter((mark) => !(mark === "b" && (name === "b" || name === "strong")));
			stack.push([normal ? "drop" : "", ...marks]);
			return `${normal ? "" : match}${marks.map((mark) => `<${mark}>`).join("")}`;
		},
	);
}

/**
 * Converts resume HTML into the editor's internal `<html>…</html>` form. The wrapper makes both platforms use their
 * own parser: iOS treats short unwrapped fragments (under 13 characters, like `<p>Hi</p>`) as literal text, and the
 * fallback normaliser rewrites markup. Marks it can't represent are dropped here; that only reaches the resume if
 * the field is edited (README §0).
 */
export function toEnrichedHtml(html: string): string {
	let body = html.trim();
	if (!body) return "<html>\n<p></p>\n</html>";
	if (!body.includes("<")) body = `<p>${encode(body)}</p>`;
	body = styleMarksToTags(collapseListParagraphs(body))
		.replaceAll(/<(\/?)([a-z][a-z0-9]*)(\s[^>]*)?(\/?)>/gi, (_match, close: string, name: string, attributes = "") => {
			const tag = RENAMED[name.toLowerCase()] ?? name.toLowerCase();
			if (!ENRICHED_TAGS.has(tag)) return "";
			if (tag === "br") return "<br>";
			if (tag === "a" && !close) {
				const href = /\shref\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attributes);
				return href ? `<a href="${href[2] ?? href[3] ?? ""}">` : "<a>";
			}
			return `<${close}${tag}>`;
		})
		.replaceAll(/(<\/(?:p|li|ul|ol|blockquote|h[1-6])>)(?!\n)/g, "$1\n")
		.trim();
	return `<html>\n${body}\n</html>`;
}

export type RichTextSession = {
	/** What the editor mounts with (its `defaultValue`), computed once: editing never reloads it. */
	markup: string;
	focus: () => void;
	blur: () => void;
	/**
	 * An explicit user command (toolbar mark, link) is about to change the text. Its report is written even if a
	 * prompt took focus from the field, until the field is focused again or reloaded.
	 */
	command: () => void;
	/** The editor's serialisation of the stored value (`getHTML()` after it loaded it). May release a held edit. */
	baseline: (enrichedHtml: string) => string | null;
	/** The editor's HTML changed. Returns the HTML to write, or null: not an edit, or no change from the stored value. */
	change: (enrichedHtml: string) => string | null;
	/** The stored value changed from outside (undo, remote update). Returns the markup to load, or null to keep typing. */
	external: (value: string) => string | null;
	/** The caller wrote `value` itself (Improve's Replace). Returns the markup to load. */
	wrote: (value: string) => string;
};

/** One field's gate between the editor's reports and the draft store. Returned HTML is what the caller writes. */
export function createRichTextSession(initial: string): RichTextSession {
	let focused = false;
	let commanded = false;
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
		markup: toEnrichedHtml(initial),
		focus: () => {
			focused = true;
			commanded = false;
		},
		blur: () => {
			focused = false;
		},
		command: () => {
			commanded = true;
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
			const editing = focused || (commanded && baseline !== undefined);
			// Other reports are the editor parsing the stored value: they are its baseline, not an edit.
			if (!editing) baseline ??= enrichedHtml;
			// Until the baseline is known an edit is held, unless the field was empty (nothing to preserve).
			else if (baseline === undefined && original) pending = enrichedHtml;
			else return apply(enrichedHtml);
			return null;
		},
		external: (value) => {
			if (focused || value === last) return null;
			original = last = value;
			baseline = pending = undefined;
			commanded = false;
			return toEnrichedHtml(value);
		},
		wrote: (value) => {
			last = value;
			return toEnrichedHtml(value);
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
