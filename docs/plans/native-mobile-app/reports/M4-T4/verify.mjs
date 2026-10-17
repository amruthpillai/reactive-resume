// Run from the repository root: node docs/plans/native-mobile-app/reports/M4-T4/verify.mjs
// Executes the shipped length guide, AI draft streamer, link/restore helpers and M3-T5's rich-text session. The RPC
// client and the account scope are simulated; zustand, immer, ORPCError, the real draft store (src/draft/store.ts)
// and the streaming/abort logic are production code.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const mobile = "../../../../../apps/mobile/src";
const letters = `${mobile}/features/letters`;
const events = [];
let stream = null;

/** A stand-in letter store: `flush` leaves `status`/`conflict` as a real save would. */
function simpleStore({ id = "letter-1", status = "saved", conflict = null } = {}) {
	const state = {
		document: { id },
		status,
		conflict,
		flush: async () => void events.push({ kind: "flush" }),
		open: async (opened) => void events.push({ kind: "open", id: opened }),
	};
	return { getState: () => state, state };
}

const fixture = {
	store: simpleStore(),
	scope: "server/user-a",
	streamClient: {
		coverLetters: {
			draft: async (input, options) => {
				events.push({ kind: "stream", input });
				return stream(options.signal, input);
			},
		},
	},
	client: { coverLetters: {} },
	useLetterStore: {
		getState: () => fixture.store.getState(),
		subscribe: (listener) => fixture.store.subscribe(listener),
	},
	getDraftScope: async () => fixture.scope,
};
globalThis.__m4t4 = fixture;
const mocks = {
	"@/api/client": ["streamClient", "client"],
	"@/draft": ["useLetterStore", "getDraftScope"],
};
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
		// Metro resolves extensionless relative imports; Node needs the file name.
		if (specifier.startsWith(".") && context.parentURL?.includes("/apps/mobile/src/") && !/\.\w+$/.test(specifier))
			return next(`${specifier}.ts`, context);
		return next(specifier, context);
	},
});

const { LETTER_LENGTH, countWords, letterLength } = await import(`${letters}/length.ts`);
draftingUrl = new URL(`${letters}/drafting.ts`, import.meta.url).href;
const { startLetterDraft, discardLetterDraft, useLetterDrafting } = await import(draftingUrl);
const { nextLetterVisit, relinkLetter, restoreLetterVersion } = await import(`${letters}/save.ts`);
const { createDraftStore } = await import(`${mobile}/draft/store.ts`);
const { ORPCError } = await import("harness:orpc");

