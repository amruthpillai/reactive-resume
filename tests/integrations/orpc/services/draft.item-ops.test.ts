/**
 * @packageDocumentation
 *
 * @remarks
 * Focused tests for the draft itemOps operation. These tests validate partial
 * list mutations (upsert/remove/reorder) while preserving the stability required
 * for chunked, iterative agent updates.
 */
import { describe, expect, it } from "vitest";
import { applyItemOpsOperation } from "@/integrations/orpc/services/draft/item-ops";
import { createEmptyDraftData } from "./draft-test-helpers";

/**
 * @remarks
 * Validates itemOps behavior across section and custom targets.
 */
describe("applyItemOpsOperation", () => {
	/**
	 * @remarks
	 * Upserts section items by id and merges partial updates without requiring full payloads.
	 */
	it("upserts and merges partial section items", () => {
		const draft = createEmptyDraftData();

		const withCompany = applyItemOpsOperation(draft, {
			op: "itemOps",
			action: "upsert",
			target: { kind: "section", section: "experience" },
			items: [{ id: "experience-1", company: "Analytical Engine" }],
		});

		const withPosition = applyItemOpsOperation(withCompany, {
			op: "itemOps",
			action: "upsert",
			target: { kind: "section", section: "experience" },
			items: [{ id: "experience-1", position: "Analyst" }],
		});

		const item = withPosition.sections.experience.items[0];
		expect(item?.company).toBe("Analytical Engine");
		expect(item?.position).toBe("Analyst");
		expect(item?.website.label).toBe("");
		expect(item?.website.url).toBe("");
	});

	/**
	 * @remarks
	 * Removes items by id and reorders the remaining list deterministically.
	 */
	it("removes and reorders section items", () => {
		const draft = createEmptyDraftData();

		const withItems = applyItemOpsOperation(draft, {
			op: "itemOps",
			action: "upsert",
			target: { kind: "section", section: "skills" },
			items: [
				{ id: "skill-1", name: "Mathematics" },
				{ id: "skill-2", name: "Logic" },
				{ id: "skill-3", name: "Engineering" },
			],
		});

		const afterRemove = applyItemOpsOperation(withItems, {
			op: "itemOps",
			action: "remove",
			target: { kind: "section", section: "skills" },
			ids: ["skill-2"],
		});

		const afterReorder = applyItemOpsOperation(afterRemove, {
			op: "itemOps",
			action: "reorder",
			target: { kind: "section", section: "skills" },
			ids: ["skill-3", "skill-1"],
		});

		const ids = afterReorder.sections.skills.items.map((item) => item.id);
		expect(ids).toEqual(["skill-3", "skill-1"]);
	});

	/**
	 * @remarks
	 * Supports non-section targets such as custom fields and custom sections.
	 */
	it("upserts custom fields and custom section items", () => {
		const draft = {
			...createEmptyDraftData(),
			customSections: [
				{
					id: "custom-section-1",
					title: "Talks",
					type: "projects",
					items: [],
				},
			],
		};

		const withCustomField = applyItemOpsOperation(draft, {
			op: "itemOps",
			action: "upsert",
			target: { kind: "customField" },
			items: [{ id: "custom-field-1", text: "Open to relocation" }],
		});

		const withCustomSectionItem = applyItemOpsOperation(withCustomField, {
			op: "itemOps",
			action: "upsert",
			target: { kind: "customSection", sectionId: "custom-section-1" },
			items: [{ id: "custom-item-1", name: "Analytical Engine Notes" }],
		});

		expect(withCustomSectionItem.basics.customFields[0]?.text).toBe("Open to relocation");
		expect(withCustomSectionItem.basics.customFields[0]?.link).toBe("");
		expect(withCustomSectionItem.customSections[0]?.items[0]?.id).toBe("custom-item-1");
		expect(withCustomSectionItem.customSections[0]?.items[0]?.name).toBe("Analytical Engine Notes");
	});
});
