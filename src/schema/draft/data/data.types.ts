/**
 * @packageDocumentation
 *
 * @remarks
 * This module is intentionally type-only and derives DraftResume types from the runtime
 * Zod schemas in `data.schema.ts`. This schema-first pattern makes the validator the
 * single source of truth and eliminates manual type duplication.
 *
 * Design rationale:
 * - Single source of truth: the schema defines the contract; types are inferred.
 * - Drift prevention: changes to the schema automatically update DraftData and related types.
 * - Type-only imports: `import type` keeps Zod out of runtime bundles for consumers.
 * - Clear layering: runtime validation stays in `data.schema.ts`, compile-time types live here.
 *
 * Most consumers should import from the stable barrel `@/schema/draft/data` to avoid
 * coupling to internal filenames. This type module must not import from the barrel to keep
 * dependencies acyclic.
 *
 * @see {@link ./index | DraftResume barrel}
 * @see {@link ./data.schema | DraftResume schema}
 * @example
 * import type { DraftData } from "@/schema/draft/data";
 */
import type { infer as ZodInfer } from "zod";
import type {
	awardItemDataSchema,
	awardsSectionDataSchema,
	basicsDataSchema,
	certificationItemDataSchema,
	certificationsSectionDataSchema,
	customFieldDataSchema,
	customSectionDataSchema,
	customSectionItemDataSchema,
	draftDataSchema,
	educationItemDataSchema,
	educationSectionDataSchema,
	experienceItemDataSchema,
	experienceSectionDataSchema,
	interestItemDataSchema,
	interestsSectionDataSchema,
	labeledUrlSchema,
	listItemDataSchema,
	languageItemDataSchema,
	languagesSectionDataSchema,
	metadataDataSchema,
	pictureDataSchema,
	profileItemDataSchema,
	profilesSectionDataSchema,
	projectItemDataSchema,
	projectsSectionDataSchema,
	publicationItemDataSchema,
	publicationsSectionDataSchema,
	referenceItemDataSchema,
	referencesSectionDataSchema,
	sectionTypeSchema,
	sectionsDataSchema,
	skillItemDataSchema,
	skillsSectionDataSchema,
	summaryDataSchema,
	urlValueSchema,
	volunteerItemDataSchema,
	volunteerSectionDataSchema,
} from "./data.schema";

/**
 * @remarks Represents a URL-like value that can be concrete or still being drafted.
 * @example "https://example.com"
 */
export type UrlValue = ZodInfer<typeof urlValueSchema>;

/**
 * @remarks Couples a human-readable label with a URL-like value.
 * @example { label: "Portfolio", url: "https://example.com" }
 */
export type LabeledURL = ZodInfer<typeof labeledUrlSchema>;

/**
 * @remarks Represents the shared identity contract for draft list items.
 * @example { id: "exp-analytical-engine-7f3k" }
 */
export type ListItemData = ZodInfer<typeof listItemDataSchema>;

/**
 * @remarks Namespace that groups Draft Resume data types for cohesive use.
 * @see DraftResume.DraftData
 */
export namespace DraftResume {
	/**
	 * @remarks Represents a single picture reference used by the draft.
	 * @example { url: "https://example.com/photo.jpg" }
	 */
	export type PictureData = ZodInfer<typeof pictureDataSchema>;

	/**
	 * @remarks Captures a custom field with optional link-like content.
	 * @example { text: "Open to relocation", link: "" }
	 */
	export type CustomFieldData = ListItemData & ZodInfer<typeof customFieldDataSchema>;

	/**
	 * @remarks Encapsulates the primary identity fields for the draft owner.
	 * @example { name: "A. Person", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] }
	 */
	export type BasicsData = ZodInfer<typeof basicsDataSchema>;

	/**
	 * @remarks Holds a short-form overview with title and content.
	 * @example { title: "Summary", content: "" }
	 */
	export type SummaryData = ZodInfer<typeof summaryDataSchema>;

	/**
	 * @remarks Captures a social or professional profile entry.
	 * @example { network: "GitHub", username: "aperson", website: { label: "", url: "" } }
	 */
	export type ProfileItemData = ListItemData & ZodInfer<typeof profileItemDataSchema>;

