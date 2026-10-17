// Run from repository root:
//   node --import ./apps/server/node_modules/tsx/dist/loader.mjs docs/plans/native-mobile-app/reports/M3-T5/verify.mjs
// Executes the shipped rich-text gate, date helpers, outline model and the real M3-T3 draft store. Only the
// native editor's reports and the network adapter are simulated.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { sampleResumeData } from "../../../../../packages/schema/src/resume/sample.ts";
import { createDraftStore } from "../../../../../apps/mobile/src/draft/store.ts";
import {
	editDates,
	fromPickerDate,
	isReversed,
	pickerDate,
	readTypedDate,
	showYearMonth,
} from "../../../../../apps/mobile/src/features/write/dates.ts";
import {
	applySectionDrop,
	findEntry,
	findPlacement,
	getSectionObject,
	NO_PAGES,
	readData,
	selectPages,
	flattenOutline,
	getOutlineRows,
	moveItem,
	resolveDrop,
	resolveSection,
} from "../../../../../apps/mobile/src/features/write/model.ts";
import {
	createRichTextSession,
	fromEnrichedHtml,
	getLines,
	lineAtCaret,
	replaceLine,
	toEnrichedHtml,
} from "../../../../../apps/mobile/src/features/write/rich-text.ts";
import { claimUpload, commitUpload } from "../../../../../apps/mobile/src/features/write/upload.ts";

// immer resolves from the mobile app, as in the app bundle.
const { produce } = createRequire(new URL("../../../../../apps/mobile/package.json", import.meta.url))("immer");

let passed = 0;
async function check(name, run) {
	await run();
	console.log(`PASS ${name}`);
	passed++;
}
const drain = async () => {
	for (let i = 0; i < 30; i++) await Promise.resolve();
};

/** What react-native-enriched-html reports for stored HTML: its own tag set, marks it can't hold dropped. */
const enriched = (html) =>
	`<html>\n${html
		.replaceAll(/<\/?(mark|span)[^>]*>/g, "")
		.replaceAll(/ style="[^"]*"/g, "")
		.replaceAll("<strong>", "<b>")
		.replaceAll("</strong>", "</b>")
		.replaceAll("<em>", "<i>")
		.replaceAll("</em>", "</i>")
		.replaceAll(/<li><p>([\s\S]*?)<\/p><\/li>/g, "<li>$1</li>")
		.replaceAll(/(<\/(p|ul|ol|li)>)/g, "$1\n")}\n</html>`;

// Rich HTML the native editor can't represent: highlight colours, alignment, nested list paragraphs.
const RICH = {
	summary: '<p style="text-align: center">Lead <mark data-color="#ff0">engineer</mark> with <strong>10</strong> years.</p>',
	experience:
		'<ul><li><p>Shipped <span style="color: rgb(220, 38, 38)">three</span> titles</p></li><li><p>Cut load time by 35%</p></li></ul>',
	project: '<p><em>Open source</em> dialogue editor<mark>.</mark></p>',
};

function fixture() {
	const data = structuredClone(sampleResumeData);
	data.summary.content = RICH.summary;
	const experience = data.sections.experience.items[0];
	const project = data.sections.projects.items[0];
	experience.description = RICH.experience;
	project.description = RICH.project;
	let remote = { id: "resume", isLocked: false, updatedAt: 1, data };
	const saves = [];
	const adapter = {
		kind: "resume",
		delay: 500,
		read: async () => structuredClone(remote),
		data: (d) => d.data,
		withData: (d, next) => ({ ...d, data: next }),
		version: (d) => d.updatedAt,
		matches: (a, b) => JSON.stringify(a.data) === JSON.stringify(b.data),
		parse: (d) => d,
		merge: (saved, _submitted, current) => ({ ...saved, data: current.data }),
		isConflict: () => false,
		save: async (d) => {
			saves.push(structuredClone(d.data));
			remote = { ...d, updatedAt: remote.updatedAt + 1 };
			return structuredClone(remote);
		},
		copy: async () => undefined,
	};
	const disk = new Map();
	const env = {
		storage: {
			getItemSync: (k) => disk.get(k) ?? null,
			setItemSync: (k, v) => disk.set(k, v),
			removeItemSync: (k) => disk.delete(k),
			getAllKeysSync: () => [...disk.keys()],
		},
		scope: async () => "local/user",
		online: () => true,
		focused: () => false,
	};
	const draft = createDraftStore(adapter, env);
	return { draft, saves, experienceId: experience.id, projectId: project.id };
}

