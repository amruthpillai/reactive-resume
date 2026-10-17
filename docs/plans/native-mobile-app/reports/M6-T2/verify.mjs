// M6-T2 Node scenarios: run with `node docs/plans/native-mobile-app/reports/M6-T2/verify.mjs` (Node 24 strips the
// types of the shipped module). Covers the audio size cap and the pure tab logic the workspace screens rely on.
import assert from "node:assert/strict";
import {
	acceptedAudioType,
	answersDocument,
	audioProblem,
	chooseVoice,
	currentInterview,
	diffWords,
	isFixedChange,
	MAX_AUDIO_BYTES,
	MAX_SECONDS,
	nextEvening,
	openChanges,
	preparePhase,
	RECORDING_OPTIONS,
	writeNumbersAsDigits,
} from "../../../../../apps/mobile/src/features/workspace/logic.ts";
import {
	afterTranscribed,
	createAutosave,
	createDraftStore,
	createPendingRegistry,
	createRequests,
	playLatest,
} from "../../../../../apps/mobile/src/features/workspace/state.ts";

let passed = 0;
const queue = [];
const scenario = (name, run) => queue.push({ name, run });

/** Timers the scenarios advance by hand. */
function fakeTimers() {
	let now = 0;
	let next = 1;
	const pending = new Map();
	return {
		set: (run, ms) => {
			const id = next++;
			pending.set(id, { run, at: now + ms });
			return id;
		},
		clear: (id) => pending.delete(id),
		async advance(ms) {
			now += ms;
			for (const [id, timer] of [...pending].sort((a, b) => a[1].at - b[1].at))
				if (timer.at <= now) {
					pending.delete(id);
					timer.run();
				}
			await new Promise((resolve) => setImmediate(resolve));
		},
		count: () => pending.size,
	};
}

const memoryStorage = () => {
	const items = new Map();
	return {
		items,
		getItemSync: (key) => items.get(key) ?? null,
		setItemSync: (key, value) => items.set(key, value),
		removeItemSync: (key) => items.delete(key),
	};
};

scenario("audio cap: exactly 2 MB passes, one byte more and empty/unknown sizes are refused", () => {
	assert.equal(MAX_AUDIO_BYTES, 2 * 1024 * 1024);
	assert.equal(audioProblem(MAX_AUDIO_BYTES), null);
	assert.equal(audioProblem(MAX_AUDIO_BYTES + 1), "too-large");
	assert.equal(audioProblem(0), "empty");
	assert.equal(audioProblem(null), "empty");
	assert.equal(audioProblem(undefined), "empty");
});

scenario("recording preset: 2 minutes of AAC stays under the cap with room for the container", () => {
	assert.equal(RECORDING_OPTIONS.extension, ".m4a");
	const worst = (RECORDING_OPTIONS.bitRate / 8) * MAX_SECONDS;
	assert.ok(worst * 1.25 < MAX_AUDIO_BYTES, `${worst} bytes is too close to the cap`);
});

scenario("chosen audio files: m4a/wav aliases normalised, other formats and oversize refused", () => {
	assert.equal(acceptedAudioType("audio/x-m4a", 1000), "audio/mp4");
	assert.equal(acceptedAudioType("audio/m4a", 1000), "audio/mp4");
	assert.equal(acceptedAudioType("audio/x-wav", 1000), "audio/wav");
	assert.equal(acceptedAudioType("audio/mpeg", MAX_AUDIO_BYTES), "audio/mpeg");
	assert.equal(acceptedAudioType("audio/mpeg", MAX_AUDIO_BYTES + 1), null);
	assert.equal(acceptedAudioType("video/mp4", 1000), null);
	assert.equal(acceptedAudioType(undefined, 1000), null);
	assert.equal(acceptedAudioType("audio/ogg", 0), null);
});

