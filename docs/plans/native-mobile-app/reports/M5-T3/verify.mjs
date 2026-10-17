// M5-T3 scenarios: calendar bucketing across time zones and the Insights funnel/outcome maths.
// Runs the shipped pure modules directly (Node 24 type stripping). Run it under more than one device timezone to show
// the results only depend on the user's timezone argument:
//   TZ=UTC node docs/plans/native-mobile-app/reports/M5-T3/verify.mjs
//   TZ=Pacific/Kiritimati node docs/plans/native-mobile-app/reports/M5-T3/verify.mjs
import assert from "node:assert/strict";
import {
	keepPending,
	pendingAfterError,
	stageAt,
} from "../../../../../apps/mobile/src/features/applications-board/board.ts";
import {
	collectEvents,
	dayKeyOf,
	followUpDay,
	groupByDay,
	monthGrid,
	shiftMonth,
	upcomingEvents,
	weekStartsOn,
} from "../../../../../apps/mobile/src/features/applications-board/calendar.ts";
import {
	computeOutcomes,
	computePipeline,
	computeTimeline,
	countSources,
} from "../../../../../apps/mobile/src/features/applications-board/insights.ts";
import { followUpStart } from "../../../../../apps/mobile/src/features/reminders/schedule.ts";

const app = (id, overrides = {}) => ({
	id,
	status: "applied",
	closedReason: null,
	activity: [],
	appliedAt: "2026-09-01T12:00:00Z",
	resumeId: null,
	followUpAt: null,
	source: null,
	...overrides,
});
const interview = (id, at, durationMinutes = 60, timezone = "UTC") => ({
	type: "interview",
	id,
	at,
	durationMinutes,
	timezone,
	kind: "technical",
	location: "",
	participants: [],
});
const stage = (value, at) => ({ type: "stage", id: `${value}-${at}`, stage: value, at });

const scenarios = [];
const scenario = (name, run) => scenarios.push({ name, run });

scenario("interview day follows the user's timezone, not the device's", () => {
	const at = "2026-10-19T22:30:00Z";
	assert.equal(dayKeyOf(at, "Europe/Berlin"), "2026-10-20"); // 00:30 CEST
	assert.equal(dayKeyOf(at, "America/Los_Angeles"), "2026-10-19"); // 15:30 PDT
	assert.equal(dayKeyOf(at, "Asia/Tokyo"), "2026-10-20"); // 07:30 JST
	const applications = [app("a", { status: "interview", activity: [interview("i1", at)] })];
	assert.equal(collectEvents(applications, "America/Los_Angeles")[0].day, "2026-10-19");
	assert.equal(collectEvents(applications, "Europe/Berlin")[0].day, "2026-10-20");
});

scenario("interview at a DST change lands on the right local day", () => {
	// 25 Oct 2026, Berlin falls back at 03:00 CEST → 02:00 CET. 23:30 UTC on the 25th is 00:30 CET on the 26th.
	assert.equal(dayKeyOf("2026-10-25T23:30:00Z", "Europe/Berlin"), "2026-10-26");
	assert.equal(dayKeyOf("2026-10-24T22:30:00Z", "Europe/Berlin"), "2026-10-25"); // 00:30 CEST
});

scenario("follow-up days: web's UTC-midnight dates and the app's 09:00 local both keep their date", () => {
	// Web stores the bare date at UTC midnight; in Los Angeles that instant is the evening before.
	assert.equal(followUpDay("2026-10-21T00:00:00Z", "America/Los_Angeles"), "2026-10-21");
	assert.equal(followUpDay("2026-10-21T00:00:00Z", "Pacific/Auckland"), "2026-10-21");
	// The app stores 09:00 on the user's clock.
	assert.equal(followUpDay("2026-10-21T16:00:00Z", "America/Los_Angeles"), "2026-10-21"); // 09:00 PDT
	assert.equal(followUpDay("2026-10-20T20:00:00Z", "Pacific/Auckland"), "2026-10-21"); // 09:00 NZDT
	assert.equal(followUpDay("2026-10-21T00:00:00Z", "Asia/Tokyo"), "2026-10-21"); // 09:00 JST is UTC midnight
});

scenario("calendar events: closed applications left out, interview end from duration, sorted by day then time", () => {
	const applications = [
		app("late", { activity: [interview("i2", "2026-10-20T15:00:00Z", 45)] }),
		app("closed", { status: "closed", activity: [interview("i3", "2026-10-18T09:00:00Z")] }),
		app("early", {
			followUpAt: "2026-10-20T00:00:00Z",
			activity: [interview("i1", "2026-10-20T08:00:00Z", 30)],
		}),
	];
	const events = collectEvents(applications, "UTC");
	assert.deepEqual(
		events.map((event) => event.id),
		["follow-up:early", "interview:i1", "interview:i2"],
	);
	assert.equal(events[1].end.toISOString(), "2026-10-20T08:30:00.000Z");
	assert.deepEqual([...groupByDay(events).keys()], ["2026-10-20"]);
});

