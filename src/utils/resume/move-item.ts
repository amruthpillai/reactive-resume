import type { WritableDraft } from "immer";
import type { CustomSection, ResumeData, SectionItem, SectionType } from "@/schema/resume/data";
import { generateId } from "@/utils/string";
import { getSectionTitle as getDefaultSectionTitle } from "./section";

// ============================================================================
// Types
// ============================================================================

/** Target section that an item can be moved to */
export type MoveTargetSection = {
	sectionId: string;
	sectionTitle: string;
	/** Whether this is a standard section (true) or custom section (false) */
	isStandard: boolean;
};

/** Page with its compatible sections for the move menu */
export type MoveTargetPage = {
	pageIndex: number;
	sections: MoveTargetSection[];
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a section ID belongs to a standard section.
 * Standard sections have predefined keys like "experience", "education", etc.
 */
function isStandardSectionId(sectionId: string): sectionId is SectionType {
	const standardSections: SectionType[] = [
		"profiles",
		"experience",
		"education",
		"projects",
		"skills",
		"languages",
		"interests",
		"awards",
		"certifications",
		"publications",
		"volunteer",
		"references",
	];

	return standardSections.includes(sectionId as SectionType);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Gets the title of a section.
 * For standard sections, returns the localized default title.
 * For custom sections, returns the user-defined title.
 *
 * @param resumeData - The resume data object
 * @param type - The section type
 * @param customSectionId - The custom section ID (if applicable)
 * @returns The section title
 */
export function getSourceSectionTitle(resumeData: ResumeData, type: SectionType, customSectionId?: string): string {
	if (customSectionId) {
		const customSection = resumeData.customSections.find((s) => s.id === customSectionId);
		return customSection?.title ?? getDefaultSectionTitle(type);
	}

	return getDefaultSectionTitle(type);
}

/**
 * Finds all compatible sections an item can be moved to.
 * A section is compatible if it has the same type as the source section.
 *
 * @param resumeData - The resume data object
 * @param sourceType - The type of the source section
 * @param sourceSectionId - The ID of the source section (custom section ID or undefined for standard)
 * @returns Array of pages with their compatible sections
 */
export function getCompatibleMoveTargets(
	resumeData: ResumeData,
	sourceType: SectionType,
	sourceSectionId: string | undefined,
): MoveTargetPage[] {
	const { pages } = resumeData.metadata.layout;
	const result: MoveTargetPage[] = [];

	for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
		const page = pages[pageIndex];
		const allSectionIds = [...page.main, ...page.sidebar];
		const compatibleSections: MoveTargetSection[] = [];

		for (const sectionId of allSectionIds) {
			// Skip the source section itself
			if (sectionId === sourceSectionId || (sourceSectionId === undefined && sectionId === sourceType)) {
				continue;
			}

			// Check if it's a standard section with matching type
			if (isStandardSectionId(sectionId) && sectionId === sourceType) {
				compatibleSections.push({
					sectionId,
					sectionTitle: getDefaultSectionTitle(sectionId),
					isStandard: true,
				});
				continue;
			}

			// Check if it's a custom section with matching type
			const customSection = resumeData.customSections.find((s) => s.id === sectionId);
			if (customSection && customSection.type === sourceType) {
				compatibleSections.push({
					sectionId: customSection.id,
					sectionTitle: customSection.title,
					isStandard: false,
				});
			}
		}

		result.push({ pageIndex, sections: compatibleSections });
	}

	return result;
}

/**
 * Removes an item from its source section (standard or custom).
 *
 * @param draft - The immer draft of resume data
 * @param itemId - The ID of the item to remove
 * @param type - The section type
 * @param customSectionId - The custom section ID (if applicable)
 * @returns The removed item, or null if not found
 */
export function removeItemFromSource(
	draft: WritableDraft<ResumeData>,
	itemId: string,
	type: SectionType,
	customSectionId?: string,
): SectionItem | null {
	if (customSectionId) {
		const section = draft.customSections.find((s) => s.id === customSectionId);
		if (!section) return null;

		const index = section.items.findIndex((item) => item.id === itemId);
		if (index === -1) return null;

		const [removed] = section.items.splice(index, 1);
		return removed as SectionItem;
	}

	const section = draft.sections[type];
	if (!("items" in section)) return null;

	const index = section.items.findIndex((item) => item.id === itemId);
	if (index === -1) return null;

	const [removed] = section.items.splice(index, 1);
	return removed as SectionItem;
}

/**
 * Adds an item to a target section.
 *
 * @param draft - The immer draft of resume data
 * @param item - The item to add
 * @param targetSectionId - The target section ID
 * @param type - The section type
 */
export function addItemToSection(
	draft: WritableDraft<ResumeData>,
	item: SectionItem,
	targetSectionId: string,
	type: SectionType,
): void {
	// Check if target is a standard section
	if (isStandardSectionId(targetSectionId) && targetSectionId === type) {
		const section = draft.sections[type];
		if ("items" in section) {
			section.items.push(item as never);
		}
		return;
	}

	// Otherwise, it's a custom section
	const customSection = draft.customSections.find((s) => s.id === targetSectionId);
	if (customSection) {
		customSection.items.push(item as never);
	}
}

/**
 * Creates a new custom section with the given item and adds it to the specified page.
 *
 * @param draft - The immer draft of resume data
 * @param item - The item to add to the new section
 * @param type - The section type for the new custom section
 * @param sectionTitle - The title for the new custom section
 * @param targetPageIndex - The page index to add the section to
 * @returns The ID of the newly created custom section
 */
export function createCustomSectionWithItem(
	draft: WritableDraft<ResumeData>,
	item: SectionItem,
	type: SectionType,
	sectionTitle: string,
	targetPageIndex: number,
): string {
	const newSectionId = generateId();

	// Create the new custom section
	const newSection: CustomSection = {
		id: newSectionId,
		type,
		title: sectionTitle,
		columns: 1,
		hidden: false,
		items: [item as never],
	};

	draft.customSections.push(newSection as WritableDraft<CustomSection>);

	// Add the section to the target page's main column
	const page = draft.metadata.layout.pages[targetPageIndex];
	if (page) {
		page.main.push(newSectionId);
	}

	return newSectionId;
}

/**
 * Creates a new page with a custom section containing the given item.
 *
 * @param draft - The immer draft of resume data
 * @param item - The item to add to the new section
 * @param type - The section type for the new custom section
 * @param sectionTitle - The title for the new custom section
 */
export function createPageWithSection(
	draft: WritableDraft<ResumeData>,
	item: SectionItem,
	type: SectionType,
	sectionTitle: string,
): void {
	const newSectionId = generateId();

	// Create the new custom section
	const newSection: CustomSection = {
		id: newSectionId,
		type,
		title: sectionTitle,
		columns: 1,
		hidden: false,
		items: [item as never],
	};

	draft.customSections.push(newSection as WritableDraft<CustomSection>);

	// Create the new page with the section in the main column
	draft.metadata.layout.pages.push({
		fullWidth: false,
		main: [newSectionId],
		sidebar: [],
	});
}