let passed = 0;
async function check(name, run) {
	events.length = 0;
	fixture.store = simpleStore();
	fixture.scope = "server/user-a";
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
	fixture.store.state.flush = async () => {
		fixture.store.state.document = { id: "letter-2" };
	};
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
const { createRichTextSession, toEnrichedHtml } = await import(`${mobile}/features/write/rich-text.ts`);
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

// Review blocker 1: drafting starts only after a confirmed save.
for (const [label, saved] of [
	["a failed save", { status: "error" }],
	["an offline save", { status: "offline" }],
	["a conflict", { status: "error", conflict: { remote: {} } }],
])
	await check(`${label} stops drafting before it streams against stale links`, async () => {
		fixture.store = simpleStore(saved);
		stream = async function* () {
			yield "from stale links";
		};
		await startLetterDraft();
		assert.deepEqual(events.map((event) => event.kind), ["flush"]);
		assert.deepEqual(draft(), { phase: "unsaved" });
	});

// Review blocker 2: linking the design keeps the server-resolved style in undo history.
/** The letter adapter's shape (src/draft/adapters.ts) over a server that resolves linked designs from the resume. */
function letterServer() {
	const own = { metadata: { template: "onyx", design: { colors: { primary: "rgba(160, 68, 42, 1)" } } } };
	const resume = { metadata: { template: "pikachu", design: { colors: { primary: "rgba(62, 107, 79, 1)" } } } };
	const editable = ["content", "sourceResumeId", "senderLinked", "designLinked", "style"];
	const fields = (letter) => Object.fromEntries(editable.map((key) => [key, letter[key]]));
	const changed = (current, base) =>
		Object.fromEntries(
			Object.entries(fields(current)).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(base[key])),
		);
	let remote = {
		id: "letter-1",
		isLocked: false,
		revision: 1,
		content: "<p>Hello</p>",
		sourceResumeId: "resume-1",
		senderLinked: true,
		designLinked: false,
		style: own,
	};
	const saves = [];
	const network = { online: true, failing: false };
	const adapter = {
		kind: "letter",
		delay: 800,
		read: async () => structuredClone(remote),
		data: (letter) => letter,
		withData: (letter, data) => ({ ...letter, ...fields(data) }),
		version: (letter) => letter.revision,
		matches: (left, right) => Object.keys(changed(left, right)).length === 0,
		merge: (saved, submitted, current) => ({ ...saved, ...changed(current, submitted) }),
		parse: (value) => value,
		isConflict: () => false,
		copy: async () => {},
		save: async (letter, baseline) => {
			if (network.failing) throw new Error("unreachable");
			const input = changed(letter, baseline);
			saves.push(input);
			// As coverLetterService.update: sending a design ends the link; a link reads the resume's design.
			const ownDesign = "style" in input && JSON.stringify(letter.style.metadata) !== JSON.stringify(baseline.style.metadata);
			const designLinked = !ownDesign && (input.designLinked ?? remote.designLinked);
			remote = {
				...remote,
				...input,
				revision: remote.revision + 1,
				designLinked,
				style: designLinked ? resume : ownDesign ? letter.style : remote.style,
			};
			return structuredClone(remote);
		},
	};
	const disk = new Map();
	const draftStore = createDraftStore(adapter, {
		storage: {
			getItemSync: (key) => disk.get(key) ?? null,
			setItemSync: (key, value) => disk.set(key, value),
			removeItemSync: (key) => disk.delete(key),
			getAllKeysSync: () => [...disk.keys()],
		},
		scope: async () => "server/user-a",
		online: () => network.online,
		focused: () => false,
	});
	return { store: draftStore.store, saves, resume, network, remote: () => remote };
}

await check("undoing typing after Match the resume keeps the resume's design and the link", async () => {
	const server = letterServer();
	fixture.store = server.store;
	const state = server.store.getState;
	await state().open("letter-1");
	state().update((letter) => void (letter.content = "<p>Hello there</p>"), { coalesceKey: "content" });
	await state().flush();
	assert.equal(await relinkLetter((letter) => void (letter.designLinked = true)), "linked");
	await new Promise((resolve) => setImmediate(resolve));
	assert.deepEqual(state().document.style, server.resume);
	state().undo();
	assert.equal(state().document.content, "<p>Hello</p>");
	assert.equal(state().document.designLinked, true);
	assert.deepEqual(state().document.style, server.resume);
	await state().flush();
	assert.equal(server.remote().designLinked, true);
	assert.equal(server.remote().content, "<p>Hello</p>");
	assert.ok(server.saves.every((input) => !("style" in input) || input.designLinked !== false));
	state().redo();
	assert.equal(state().document.designLinked, true);
	assert.deepEqual(state().document.style, server.resume);
	await state().close();
});
await check("pending edits that can't be saved stop the link change before it's made", async () => {
	fixture.store = simpleStore({ status: "error" });
	fixture.store.state.updateDocument = () => void events.push({ kind: "updateDocument" });
	assert.equal(await relinkLetter(() => {}), "unsaved");
	assert.deepEqual(events.map((event) => event.kind), ["flush"]);
});

// Second review, blocker 1: pending design edits are saved before the link change, which then goes alone.
await check("Match after a pending design edit saves the edit first, then links on its own", async () => {
	const server = letterServer();
	fixture.store = server.store;
	const state = server.store.getState;
	await state().open("letter-1");
	state().update((letter) => {
		letter.style.metadata.design.colors.primary = "rgba(47, 90, 138, 1)";
	});
	assert.equal(await relinkLetter((letter) => void (letter.designLinked = true)), "linked");
	assert.deepEqual(
		server.saves.map((input) => Object.keys(input)),
		[["style"], ["designLinked"]],
	);
	assert.equal(server.remote().designLinked, true);
	assert.equal(state().document.designLinked, true);
	assert.deepEqual(state().document.style, server.resume);
	await state().close();
});