/** The entry writer's recipe (hooks.ts useEntryWriter) with its coalesceKey. */
const writeEntry = (draft, sectionId, entryId, key, value) =>
	draft.store.getState().update(
		(d) => {
			const entry = findEntry(d, sectionId, entryId);
			if (entry) entry[key] = value;
		},
		{ coalesceKey: `${entryId}:${key}` },
	);

await check("fromEnrichedHtml: strips the wrapper and newlines, empty is blank, edge blank lines go", () => {
	assert.equal(fromEnrichedHtml("<html>\n<p>One</p>\n<ul>\n<li>Two</li>\n</ul>\n</html>"), "<p>One</p><ul><li>Two</li></ul>");
	assert.equal(fromEnrichedHtml("<html>\n<p></p>\n</html>"), "");
	assert.equal(fromEnrichedHtml("<html>\n<br>\n<p>Text</p>\n<br>\n</html>"), "<p>Text</p>");
	assert.equal(fromEnrichedHtml("<p>Keep  two  spaces</p>"), "<p>Keep  two  spaces</p>");
});

await check("mounting editors never writes; untouched fields keep their HTML byte for byte", async () => {
	const f = fixture();
	await f.draft.store.getState().open("resume");
	const before = f.draft.store.getState().data;
	const sessions = Object.values(RICH).map((html) => createRichTextSession(html));
	Object.values(RICH).forEach((html, index) => {
		const session = sessions[index];
		// Mount: the editor parses the value and reports its serialisation, unfocused, twice.
		assert.equal(session.change(enriched(html)), null);
		assert.equal(session.baseline(enriched(html)), null);
		// Focus and leave without typing.
		session.focus();
		assert.equal(session.change(enriched(html)), null);
		session.blur();
	});
	assert.equal(f.draft.store.getState().data, before, "no update reached the draft store");
	await f.draft.store.getState().flush();
	assert.equal(f.saves.length, 0);
});

await check("editing one field re-serialises only that field; the save keeps every other HTML string", async () => {
	const f = fixture();
	await f.draft.store.getState().open("resume");
	const experience = createRichTextSession(RICH.experience);
	const summary = createRichTextSession(RICH.summary);
	const project = createRichTextSession(RICH.project);
	for (const [session, html] of [
		[experience, RICH.experience],
		[summary, RICH.summary],
		[project, RICH.project],
	])
		session.change(enriched(html));

	experience.focus();
	const typed = "<html>\n<ul>\n<li>Shipped three titles on time</li>\n<li>Cut load time by 35%</li>\n</ul>\n</html>";
	const html = experience.change(typed);
	assert.equal(html, "<ul><li>Shipped three titles on time</li><li>Cut load time by 35%</li></ul>");
	writeEntry(f.draft, "experience", f.experienceId, "description", html);
	experience.blur();
	await f.draft.store.getState().flush();

	assert.equal(f.saves.length, 1);
	const saved = f.saves[0];
	assert.equal(saved.sections.experience.items[0].description, html);
	assert.equal(saved.summary.content, RICH.summary, "summary untouched, marks and alignment kept");
	assert.equal(saved.sections.projects.items[0].description, RICH.project, "project untouched");
	// Everything else in the resume is unchanged too.
	const expected = structuredClone(saved);
	expected.sections.experience.items[0].description = RICH.experience;
	const original = fixture();
	await original.draft.store.getState().open("resume");
	assert.deepEqual(expected, original.draft.store.getState().data);
});

await check("typing back to the original restores the stored HTML verbatim, not the editor's version", () => {
	const session = createRichTextSession(RICH.summary);
	session.change(enriched(RICH.summary));
	session.focus();
	assert.equal(session.change("<html>\n<p>Lead engineer with <b>10</b> years!</p>\n</html>"), "<p>Lead engineer with <b>10</b> years!</p>");
	assert.equal(session.change(enriched(RICH.summary)), RICH.summary);
	assert.equal(session.change(enriched(RICH.summary)), null, "no duplicate write");
});

