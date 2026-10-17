// Run from the repository root: node docs/plans/native-mobile-app/reports/M4-T4/verify.mjs
// Executes the shipped length guide and AI draft streamer. The RPC stream and the letter draft store are simulated;
// zustand, ORPCError and the streaming/abort logic are the production code.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const letters = "../../../../../apps/mobile/src/features/letters";
const events = [];
let stream = null;
const fixture = {
	streamClient: {
		coverLetters: {
			draft: async (input, options) => {
				events.push({ kind: "stream", input });
				return stream(options.signal, input);
			},
		},
	},
	useLetterStore: {
		document: { id: "letter-1" },
		getState() {
			return {
				document: fixture.useLetterStore.document,
				flush: async () => void events.push({ kind: "flush" }),
			};
		},
	},
};
globalThis.__m4t4 = fixture;
const mocks = { "@/api/client": ["streamClient"], "@/draft": ["useLetterStore"] };
let draftingUrl;
registerHooks({
	resolve(specifier, context, next) {
		if (mocks[specifier])
			return {
				url: `data:text/javascript,${encodeURIComponent(mocks[specifier].map((name) => `export const ${name} = globalThis.__m4t4.${name};`).join("\n"))}`,
				shortCircuit: true,
			};
		// The harness's ORPCError is the one drafting.ts imports.
		if (specifier === "harness:orpc") return next("@orpc/client", { ...context, parentURL: draftingUrl });
		return next(specifier, context);
	},
});

const { LETTER_LENGTH, countWords, letterLength } = await import(`${letters}/length.ts`);
draftingUrl = new URL(`${letters}/drafting.ts`, import.meta.url).href;
const { startLetterDraft, discardLetterDraft, useLetterDrafting } = await import(draftingUrl);
const { ORPCError } = await import("harness:orpc");

let passed = 0;
async function check(name, run) {
	events.length = 0;
	discardLetterDraft();
	await run();
	passed++;
	console.log(`PASS ${name}`);
}
const draft = () => useLetterDrafting.getState().draft;
const words = (count) => `<p>${Array.from({ length: count }, (_, index) => `word${index}`).join(" ")}</p>`;

/** Chunks released one at a time by `next()`; the iterator ends early with AbortError once the signal aborts. */
function controlled(chunks) {
	const gates = [];
	let release;
	stream = async function* (signal) {
		for (const chunk of chunks) {
			await new Promise((resolve) => gates.push(resolve));
			if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
			yield chunk;
		}
		await new Promise((resolve) => gates.push(resolve));
	};
	release = async () => {
		while (!gates.length) await new Promise((resolve) => setImmediate(resolve));
		gates.shift()();
		await new Promise((resolve) => setImmediate(resolve));
	};
	return release;
}

// Word-count guide (web's 180–320 band).
await check("word count strips markup and non-breaking spaces", () => {
	assert.equal(countWords(""), 0);
	assert.equal(countWords("<p></p><p> </p>"), 0);
	assert.equal(countWords("<p>Dear&nbsp;team,</p><p>I&#160;build <b>tools</b> daily.</p>"), 6);
	assert.equal(countWords("<ul><li>one</li><li>two</li></ul>"), 2);
});
await check("length bands match the 180–320 guide", () => {
	assert.deepEqual(LETTER_LENGTH, { min: 180, max: 320, scale: 450 });
	assert.equal(letterLength(countWords("")), "empty");
	assert.equal(letterLength(countWords(words(1))), "short");
	assert.equal(letterLength(countWords(words(179))), "short");
	assert.equal(letterLength(countWords(words(180))), "comfortable");
	assert.equal(letterLength(countWords(words(320))), "comfortable");
	assert.equal(letterLength(countWords(words(321))), "long");
});