// Second review, blocker 2: a link confirmed later (Retry, reconnect) still rebases history.
for (const [label, interrupt, recover] of [
	[
		"a failed save and Retry",
		(server) => void (server.network.failing = true),
		async (server, state) => {
			server.network.failing = false;
			state().retry();
		},
	],
	[
		"going offline and reconnecting",
		(server) => void (server.network.online = false),
		async (server, state) => {
			server.network.online = true;
			await state().flush();
		},
	],
])
	await check(`a link confirmed after ${label} still keeps undo from unlinking`, async () => {
		const server = letterServer();
		fixture.store = server.store;
		const state = server.store.getState;
		await state().open("letter-1");
		state().update((letter) => void (letter.content = "<p>Hello there</p>"), { coalesceKey: "content" });
		await state().flush();
		interrupt(server);
		assert.equal(await relinkLetter((letter) => void (letter.designLinked = true)), "queued");
		assert.equal(server.remote().designLinked, false);
		await recover(server, state);
		for (let tick = 0; tick < 20 && state().status !== "saved"; tick++)
			await new Promise((resolve) => setImmediate(resolve));
		await new Promise((resolve) => setImmediate(resolve));
		assert.equal(server.remote().designLinked, true);
		state().undo();
		assert.equal(state().document.content, "<p>Hello</p>");
		assert.equal(state().document.designLinked, true);
		assert.deepEqual(state().document.style, server.resume);
		await state().flush();
		assert.equal(server.remote().designLinked, true);
		await state().close();
	});
await check("a link left unconfirmed when the editor closes never rebases another visit", async () => {
	const server = letterServer();
	fixture.store = server.store;
	const state = server.store.getState;
	await state().open("letter-1");
	state().update((letter) => void (letter.content = "<p>Hello there</p>"), { coalesceKey: "content" });
	await state().flush();
	server.network.online = false;
	assert.equal(await relinkLetter((letter) => void (letter.designLinked = true)), "queued");
	nextLetterVisit();
	const writes = server.saves.length;
	server.network.online = true;
	await state().flush();
	await new Promise((resolve) => setImmediate(resolve));
	// The queued link still saves; only the history rebase (one extra empty save) is dropped with the visit.
	assert.equal(server.remote().designLinked, true);
	assert.equal(server.saves.length, writes + 1);
	await state().close();
});

// Review blocker 3: a restore that finishes after the user moved on never replaces their draft.
async function restoreWhile(change) {
	let finish;
	fixture.client.coverLetters.restoreVersion = (input) =>
		new Promise((resolve) => {
			events.push({ kind: "restore", input });
			finish = resolve;
		});
	const running = restoreLetterVersion("letter-1", "version-1", () => new Error("unsaved"));
	while (!finish) await new Promise((resolve) => setImmediate(resolve));
	change();
	finish();
	return running;
}
await check("restore reopens the letter when the same visit is still open", async () => {
	assert.equal(await restoreWhile(() => {}), true);
	assert.deepEqual(events.map((event) => event.kind), ["flush", "restore", "open"]);
});
for (const [label, change] of [
	["the user left the editor", () => nextLetterVisit()],
	["another letter is open", () => void (fixture.store.state.document = { id: "letter-2" })],
	["another account signed in", () => void (fixture.scope = "server/user-b")],
])
	await check(`restore finishing after ${label} leaves the open draft alone`, async () => {
		assert.equal(await restoreWhile(change), false);
		assert.equal(
			events.some((event) => event.kind === "open"),
			false,
		);
	});
await check("restore refuses to run on unsaved changes", async () => {
	fixture.store = simpleStore({ status: "offline" });
	fixture.client.coverLetters.restoreVersion = async () => void events.push({ kind: "restore" });
	await assert.rejects(restoreLetterVersion("letter-1", "version-1", () => new Error("unsaved")), /unsaved/);
	assert.deepEqual(events.map((event) => event.kind), ["flush"]);
});

console.log(`${passed} scenarios passed`);