await check("an edit before the baseline arrives is held, then written once it's known", () => {
	const session = createRichTextSession(RICH.project);
	session.focus();
	assert.equal(session.change("<html>\n<p>Edited</p>\n</html>"), null);
	assert.equal(session.baseline(enriched(RICH.project)), "<p>Edited</p>");
	// An empty field has nothing to preserve, so it writes at once.
	const empty = createRichTextSession("");
	empty.focus();
	assert.equal(empty.change("<html>\n<p>New</p>\n</html>"), "<p>New</p>");
});

await check("undo and remote updates reload an unfocused editor without writing; focused editors keep typing", () => {
	const session = createRichTextSession(RICH.project);
	session.change(enriched(RICH.project));
	assert.equal(session.external("<p>From another device</p>"), "<html>\n<p>From another device</p>\n</html>");
	assert.equal(session.change(enriched("<p>From another device</p>")), null, "reload report is the new baseline");
	session.focus();
	assert.equal(session.external("<p>Remote while typing</p>"), null, "remote waits for blur (M3-T3 defers it)");
	assert.equal(session.change(enriched("<p>From another device</p>")), null);
});

await check("Improve: line at caret, replace keeps the block tag, stale lines aren't replaced", () => {
	const html = "<p>Intro line</p><ul><li>Built <b>things</b></li><li>Second &amp; last</li></ul>";
	assert.deepEqual(getLines(html), ["Intro line", "Built things", "Second & last"]);
	const plain = "Intro line\nBuilt things\nSecond & last";
	assert.deepEqual(lineAtCaret(plain, plain.indexOf("things")), { index: 1, text: "Built things" });
	assert.equal(lineAtCaret("One\n\nThree", 4), null);
	assert.equal(
		replaceLine(html, 1, "Built things", "Shipped 4 tools <fast>"),
		"<p>Intro line</p><ul><li>Shipped 4 tools &lt;fast&gt;</li><li>Second &amp; last</li></ul>",
	);
	assert.equal(replaceLine(html, 1, "Built other things", "x"), null);
});

await check("dates: typed month-years read in the resume's locale, format back, and flag reversed ranges", () => {
	assert.equal(readTypedDate("Mar 2022", "en-US"), "2022-03");
	assert.equal(readTypedDate("03/2022", "en-US"), "2022-03");
	assert.equal(readTypedDate("2022-03", "en-US"), "2022-03");
	assert.equal(readTypedDate("2022", "en-US"), "2022");
	assert.equal(readTypedDate("März 2022", "de-DE"), "2022-03");
	assert.equal(readTypedDate("", "en-US"), null);
	assert.equal(readTypedDate("sometime", "en-US"), undefined);
	assert.equal(showYearMonth("2022-03", "en-US", "short"), "Mar 2022");
	assert.equal(showYearMonth("2022-03", "en-US", "long"), "March 2022");
	assert.equal(showYearMonth("2022-03", "en-US", "numeric"), "03/2022");
	assert.equal(showYearMonth("2022-03", "en-US", "iso"), "2022-03");
	assert.equal(showYearMonth("2022-03", "de-DE", "long"), "März 2022");
	assert.equal(showYearMonth("2022", "en-US", "short"), "2022");
	assert.equal(fromPickerDate(pickerDate("2019-11")), "2019-11");
	assert.equal(isReversed({ start: "2022-03", end: "2021-01", present: false }), true);
	assert.equal(isReversed({ start: "2022-03", end: "2022", present: false }), false, "year-only end contains the start");
	assert.equal(isReversed({ start: "2022-03", end: "2021-01", present: true }), false);
	const edited = editDates({ start: null, end: null, present: false, raw: "Summer 2016" }, { start: "2016-06" });
	assert.deepEqual(edited, { start: "2016-06", end: null, present: false }, "editing clears the review note");
});