	/**
	 * @remarks Represents a single work experience entry.
	 * @example { company: "Acme", position: "", location: "", period: "", website: { label: "", url: "" }, description: "" }
	 */
	export type ExperienceItemData = ListItemData & ZodInfer<typeof experienceItemDataSchema>;

	/**
	 * @remarks Represents a single education entry.
	 * @example { school: "Example University", degree: "", area: "", grade: "", location: "", period: "", website: { label: "", url: "" }, description: "" }
	 */
	export type EducationItemData = ListItemData & ZodInfer<typeof educationItemDataSchema>;

	/**
	 * @remarks Represents a single project entry.
	 * @example { name: "Project X", period: "", website: { label: "", url: "" }, description: "" }
	 */
	export type ProjectItemData = ListItemData & ZodInfer<typeof projectItemDataSchema>;

	/**
	 * @remarks Represents a single skill entry.
	 * @example { name: "TypeScript", proficiency: "Advanced", level: 0, keywords: [] }
	 */
	export type SkillItemData = ListItemData & ZodInfer<typeof skillItemDataSchema>;

	/**
	 * @remarks Represents a single language entry.
	 * @example { language: "English", fluency: "", level: 0 }
	 */
	export type LanguageItemData = ListItemData & ZodInfer<typeof languageItemDataSchema>;

	/**
	 * @remarks Represents a single interest entry.
	 * @example { name: "Photography", keywords: [] }
	 */
	export type InterestItemData = ListItemData & ZodInfer<typeof interestItemDataSchema>;

	/**
	 * @remarks Represents a single award entry.
	 * @example { title: "Top Performer", awarder: "", date: "", website: { label: "", url: "" }, description: "" }
	 */
	export type AwardItemData = ListItemData & ZodInfer<typeof awardItemDataSchema>;

	/**
	 * @remarks Represents a single certification entry.
	 * @example { title: "Certification", issuer: "", date: "", website: { label: "", url: "" }, description: "" }
	 */
	export type CertificationItemData = ListItemData & ZodInfer<typeof certificationItemDataSchema>;

	/**
	 * @remarks Represents a single publication entry.
	 * @example { title: "Publication", publisher: "", date: "", website: { label: "", url: "" }, description: "" }
	 */
	export type PublicationItemData = ListItemData & ZodInfer<typeof publicationItemDataSchema>;

	/**
	 * @remarks Represents a single volunteer entry.
	 * @example { organization: "Org", location: "", period: "", website: { label: "", url: "" }, description: "" }
	 */
	export type VolunteerItemData = ListItemData & ZodInfer<typeof volunteerItemDataSchema>;

	/**
	 * @remarks Represents a single reference entry.
	 * @example { name: "Reference", position: "", website: { label: "", url: "" }, phone: "", description: "" }
	 */
	export type ReferenceItemData = ListItemData & ZodInfer<typeof referenceItemDataSchema>;

	/**
	 * @remarks Enumerates built-in section identifiers supported by the draft.
	 * @example "experience"
	 */
	export type SectionType = ZodInfer<typeof sectionTypeSchema>;

	/**
	 * @remarks Generic section structure that binds a title to a set of items.
	 * @example { title: "Experience", items: [] }
	 */
	export type SectionData<TItemData> = {
		title: string;
		items: TItemData[];
	};

	/**
	 * @remarks Allows incremental updates to a section without requiring full data.
	 * @example { title: "Experience", items: [] }
	 */
	export type SectionPayload<TItemPayload> = Partial<SectionData<TItemPayload>>;

	/**
	 * @remarks Permits partial updates to profile items.
	 * @example { network: "GitHub" }
	 */
	export type ProfileItemPayload = Partial<ProfileItemData>;

	/**
	 * @remarks Permits partial updates to experience items.
	 * @example { company: "Acme" }
	 */
	export type ExperienceItemPayload = Partial<ExperienceItemData>;

	/**
	 * @remarks Permits partial updates to education items.
	 * @example { school: "Example University" }
	 */
	export type EducationItemPayload = Partial<EducationItemData>;

	/**
	 * @remarks Permits partial updates to project items.
	 * @example { name: "Project X" }
	 */
	export type ProjectItemPayload = Partial<ProjectItemData>;

