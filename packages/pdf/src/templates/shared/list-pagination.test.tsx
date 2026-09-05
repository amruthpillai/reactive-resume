import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { resolveResumeRuntime } from "../../semantic/resolve";

async function listPages(
	margin: number,
	repeats = 5,
	css = "",
	options: { html?: string; rtl?: boolean; multipleParagraphs?: boolean } = {},
) {
	const data = structuredClone(defaultResumeData);
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	if (options.rtl) data.metadata.page.locale = "ar-SA";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.summary.title = "Summary";
	// Normalization unwraps a lone paragraph in a list item. Two paragraphs retain
	// real paragraph nodes so authored orphans are exercised by the renderer.
	data.summary.content =
		options.html ??
		`<ul><li><p>TARGET ${"Some words to fill several lines and force wrapping. ".repeat(repeats)} END</p>${options.multipleParagraphs ? "<p>Second paragraph</p>" : ""}</li></ul>`;
	data.metadata.stylesheet = {
		mode: "semantic",
		source: {
			languageVersion: 1,
			text: `@version 1; page { size: 300pt 300pt; } rich-text { margin-top: ${margin}pt; } ${css}`,
		},
	};
	const runtime = resolveResumeRuntime({ data, template: "onyx", mode: "semantic" });
	expect(runtime.diagnostics).toEqual([]);
	const bytes = await act(() => renderToBuffer(<ResumeDocument data={data} template="onyx" />));
	const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
	try {
		const doc = await task.promise;
		const pages: string[][] = [];
		for (let n = 1; n <= doc.numPages; n++) {
			const page = await doc.getPage(n);
			const text = await page.getTextContent();
			pages.push(text.items.flatMap((item) => ("str" in item && item.str ? [item.str] : [])));
		}
		return {
			marker: pages.findIndex((p) => p.some((s) => s.includes("•") || s.startsWith("1."))),
			first: pages.findIndex((p) => p.some((s) => s.includes("TARGET"))),
			last: pages.findIndex((p) => p.some((s) => s.includes("END"))),
			pages,
		};
	} finally {
		await task.destroy();
	}
}

