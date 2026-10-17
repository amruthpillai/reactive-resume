import assert from "node:assert/strict";
import {
	validSlug,
	normalizeSlug,
	summarizeViews,
	safeFileName,
} from "../../../../../apps/mobile/src/features/share/model.ts";

let scenarios = 0;
for (const [value, valid] of [
	["resume", true],
	["0", true],
	["gameplay-programmer-2", true],
	["a1-b2", true],
	["", false],
	["Resume", false],
	["-resume", false],
	["resume-", false],
	["resume--two", false],
	["résumé", false],
	["resume_two", false],
	["resume two", false],
	["a/b", false],
	["a?b", false],
	["a.b", false],
	["a\n", false],
]) {
	assert.equal(validSlug(value), valid, `slug: ${JSON.stringify(value)}`);
	scenarios++;
}
assert.equal(normalizeSlug("Senior GAME Developer"), "senior-game-developer");
assert.equal(validSlug(normalizeSlug("Senior GAME Developer")), true);
scenarios++;

assert.deepEqual(summarizeViews([]), { views: 0, downloads: 0, peak: 0, bars: [] });
scenarios++;
assert.deepEqual(summarizeViews([{ date: "2026-10-17", views: 0, downloads: 3 }]), {
	views: 0,
	downloads: 3,
	peak: 0,
	bars: [{ date: "2026-10-17", height: 0 }],
});
scenarios++;
assert.deepEqual(
	summarizeViews([
		{ date: "2026-10-15", views: 4, downloads: 1 },
		{ date: "2026-10-16", views: 8, downloads: 2 },
		{ date: "2026-10-17", views: 0, downloads: 5 },
	]),
	{
		views: 12,
		downloads: 8,
		peak: 8,
		bars: [
			{ date: "2026-10-15", height: 0.5 },
			{ date: "2026-10-16", height: 1 },
			{ date: "2026-10-17", height: 0 },
		],
	},
);
scenarios++;
const days = [
	{ date: "old", views: 999, downloads: 999 },
	...Array.from({ length: 30 }, (_, index) => ({ date: String(index), views: 2, downloads: 1 })),
];
const snapshot = structuredClone(days);
const summary = summarizeViews(days);
assert.equal(summary.views, 60);
assert.equal(summary.downloads, 30);
assert.equal(summary.peak, 2);
assert.equal(summary.bars.length, 30);
assert.equal(summary.bars[0].date, "0");
assert.deepEqual(days, snapshot);
scenarios++;
assert.equal(safeFileName("../Marcus/Resume?.pdf"), "MarcusResume.pdf");
assert.equal(safeFileName("\u0000resume\u001f"), "resume");
assert.equal(safeFileName("..."), "");
scenarios++;
console.log(`${scenarios} scenarios passed (slug grammar/normalization, anonymous daily stats, native file names).`);
