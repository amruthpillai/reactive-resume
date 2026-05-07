import type { ResumeData, SectionType } from "@reactive-resume/schema/resume/data";
import type { WritableDraft } from "immer";

/**
 * Pushes a new item into a section's items array.
 * Handles both built-in sections and custom sections.
 */
export function createSectionItem(
	draft: WritableDraft<ResumeData>,
	sectionKey: SectionType,
	formData: Record<string, unknown>,
	customSectionId?: string,
) {
	if (customSectionId) {
		const section = draft.customSections.find((s) => s.id === customSectionId);
		if (section) section.items.push(formData as never);
	} else {
		(draft.sections[sectionKey].items as unknown[]).push(formData);
	}
}

/**
 * Finds and replaces an existing item in a section's items array by id.
 * Handles both built-in sections and custom sections.
 */
export function updateSectionItem(
	draft: WritableDraft<ResumeData>,
	sectionKey: SectionType,
	formData: { id: string } & Record<string, unknown>,
	customSectionId?: string,
) {
	if (customSectionId) {
		const section = draft.customSections.find((s) => s.id === customSectionId);
		if (!section) return;
		const index = section.items.findIndex((item) => item.id === formData.id);
		if (index !== -1) section.items[index] = formData as never;
	} else {
		const items = draft.sections[sectionKey].items as Array<{ id: string }>;
		const index = items.findIndex((item) => item.id === formData.id);
		if (index !== -1) (items[index] as unknown as Record<string, unknown>) = formData;
	}
}
