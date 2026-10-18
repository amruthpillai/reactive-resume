// A resume's rich text as plain blocks for native <Text>. The owner's HTML is never rendered as markup: only
// formatting tags and plain links survive, everything else keeps just its text (web: public/rich-text.tsx). Pure, so
// Node scripts can run it.

export type Run = {
	text: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strike?: boolean;
	code?: boolean;
	href?: string;
};

export type Block = {
	kind: "paragraph" | "heading" | "quote" | "item";
	/** List nesting; 0 outside lists. */
	depth: number;
	/** "•" or "3." for list items. */
	marker?: string;
	runs: Run[];
};

type Mark = "bold" | "italic" | "underline" | "strike" | "code";

const MARKS: Record<string, Mark> = {
	strong: "bold",
	b: "bold",
	em: "italic",
	i: "italic",
	u: "underline",
	s: "strike",
	strike: "strike",
	del: "strike",
	code: "code",
};
const BLOCKS = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"]);
// Their contents are code or markup, not text anyone wrote for the page.
const DROPPED = new Set(["script", "style", "template", "noscript", "iframe", "object"]);
const SAFE_HREF = /^(https?:|mailto:|tel:)/i;
// Linear on malformed input: a tag stops at the next "<" and its name must end at whitespace, "/" or ">", so a failed
// match never rescans the rest of the string; an unterminated comment swallows the rest, as browsers do.
const TOKEN = /<!--[\s\S]*?(?:-->|$)|<(\/?)([a-zA-Z][a-zA-Z0-9]*)(?=[\s/>])([^<>]*)>|([^<]+)|</g;
// Rich text fields are a few KB; anything past this is not resume text.
const MAX_LENGTH = 200_000;
// Deeper nesting adds nothing readable and would make every run copy a long mark stack.
const MAX_DEPTH = 16;
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const decode = (text: string) =>
	text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{1,8});/gi, (entity, body: string) => {
		if (body[0] !== "#") return NAMED[body.toLowerCase()] ?? entity;
		const code = body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
		return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
	});

const attribute = (attributes: string, name: string) =>
	new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
		.exec(attributes)
		?.slice(1)
		.find((value) => value !== undefined);

export function parseRichText(html: string): Block[] {
	const blocks: Block[] = [];
	const marks: (Mark | { href: string } | null)[] = [];
	const lists: { ordered: boolean; count: number }[] = [];
	// Typed through `as`: `start` assigns it inside a closure, which control-flow narrowing cannot see.
	let current = null as Block | null;
	let quote = 0;
	let dropped: string | null = null;
	// Marks opened past MAX_DEPTH, so their closing tags pop nothing real.
	let overflow = 0;

	const start = (kind: Block["kind"], marker?: string) => {
		current = {
			kind,
			depth: Math.min(MAX_DEPTH, Math.max(0, lists.length - (kind === "item" ? 1 : 0))),
			runs: [],
			...(marker ? { marker } : {}),
		};
		blocks.push(current);
		return current;
	};
	const block = () => current ?? start(quote > 0 ? "quote" : "paragraph");
	const push = (text: string) => {
		const run: Run = { text };
		for (const mark of marks) {
			if (mark === null) continue;
			if (typeof mark === "string") run[mark] = true;
			else run.href = mark.href;
		}
		block().runs.push(run);
	};

	for (const [token, closing, rawTag, attributes = "", text] of html.slice(0, MAX_LENGTH).matchAll(TOKEN)) {
		const tag = rawTag?.toLowerCase();
		if (token.startsWith("<!--")) continue;
		if (dropped) {
			if (closing && tag === dropped) dropped = null;
			continue;
		}
		if (text !== undefined || !tag) {
			const value = decode(text ?? "<").replace(/\s+/g, " ");
			if (value.trim() || current) push(value);
			continue;
		}
		if (DROPPED.has(tag)) {
			if (!closing && !attributes.trim().endsWith("/")) dropped = tag;
		} else if (tag === "br") {
			push("\n");
		} else if (tag in MARKS || tag === "a" || tag === "mark") {
			if (closing) {
				if (overflow > 0) overflow -= 1;
				else marks.pop();
			} else if (marks.length >= MAX_DEPTH) overflow += 1;
			else if (tag === "a") {
				const href = attribute(attributes, "href")?.trim() ?? "";
				marks.push(SAFE_HREF.test(href) ? { href } : null);
			} else marks.push(MARKS[tag] ?? null);
		} else if (tag === "ul" || tag === "ol") {
			current = null;
			if (closing) lists.pop();
			else lists.push({ ordered: tag === "ol", count: 0 });
		} else if (tag === "li") {
			current = null;
			const list = lists.at(-1);
			if (!closing && list) {
				list.count += 1;
				start("item", list.ordered ? `${list.count}.` : "•");
			}
		} else if (tag === "blockquote") {
			current = null;
			quote = Math.max(0, quote + (closing ? -1 : 1));
		} else if (BLOCKS.has(tag)) {
			// A list item's own first paragraph (<li><p>…</p></li>) stays on the marker's line.
			const opensItem = current?.kind === "item" && current.runs.length === 0;
			if (closing) current = null;
			else if (!opensItem) start(tag.startsWith("h") ? "heading" : quote > 0 ? "quote" : "paragraph");
		}
	}

	return blocks.flatMap((entry) => {
		const runs = entry.runs.filter((run) => run.text);
		const first = runs[0];
		const last = runs.at(-1);
		if (first) first.text = first.text.trimStart();
		if (last && last.text !== "\n") last.text = last.text.trimEnd();
		return runs.some((run) => run.text.trim()) ? [{ ...entry, runs: runs.filter((run) => run.text) }] : [];
	});
}
