import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { getResumeSocialMeta } from "./social-meta";

const buildData = (overrides: { name?: string; headline?: string; summary?: string; template?: string }): ResumeData =>
	({
		basics: { name: overrides.name ?? "", headline: overrides.headline ?? "" },
		summary: { content: overrides.summary ?? "" },
		metadata: { template: overrides.template ?? "azurill" },
	}) as ResumeData;

describe("getResumeSocialMeta", () => {
	it("combines the name and headline into the social title", () => {
		const meta = getResumeSocialMeta(buildData({ name: "Jane Doe", headline: "Staff Engineer" }));

		expect(meta.title).toBe("Jane Doe — Staff Engineer");
		expect(meta.name).toBe("Jane Doe");
	});

	it("falls back to the resume name when the basics name is blank", () => {
		const meta = getResumeSocialMeta(buildData({}), "Untitled Resume");

		expect(meta.name).toBe("Untitled Resume");
		expect(meta.title).toBe("Untitled Resume");
		expect(meta.description).toBe("Untitled Resume");
	});

	it("strips markup and collapses whitespace out of the summary", () => {
		const meta = getResumeSocialMeta(
			buildData({ name: "Jane", summary: "<p>Builds   <strong>systems</strong>\n\nat scale.</p>" }),
		);

		expect(meta.description).toBe("Builds systems at scale.");
	});

	it("prefers the headline when the summary is empty markup", () => {
		const meta = getResumeSocialMeta(buildData({ name: "Jane", headline: "Staff Engineer", summary: "<p></p>" }));

		expect(meta.description).toBe("Staff Engineer");
	});

	it("truncates a long summary on a word boundary", () => {
		const meta = getResumeSocialMeta(buildData({ name: "Jane", summary: "word ".repeat(80) }));

		expect(meta.description.length).toBeLessThanOrEqual(161);
		expect(meta.description.endsWith("word…")).toBe(true);
	});
});