// AI draft over SSE.
await check("streams chunks after flushing, then holds the trimmed draft for Keep", async () => {
	const next = controlled([" I build ", "editor tools.", " \n"]);
	const running = startLetterDraft();
	assert.deepEqual(draft(), { phase: "streaming", text: "" });
	await next();
	assert.deepEqual(events.map((event) => event.kind), ["flush", "stream"]);
	assert.deepEqual(events[1].input, { id: "letter-1", variant: "draft" });
	assert.deepEqual(draft(), { phase: "streaming", text: " I build " });
	await next();
	assert.deepEqual(draft(), { phase: "streaming", text: " I build editor tools." });
	await next();
	await next();
	await running;
	assert.deepEqual(draft(), { phase: "ready", text: "I build editor tools." });
});
await check("Shorter and More personal revise the previous draft; Try again repeats it", async () => {
	const next = controlled(["Short."]);
	const running = startLetterDraft("shorter", "A long draft.");
	await next();
	await next();
	await running;
	assert.deepEqual(events[1].input, { id: "letter-1", variant: "shorter", previous: "A long draft." });
	assert.deepEqual(useLetterDrafting.getState().last, { variant: "shorter", previous: "A long draft." });
	assert.deepEqual(draft(), { phase: "ready", text: "Short." });
});
await check("an empty draft fails instead of offering nothing to keep", async () => {
	const next = controlled(["  ", "\n"]);
	const running = startLetterDraft();
	await next();
	await next();
	await next();
	await running;
	assert.equal(draft().phase, "failed");
	assert.equal(draft().provider, null);
});
await check("a provider that doesn't respond is named in the failure", async () => {
	stream = async function* () {
		yield "Partial";
		throw new ORPCError("BAD_GATEWAY", { data: { provider: "OpenAI" } });
	};
	await startLetterDraft();
	assert.equal(draft().phase, "failed");
	assert.equal(draft().provider, "OpenAI");
	assert.equal(draft().error.code, "BAD_GATEWAY");
});
await check("Stop aborts the stream and leaves no draft, even if chunks were in flight", async () => {
	let signal;
	const next = controlled(["One ", "two"]);
	const original = stream;
	stream = (aborting, input) => {
		signal = aborting;
		return original(aborting, input);
	};
	const running = startLetterDraft();
	await next();
	assert.deepEqual(draft(), { phase: "streaming", text: "One " });
	discardLetterDraft();
	assert.equal(signal.aborted, true);
	await next();
	await running;
	assert.deepEqual(draft(), { phase: "idle" });
});
await check("a newer draft supersedes an older one still streaming", async () => {
	const signals = [];
	const firstGate = [];
	stream = async function* (signal, input) {
		signals.push(signal);
		if (input.variant === "draft") {
			await new Promise((resolve) => firstGate.push(resolve));
			yield "stale";
			return;
		}
		yield "Personal.";
	};
	const first = startLetterDraft("draft");
	while (!signals.length) await new Promise((resolve) => setImmediate(resolve));
	await startLetterDraft("personal", "Old.");
	firstGate[0]();
	await first;
	assert.equal(signals[0].aborted, true);
	assert.deepEqual(draft(), { phase: "ready", text: "Personal." });
});
await check("switching letters while saving never streams into the new one", async () => {
	let switched = false;
	fixture.useLetterStore.getState = () => ({
		document: switched ? { id: "letter-2" } : { id: "letter-1" },
		flush: async () => {
			switched = true;
		},
	});
	stream = async function* () {
		yield "wrong letter";
	};
	await startLetterDraft();
	assert.equal(
		events.some((event) => event.kind === "stream"),
		false,
	);
	assert.deepEqual(draft(), { phase: "idle" });
});

// Rich text: only an edited field is re-serialised (README §0).
const { createRichTextSession, toEnrichedHtml } = await import(`${letters}/rich-text.ts`);
await check("the body keeps its HTML byte for byte until the user edits it", () => {
	const stored = '<p>Hi <strong class="x">there</strong></p><table><tr><td>kept</td></tr></table>';
	const session = createRichTextSession(stored);
	assert.equal(session.markup, "<html>\n<p>Hi <b>there</b></p>\nkept\n</html>");
	// The editor parses the value and reports its own serialisation while unfocused: not an edit.
	assert.equal(session.change("<html>\n<p>Hi <b>there</b></p>\n<p>kept</p>\n</html>"), null);
	session.focus();
	// Focus without a change reports the baseline again: still the stored HTML.
	assert.equal(session.change("<html>\n<p>Hi <b>there</b></p>\n<p>kept</p>\n</html>"), null);
	assert.equal(session.change("<html>\n<p>Hi <b>there</b>!</p>\n<p>kept</p>\n</html>"), "<p>Hi <b>there</b>!</p><p>kept</p>");
});
await check("short fragments are wrapped so iOS parses them as HTML", () => {
	assert.equal(toEnrichedHtml("<p>Hi</p>"), "<html>\n<p>Hi</p>\n</html>");
	assert.equal(toEnrichedHtml("Hi & bye"), "<html>\n<p>Hi &amp; bye</p>\n</html>");
	assert.equal(toEnrichedHtml(""), "<html>\n<p></p>\n</html>");
});
await check("a kept draft loads into an unfocused body; typing is never overwritten", () => {
	const session = createRichTextSession("");
	session.change("<html>\n<p></p>\n</html>");
	assert.equal(session.external("<p>Kept draft.</p>"), "<html>\n<p>Kept draft.</p>\n</html>");
	session.focus();
	assert.equal(session.external("<p>Remote.</p>"), null);
});

console.log(`${passed} scenarios passed`);
