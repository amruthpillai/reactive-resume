// M5-T2 scenarios: .ics text, reminder times across timezones, the attachment check and the notes save queue.
// Runs the shipped pure modules directly: `node docs/plans/native-mobile-app/reports/M5-T2/verify.mjs` (Node 24).
import assert from "node:assert/strict";
import { buildIcs, icsFileName, interviewEvent } from "../../../../../apps/mobile/src/features/reminders/ics.ts";
import { createNotesQueue } from "../../../../../apps/mobile/src/features/application-detail/notes-queue.ts";
import {
	followUpStart,
	reminderId,
	reminderTime,
	zonedParts,
} from "../../../../../apps/mobile/src/features/reminders/schedule.ts";
import { attachmentProblem, MAX_ATTACHMENT_BYTES } from "../../../../../apps/mobile/src/features/application-detail/attachment.ts";
import { fromZonedDateTime } from "../../../../../packages/utils/src/timezone.ts";

const scenarios = [];
const scenario = (name, run) => scenarios.push({ name, run });

scenario("ics: one UTC event, escaped text, CRLF lines (web parity)", () => {
	const ics = buildIcs(
		{
			uid: "i1",
			title: "Panel interview, Lumen",
			start: new Date("2026-10-02T12:00:00Z"),
			end: new Date("2026-10-02T13:00:00Z"),
			location: "Berlin; Room 4",
			description: "Bring the portfolio\nand notes",
		},
		new Date("2026-09-28T08:30:00Z"),
	);
	assert.deepEqual(ics.split("\r\n"), [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Reactive Resume//Applications//EN",
		"CALSCALE:GREGORIAN",
		"BEGIN:VEVENT",
		"UID:i1@reactive-resume",
		"DTSTAMP:20260928T083000Z",
		"DTSTART:20261002T120000Z",
		"DTEND:20261002T130000Z",
		"SUMMARY:Panel interview\\, Lumen",
		"LOCATION:Berlin\\; Room 4",
		"DESCRIPTION:Bring the portfolio\\nand notes",
		"END:VEVENT",
		"END:VCALENDAR",
		"",
	]);
});

scenario("ics: long lines fold at 75 characters; file name is safe", () => {
	const ics = buildIcs({ uid: "x", title: "A".repeat(100), start: new Date(0), end: new Date(0) });
	const lines = ics.split("\r\n");
	const at = lines.findIndex((line) => line.startsWith("SUMMARY"));
	assert.equal(lines[at].length, 75);
	assert.ok(lines[at + 1].startsWith(" "));
	assert.equal(icsFileName("Parcel & Co./Berlin", "2026-10-19"), "Parcel-Co.-Berlin-2026-10-19.ics");
});

scenario("interview in America/Los_Angeles, user in Europe/Berlin: same instant, 30 min reminder", () => {
	const start = fromZonedDateTime("2026-10-19", "07:00", "America/Los_Angeles");
	assert.equal(start.toISOString(), "2026-10-19T14:00:00.000Z");
	assert.deepEqual(zonedParts(start, "Europe/Berlin"), { date: "2026-10-19", time: "16:00" });
	const now = new Date("2026-10-17T10:00:00Z");
	assert.equal(reminderTime(start, 30, now).toISOString(), "2026-10-19T13:30:00.000Z");
	assert.equal(reminderTime(start, 1440, now).toISOString(), "2026-10-18T14:00:00.000Z");
});

scenario("reminder lead across a DST change keeps elapsed time (Berlin, 25 Oct 2026)", () => {
	const start = fromZonedDateTime("2026-10-25", "10:00", "Europe/Berlin"); // CET after 03:00 fallback
	assert.equal(start.toISOString(), "2026-10-25T09:00:00.000Z");
	const reminder = reminderTime(start, 1440, new Date("2026-10-01T00:00:00Z"));
	assert.equal(reminder.toISOString(), "2026-10-24T09:00:00.000Z");
	assert.deepEqual(zonedParts(reminder, "Europe/Berlin"), { date: "2026-10-24", time: "11:00" }); // CEST
});

scenario("skipped DST time is rejected before saving", () => {
	assert.equal(fromZonedDateTime("2027-03-28", "02:30", "Europe/Berlin"), null);
	assert.equal(fromZonedDateTime("2026-02-30", "09:00", "UTC"), null);
});

scenario("reminder already passed is not scheduled", () => {
	const start = new Date("2026-10-17T10:20:00Z");
	assert.equal(reminderTime(start, 30, new Date("2026-10-17T10:00:00Z")), null);
	assert.equal(reminderTime(start, 10, new Date("2026-10-17T10:00:00Z")).toISOString(), "2026-10-17T10:10:00.000Z");
});

scenario("follow-up fires at 09:00 in the user's timezone, not the device's", () => {
	assert.equal(followUpStart("2026-10-21", "Asia/Tokyo").toISOString(), "2026-10-21T00:00:00.000Z");
	assert.equal(followUpStart("2026-10-21", "America/New_York").toISOString(), "2026-10-21T13:00:00.000Z");
	assert.equal(followUpStart("2026-10-21", "UTC").toISOString(), "2026-10-21T09:00:00.000Z");
});

scenario("reminder identifiers: one per interview, one per application follow-up", () => {
	assert.equal(reminderId("interview", "app1", "e1"), "interview:e1");
	assert.equal(reminderId("follow-up", "app1"), "follow-up:app1");
});

