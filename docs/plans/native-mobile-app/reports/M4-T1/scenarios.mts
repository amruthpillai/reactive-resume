// Node scenarios for M4-T1 (colour contrast, presets, layout drag logic). Run from apps/mobile:
//   cp ../../docs/plans/native-mobile-app/reports/M4-T1/scenarios.mts .m4t1.mts && node ../../node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs .m4t1.mts; rm .m4t1.mts
import assert from "node:assert/strict";
import { produce } from "immer";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ACCENTS, contrastOnWhite, darkenForWhite, MIN_CONTRAST, hexToRgba, rgbaToHex, parseColorInput, resetDesign, applyTextSize, matchDensity, applyDensity, TEMPLATES, matchesFilter } from "./src/features/design/presets.ts";
import { dropAt, moveSection, moveToEnd, moveToNewPage, setFullWidth, deletePage, isVisibleSection } from "./src/features/design/layout.ts";

let n = 0; const ok = (name: string) => console.log(`ok ${++n} ${name}`);

// Colour contrast
for (const a of ACCENTS) assert.ok(contrastOnWhite(a.hex) >= MIN_CONTRAST, a.label);
ok("all 8 accents >= 4.5:1 on white");
for (const hex of ["#FFFF00", "#A0E0A0", "#7FDBFF", "#FFFFFF", "#3E6B4F"]) {
	const dark = darkenForWhite(hex);
	assert.ok(contrastOnWhite(dark) >= 4.6, `${hex} -> ${dark} ${contrastOnWhite(dark)}`);
	console.log(`   ${hex} ${contrastOnWhite(hex).toFixed(2)}:1 -> ${dark} ${contrastOnWhite(dark).toFixed(2)}:1`);
}
assert.equal(darkenForWhite("#3E6B4F"), "#3E6B4F");
ok("darkenForWhite reaches >= 4.6:1 and keeps readable colours");
assert.equal(rgbaToHex(hexToRgba("#3e6b4f")), "#3E6B4F");
assert.equal(parseColorInput("3E6B4F"), "rgba(62, 107, 79, 1)");
assert.equal(parseColorInput("rgba(1, 2, 3, 0.5)"), "rgba(1, 2, 3, 0.5)");
assert.equal(parseColorInput("#12345"), null);
assert.equal(parseColorInput("red"), null);
ok("hex/rgba round trip and colour input parsing");

// Presets
const sized = produce(defaultResumeData.metadata, (m) => { m.typography.body.fontSize = 10; m.typography.heading.fontSize = 14; applyTextSize(m, 12); });
assert.equal(sized.typography.body.fontSize, 12); assert.equal(sized.typography.heading.fontSize, 17);
const dense = produce(defaultResumeData.metadata, (m) => applyDensity(m, "compact"));
assert.equal(matchDensity(dense), "compact");
ok("text size keeps heading ratio; density round trip");
const custom = produce(defaultResumeData, (d) => { d.metadata.template = "pikachu"; d.metadata.page.format = "letter"; d.metadata.page.locale = "de-DE"; d.metadata.page.marginX = 40; d.metadata.design.colors.primary = "rgba(1, 2, 3, 1)"; d.metadata.layout.sidebarWidth = 45; d.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "x{}" } }; });
const reset = produce(custom, (d) => resetDesign(d.metadata));
assert.equal(reset.metadata.template, "pikachu"); assert.equal(reset.metadata.page.format, "letter"); assert.equal(reset.metadata.page.locale, "de-DE");
assert.equal(reset.metadata.stylesheet?.source.text, "x{}");
assert.equal(reset.metadata.page.marginX, defaultResumeData.metadata.page.marginX);
assert.equal(reset.metadata.design.colors.primary, defaultResumeData.metadata.design.colors.primary);
assert.equal(reset.metadata.layout.sidebarWidth, defaultResumeData.metadata.layout.sidebarWidth);
ok("reset keeps template, paper, language, CSS; restores the look");
assert.equal(TEMPLATES.length, 17);
assert.deepEqual(TEMPLATES.filter((t) => matchesFilter(t, "two")).length + TEMPLATES.filter((t) => matchesFilter(t, "one")).length, 17);
ok(`17 templates; filters one=${TEMPLATES.filter((t) => matchesFilter(t, "one")).length} two=${TEMPLATES.filter((t) => matchesFilter(t, "two")).length} ats=${TEMPLATES.filter((t) => matchesFilter(t, "ats")).length}`);

