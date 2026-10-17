// M5-T2 scenarios: .ics text, reminder times across timezones, and the attachment check.
// Runs the shipped pure modules directly: `node docs/plans/native-mobile-app/reports/M5-T2/verify.mjs` (Node 24).
import assert from "node:assert/strict";
import { buildIcs, icsFileName } from "../../../../../apps/mobile/src/features/reminders/ics.ts";
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

let failed = 0;
for (const { name, run } of scenarios) {
	try {
		run();
		console.log(`pass  ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}\n      ${error.message}`);
	}
}
console.log(`${scenarios.length - failed}/${scenarios.length} scenarios passed`);
process.exit(failed ? 1 : 0);