scenario("attachment check: PDF up to 10 MB only", () => {
	assert.equal(MAX_ATTACHMENT_BYTES, 10_485_760);
	assert.equal(attachmentProblem({ name: "cv.pdf", mimeType: "application/pdf", size: MAX_ATTACHMENT_BYTES }), null);
	assert.equal(
		attachmentProblem({ name: "cv.pdf", mimeType: "application/pdf", size: MAX_ATTACHMENT_BYTES + 1 }),
		"too-large",
	);
	assert.equal(
		attachmentProblem({ name: "cv.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 10 }),
		"not-pdf",
	);
	assert.equal(attachmentProblem({ name: "CV.PDF", size: 248_000 }), null);
	assert.equal(attachmentProblem({ name: "cv.pdf", mimeType: "application/pdf" }), "unknown-size");
});

scenario("ics: folding counts UTF-8 octets and never splits a code point (review 6)", () => {
	const title = `面接 · ${"🎯 Café ".repeat(12)}— Zürich`;
	const ics = buildIcs({ uid: "u", title, start: new Date(0), end: new Date(0) });
	const lines = ics.split("\r\n");
	const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
	for (const line of lines) {
		assert.ok(Buffer.byteLength(line, "utf8") <= 75, `${Buffer.byteLength(line, "utf8")} octets: ${line}`);
		assert.ok(!lone.test(line), `split surrogate pair: ${line}`);
	}
	const start = lines.findIndex((line) => line.startsWith("SUMMARY:"));
	let unfolded = lines[start];
	for (let i = start + 1; lines[i].startsWith(" "); i++) unfolded += lines[i].slice(1);
	assert.equal(unfolded, `SUMMARY:${title}`);
	assert.ok(lines.filter((line) => line.startsWith(" ")).length >= 2);
});

scenario("ics: interview event carries only its notes, never the people (review 5)", () => {
	const interview = {
		id: "e1",
		at: new Date("2026-10-19T14:00:00Z"),
		durationMinutes: 45,
		location: "https://video.example.com/fieldnote",
		notes: "Walk through a gameplay system you designed.",
		participants: [{ name: "Sam Rivera", role: "Gameplay lead" }],
	};
	const event = interviewEvent(interview, "Technical interview · Senior Game Developer, Fieldnote");
	assert.equal(event.description, interview.notes);
	assert.equal(event.end.toISOString(), "2026-10-19T14:45:00.000Z");
	const ics = buildIcs(event);
	assert.ok(!ics.includes("Sam Rivera") && !ics.includes("Gameplay lead"));
	assert.ok(ics.includes("DESCRIPTION:Walk through a gameplay system you designed."));
	assert.ok(!buildIcs(interviewEvent({ ...interview, notes: "" }, "x")).includes("DESCRIPTION"));
});

const memoryStorage = () => {
	const map = new Map();
	return {
		map,
		getItemSync: (key) => map.get(key) ?? null,
		setItemSync: (key, value) => map.set(key, value),
		removeItemSync: (key) => map.delete(key),
	};
};
const deferredSend = () => {
	const calls = [];
	const send = (value) =>
		new Promise((resolve, reject) => {
			calls.push({ value, resolve, reject });
		});
	return { calls, send };
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

scenario("notes: saves never overlap; edits during a request coalesce, latest text wins (review 1)", async () => {
	const storage = memoryStorage();
	const queue = createNotesQueue(storage);
	const { calls, send } = deferredSend();
	storage.setItemSync("k", "A");
	const first = queue.save("k", "A", send);
	storage.setItemSync("k", "AB");
	const second = queue.save("k", "AB", send);
	storage.setItemSync("k", "ABC");
	const third = queue.save("k", "ABC", send);
	await tick();
	assert.deepEqual(calls.map((call) => call.value), ["A"]); // one request in flight
	calls[0].resolve();
	await tick();
	assert.deepEqual(calls.map((call) => call.value), ["A", "ABC"]); // "AB" coalesced away
	assert.equal(storage.getItemSync("k"), "ABC"); // still kept: not saved yet
	calls[1].resolve();
	await Promise.all([first, second, third]);
	assert.equal(storage.getItemSync("k"), null); // saved: nothing kept
	assert.equal(calls.at(-1).value, "ABC");
});

scenario("notes: a failed save keeps the text on the device and retries the latest (review 1, 2)", async () => {
	const storage = memoryStorage();
	const queue = createNotesQueue(storage);
	const { calls, send } = deferredSend();
	storage.setItemSync("k", "draft");
	const failed = queue.save("k", "draft", send);
	await tick();
	calls[0].reject(new Error("offline"));
	await assert.rejects(failed);
	assert.equal(storage.getItemSync("k"), "draft");
	assert.equal(queue.kept("k"), "draft"); // restored on the next visit
	storage.setItemSync("k", "draft 2");
	const retry = queue.save("k", "draft 2", send);
	await tick();
	assert.equal(calls[1].value, "draft 2");
	calls[1].resolve();
	await retry;
	assert.equal(storage.getItemSync("k"), null);
	// Keys are independent: another application's save is not held behind this one.
	const other = queue.save("j", "x", send);
	await tick();
	assert.equal(calls[2].value, "x");
	calls[2].resolve();
	await other;
});

let failed = 0;
for (const { name, run } of scenarios) {
	try {
		await run();
		console.log(`pass  ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}\n      ${error.message}`);
	}
}
console.log(`${scenarios.length - failed}/${scenarios.length} scenarios passed`);
process.exit(failed ? 1 : 0);
