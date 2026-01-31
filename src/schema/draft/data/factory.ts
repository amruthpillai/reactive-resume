/**
 * @packageDocumentation
 *
 * @remarks
 * Canonical factory for DraftResume payloads. This module centralizes all empty
 * and default object construction so server-side logic and tests can share a
 * single, authoritative baseline.
 *
 * Design goals:
 * - Single source of truth for draft defaults.
 * - Stable, typed entry points for list item and section construction.
 * - Ergonomic nesting that mirrors the DraftData shape.
 *
 * @see {@link ./data.schema | DraftResume schema}
 * @see {@link ./data.types | DraftResume types}
 */
import type { DraftData, DraftResume, LabeledURL } from "./data.types";

type SectionKey = keyof DraftData["sections"];

/**
 * @remarks Creates a labeled URL payload with empty values.
 * @returns An empty labeled URL object.
 * @example { label: "", url: "" }
 */
const createEmptyLabeledUrl = (): LabeledURL => ({ label: "", url: "" });

/**
 * @remarks Creates an empty picture payload.
 * @returns A picture payload with an empty URL.
 * @example { url: "" }
 */
const createEmptyPicture = (): DraftResume.PictureData => ({ url: "" });

/**
 * @remarks Creates an empty custom field entry for iterative drafting.
 * @param id - The stable identifier for the custom field.
 * @returns A custom field payload with empty values.
 * @example { id: "cf-1", text: "", link: "" }
 */
const createEmptyCustomField = (id: string): DraftResume.CustomFieldData => ({
	id,
	text: "",
	link: "",
});

/**
 * @remarks Creates an empty basics payload.
 * @returns A basics payload with empty identity fields.
 * @example { name: "", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] }
 */
const createEmptyBasics = (): DraftResume.BasicsData => ({
	name: "",
	headline: "",
	email: "",
	phone: "",
	location: "",
	website: createEmptyLabeledUrl(),
	customFields: [],
});

/**
 * @remarks Creates an empty summary payload.
 * @returns A summary payload with empty title and content.
 * @example { title: "", content: "" }
 */
const createEmptySummary = (): DraftResume.SummaryData => ({ title: "", content: "" });

/**
 * @remarks Creates an empty metadata payload.
 * @returns A metadata payload with empty notes.
 * @example { notes: "" }
 */
const createEmptyMetadata = (): DraftResume.MetadataData => ({ notes: "" });

/**
 * @remarks Creates an empty section payload.
 * @param items - Optional item list to seed the section.
 * @returns A section payload with an empty title.
 * @example { title: "", items: [] }
 */
const createEmptySectionData = <TItem>(items: TItem[] = []): DraftResume.SectionData<TItem> => ({
	title: "",
	items,
});

/**
 * @remarks
 * Builds empty list items for each section type.
 * Used by itemOps upserts to fill missing fields with empty values.
 *
 * @see {@link DraftResume.SectionType}
 */
const sectionItemFactories: { [K in SectionKey]: (id: string) => DraftData["sections"][K]["items"][number] } = {
	profiles: (id) => ({ id, network: "", username: "", website: createEmptyLabeledUrl() }),
	experience: (id) => ({
		id,
		company: "",
		position: "",
		location: "",
		period: "",
		website: createEmptyLabeledUrl(),
		description: "",
	}),
	education: (id) => ({
		id,
		school: "",
		degree: "",
		area: "",
		grade: "",
		location: "",
		period: "",
		website: createEmptyLabeledUrl(),
		description: "",
	}),
	projects: (id) => ({ id, name: "", period: "", website: createEmptyLabeledUrl(), description: "" }),
	skills: (id) => ({ id, name: "", proficiency: "", level: 0, keywords: [] }),
	languages: (id) => ({ id, language: "", fluency: "", level: 0 }),
	interests: (id) => ({ id, name: "", keywords: [] }),
	awards: (id) => ({ id, title: "", awarder: "", date: "", website: createEmptyLabeledUrl(), description: "" }),
	certifications: (id) => ({ id, title: "", issuer: "", date: "", website: createEmptyLabeledUrl(), description: "" }),
	publications: (id) => ({ id, title: "", publisher: "", date: "", website: createEmptyLabeledUrl(), description: "" }),
	volunteer: (id) => ({ id, organization: "", location: "", period: "", website: createEmptyLabeledUrl(), description: "" }),
	references: (id) => ({ id, name: "", position: "", website: createEmptyLabeledUrl(), phone: "", description: "" }),
};

/**
 * @remarks Builds empty sections keyed by their section identifiers.
 */