await check("outline: drags land after the section above, cross dividers, and entries stay in their section", () => {
	const data = produce(sampleResumeData, (d) => {
		d.metadata.layout.pages = [
			{ fullWidth: false, main: ["experience", "education"], sidebar: ["skills"] },
			{ fullWidth: false, main: ["projects"], sidebar: [] },
		];
	});
	const rows = getOutlineRows(data);
	const flat = flattenOutline(data, rows, new Set(["experience"]));
	const keys = flat.map((row) => row.key);
	const index = (key) => keys.indexOf(key);
	assert.ok(index("b:0") > index("s:education") && index("p:1") > index("s:skills"), "sidebar and page dividers");

	// Skills dragged above Education: it leaves the sidebar for Page 1's main column, after Experience's last entry.
	const reorder = (from, to) => {
		const list = [...flat];
		const [row] = list.splice(from, 1);
		list.splice(to, 0, row);
		return list;
	};
	const up = reorder(index("s:skills"), index("s:education"));
	const drop = resolveDrop(up, index("s:education"));
	assert.deepEqual(drop, { kind: "section", id: "skills", target: { page: 0, column: "main", after: "experience" } });
	const moved = produce(data, (d) => applySectionDrop(d, drop));
	assert.deepEqual(moved.metadata.layout.pages[0], { fullWidth: false, main: ["experience", "skills", "education"], sidebar: [] });

	// An entry dragged out of its section snaps to that section's end.
	const firstEntry = flat.find((row) => row.kind === "entry");
	const out = reorder(index(firstEntry.key), flat.length - 1);
	const entryDrop = resolveDrop(out, flat.length - 1);
	assert.equal(entryDrop.kind, "entry");
	assert.equal(entryDrop.to, firstEntry.count - 1);
});

await check("Move to…: an entry moved out of a custom section removes the emptied section", () => {
	const data = produce(sampleResumeData, (d) => {
		d.customSections.push({
			id: "custom",
			type: "projects",
			title: "Side projects",
			icon: "",
			columns: 1,
			hidden: false,
			showHeading: true,
			keepTogether: false,
			startOnNewPage: false,
			items: [{ ...structuredClone(sampleResumeData.sections.projects.items[0]), id: "only" }],
		});
		d.metadata.layout.pages.push({ fullWidth: false, main: ["custom"], sidebar: [] });
	});
	const pages = data.metadata.layout.pages.length;
	const section = resolveSection(data, "custom");
	const next = produce(data, (d) => moveItem(d, section, "only", { type: "section", sectionId: "projects" }));
	assert.equal(next.customSections.some((custom) => custom.id === "custom"), false);
	assert.equal(next.metadata.layout.pages.length, pages - 1, "its now-empty page goes too");
	assert.ok(next.sections.projects.items.some((item) => item.id === "only"));
});

// Review round (Codex bf75f9a3). Component events are replayed in the order RichTextField receives them.

await check("review 1: sheet selectors return stored values, so useSyncExternalStore snapshots are stable", async () => {
	const f = fixture();
	const getSnapshot = (selector) => selector(f.draft.store.getState());
	const experience = { id: "experience", kind: "builtin", type: "experience" };
	const selectors = [
		readData(selectPages, NO_PAGES),
		readData((data) => getSectionObject(data, experience) ?? null, null),
	];
	// Closed store: the fallbacks are constants.
	for (const selector of selectors) assert.ok(Object.is(getSnapshot(selector), getSnapshot(selector)));
	await f.draft.store.getState().open("resume");
	for (const selector of selectors) assert.ok(Object.is(getSnapshot(selector), getSnapshot(selector)));
	// The old selector built a new placement object per read, which React treats as a change every render.
	const old = readData((data) => findPlacement(selectPages(data), "experience"), null);
	assert.ok(!Object.is(getSnapshot(old), getSnapshot(old)), "fresh objects can't be selected");
	assert.deepEqual(findPlacement(getSnapshot(selectors[0]), "experience"), { page: 0, column: "main" });
});

await check("review 2: typing never changes the editor's initial markup; reloads happen only while not focused", () => {
	const session = createRichTextSession(RICH.project);
	const mounted = session.markup;
	session.change(enriched(RICH.project));
	session.focus();
	const edited = session.change("<html>\n<p>Open source dialogue editor, v2</p>\n</html>");
	assert.equal(edited, "<p>Open source dialogue editor, v2</p>");
	// The parent re-renders with the edited value: no reload while typing, and the mount markup is unchanged.
	assert.equal(session.external(edited), null);
	assert.equal(session.markup, mounted);
	// Undo after leaving the field: one imperative, wrapped reload.
	session.blur();
	assert.equal(session.external(RICH.project), toEnrichedHtml(RICH.project));
	assert.equal(session.external(RICH.project), null, "same value doesn't reload twice");
});

