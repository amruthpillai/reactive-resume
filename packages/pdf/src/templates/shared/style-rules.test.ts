import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { getSectionStyleRuleContext, resolveStyleRuleSlot } from "./style-rules";

const createResumeData = (styleRules: ResumeData["metadata"]["styleRules"]): ResumeData => ({
	...defaultResumeData,
	metadata: {
		...defaultResumeData.metadata,
		styleRules,
	},
});

describe("resolveStyleRuleSlot", () => {
	it("applies global, section-type, and section-id rules in specificity order", () => {
		const data = createResumeData([
			{
				id: "global-heading",
				label: "Global Heading",
				enabled: true,
				target: { scope: "global" },
				slots: { heading: { color: "rgba(0, 0, 0, 1)", fontSize: 12 } },
			},
			{
				id: "experience-heading",
				label: "Experience Heading",
				enabled: true,
				target: { scope: "sectionType", sectionType: "experience" },
				slots: { heading: { color: "rgba(220, 38, 38, 1)" } },
			},
			{
				id: "specific-heading",
				label: "Specific Heading",
				enabled: true,
				target: { scope: "sectionId", sectionId: "experience" },
				slots: { heading: { fontSize: 15 } },
			},
		]);

		expect(
			resolveStyleRuleSlot(data, {
				sectionId: "experience",
				sectionType: "experience",
				slot: "heading",
			}),
		).toEqual({ color: "#dc2626", fontSize: 15 });
	});

	it("ignores disabled rules and non-matching deleted section ids", () => {
		const data = createResumeData([
			{
				id: "disabled",
				label: "Disabled",
				enabled: false,
				target: { scope: "global" },
				slots: { section: { backgroundColor: "rgba(0, 0, 0, 1)" } },
			},
			{
				id: "missing",
				label: "Missing",
				enabled: true,
				target: { scope: "sectionId", sectionId: "missing-section" },
				slots: { section: { backgroundColor: "rgba(220, 38, 38, 1)" } },
			},
		]);

		expect(
			resolveStyleRuleSlot(data, {
				sectionId: "experience",
				sectionType: "experience",
				slot: "section",
			}),
		).toEqual({});
	});

	it("resolves custom section types for section-type rules", () => {
		const data = createResumeData([
			{
				id: "custom-summary-rich-text",
				label: "Custom Summary Rich Text",
				enabled: true,
				target: { scope: "sectionType", sectionType: "summary" },
				slots: { richParagraph: { color: "rgba(21, 93, 252, 1)" } },
			},
		]);
		const customSection = {
			...defaultResumeData.summary,
			id: "custom-summary",
			type: "summary" as const,
			items: [],
		};
		const customData = { ...data, customSections: [customSection] };

		expect(getSectionStyleRuleContext(customData, "custom-summary")).toEqual({
			sectionId: "custom-summary",
			sectionType: "summary",
		});
		expect(
			resolveStyleRuleSlot(customData, {
				sectionId: "custom-summary",
				sectionType: "summary",
				slot: "richParagraph",
			}),
		).toEqual({ color: "#155dfc" });
	});

	it("clamps unsafe spacing values before returning React PDF styles", () => {
		const data = createResumeData([
			{
				id: "spacing",
				label: "Spacing",
				enabled: true,
				target: { scope: "global" },
				slots: { item: { padding: 1000, marginTop: -1000, rowGap: -12, borderWidth: -5 } },
			},
		]);

		expect(
			resolveStyleRuleSlot(data, {
				sectionId: "skills",
				sectionType: "skills",
				slot: "item",
			}),
		).toEqual({ padding: 72, marginTop: -72, rowGap: -12, borderWidth: 0 });
	});

	it("resolves visible text, opacity, and border style properties", () => {
		const data = createResumeData([
			{
				id: "rich-link-style",
				label: "Rich Link Style",
				enabled: true,
				target: { scope: "global" },
				slots: {
					richLink: {
						color: "rgba(21, 93, 252, 1)",
						textDecoration: "underline",
						textDecorationColor: "rgba(220, 38, 38, 1)",
						textDecorationStyle: "dashed",
						fontStyle: "italic",
						lineHeight: 9,
						letterSpacing: -100,
						textAlign: "right",
						textTransform: "uppercase",
						opacity: 2,
						borderStyle: "dotted",
					},
				},
			},
		]);

		expect(
			resolveStyleRuleSlot(data, {
				sectionId: "experience",
				sectionType: "experience",
				slot: "richLink",
			}),
		).toEqual({
			color: "#155dfc",
			textDecoration: "underline",
			textDecorationColor: "#dc2626",
			textDecorationStyle: "dashed",
			fontStyle: "italic",
			lineHeight: 4,
			letterSpacing: -16,
			textAlign: "right",
			textTransform: "uppercase",
			opacity: 1,
			borderStyle: "dotted",
		});
	});
});