// Layout drag logic
type L = typeof defaultResumeData.metadata.layout;
const layout: L = { sidebarWidth: 35, pages: [ { fullWidth: false, main: ["summary", "experience", "hidden1", "education"], sidebar: ["skills", "languages"] }, { fullWidth: false, main: ["projects"], sidebar: [] } ] };
const shown = (id: string) => id !== "hidden1";
// drop zones: page0 main rows (excluding dragged), page0 sidebar, page1 main/sidebar
const zones = [
	{ page: 0, column: "main" as const, top: 100, bottom: 250, rows: [ { top: 110, bottom: 150 }, { top: 160, bottom: 200 } ] },
	{ page: 0, column: "sidebar" as const, top: 260, bottom: 400, rows: [ { top: 270, bottom: 310 }, { top: 320, bottom: 360 } ] },
	{ page: 1, column: "main" as const, top: 450, bottom: 550, rows: [ { top: 460, bottom: 500 } ] },
	{ page: 1, column: "sidebar" as const, top: 560, bottom: 620, rows: [] },
];
assert.deepEqual(dropAt(zones, 105), { page: 0, column: "main", index: 0 });
assert.deepEqual(dropAt(zones, 175), { page: 0, column: "main", index: 1 });
assert.deepEqual(dropAt(zones, 330), { page: 0, column: "sidebar", index: 1 });
assert.deepEqual(dropAt(zones, 420), { page: 0, column: "sidebar", index: 2 }); // gap: nearest zone, after its rows
assert.deepEqual(dropAt(zones, 900), { page: 1, column: "sidebar", index: 0 }); // below everything: last zone
assert.deepEqual(dropAt(zones, 0), { page: 0, column: "main", index: 0 });
assert.equal(dropAt([], 10), null);
ok("dropAt picks column/page and index from finger y");
// main -> sidebar at index 1 (between skills and languages)
let next = produce(layout, (d) => { assert.equal(moveSection(d, "experience", { page: 0, column: "sidebar", index: 1 }, shown), true); });
assert.deepEqual(next.pages[0]!.main, ["summary", "hidden1", "education"]);
assert.deepEqual(next.pages[0]!.sidebar, ["skills", "experience", "languages"]);
ok("drag main -> sidebar lands between rows");
// reorder within main: education (visible index 2 of [summary, experience, education]) to top
next = produce(layout, (d) => void moveSection(d, "education", { page: 0, column: "main", index: 0 }, shown));
assert.deepEqual(next.pages[0]!.main, ["education", "summary", "experience", "hidden1"]);
// drop experience after education: others visible = [summary, education]; index 2 = end
next = produce(layout, (d) => void moveSection(d, "experience", { page: 0, column: "main", index: 2 }, shown));
assert.deepEqual(next.pages[0]!.main, ["summary", "hidden1", "education", "experience"]);
ok("reorder within a column keeps hidden sections in place");
// drop on same spot: no change
let changed = true;
next = produce(layout, (d) => { changed = moveSection(d, "experience", { page: 0, column: "main", index: 1 }, shown); });
assert.equal(changed, false); assert.equal(next, layout);
ok("dropping where it started changes nothing (no undo step content)");
// to another page's empty sidebar
next = produce(layout, (d) => void moveSection(d, "skills", { page: 1, column: "sidebar", index: 0 }, shown));
assert.deepEqual(next.pages[1]!.sidebar, ["skills"]); assert.deepEqual(next.pages[0]!.sidebar, ["languages"]);
ok("drag onto another page");
next = produce(layout, (d) => void moveToEnd(d, "summary", { page: 1, column: "main" }));
assert.deepEqual(next.pages[1]!.main, ["projects", "summary"]);
next = produce(layout, (d) => moveToNewPage(d, "languages"));
assert.equal(next.pages.length, 3); assert.deepEqual(next.pages[2], { fullWidth: false, main: ["languages"], sidebar: [] });
ok("Move to: end of column, new page");
next = produce(layout, (d) => setFullWidth(d, 0, true));
assert.deepEqual(next.pages[0]!.sidebar, []); assert.deepEqual(next.pages[0]!.main.slice(-2), ["skills", "languages"]);
next = produce(layout, (d) => deletePage(d, 0));
assert.equal(next.pages.length, 1); assert.deepEqual(next.pages[0]!.main, ["projects", "summary", "experience", "hidden1", "education"]);
next = produce({ ...layout, pages: [layout.pages[0]!] }, (d) => deletePage(d, 0));
assert.equal(next.pages.length, 1);
ok("full width moves sidebar to main; delete page keeps sections; last page stays");
const data = produce(defaultResumeData, (d) => { d.summary.content = "<p>Hi</p>"; d.sections.skills.items.push({ id: "s", hidden: false, name: "  ", proficiency: "", level: 0, keywords: [], icon: "", options: {} } as never); });
assert.equal(isVisibleSection("summary", data), true); assert.equal(isVisibleSection("skills", data), false); assert.equal(isVisibleSection("nope", data), false);
ok("visibility: summary with content, skills with blank names hidden");
console.log(`all ${n} scenarios passed`);