const sectionFactories: { [K in SectionKey]: () => DraftData["sections"][K] } = {
	profiles: () => createEmptySectionData<DraftResume.ProfileItemData>(),
	experience: () => createEmptySectionData<DraftResume.ExperienceItemData>(),
	education: () => createEmptySectionData<DraftResume.EducationItemData>(),
	projects: () => createEmptySectionData<DraftResume.ProjectItemData>(),
	skills: () => createEmptySectionData<DraftResume.SkillItemData>(),
	languages: () => createEmptySectionData<DraftResume.LanguageItemData>(),
	interests: () => createEmptySectionData<DraftResume.InterestItemData>(),
	awards: () => createEmptySectionData<DraftResume.AwardItemData>(),
	certifications: () => createEmptySectionData<DraftResume.CertificationItemData>(),
	publications: () => createEmptySectionData<DraftResume.PublicationItemData>(),
	volunteer: () => createEmptySectionData<DraftResume.VolunteerItemData>(),
	references: () => createEmptySectionData<DraftResume.ReferenceItemData>(),
};

/**
 * @remarks Creates an empty section payload for a specific section type.
 * @param section - The section type to initialize.
 * @returns A section payload with an empty title and item list.
 * @example { title: "", items: [] }
 */
const createEmptySection = <K extends SectionKey>(section: K): DraftData["sections"][K] => sectionFactories[section]();

/**
 * @remarks Creates an empty list item for a given section type.
 * @param section - The target section to initialize.
 * @param id - The stable identifier for the item.
 * @returns An item payload with empty values.
 */
const createEmptySectionItem = <K extends SectionKey>(
	section: K,
	id: string,
): DraftData["sections"][K]["items"][number] => sectionItemFactories[section](id);

/**
 * @remarks Creates the full sections payload with empty section data.
 * @returns A SectionsData payload with empty titles and item arrays.
 */
const createEmptySections = (): DraftResume.SectionsData => ({
	profiles: sectionFactories.profiles(),
	experience: sectionFactories.experience(),
	education: sectionFactories.education(),
	projects: sectionFactories.projects(),
	skills: sectionFactories.skills(),
	languages: sectionFactories.languages(),
	interests: sectionFactories.interests(),
	awards: sectionFactories.awards(),
	certifications: sectionFactories.certifications(),
	publications: sectionFactories.publications(),
	volunteer: sectionFactories.volunteer(),
	references: sectionFactories.references(),
});

/**
 * @remarks Creates an empty custom section entry.
 * @param id - The stable identifier for the custom section.
 * @param type - The base section type that defines the item shape.
 * @returns A custom section payload with empty title and items.
 * @example { id: "custom-1", title: "", type: "projects", items: [] }
 */
const createEmptyCustomSection = (id: string, type: DraftResume.SectionType): DraftResume.CustomSectionData => ({
	id,
	title: "",
	type,
	items: [],
});

/**
 * @remarks Creates the canonical empty draft payload.
 * @returns A DraftData payload populated with empty values.
 * @example { picture: { url: "" }, basics: { name: "", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] }, summary: { title: "", content: "" }, sections: { profiles: { title: "", items: [] }, experience: { title: "", items: [] }, education: { title: "", items: [] }, projects: { title: "", items: [] }, skills: { title: "", items: [] }, languages: { title: "", items: [] }, interests: { title: "", items: [] }, awards: { title: "", items: [] }, certifications: { title: "", items: [] }, publications: { title: "", items: [] }, volunteer: { title: "", items: [] }, references: { title: "", items: [] } }, customSections: [], metadata: { notes: "" } }
 */
const createEmptyDraft = (): DraftData => ({
	picture: createEmptyPicture(),
	basics: createEmptyBasics(),
	summary: createEmptySummary(),
	sections: createEmptySections(),
	customSections: [],
	metadata: createEmptyMetadata(),
});

/**
 * @remarks
 * Nested factory that centralizes DraftResume construction and defaults.
 * Prefer using this object instead of ad-hoc literal construction.
 *
 * @example
 * draftFactory.draft.empty();
 * draftFactory.sections.item.empty("experience", "experience-1");
 * draftFactory.basics.customField.empty("custom-field-1");
 */
export const draftFactory = {
	url: {
		labeled: {
			empty: createEmptyLabeledUrl,
		},
	},
	picture: {
		empty: createEmptyPicture,
	},
	basics: {
		empty: createEmptyBasics,
		customField: {
			empty: createEmptyCustomField,
		},
	},
	summary: {
		empty: createEmptySummary,
	},
	metadata: {
		empty: createEmptyMetadata,
	},
	sections: {
		empty: createEmptySections,
		section: {
			empty: createEmptySection,
		},
		item: {
			empty: createEmptySectionItem,
		},
	},
	customSections: {
		item: {
			empty: createEmptyCustomSection,
		},
	},
	draft: {
		empty: createEmptyDraft,
	},
} as const;