scenario("upcoming: an interview still running counts, a finished one doesn't; today's follow-up counts", () => {
	const applications = [
		app("a", {
			followUpAt: "2026-10-19T00:00:00Z",
			activity: [interview("done", "2026-10-19T08:00:00Z", 30), interview("running", "2026-10-19T09:30:00Z", 60)],
		}),
		app("b", { followUpAt: "2026-10-18T00:00:00Z" }),
	];
	const now = new Date("2026-10-19T10:00:00Z");
	const upcoming = upcomingEvents(collectEvents(applications, "UTC"), now, "2026-10-19");
	assert.deepEqual(
		upcoming.map((event) => event.id),
		["follow-up:a", "interview:running"],
	);
});

scenario("month grid: 42 days from the week start, no skipped or repeated days across DST", () => {
	const monday = monthGrid(2026, 9, 1);
	assert.equal(monday.length, 42);
	assert.equal(monday[0].key, "2026-09-28");
	assert.equal(monday.filter((day) => day.inMonth).length, 31);
	assert.equal(monthGrid(2026, 9, 0)[0].key, "2026-09-27");
	// March 2027: Europe changes clocks on the 28th.
	const march = monthGrid(2027, 2, 1);
	const keys = march.map((day) => day.key);
	assert.equal(new Set(keys).size, 42);
	for (let i = 1; i < keys.length; i++) {
		assert.equal(Date.parse(keys[i]) - Date.parse(keys[i - 1]), 86_400_000, `${keys[i - 1]} → ${keys[i]}`);
	}
	assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
	assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
});

scenario("week start: locale's first day where Intl knows it", () => {
	assert.equal(weekStartsOn("en-US"), 0);
	assert.equal(weekStartsOn("en-GB"), 1);
	assert.equal(weekStartsOn("de-DE"), 1);
});

scenario("outcomes: funnel counts closed applications by furthest stage; replies and median days (web parity)", () => {
	const applications = [
		app("saved", { status: "saved" }),
		app("applied", { activity: [stage("applied", "2026-09-01T12:00:00Z")] }),
		app("screen", {
			status: "screening",
			activity: [stage("applied", "2026-09-01T12:00:00Z"), stage("screening", "2026-09-05T12:00:00Z")],
		}),
		app("closed-after-interview", {
			status: "closed",
			closedReason: "not-selected",
			activity: [
				stage("applied", "2026-09-01T12:00:00Z"),
				stage("interview", "2026-09-11T12:00:00Z"),
				stage("closed", "2026-09-20T12:00:00Z"),
			],
		}),
		app("rejected", {
			status: "closed",
			closedReason: "not-selected",
			activity: [stage("applied", "2026-09-01T12:00:00Z"), stage("closed", "2026-09-08T12:00:00Z")],
		}),
	];
	const outcomes = computeOutcomes(applications, () => false);
	assert.deepEqual(outcomes.funnel, [
		{ status: "applied", reached: 4 },
		{ status: "screening", reached: 2 },
		{ status: "interview", reached: 1 },
		{ status: "offer", reached: 0 },
	]);
	assert.equal(outcomes.sent, 4);
	assert.equal(outcomes.heardBack, 3); // screening after 4 days, interview after 10, rejection after 7
	assert.equal(outcomes.medianDaysToReply, 7);
});

scenario("outcomes: tailored vs base only counts sent applications with a linked resume", () => {
	const applications = [
		app("t1", { resumeId: "r1", status: "screening", activity: [stage("screening", "2026-09-04T12:00:00Z")] }),
		app("t2", { resumeId: "r2" }),
		app("b1", { resumeId: "base", status: "interview", activity: [stage("interview", "2026-09-10T12:00:00Z")] }),
		app("none"),
		app("saved", { status: "saved", resumeId: "r3" }),
	];
	const madeFor = new Map([
		["r1", "t1"],
		["r2", "t2"],
		["r3", "saved"],
	]);
	const outcomes = computeOutcomes(applications, (a) => madeFor.get(a.resumeId) === a.id);
	assert.deepEqual(outcomes.tailored, { sent: 2, replied: 1 });
	assert.deepEqual(outcomes.base, { sent: 1, replied: 1 });
});

scenario("timeline: weeks are bucketed on the user's clock and start on the locale's week start", () => {
	// Sent 23:30 UTC on Sunday 11 Oct: Monday 01:30 in Berlin, Sunday 16:30 in Los Angeles.
	const applications = [app("a", { activity: [stage("applied", "2026-10-11T23:30:00Z")] })];
	const now = new Date("2026-10-19T12:00:00Z"); // Monday
	const berlin = computeTimeline(applications, { now, timeZone: "Europe/Berlin", weekStartsOn: 1 });
	const la = computeTimeline(applications, { now, timeZone: "America/Los_Angeles", weekStartsOn: 1 });
	assert.equal(berlin.length, 8);
	assert.equal(berlin.at(-1).start, "2026-10-19");
	assert.equal(berlin[0].start, "2026-08-31");
	assert.deepEqual(berlin.find((week) => week.count)?.start, "2026-10-12");
	assert.deepEqual(la.find((week) => week.count)?.start, "2026-10-05");
	// Sunday-start weeks put the LA Sunday at the start of its own week.
	const sunday = computeTimeline(applications, { now, timeZone: "America/Los_Angeles", weekStartsOn: 0 });
	assert.deepEqual(sunday.find((week) => week.count)?.start, "2026-10-11");
	// Saved-only applications and ones sent before the window are not counted.
	const old = [app("old", { appliedAt: "2026-01-01T12:00:00Z" }), app("saved", { status: "saved" })];
	assert.equal(
		computeTimeline(old, { now, timeZone: "UTC", weekStartsOn: 1 }).reduce((sum, week) => sum + week.count, 0),
		0,
	);
});