scenario("voice choice: stored connection kept while capable, text only, fallback model", () => {
	const providers = [
		{ id: "g", label: "Groq", provider: "groq" },
		{ id: "o", label: "OpenAI", provider: "openai" },
		{ id: "a", label: "Anthropic", provider: "anthropic" },
	];
	assert.equal(chooseVoice(providers, "transcription", undefined, undefined)?.providerId, "g");
	assert.equal(chooseVoice(providers, "speech", undefined, undefined)?.providerId, "o", "Groq has no speech model");
	assert.equal(chooseVoice(providers, "speech", "off", undefined), null);
	assert.equal(chooseVoice(providers, "transcription", "a", undefined)?.providerId, "g", "Anthropic can't transcribe");
	assert.equal(chooseVoice(providers, "transcription", "o", "whisper-1")?.model, "whisper-1");
	assert.equal(chooseVoice(providers, "transcription", "o", "retired")?.model, "gpt-4o-mini-transcribe");
	assert.equal(chooseVoice([providers[2]], "transcription", undefined, undefined), null);
});

const interview = (at, minutes = 60) => ({ type: "interview", id: at, at, durationMinutes: minutes });
const now = new Date("2026-10-19T14:00:00Z");

scenario("Prepare phase: plan, the 10 minutes before through the end, then after", () => {
	assert.equal(preparePhase(interview("2026-10-19T14:11:00Z"), now), "plan");
	assert.equal(preparePhase(interview("2026-10-19T14:10:00Z"), now), "soon");
	assert.equal(preparePhase(interview("2026-10-19T13:30:00Z"), now), "soon", "still running");
	assert.equal(preparePhase(interview("2026-10-19T12:00:00Z"), now), "after");
});

scenario("current interview: next to come, else one that ended within a day, else none", () => {
	const soon = interview("2026-10-20T09:00:00Z");
	const ended = interview("2026-10-19T10:00:00Z");
	const old = interview("2026-10-15T10:00:00Z");
	const note = { type: "note", at: "2026-10-19T00:00:00Z" };
	assert.equal(currentInterview([ended, note, soon], now), soon);
	assert.equal(currentInterview([old, ended, note], now), ended);
	assert.equal(currentInterview([old, note], now), undefined);
});

scenario("week plan: 18:00 local, today only while it's ahead, across a DST change", () => {
	// Saturday 2026-10-17 in Berlin.
	const saturdayNoon = new Date("2026-10-17T10:00:00Z");
	assert.equal(nextEvening("sat", saturdayNoon, "Europe/Berlin").toISOString(), "2026-10-17T16:00:00.000Z");
	const saturdayNight = new Date("2026-10-17T19:00:00Z");
	assert.equal(nextEvening("sat", saturdayNight, "Europe/Berlin").toISOString(), "2026-10-24T16:00:00.000Z");
	// Sunday 25 Oct: Berlin is back on CET (UTC+1) by the evening.
	assert.equal(nextEvening("sun", saturdayNoon, "Europe/Berlin").toISOString(), "2026-10-18T16:00:00.000Z");
	const nextSaturday = new Date("2026-10-24T10:00:00Z");
	assert.equal(nextEvening("sun", nextSaturday, "Europe/Berlin").toISOString(), "2026-10-25T17:00:00.000Z");
	// Auckland moves to NZDT at 02:00 on Sunday 27 Sep. Saturday 18:00 is still NZST (UTC+12); taking the offset only at
	// the first guess (web) lands an hour early.
	const friday = new Date("2026-09-25T00:00:00Z");
	assert.equal(nextEvening("sat", friday, "Pacific/Auckland").toISOString(), "2026-09-26T06:00:00.000Z");
});

scenario("proposed changes: a stage already reached, or any stage from Saved, is fixed and unticked", () => {
	const changes = [
		{ type: "stage", stage: "interview" },
		{ type: "follow-up", at: null, note: "Send availability" },
		{ type: "offer" },
	];
	assert.deepEqual(openChanges(changes, "screening"), [0, 1, 2]);
	assert.deepEqual(openChanges(changes, "interview"), [1, 2]);
	assert.deepEqual(openChanges(changes, "saved"), [1, 2]);
	assert.equal(isFixedChange(changes[1], "saved"), false);
});

