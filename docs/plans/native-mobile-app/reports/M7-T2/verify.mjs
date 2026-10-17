// M7-T2 Node scenarios: search ranking and the public viewer's rich-text sanitiser, run on the shipped sources
// through Node's type stripping. Run from the repo root: node docs/plans/native-mobile-app/reports/M7-T2/verify.mjs
import assert from "node:assert/strict";
import { parseRichText } from "../../../../../apps/mobile/src/features/public/html.ts";
import { rank } from "../../../../../apps/mobile/src/features/search/rank.ts";

let passed = 0;
const scenario = (name, run) => {
	run();
	passed += 1;
	console.log(`ok ${passed} ${name}`);
};
const titles = (items) => items.map((item) => item.title);

const docs = [
	{ title: "Unity Engineer, Northwind Labs", keywords: ["games"], time: 1 },
	{ title: "Senior Game Developer", keywords: ["Northwind Labs", "Unity Engineer"], time: 3 },
	{ title: "Northwind cover letter", keywords: [], time: 2 },
	{ title: "Technical Artist", keywords: ["shaders"], time: 4 },
	{ title: "Café résumé", keywords: [], time: 0 },
];

scenario("empty query keeps everything, newest first", () => {
	assert.deepEqual(titles(rank("", docs)), [
		"Technical Artist",
		"Senior Game Developer",
		"Northwind cover letter",
		"Unity Engineer, Northwind Labs",
		"Café résumé",
	]);
});

scenario("prefix beats word start beats keyword match; ties go to the newest", () => {
	assert.deepEqual(titles(rank("north", docs)), [
		"Northwind cover letter",
		"Unity Engineer, Northwind Labs",
		"Senior Game Developer",
	]);
});

scenario("every term must match, across title and keywords", () => {
	assert.deepEqual(titles(rank("senior unity", docs)), ["Senior Game Developer"]);
	assert.deepEqual(titles(rank("unity shaders", docs)), []);
});

scenario("case and accents are ignored", () => {
	assert.deepEqual(titles(rank("CAFE RESUME", docs)), ["Café résumé"]);
});

scenario("substring matches rank last; no match is dropped", () => {
	assert.deepEqual(titles(rank("ist", docs)), ["Technical Artist"]);
	assert.deepEqual(titles(rank("lisbon office", docs)), []);
});

const text = (blocks) => blocks.map((block) => `${block.kind}:${block.marker ?? ""}${block.runs.map((run) => run.text).join("")}`);

scenario("TipTap paragraphs and lists become blocks with markers and depth", () => {
	const blocks = parseRichText(
		"<p>Led <strong>12</strong> engineers</p><ul><li><p>Cut build time</p></li><li><p>Shipped <em>v2</em></p><ol><li><p>Nested</p></li></ol></li></ul>",
	);
	assert.deepEqual(text(blocks), ["paragraph:Led 12 engineers", "item:•Cut build time", "item:•Shipped v2", "item:1.Nested"]);
	assert.deepEqual(
		blocks.map((block) => block.depth),
		[0, 0, 0, 1],
	);
	assert.equal(blocks[0].runs[1].bold, true);
	assert.equal(blocks[2].runs[1].italic, true);
});

scenario("only http, mailto and tel links stay links; the text survives", () => {
	const blocks = parseRichText(
		`<p><a href="https://example.com">site</a> <a href='javascript:alert(1)'>bad</a> <a href=mailto:a@b.co>mail</a></p>`,
	);
	const runs = blocks[0].runs;
	assert.equal(runs.find((run) => run.text === "site").href, "https://example.com");
	assert.equal(runs.find((run) => run.text === "bad").href, undefined);
	assert.equal(runs.find((run) => run.text === "mail").href, "mailto:a@b.co");
});

scenario("scripts, styles and comments are dropped; unknown tags keep their text; entities decode", () => {
	const blocks = parseRichText(
		"<p>A&amp;B &lt;tag&gt; &#8217;s &#x2014; <script>alert(1)</script><style>p{}</style><!-- note --><span>kept</span> <img src=x onerror=alert(1)></p><h2>Heading</h2><blockquote><p>Quoted</p></blockquote>",
	);
	assert.deepEqual(text(blocks), ["paragraph:A&B <tag> ’s — kept", "heading:Heading", "quote:Quoted"]);
});

scenario("line breaks are kept and whitespace collapses; empty paragraphs vanish", () => {
	const blocks = parseRichText("<p>  one<br>two   three </p><p> </p><p></p>");
	assert.deepEqual(text(blocks), ["paragraph:one\ntwo three"]);
});

scenario("malformed HTML parses in linear time and stays bounded", () => {
	const hostile = [
		"<a".repeat(40_000),
		"<!--".repeat(40_000),
		`<a href="${"x".repeat(80_000)}`,
		"<p>".repeat(40_000),
		"<strong>".repeat(40_000) + "deep",
		"&#".repeat(40_000),
		"<ul><li>".repeat(20_000) + "x",
	];
	for (const html of hostile) {
		const started = performance.now();
		const blocks = parseRichText(html);
		const elapsed = performance.now() - started;
		assert.ok(elapsed < 500, `${html.slice(0, 12)}… took ${Math.round(elapsed)} ms`);
		assert.ok(blocks.every((block) => block.depth <= 16));
	}
	// Text after a broken tag still reads; a stray "<" stays text.
	assert.deepEqual(text(parseRichText("<p>a < b <a href='https://x.dev' oops <b>bold</b></p>")), ["paragraph:a < b <a href='https://x.dev' oops bold"]);
});

console.log(`${passed} scenarios passed`);
