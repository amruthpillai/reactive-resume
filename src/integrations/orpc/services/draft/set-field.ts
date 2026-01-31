import type { DraftData } from "@/schema/draft/data";
import type { DraftOperation } from "@/schema/draft/operations";

/**
 * @remarks Represents a draft operation that updates a single field by path.
 */
type SetFieldOperation = Extract<DraftOperation, { op: "setField" }>;

/**
 * @remarks Applies a field-level update to a draft payload.
 * @param draft - The current draft payload.
 * @param operation - The field operation to apply.
 * @returns The updated draft payload.
 */
export const applySetFieldOperation = (draft: DraftData, operation: SetFieldOperation): DraftData => {
	switch (operation.path) {
		case "picture.url":
			return { ...draft, picture: { ...draft.picture, url: operation.value } };
		case "basics.name":
			return { ...draft, basics: { ...draft.basics, name: operation.value } };
		case "basics.headline":
			return { ...draft, basics: { ...draft.basics, headline: operation.value } };
		case "basics.email":
			return { ...draft, basics: { ...draft.basics, email: operation.value } };
		case "basics.phone":
			return { ...draft, basics: { ...draft.basics, phone: operation.value } };
		case "basics.location":
			return { ...draft, basics: { ...draft.basics, location: operation.value } };
		case "basics.website.label":
			return {
				...draft,
				basics: {
					...draft.basics,
					website: { ...draft.basics.website, label: operation.value },
				},
			};
		case "basics.website.url":
			return {
				...draft,
				basics: {
					...draft.basics,
					website: { ...draft.basics.website, url: operation.value },
				},
			};
		case "summary.title":
			return { ...draft, summary: { ...draft.summary, title: operation.value } };
		case "summary.content":
			return { ...draft, summary: { ...draft.summary, content: operation.value } };
		case "metadata.notes":
			return { ...draft, metadata: { ...draft.metadata, notes: operation.value } };
		case "sections.profiles.title":
			return updateSectionTitle(draft, "profiles", operation.value);
		case "sections.experience.title":
			return updateSectionTitle(draft, "experience", operation.value);
		case "sections.education.title":
			return updateSectionTitle(draft, "education", operation.value);
		case "sections.projects.title":
			return updateSectionTitle(draft, "projects", operation.value);
		case "sections.skills.title":
			return updateSectionTitle(draft, "skills", operation.value);
		case "sections.languages.title":
			return updateSectionTitle(draft, "languages", operation.value);
		case "sections.interests.title":
			return updateSectionTitle(draft, "interests", operation.value);
		case "sections.awards.title":
			return updateSectionTitle(draft, "awards", operation.value);
		case "sections.certifications.title":
			return updateSectionTitle(draft, "certifications", operation.value);
		case "sections.publications.title":
			return updateSectionTitle(draft, "publications", operation.value);
		case "sections.volunteer.title":
			return updateSectionTitle(draft, "volunteer", operation.value);
		case "sections.references.title":
			return updateSectionTitle(draft, "references", operation.value);
	}
};

/**
 * @remarks Updates a section title while preserving its items.
 * @param draft - The current draft payload.
 * @param section - The section to update.
 * @param title - The new section title.
 * @returns The updated draft payload.
 */
const updateSectionTitle = (
	draft: DraftData,
	section: keyof DraftData["sections"],
	title: string,
): DraftData => ({
	...draft,
	sections: {
		...draft.sections,
		[section]: {
			...draft.sections[section],
			title,
		},
	},
});