scenario("pipeline: reached and conversion among active applications; closed counted apart (web computeInsights)", () => {
	const statuses = ["saved", "saved", "applied", "applied", "applied", "screening", "interview", "offer", "closed"];
	const pipeline = computePipeline(statuses.map((status) => ({ status })));
	assert.equal(pipeline.active, 8);
	assert.equal(pipeline.closed, 1);
	assert.deepEqual(
		pipeline.steps.map((step) => [step.status, step.reached, step.conversion]),
		[
			["saved", 8, 100],
			["applied", 6, 75],
			["screening", 3, 50],
			["interview", 2, 67],
			["offer", 1, 50],
		],
	);
	assert.deepEqual(
		computePipeline([]).steps.map((step) => step.conversion),
		[null, null, null, null, null],
	);
});

scenario("sources: counted per source, most first, empty sources left out (server stats parity)", () => {
	const sources = countSources([
		{ source: "LinkedIn" },
		{ source: "Referral" },
		{ source: null },
		{ source: "" },
		{ source: "Referral" },
	]);
	assert.deepEqual(sources, [
		{ source: "Referral", count: 2 },
		{ source: "LinkedIn", count: 1 },
	]);
});

scenario("follow-up editor (detail sheet) opens on the calendar's day; saving it keeps that day", () => {
	// The editor initialises from followUpDay and saves followUpStart(date) (application-detail/sheets.tsx).
	const roundTrip = (followUpAt, timeZone) => {
		const date = followUpDay(followUpAt, timeZone);
		return { date, saved: followUpStart(date, timeZone).toISOString() };
	};
	// Web stored 21 Oct as UTC midnight: the calendar shows 21 Oct in Los Angeles, so the editor must too.
	assert.deepEqual(roundTrip("2026-10-21T00:00:00Z", "America/Los_Angeles"), {
		date: "2026-10-21",
		saved: "2026-10-21T16:00:00.000Z", // 09:00 PDT
	});
	assert.equal(roundTrip("2026-10-21T00:00:00Z", "Pacific/Auckland").date, "2026-10-21");
	// The app's own 09:00-local values save back unchanged.
	assert.deepEqual(roundTrip("2026-10-21T16:00:00Z", "America/Los_Angeles"), {
		date: "2026-10-21",
		saved: "2026-10-21T16:00:00.000Z",
	});
});

scenario("board: a failed move clears its own override even before the optimistic render (review fix 2)", () => {
	const pending = { id: "a", from: "saved", to: "screening" };
	// The mutation failed and rolled back before the list ever showed Screening: the list still says Saved.
	const list = [{ id: "a", status: "saved" }];
	assert.equal(keepPending(pending, list), pending); // render-time check alone would keep it forever
	assert.equal(pendingAfterError(pending, "a", "screening"), null);
	// A later move of the same card, or another card's move, is left alone.
	assert.equal(pendingAfterError({ id: "a", from: "saved", to: "offer" }, "a", "screening")?.to, "offer");
	assert.equal(pendingAfterError({ id: "b", from: "saved", to: "applied" }, "a", "screening")?.id, "b");
	// Once the list moves on, the override goes.
	assert.equal(keepPending(pending, [{ id: "a", status: "screening" }]), null);
	assert.equal(keepPending(pending, []), null);
});

scenario("board: the drop target is picked from current column positions (review fix 3)", () => {
	const before = new Map([
		["saved", { x: 16, width: 268 }],
		["applied", { x: 296, width: 268 }],
	]);
	assert.equal(stageAt(300, before), "applied");
	assert.equal(stageAt(290, before), null); // in the gap
	// Auto-scroll moved the columns one step left under a finger that stayed at x = 300.
	const after = new Map([
		["saved", { x: -264, width: 268 }],
		["applied", { x: 16, width: 268 }],
		["screening", { x: 296, width: 268 }],
	]);
	assert.equal(stageAt(300, after), "screening");
});

let failed = 0;
for (const { name, run } of scenarios) {
	try {
		run();
		console.log(`ok   ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL ${name}\n     ${error.message}`);
	}
}
console.log(`\n${scenarios.length - failed}/${scenarios.length} scenarios passed (TZ=${process.env.TZ ?? "system"})`);
process.exit(failed ? 1 : 0);