describe("list marker pagination (#3344)", () => {
	it("terminates when an authored marker presence hint exceeds a whole page", async () => {
		if (process.env.RR_LIST_PRESENCE_PROBE !== "1") {
			// The renderer's pagination loop is synchronous. A test timeout cannot
			// interrupt it, so run this probe in a killable process with thread workers.
			const vitest = join(dirname(createRequire(import.meta.url).resolve("vitest/package.json")), "vitest.mjs");
			await promisify(execFile)(
				process.execPath,
				[
					vitest,
					"run",
					"src/templates/shared/list-pagination.test.tsx",
					"-t",
					"terminates when an authored marker presence hint exceeds a whole page",
					"--pool=threads",
					"--maxWorkers=1",
					"--passWithNoTests=false",
				],
				{
					cwd: fileURLToPath(new URL("../../../", import.meta.url)),
					env: { ...process.env, RR_LIST_PRESENCE_PROBE: "1" },
					// Include cold imports when the full suite competes for workers.
					timeout: 60000,
					killSignal: "SIGKILL",
				},
			);
			return;
		}
		for (const rtl of [false, true]) {
			for (const first of ["list-item-content", "list-marker"]) {
				const result = await listPages(
					180,
					30,
					`${first} { order: -1; } list-marker { -resume-min-presence-ahead: 1000pt; }`,
					{ rtl },
				);
				expect(result.first).toBe(1);
				expect(result.marker).toBe(result.first);
				expect(result.last).toBeGreaterThan(result.first);
				expect(result.pages.length).toBeLessThanOrEqual(4);
				expect(result.pages.flat().join(" ").match(/•/g)).toHaveLength(1);
				expect(
					result.pages
						.flat()
						.join(" ")
						.match(/\bSome\b/g),
				).toHaveLength(30);
			}
		}
	}, 70000);
	it("moves a bullet with its first paragraph when the paragraph cannot start on this page", async () => {
		const result = await listPages(194);
		expect(result.first).toBe(1);
		expect(result.marker).toBe(result.first);
	});
	it("keeps content on the current page when the first paragraph can start", async () => {
		const result = await listPages(192);
		expect(result.first).toBe(0);
		expect(result.marker).toBe(result.first);
	});
	it("allows a long list item to continue across pages", async () => {
		const result = await listPages(194, 30);
		expect(result.marker).toBe(result.first);
		expect(result.last).toBeGreaterThan(result.first);
		expect(result.pages.flat().join(" ").match(/•/g)).toHaveLength(1);
		expect(
			result.pages
				.flat()
				.join(" ")
				.match(/\bSome\b/g),
		).toHaveLength(30);
	});
	it("respects authored paragraph orphan counts", async () => {
		const result = await listPages(190, 30, "paragraph { orphans: 3; }", { multipleParagraphs: true });
		expect(result.marker).toBe(result.first);
		expect(result.last).toBeGreaterThan(result.first);
	});
	it("allows the first line when the author requests one orphan line", async () => {
		const result = await listPages(194, 30, "paragraph { orphans: 1; }", { multipleParagraphs: true });
		expect(result.first).toBe(0);
		expect(result.marker).toBe(result.first);
	});
	it.each([180, 190, 192, 194, 200, 208, 215])(
		"keeps reordered list markers with content at margin %i",
		async (margin) => {
			const result = await listPages(margin, 30, "list-item-content { order: -1; }");
			expect(result.marker).toBe(result.first);
		},
	);
	it.each([180, 190, 192, 194, 200, 208, 215])("keeps RTL markers with content at margin %i", async (margin) => {
		const result = await listPages(margin, 30, "", { rtl: true });
		expect(result.marker).toBe(result.first);
	});
	it("keeps ordered markers with first text", async () => {
		const result = await listPages(194, 30, "", {
			html: `<ol><li>TARGET ${"Some words to fill several lines and force wrapping. ".repeat(30)} END</li></ol>`,
		});
		expect(result.marker).toBe(result.first);
	});
	it("does not add a marker when Semantic CSS hides it", async () => {
		const result = await listPages(194, 30, "list-marker { display: none; }");
		expect(result.marker).toBe(-1);
		expect(result.first).toBe(1);
	});
	it("respects an explicit marker presence override", async () => {
		const result = await listPages(180, 30, "list-marker { -resume-min-presence-ahead: 60pt; }");
		expect(result.first).toBe(1);
		expect(result.marker).toBe(result.first);
	});
	it("keeps a nested list marker with its first text", async () => {
		const result = await listPages(179, 30, "", {
			html: `<ul><li>Outer item<ul><li>TARGET ${"Some words to fill several lines and force wrapping. ".repeat(30)} END</li></ul></li></ul>`,
		});
		const markerPages = result.pages.flatMap((page, index) =>
			page.flatMap((text) => (text.includes("•") ? [index] : [])),
		);
		expect(markerPages.at(1)).toBe(result.first);
	});
	it("uses the visible list item's orphan count after filtering", async () => {
		const result = await listPages(194, 30, "list-item:first-child { display: none; } paragraph { orphans: 1; }", {
			html: `<ul><li>Hidden first item</li><li><p>TARGET ${"Some words to fill several lines and force wrapping. ".repeat(30)} END</p><p>Last paragraph</p></li></ul>`,
		});
		expect(result.first).toBe(0);
		expect(result.marker).toBe(result.first);
		expect(result.pages.flat().join(" ")).not.toContain("Hidden first item");
	});
	it("uses the first rendered paragraph after semantic reordering", async () => {
		const result = await listPages(194, 30, "paragraph:last-child { order: -1; orphans: 1; }", {
			html: `<ul><li><p>Original first paragraph</p><p>TARGET ${"Some words to fill several lines and force wrapping. ".repeat(30)} END</p></li></ul>`,
		});
		expect(result.first).toBe(0);
		expect(result.marker).toBe(result.first);
	});
	it("keeps the marker with a paragraph using larger text", async () => {
		const result = await listPages(180, 30, "paragraph { font-size: 15pt; orphans: 2; }", { multipleParagraphs: true });
		expect(result.marker).toBe(result.first);
	});
	it.each([false, true])("keeps explicitly deferred markers with reordered content (RTL %s)", async (rtl) => {
		const result = await listPages(
			180,
			30,
			"list-item-content { order: -1; } list-marker { -resume-min-presence-ahead: 60pt; }",
			{ rtl },
		);
		expect(result.first).toBe(1);
		expect(result.marker).toBe(result.first);
		expect(
			result.pages
				.flat()
				.join(" ")
				.match(/\bSome\b/g),
		).toHaveLength(30);
	});
	it("keeps short content and its marker on one page", async () => {
		const result = await listPages(0, 1);
		expect(result.pages).toHaveLength(1);
		expect(result.marker).toBe(0);
		expect(result.first).toBe(0);
	});
	it.each([
		[false, 0],
		[false, 180],
		[true, 0],
		[true, 180],
	] as const)(
		"consumes reordered marker page breaks and continues long content (RTL %s, margin %i)",
		async (rtl, margin) => {
			const result = await listPages(
				margin,
				30,
				"list-item-content { order: -1; } list-marker { break-before: page; }",
				{ rtl },
			);
			expect(result.first).toBe(1);
			expect(result.marker).toBe(result.first);
			expect(result.last).toBeGreaterThan(result.first);
			expect(result.pages.flat().join(" ").match(/•/g)).toHaveLength(1);
			expect(
				result.pages
					.flat()
					.join(" ")
					.match(/\bSome\b/g),
			).toHaveLength(30);
		},
	);
	it.each([false, true])("consumes marker-first page breaks without overflowing (RTL %s)", async (rtl) => {
		const result = await listPages(180, 30, "list-marker { order: -1; break-before: page; }", { rtl });
		expect(result.first).toBe(1);
		expect(result.marker).toBe(result.first);
		expect(result.last).toBeGreaterThan(result.first);
		expect(result.pages.flat().join(" ").match(/•/g)).toHaveLength(1);
		expect(
			result.pages
				.flat()
				.join(" ")
				.match(/\bSome\b/g),
		).toHaveLength(30);
	});
});
