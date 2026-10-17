// Rich-text plumbing between react-native-enriched-html and the letter's HTML strings. Pure, so Node can check it.
// ponytail: same rules as M3-T5's Write field (src/features/write/rich-text.ts on its branch); fold the two together
// once both have merged.
//
// Owner decision (README §0, §1.4): only a field the user actually edits is re-serialised. The native editor parses
// a field's HTML and reports its own serialisation back; that serialisation of the stored value is the field's
// baseline. Reports that equal the baseline, or arrive while the field isn't focused, never write, so untouched
// fields keep their original HTML byte for byte.

/** Converts the editor's `<html>\n<p>…</p>\n</html>` into the letter's HTML: no wrapper, no newlines, "" when empty. */
export function fromEnrichedHtml(html: string): string {
	let body = html.trim();
	if (body.startsWith("<html>")) body = body.slice(6);
	if (body.endsWith("</html>")) body = body.slice(0, -7);
	return body
		.replaceAll(/>\s*\n\s*</g, "><")
		.trim()
		.replace(/^(?:<br\s*\/?>|<p>\s*<\/p>)+/, "")
		.replace(/(?:<br\s*\/?>|<p>\s*<\/p>)+$/, "");
}

// The editor's own tag set. Anything else is unwrapped to its text when the editor loads it.
const ENRICHED_TAGS = new Set(["p", "br", "b", "i", "u", "s", "code", "a", "ul", "ol", "li", "blockquote"]);
const RENAMED: Record<string, string> = { strong: "b", em: "i", del: "s", strike: "s" };

const encode = (text: string) =>
	text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/**
 * Converts letter HTML into the editor's internal `<html>…</html>` form. The wrapper makes both platforms use their
 * own parser: iOS treats short unwrapped fragments (under 13 characters, like `<p>Hi</p>`) as literal text. Marks it
 * can't represent are dropped here; that only reaches the letter if the field is edited (README §0).
 */
export function toEnrichedHtml(html: string): string {
	let body = html.trim();
	if (!body) return "<html>\n<p></p>\n</html>";
	if (!body.includes("<")) body = `<p>${encode(body)}</p>`;
	body = body
		.replaceAll(/<li(\s[^>]*)?>\s*<p(\s[^>]*)?>([\s\S]*?)<\/p>\s*<\/li>/gi, "<li>$3</li>")
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
		.replaceAll(/(<\/(?:p|li|ul|ol|blockquote)>)(?!\n)/g, "$1\n")
		.trim();
	return `<html>\n${body}\n</html>`;
}

export type RichTextSession = {
	/** What the editor mounts with (its `defaultValue`), computed once: editing never reloads it. */
	markup: string;
	focus: () => void;
	blur: () => void;
	/** The editor's serialisation of the stored value (`getHTML()` after it loaded it). May release a held edit. */
	baseline: (enrichedHtml: string) => string | null;
	/** The editor's HTML changed. Returns the HTML to write, or null: not an edit, or no change from the stored value. */
	change: (enrichedHtml: string) => string | null;
	/** The stored value changed from outside (undo, remote update). Returns the markup to load, or null to keep typing. */
	external: (value: string) => string | null;
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
		markup: toEnrichedHtml(initial),
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
			// Reports while unfocused are the editor parsing the stored value: its baseline, not an edit.
			if (!focused) baseline ??= enrichedHtml;
			// Until the baseline is known an edit is held, unless the field was empty (nothing to preserve).
			else if (baseline === undefined && original) pending = enrichedHtml;
			else return apply(enrichedHtml);
			return null;
		},
		external: (value) => {
			if (focused || value === last) return null;
			original = last = value;
			baseline = pending = undefined;
			return toEnrichedHtml(value);
		},
	};
}
