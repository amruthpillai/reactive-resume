import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createResumeData, hasRenderDataChanged, preserveServerStylesheet } from "./stylesheet-preservation";

const cloneData = (): ResumeData => structuredClone(defaultResumeData);

const semanticStylesheet = {
	mode: "semantic",
	source: { languageVersion: 1, text: "@version 1;\nresume { color: red; }\n" },
	applied: { languageVersion: 1, text: "@version 1;\nresume { color: red; }\n" },
} as const;

describe("preserveServerStylesheet", () => {
	it("preserves the server-owned stylesheet when an old client omits it", () => {
		const serverData = cloneData();
		serverData.metadata.stylesheet = semanticStylesheet;
		const clientData = cloneData();

		const merged = preserveServerStylesheet(serverData, clientData);

		expect(merged.metadata.stylesheet).toEqual(semanticStylesheet);
	});

	it("preserves the server-owned stylesheet when a client tries to replace it", () => {
		const serverData = cloneData();
		serverData.metadata.stylesheet = semanticStylesheet;
		const clientData = cloneData();
		clientData.metadata.stylesheet = {
			mode: "legacy",
			source: { languageVersion: 1, text: "@version 1;\n" },
			applied: { languageVersion: 1, text: "@version 1;\n" },
		};

		expect(preserveServerStylesheet(serverData, clientData).metadata.stylesheet).toEqual(semanticStylesheet);
	});

	it("does not let a generic update introduce a stylesheet", () => {
		const serverData = cloneData();
		const clientData = cloneData();
		clientData.metadata.stylesheet = semanticStylesheet;

		expect(preserveServerStylesheet(serverData, clientData).metadata.stylesheet).toBeUndefined();
	});
});

describe("hasRenderDataChanged", () => {
	it("detects content and base-design changes", () => {
		const before = cloneData();
		const changedContent = cloneData();
		changedContent.basics.name = "Changed";
		const changedDesign = cloneData();
		changedDesign.metadata.design.colors.primary = "#000000";

		expect(hasRenderDataChanged(before, changedContent)).toBe(true);
		expect(hasRenderDataChanged(before, changedDesign)).toBe(true);
	});

	it("ignores notes and stylesheet source or applied changes", () => {
		const before = cloneData();
		before.metadata.stylesheet = semanticStylesheet;
		const changedNotes = structuredClone(before);
		changedNotes.metadata.notes = "private note";
		const changedStylesheet = structuredClone(before);
		changedStylesheet.metadata.stylesheet = {
			...semanticStylesheet,
			source: { languageVersion: 1, text: "@version 1;\nresume { color: blue; }\n" },
			applied: { languageVersion: 1, text: "@version 1;\nresume { color: blue; }\n" },
		};

		expect(hasRenderDataChanged(before, changedNotes)).toBe(false);
		expect(hasRenderDataChanged(before, changedStylesheet)).toBe(false);
	});

	it("detects active legacy style-rule changes but ignores dormant rules in semantic mode", () => {
		const legacyBefore = cloneData();
		const legacyAfter = cloneData();
		legacyAfter.metadata.styleRules = [
			{
				id: "rule",
				label: "Rule",
				enabled: true,
				target: { scope: "global" },
				slots: { heading: { color: "#000000" } },
			},
		];
		const semanticBefore = cloneData();
		semanticBefore.metadata.stylesheet = semanticStylesheet;
		const semanticAfter = structuredClone(semanticBefore);
		semanticAfter.metadata.styleRules = legacyAfter.metadata.styleRules;

		expect(hasRenderDataChanged(legacyBefore, legacyAfter)).toBe(true);
		expect(hasRenderDataChanged(semanticBefore, semanticAfter)).toBe(false);
	});
});

describe("createResumeData", () => {
	it("always seeds an empty semantic stylesheet", () => {
		expect(createResumeData({}).metadata.stylesheet).toEqual({
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\n" },
			applied: { languageVersion: 1, text: "@version 1;\n" },
		});
	});

	it("clones normal and sample defaults instead of mutating shared data", () => {
		const normal = createResumeData({ locale: "de-DE" });
		const sample = createResumeData({
			withSampleData: true,
			name: "Sample Person",
			locale: "de-DE",
		});

		normal.basics.name = "Mutated";
		sample.metadata.page.locale = "en-US";

		expect(defaultResumeData.basics.name).toBe("");
		expect(defaultResumeData.metadata.page.locale).not.toBe("de-DE");
		expect(sample.basics.name).toBe("Sample Person");
	});
});