await check("review 3: editor markup is always the internal <html> form, in the editor's tag set", () => {
	assert.equal(toEnrichedHtml("<p>Hi</p>"), "<html>\n<p>Hi</p>\n</html>");
	assert.ok(toEnrichedHtml("<p>Hi</p>").length >= 13);
	assert.equal(toEnrichedHtml(""), "<html>\n<p></p>\n</html>");
	assert.equal(toEnrichedHtml("Plain & simple"), "<html>\n<p>Plain &amp; simple</p>\n</html>");
	assert.equal(
		toEnrichedHtml(RICH.experience),
		"<html>\n<ul><li>Shipped three titles</li>\n<li>Cut load time by 35%</li>\n</ul>\n</html>",
	);
	assert.equal(
		toEnrichedHtml('<p style="text-align: center"><strong>Lead</strong> <em>eng</em> <a href="https://x.dev" target="_blank">site</a><br/></p>'),
		'<html>\n<p><b>Lead</b> <i>eng</i> <a href="https://x.dev">site</a><br></p>\n</html>',
	);
	// Canonical HTML survives the trip into the editor and back unchanged.
	for (const html of ["<p>Hi</p>", "<p><b>A</b> <i>b</i></p><ul><li>One</li><li>Two</li></ul>", "<h2>Title</h2><p>x</p>"])
		assert.equal(fromEnrichedHtml(toEnrichedHtml(html)), html);
	assert.equal(createRichTextSession("<p>Hi</p>").markup, "<html>\n<p>Hi</p>\n</html>");
});

await check("review 4: a link set while its prompt has focus is saved; init echoes still aren't", () => {
	const session = createRichTextSession(RICH.project);
	// A command before the editor reported its load can't turn the load echo into a write.
	session.command();
	assert.equal(session.change(enriched(RICH.project)), null);
	session.focus();
	session.blur(); // The link prompt's text field takes focus.
	session.command(); // Prompt submitted: setLink on the blurred editor.
	const linked = '<html>\n<p><i>Open source</i> <a href="https://x.dev">dialogue editor</a>.</p>\n</html>';
	assert.equal(session.change(linked), '<p><i>Open source</i> <a href="https://x.dev">dialogue editor</a>.</p>');
	// A reload clears the command: its echo is a new baseline, not an edit.
	assert.notEqual(session.external("<p>Remote</p>"), null);
	assert.equal(session.change(enriched("<p>Remote</p>")), null);
	// Toolbar marks while focused write as before.
	session.focus();
	assert.equal(session.change("<html>\n<p><b>Remote</b></p>\n</html>"), "<p><b>Remote</b></p>");
});

// Second review round.

await check("review 5: CSS-encoded bold, italic, underline and strikethrough become editor tags", () => {
	assert.equal(
		toEnrichedHtml('<p><span style="font-weight:700">Bold</span> <span style="font-style: italic">it</span></p>'),
		"<html>\n<p><b>Bold</b> <i>it</i></p>\n</html>",
	);
	assert.equal(
		toEnrichedHtml('<p><span style="text-decoration: underline line-through; color: red">both</span></p>'),
		"<html>\n<p><u><s>both</s></u></p>\n</html>",
	);
	assert.equal(
		toEnrichedHtml('<p><span style="font-weight: bold; font-style: italic"><span style="text-decoration-line: underline">nested</span> out</span> plain</p>'),
		"<html>\n<p><b><i><u>nested</u> out</i></b> plain</p>\n</html>",
	);
	// Google Docs wraps pasted text in a non-bold <b>; that wrapper isn't bold.
	assert.equal(
		toEnrichedHtml('<b style="font-weight:normal;" id="docs-internal-guid-1"><p><span style="font-weight:700">Real</span> text</p></b>'),
		"<html>\n<p><b>Real</b> text</p>\n</html>",
	);
	assert.equal(toEnrichedHtml('<p><span style="color: red">no marks</span></p>'), "<html>\n<p>no marks</p>\n</html>");
	// Editing one character keeps the converted marks in what's written.
	const stored = '<p><span style="font-weight:700">Bold</span> text</p>';
	const session = createRichTextSession(stored);
	assert.equal(session.markup, "<html>\n<p><b>Bold</b> text</p>\n</html>");
	session.change(session.markup);
	session.focus();
	assert.equal(session.change("<html>\n<p><b>Bold</b> texts</p>\n</html>"), "<p><b>Bold</b> texts</p>");
});