	/**
	 * @remarks Permits partial updates to skill items.
	 * @example { name: "TypeScript" }
	 */
	export type SkillItemPayload = Partial<SkillItemData>;

	/**
	 * @remarks Permits partial updates to language items.
	 * @example { language: "English" }
	 */
	export type LanguageItemPayload = Partial<LanguageItemData>;

	/**
	 * @remarks Permits partial updates to interest items.
	 * @example { name: "Photography" }
	 */
	export type InterestItemPayload = Partial<InterestItemData>;

	/**
	 * @remarks Permits partial updates to award items.
	 * @example { title: "Top Performer" }
	 */
	export type AwardItemPayload = Partial<AwardItemData>;

	/**
	 * @remarks Permits partial updates to certification items.
	 * @example { title: "Certification" }
	 */
	export type CertificationItemPayload = Partial<CertificationItemData>;

	/**
	 * @remarks Permits partial updates to publication items.
	 * @example { title: "Publication" }
	 */
	export type PublicationItemPayload = Partial<PublicationItemData>;

	/**
	 * @remarks Permits partial updates to volunteer items.
	 * @example { organization: "Org" }
	 */
	export type VolunteerItemPayload = Partial<VolunteerItemData>;

	/**
	 * @remarks Permits partial updates to reference items.
	 * @example { name: "Reference" }
	 */
	export type ReferenceItemPayload = Partial<ReferenceItemData>;

	/**
	 * @remarks Profiles section data container.
	 * @example { title: "Profiles", items: [] }
	 */
	export type ProfilesSectionData = ZodInfer<typeof profilesSectionDataSchema>;

	/**
	 * @remarks Experience section data container.
	 * @example { title: "Experience", items: [] }
	 */
	export type ExperienceSectionData = ZodInfer<typeof experienceSectionDataSchema>;

	/**
	 * @remarks Education section data container.
	 * @example { title: "Education", items: [] }
	 */
	export type EducationSectionData = ZodInfer<typeof educationSectionDataSchema>;

	/**
	 * @remarks Projects section data container.
	 * @example { title: "Projects", items: [] }
	 */
	export type ProjectsSectionData = ZodInfer<typeof projectsSectionDataSchema>;

	/**
	 * @remarks Skills section data container.
	 * @example { title: "Skills", items: [] }
	 */
	export type SkillsSectionData = ZodInfer<typeof skillsSectionDataSchema>;

	/**
	 * @remarks Languages section data container.
	 * @example { title: "Languages", items: [] }
	 */
	export type LanguagesSectionData = ZodInfer<typeof languagesSectionDataSchema>;

	/**
	 * @remarks Interests section data container.
	 * @example { title: "Interests", items: [] }
	 */
	export type InterestsSectionData = ZodInfer<typeof interestsSectionDataSchema>;

	/**
	 * @remarks Awards section data container.
	 * @example { title: "Awards", items: [] }
	 */
	export type AwardsSectionData = ZodInfer<typeof awardsSectionDataSchema>;

	/**
	 * @remarks Certifications section data container.
	 * @example { title: "Certifications", items: [] }
	 */
	export type CertificationsSectionData = ZodInfer<typeof certificationsSectionDataSchema>;

	/**
	 * @remarks Publications section data container.
	 * @example { title: "Publications", items: [] }
	 */
	export type PublicationsSectionData = ZodInfer<typeof publicationsSectionDataSchema>;

	/**
	 * @remarks Volunteer section data container.
	 * @example { title: "Volunteer", items: [] }
	 */
	export type VolunteerSectionData = ZodInfer<typeof volunteerSectionDataSchema>;

	/**
	 * @remarks References section data container.
	 * @example { title: "References", items: [] }
	 */
	export type ReferencesSectionData = ZodInfer<typeof referencesSectionDataSchema>;

	/**
	 * @remarks Profiles section update payload.
	 * @example { title: "Profiles", items: [] }
	 */
	export type ProfilesSectionPayload = SectionPayload<ProfileItemPayload>;

	/**
	 * @remarks Experience section update payload.
	 * @example { title: "Experience", items: [] }
	 */
	export type ExperienceSectionPayload = SectionPayload<ExperienceItemPayload>;

