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
});