scenario("Tighten diff: kept, removed and added words rebuild both texts", () => {
	const before = "I built the editor tools in C++ for designers";
	const after = "I built C++ editor tools that cut designer iteration by 40%";
	const parts = diffWords(before, after);
	const join = (types) =>
		parts
			.filter((part) => types.includes(part.type))
			.map((part) => part.text)
			.join(" ");
	assert.equal(join(["same", "removed"]), before);
	assert.equal(join(["same", "added"]), after);
	assert.deepEqual(diffWords("", "Fresh draft"), [{ type: "added", text: "Fresh draft" }]);
});

scenario("Write numbers as digits: ranges, percentages, small numbers kept as words", () => {
	assert.equal(writeNumbersAsDigits("fifty four to seventy one percent"), "54% to 71%");
	assert.equal(writeNumbersAsDigits("eighteen customers"), "18 customers");
	assert.equal(writeNumbersAsDigits("a six person team"), "a six person team");
	assert.equal(writeNumbersAsDigits("five percent"), "5%");
	assert.equal(writeNumbersAsDigits("one hundred and twenty users"), "120 users");
	assert.equal(writeNumbersAsDigits("nineteen ninety"), "nineteen ninety");
});

scenario("answers download: Markdown and text, unanswered questions left out", () => {
	const answers = [
		{ question: "Why us?", answer: "Your tools team." },
		{ question: "Salary?", answer: "  " },
	];
	assert.equal(answersDocument("Dev · Fieldnote", answers, "md"), "# Dev · Fieldnote\n\n## Why us?\n\nYour tools team.\n");
	assert.equal(answersDocument("Dev · Fieldnote", answers, "txt"), "Dev · Fieldnote\n\n\nWhy us?\n\nYour tools team.\n");
});

// ---- Review fix round (Codex 195d8e34) ----

scenario("fix 1: a failed autosave is retried, not marked done; the draft is cleared only once the server has it", async () => {
	const timers = fakeTimers();
	const results = [false, true];
	const sent = [];
	const acknowledged = [];
	const autosave = createAutosave({
		save: async (value) => {
			sent.push(value);
			return results.shift() ?? true;
		},
		onSaved: (value) => acknowledged.push(value),
		delay: 2000,
		retryDelay: 10_000,
		timers,
	});
	autosave.update("server", "server");
	acknowledged.length = 0;
	autosave.update("typed answer", "server");
	await timers.advance(2000);
	assert.deepEqual(sent, ["typed answer"]);
	assert.deepEqual(acknowledged, [], "a failed write keeps the draft");
	// The optimistic copy rolls back on refetch; the same text is retried after the longer wait, not every 2 s.
	autosave.update("typed answer", "server");
	await timers.advance(2000);
	assert.deepEqual(sent, ["typed answer"]);
	await timers.advance(8000);
	assert.deepEqual(sent, ["typed answer", "typed answer"]);
	assert.deepEqual(acknowledged, ["typed answer"]);
	autosave.update("typed answer", "typed answer");
	assert.deepEqual(acknowledged, ["typed answer"], "acknowledged once");
	autosave.dispose();
	assert.equal(timers.count(), 0);
});

scenario("fix 1: leaving flushes once; a value already on its way is not sent twice", async () => {
	const timers = fakeTimers();
	const sent = [];
	let resolve;
	const autosave = createAutosave({
		save: (value) => {
			sent.push(value);
			return new Promise((done) => (resolve = done));
		},
		delay: 2000,
		retryDelay: 10_000,
		timers,
	});
	autosave.update("message", "");
	autosave.flush();
	autosave.flush();
	autosave.dispose();
	assert.deepEqual(sent, ["message"]);
	resolve(false);
	await timers.advance(0);
	assert.equal(timers.count(), 0, "no retry timer after leaving; the device draft keeps it for next time");
});