	/**
	 * @remarks Education section update payload.
	 * @example { title: "Education", items: [] }
	 */
	export type EducationSectionPayload = SectionPayload<EducationItemPayload>;

	/**
	 * @remarks Projects section update payload.
	 * @example { title: "Projects", items: [] }
	 */
	export type ProjectsSectionPayload = SectionPayload<ProjectItemPayload>;

	/**
	 * @remarks Skills section update payload.
	 * @example { title: "Skills", items: [] }
	 */
	export type SkillsSectionPayload = SectionPayload<SkillItemPayload>;

	/**
	 * @remarks Languages section update payload.
	 * @example { title: "Languages", items: [] }
	 */
	export type LanguagesSectionPayload = SectionPayload<LanguageItemPayload>;

	/**
	 * @remarks Interests section update payload.
	 * @example { title: "Interests", items: [] }
	 */
	export type InterestsSectionPayload = SectionPayload<InterestItemPayload>;

	/**
	 * @remarks Awards section update payload.
	 * @example { title: "Awards", items: [] }
	 */
	export type AwardsSectionPayload = SectionPayload<AwardItemPayload>;

	/**
	 * @remarks Certifications section update payload.
	 * @example { title: "Certifications", items: [] }
	 */
	export type CertificationsSectionPayload = SectionPayload<CertificationItemPayload>;

	/**
	 * @remarks Publications section update payload.
	 * @example { title: "Publications", items: [] }
	 */
	export type PublicationsSectionPayload = SectionPayload<PublicationItemPayload>;

	/**
	 * @remarks Volunteer section update payload.
	 * @example { title: "Volunteer", items: [] }
	 */
	export type VolunteerSectionPayload = SectionPayload<VolunteerItemPayload>;

	/**
	 * @remarks References section update payload.
	 * @example { title: "References", items: [] }
	 */
	export type ReferencesSectionPayload = SectionPayload<ReferenceItemPayload>;

	/**
	 * @remarks Aggregates all built-in section data for the draft.
	 * @example { profiles: { title: "", items: [] }, experience: { title: "", items: [] }, education: { title: "", items: [] }, projects: { title: "", items: [] }, skills: { title: "", items: [] }, languages: { title: "", items: [] }, interests: { title: "", items: [] }, awards: { title: "", items: [] }, certifications: { title: "", items: [] }, publications: { title: "", items: [] }, volunteer: { title: "", items: [] }, references: { title: "", items: [] } }
	 */
	export type SectionsData = ZodInfer<typeof sectionsDataSchema>;

	/**
	 * @remarks Represents an item in a custom section.
	 * @example { name: "Custom Item" }
	 */
	export type CustomSectionItemData = ZodInfer<typeof customSectionItemDataSchema>;

	/**
	 * @remarks Stores a custom section, mapping a type to its items.
	 * @example { title: "Projects", type: "projects", items: [] }
	 */
	export type CustomSectionData = ListItemData & ZodInfer<typeof customSectionDataSchema>;

	/**
	 * @remarks Holds metadata for draft-specific behaviors or notes.
	 * @example { notes: "" }
	 */
	export type MetadataData = ZodInfer<typeof metadataDataSchema>;

	/**
	 * @remarks Top-level draft data structure persisted by the /draft endpoints.
	 * @example { picture: { url: "" }, basics: { name: "", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] }, summary: { title: "", content: "" }, sections: { profiles: { title: "", items: [] }, experience: { title: "", items: [] }, education: { title: "", items: [] }, projects: { title: "", items: [] }, skills: { title: "", items: [] }, languages: { title: "", items: [] }, interests: { title: "", items: [] }, awards: { title: "", items: [] }, certifications: { title: "", items: [] }, publications: { title: "", items: [] }, volunteer: { title: "", items: [] }, references: { title: "", items: [] } }, customSections: [], metadata: { notes: "" } }
	 */
	export type DraftData = ZodInfer<typeof draftDataSchema>;
}

/**
 * @remarks Alias for the canonical Draft Resume data model.
 * @see DraftResume.DraftData
 */
export type DraftData = DraftResume.DraftData;
