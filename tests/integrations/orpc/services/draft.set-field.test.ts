/**
 * @packageDocumentation
 *
 * @remarks
 * Focused tests for the draft setField operation. These tests validate that
 * field-level updates mutate only the intended paths while preserving other
 * draft state required for iterative workflows.
 */
import { describe, expect, it } from "vitest";
import { applySetFieldOperation } from "@/integrations/orpc/services/draft/set-field";
import { createEmptyDraftData } from "./draft-test-helpers";

/**
 * @remarks
 * Validates the setField operation against representative paths.
 */
describe("applySetFieldOperation", () => {
	/**
	 * @remarks
	 * Updates a basic scalar field without affecting unrelated draft content.
	 */
	it("updates basics fields while preserving untouched values", () => {
		const draft = createEmptyDraftData();

		const nextDraft = applySetFieldOperation(draft, {
			op: "setField",
			path: "basics.name",
			value: "Ada Lovelace",
		});

		expect(nextDraft.basics.name).toBe("Ada Lovelace");
		expect(nextDraft.basics.location).toBe("");
		expect(nextDraft.summary.content).toBe("");
	});

	/**
	 * @remarks
	 * Updates nested and section-scoped fields while preserving existing items.
	 */
	it("updates nested website fields and section titles", () => {
		const draft = {
			...createEmptyDraftData(),
			sections: {
				...createEmptyDraftData().sections,
				experience: {
					title: "",
					items: [
						{
							id: "experience-1",
							company: "",
							position: "",
							location: "",
							period: "",
							website: { label: "", url: "" },
							description: "",
						},
					],
				},
			},
		};

		const withWebsite = applySetFieldOperation(draft, {
			op: "setField",
			path: "basics.website.url",
			value: "https://example.com",
		});

		const withTitle = applySetFieldOperation(withWebsite, {
			op: "setField",
			path: "sections.experience.title",
			value: "Experience",
		});

		expect(withTitle.basics.website.url).toBe("https://example.com");
		expect(withTitle.basics.website.label).toBe("");
		expect(withTitle.sections.experience.title).toBe("Experience");
		expect(withTitle.sections.experience.items).toHaveLength(1);
		expect(withTitle.sections.experience.items[0]?.id).toBe("experience-1");
	});

	/**
	 * @remarks
	 * Updates a broad set of scalar and section title paths.
	 */
	it("updates picture, contact info, metadata, and multiple section titles", () => {
		const draft = createEmptyDraftData();

		const operations: Array<Parameters<typeof applySetFieldOperation>[1]> = [
			{ op: "setField", path: "picture.url", value: "https://example.com/photo.jpg" },
			{ op: "setField", path: "basics.email", value: "ada@example.com" },
			{ op: "setField", path: "basics.phone", value: "+44-1234" },
			{ op: "setField", path: "basics.location", value: "London" },
			{ op: "setField", path: "basics.website.label", value: "Portfolio" },
			{ op: "setField", path: "summary.title", value: "Summary" },
			{ op: "setField", path: "metadata.notes", value: "Collected by agent." },
			{ op: "setField", path: "sections.education.title", value: "Education" },
			{ op: "setField", path: "sections.projects.title", value: "Projects" },
			{ op: "setField", path: "sections.skills.title", value: "Skills" },
			{ op: "setField", path: "sections.languages.title", value: "Languages" },
			{ op: "setField", path: "sections.interests.title", value: "Interests" },
			{ op: "setField", path: "sections.awards.title", value: "Awards" },
			{ op: "setField", path: "sections.certifications.title", value: "Certifications" },
			{ op: "setField", path: "sections.publications.title", value: "Publications" },
			{ op: "setField", path: "sections.volunteer.title", value: "Volunteer" },
			{ op: "setField", path: "sections.references.title", value: "References" },
		];

		const updated = operations.reduce(
			(current, operation) => applySetFieldOperation(current, operation),
			draft,
		);

		expect(updated.picture.url).toBe("https://example.com/photo.jpg");
		expect(updated.basics.email).toBe("ada@example.com");
		expect(updated.basics.phone).toBe("+44-1234");
		expect(updated.basics.location).toBe("London");
		expect(updated.basics.website.label).toBe("Portfolio");
		expect(updated.basics.website.url).toBe("");
		expect(updated.summary.title).toBe("Summary");
		expect(updated.summary.content).toBe("");
		expect(updated.metadata.notes).toBe("Collected by agent.");
		expect(updated.sections.education.title).toBe("Education");
		expect(updated.sections.projects.title).toBe("Projects");
		expect(updated.sections.skills.title).toBe("Skills");
		expect(updated.sections.languages.title).toBe("Languages");
		expect(updated.sections.interests.title).toBe("Interests");
		expect(updated.sections.awards.title).toBe("Awards");
		expect(updated.sections.certifications.title).toBe("Certifications");
		expect(updated.sections.publications.title).toBe("Publications");
		expect(updated.sections.volunteer.title).toBe("Volunteer");
		expect(updated.sections.references.title).toBe("References");
		expect(updated.sections.experience.title).toBe("");
	});
});