await check("review 6: an upload writes only to the resume and account it started in", async () => {
	let resumeId = "A";
	let scope = "server/user";
	let release;
	const context = {
		resumeId: () => resumeId,
		scope: () => new Promise((resolve) => (release = () => resolve(scope))),
	};
	const claim = claimUpload(context);
	release();
	const owner = await claim;
	assert.deepEqual(owner, { resumeId: "A", scope: "server/user" });

	// Navigating to B while the account scope is read at completion: A's result must not land on B.
	const writes = [];
	const stale = commitUpload(owner, context, () => writes.push("A→?"));
	resumeId = "B";
	release();
	assert.equal(await stale, false);

	// Back on A, but another account signed in during the upload.
	resumeId = "A";
	scope = "server/other";
	const otherAccount = commitUpload(owner, context, () => writes.push("A→other"));
	release();
	assert.equal(await otherAccount, false);

	// Same resume, same account: written.
	scope = "server/user";
	const current = commitUpload(owner, context, () => writes.push("A→A"));
	release();
	assert.equal(await current, true);
	assert.deepEqual(writes, ["A→A"]);

	// Navigating while the upload is claimed makes it nobody's.
	resumeId = "A";
	const moving = claimUpload(context);
	resumeId = "B";
	release();
	assert.equal(await moving, null);
});

// Final review round.

await check("review 7: block-level CSS marks on p and li wrap the block's content in editor tags", () => {
	const marks = [
		["font-weight:700", "b"],
		["font-weight: bold", "b"],
		["font-style: italic", "i"],
		["text-decoration: underline", "u"],
		["text-decoration-line: line-through", "s"],
	];
	for (const [css, tag] of marks) {
		assert.equal(
			toEnrichedHtml(`<p style="${css}">Line <span>one</span></p>`),
			`<html>\n<p><${tag}>Line one</${tag}></p>\n</html>`,
			`p ${css}`,
		);
		assert.equal(
			toEnrichedHtml(`<ul><li style="${css}">Item</li><li>Plain</li></ul>`),
			`<html>\n<ul><li><${tag}>Item</${tag}></li>\n<li>Plain</li>\n</ul>\n</html>`,
			`li ${css}`,
		);
		// TipTap's paragraph inside the item: either element's style carries over.
		assert.equal(
			toEnrichedHtml(`<ul><li><p style="${css}">Item</p></li></ul>`),
			`<html>\n<ul><li><${tag}>Item</${tag}></li>\n</ul>\n</html>`,
			`li > p ${css}`,
		);
	}
	assert.equal(
		toEnrichedHtml('<h2 style="font-style:italic; text-decoration: underline">Head</h2><p style="text-align:center">x</p>'),
		"<html>\n<h2><i><u>Head</u></i></h2>\n<p>x</p>\n</html>",
	);
	assert.equal(
		toEnrichedHtml('<ul><li style="font-weight:700"><p style="font-style:italic">Both</p></li></ul>'),
		"<html>\n<ul><li><b><i>Both</i></b></li>\n</ul>\n</html>",
	);
	// Editing one character keeps a block's mark in what's written.
	const session = createRichTextSession('<p style="font-weight:700">Bold line</p>');
	assert.equal(session.markup, "<html>\n<p><b>Bold line</b></p>\n</html>");
	session.change(session.markup);
	session.focus();
	assert.equal(session.change("<html>\n<p><b>Bold lines</b></p>\n</html>"), "<p><b>Bold lines</b></p>");
});

await check("review 8: list-item and paragraph decorations unite instead of one hiding the other", () => {
	const stored = '<ul><li style="text-decoration:underline"><p style="text-decoration:line-through">Item</p></li></ul>';
	assert.equal(toEnrichedHtml(stored), "<html>\n<ul><li><u><s>Item</s></u></li>\n</ul>\n</html>");
	assert.equal(
		toEnrichedHtml('<ul><li style="font-weight:700; text-decoration: underline"><p style="font-style:italic; text-decoration: line-through">X</p></li></ul>'),
		"<html>\n<ul><li><b><i><u><s>X</s></u></i></b></li>\n</ul>\n</html>",
	);
	// After an edit, both decorations are in what's written.
	const session = createRichTextSession(stored);
	session.change(session.markup);
	session.focus();
	assert.equal(
		session.change("<html>\n<ul>\n<li><u><s>Items</s></u></li>\n</ul>\n</html>"),
		"<ul><li><u><s>Items</s></u></li></ul>",
	);
});

await drain();
console.log(`${passed} scenarios passed`);