scenario("fix 2 + 3: device drafts persist; finishing a review clears only the submitted revision", () => {
	const storage = memoryStorage();
	const drafts = createDraftStore(storage);
	const key = 'reactive-resume:career-draft:["https://rxresu.me","user-1"]:debrief:app:round';
	const submitted = { question: "How did you design the tools?", answer: "Workflow first.", landed: "well" };
	drafts.write(key, submitted);
	// While the review is generating, the user keeps typing.
	const edited = { ...submitted, answer: "Workflow first, then the C++ tooling." };
	drafts.write(key, edited);
	drafts.clear(key, submitted);
	assert.deepEqual(drafts.read(key), edited, "the newer edit survives the review landing");
	drafts.clear(key, edited);
	assert.equal(drafts.read(key), undefined);
	assert.equal(storage.items.size, 0);
	const broken = { getItemSync: () => "{", setItemSync: () => {}, removeItemSync: () => {} };
	assert.equal(createDraftStore(broken).read(key), undefined, "a corrupt draft reads as none");
});

scenario("fix 4: Apply, leave, return, Apply again: one pending operation; Undo cancels it", () => {
	const replyApplies = createPendingRegistry();
	const toasts = [];
	// A stand-in for career/undo.ts: records the operation; Undo runs restore, the timeout runs commit.
	const withUndo = ({ restore, commit }) => toasts.push({ undo: restore, commit });
	const onApply = (key, changes) => {
		if (!replyApplies.start(key, { changes })) return;
		withUndo({
			restore: () => replyApplies.finish(key),
			commit: async () => replyApplies.finish(key),
		});
	};
	let renders = 0;
	const unsubscribe = replyApplies.subscribe(() => renders++);
	onApply("https://rxresu.me:reply-1", [0, 1]);
	unsubscribe(); // the Messages screen unmounts
	const remounted = replyApplies.get("https://rxresu.me:reply-1");
	assert.deepEqual(remounted, { changes: [0, 1] }, "the reopened screen shows it applied");
	onApply("https://rxresu.me:reply-1", [0]);
	assert.equal(toasts.length, 1, "no second pending operation");
	toasts[0].undo();
	assert.equal(replyApplies.get("https://rxresu.me:reply-1"), undefined, "Undo cancels the only one");
	assert.equal(renders, 1);
	onApply("https://rxresu.me:reply-1", [1]);
	assert.equal(toasts.length, 2, "after Undo it can be applied again");
});

scenario("fix 5: after transcription the uploaded file is deleted without Keep, even if a newer one is on screen", () => {
	const removed = [];
	const remove = (audio) => removed.push(audio.uri);
	const uploaded = { uri: "file:///cache/ExpoAudio/a.m4a" };
	assert.equal(afterTranscribed({ uploaded, current: uploaded, keep: false, remove }), null);
	assert.deepEqual(removed, [uploaded.uri]);
	const newer = { uri: "file:///cache/ExpoAudio/b.m4a" };
	assert.equal(afterTranscribed({ uploaded, current: newer, keep: false, remove }), newer);
	assert.deepEqual(removed, [uploaded.uri, uploaded.uri]);
	assert.equal(afterTranscribed({ uploaded, current: uploaded, keep: true, remove }), uploaded, "Keep keeps it");
	assert.equal(removed.length, 2);
});

scenario("fix 6: a voice.speak reply after unmount (or a newer request) is deleted, never played", async () => {
	const requests = createRequests();
	const played = [];
	const discarded = [];
	let answer;
	const pending = playLatest(
		requests,
		() => new Promise((resolve) => (answer = resolve)),
		(file) => played.push(file),
		(file) => discarded.push(file),
	);
	requests.invalidate(); // HearIt unmounts while the request is out
	answer("speech-1.mp3");
	assert.equal(await pending, false);
	assert.deepEqual(played, []);
	assert.deepEqual(discarded, ["speech-1.mp3"]);
	const first = playLatest(requests, async () => "old.mp3", (file) => played.push(file), (file) => discarded.push(file));
	const second = playLatest(requests, async () => "new.mp3", (file) => played.push(file), (file) => discarded.push(file));
	assert.deepEqual(await Promise.all([first, second]), [false, true]);
	assert.deepEqual(played, ["new.mp3"]);
	assert.deepEqual(discarded, ["speech-1.mp3", "old.mp3"]);
});

for (const { name, run } of queue) {
	await run();
	passed++;
	console.log(`ok - ${name}`);
}
console.log(`\n${passed} scenarios passed`);
