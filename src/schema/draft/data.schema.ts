/**
 * @packageDocumentation
 *
 * @remarks
 * Runtime validation schemas for DraftResume payloads.
 * This module intentionally owns the runtime contract. Compile-time types are derived
 * in `data.types.ts` to prevent divergence between validation and typing.
 *
 * Most consumers should import from the stable barrel `data.ts` to avoid coupling
 * to internal filenames. This schema module must not import from the barrel to keep
 * dependencies acyclic.
 *
 * @see {@link ./data | DraftResume barrel}
 * @see {@link ./data.types | DraftResume types}
 */
import z from "zod";

/**
 * @remarks Accepts URL values or empty strings for iterative drafting.
 * @example ""
 * @example "https://example.com"
 */
export const urlValueSchema = z.union([z.string(), z.instanceof(URL)]);

/**
 * @remarks Validates a labeled URL structure.
 * @example { label: "Portfolio", url: "https://example.com" }
 */
export const labeledUrlSchema = z.object({
	label: z.string(),
	url: urlValueSchema,
});

/**
 * @remarks Defines the shared identity contract for draft list items.
 * @example { id: "exp-analytical-engine-7f3k" }
 */
export const listItemDataSchema = z.object({
	id: z.string(),
});

/**
 * @remarks Validates the picture data for a draft.
 * @example { url: "" }
 */
export const pictureDataSchema = z.object({
	url: urlValueSchema,
});

/**
 * @remarks Validates a custom field entry for a draft.
 * @example { text: "Open to relocation", link: "" }
 */
export const customFieldDataSchema = listItemDataSchema.extend({
	text: z.string(),
	link: urlValueSchema,
});

/**
 * @remarks Validates the basics section for a draft.
 * @example { name: "", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] }
 */
export const basicsDataSchema = z.object({
	name: z.string(),
	headline: z.string(),
	email: z.string(),
	phone: z.string(),
	location: z.string(),
	website: labeledUrlSchema,
	customFields: z.array(customFieldDataSchema),
});

/**
 * @remarks Validates the summary section for a draft.
 * @example { title: "", content: "" }
 */
export const summaryDataSchema = z.object({
	title: z.string(),
	content: z.string(),
});

/**
 * @remarks Validates a profile item entry.
 * @example { network: "", username: "", website: { label: "", url: "" } }
 */
export const profileItemDataSchema = listItemDataSchema.extend({
	network: z.string(),
	username: z.string(),
	website: labeledUrlSchema,
});

/**
 * @remarks Validates an experience item entry.
 * @example { company: "", position: "", location: "", period: "", website: { label: "", url: "" }, description: "" }
 */
export const experienceItemDataSchema = listItemDataSchema.extend({
	company: z.string(),
	position: z.string(),
	location: z.string(),
	period: z.string(),
	website: labeledUrlSchema,
	description: z.string(),
});

/**
 * @remarks Validates an education item entry.
 * @example { school: "", degree: "", area: "", grade: "", location: "", period: "", website: { label: "", url: "" }, description: "" }
 */
export const educationItemDataSchema = listItemDataSchema.extend({
	school: z.string(),
	degree: z.string(),
	area: z.string(),
	grade: z.string(),
	location: z.string(),
	period: z.string(),
	website: labeledUrlSchema,
	description: z.string(),
});

/**
 * @remarks Validates a project item entry.
 * @example { name: "", period: "", website: { label: "", url: "" }, description: "" }
 */
export const projectItemDataSchema = listItemDataSchema.extend({
	name: z.string(),
	period: z.string(),
	website: labeledUrlSchema,
	description: z.string(),
});

/**
 * @remarks Validates a skill item entry.
 * @example { name: "", proficiency: "", level: 0, keywords: [] }
 */
export const skillItemDataSchema = listItemDataSchema.extend({
	name: z.string(),
	proficiency: z.string(),
	level: z.number(),
	keywords: z.array(z.string()),
});

/**
 * @remarks Validates a language item entry.
 * @example { language: "", fluency: "", level: 0 }
 */
export const languageItemDataSchema = listItemDataSchema.extend({
	language: z.string(),
	fluency: z.string(),
	level: z.number(),
});

/**
 * @remarks Validates an interest item entry.
 * @example { name: "", keywords: [] }
 */
export const interestItemDataSchema = listItemDataSchema.extend({
	name: z.string(),
	keywords: z.array(z.string()),
});

/**
 * @remarks Validates an award item entry.
 * @example { title: "", awarder: "", date: "", website: { label: "", url: "" }, description: "" }
 */
export const awardItemDataSchema = listItemDataSchema.extend({
	title: z.string(),
	awarder: z.string(),
	date: z.string(),
	website: labeledUrlSchema,
	description: z.string(),
});

/**
 * @remarks Validates a certification item entry.
 * @example { title: "", issuer: "", date: "", website: { label: "", url: "" }, description: "" }
 */
export const certificationItemDataSchema = listItemDataSchema.extend({
	title: z.string(),
	issuer: z.string(),
	date: z.string(),
	website: labeledUrlSchema,
	description: z.string(),
});

/**
 * @remarks Validates a publication item entry.
 * @example { title: "", publisher: "", date: "", website: { label: "", url: "" }, description: "" }
 */
export const publicationItemDataSchema = listItemDataSchema.extend({
	title: z.string(),
	publisher: z.string(),
	date: z.string(),
	website: labeledUrlSchema,
	description: z.string(),
});

/**
 * @remarks Validates a volunteer item entry.
 * @example { organization: "", location: "", period: "", website: { label: "", url: "" }, description: "" }
 */
export const volunteerItemDataSchema = listItemDataSchema.extend({
	organization: z.string(),
	location: z.string(),
	period: z.string(),
	website: labeledUrlSchema,
	description: z.string(),
});

/**
 * @remarks Validates a reference item entry.
 * @example { name: "", position: "", website: { label: "", url: "" }, phone: "", description: "" }
 */
export const referenceItemDataSchema = listItemDataSchema.extend({
	name: z.string(),
	position: z.string(),
	website: labeledUrlSchema,
	phone: z.string(),
	description: z.string(),
});

/**
 * @remarks Builds section schemas with a shared structure and item schema.
 * @param itemSchema - The schema used to validate section items.
 * @returns A schema with a title and list of items.
 */
const createSectionSchema = <TItemSchema extends z.ZodTypeAny>(itemSchema: TItemSchema) =>
	z.object({
		title: z.string(),
		items: z.array(itemSchema),
	});

/**
 * @remarks Validates the profiles section structure.
 * @example { title: "Profiles", items: [] }
 */
export const profilesSectionDataSchema = createSectionSchema(profileItemDataSchema);

/**
 * @remarks Validates the experience section structure.
 * @example { title: "Experience", items: [] }
 */
export const experienceSectionDataSchema = createSectionSchema(experienceItemDataSchema);

/**
 * @remarks Validates the education section structure.
 * @example { title: "Education", items: [] }
 */
export const educationSectionDataSchema = createSectionSchema(educationItemDataSchema);

/**
 * @remarks Validates the projects section structure.
 * @example { title: "Projects", items: [] }
 */
export const projectsSectionDataSchema = createSectionSchema(projectItemDataSchema);

/**
 * @remarks Validates the skills section structure.
 * @example { title: "Skills", items: [] }
 */
export const skillsSectionDataSchema = createSectionSchema(skillItemDataSchema);

/**
 * @remarks Validates the languages section structure.
 * @example { title: "Languages", items: [] }
 */
export const languagesSectionDataSchema = createSectionSchema(languageItemDataSchema);

/**
 * @remarks Validates the interests section structure.
 * @example { title: "Interests", items: [] }
 */
export const interestsSectionDataSchema = createSectionSchema(interestItemDataSchema);

/**
 * @remarks Validates the awards section structure.
 * @example { title: "Awards", items: [] }
 */
export const awardsSectionDataSchema = createSectionSchema(awardItemDataSchema);

/**
 * @remarks Validates the certifications section structure.
 * @example { title: "Certifications", items: [] }
 */
export const certificationsSectionDataSchema = createSectionSchema(certificationItemDataSchema);

/**
 * @remarks Validates the publications section structure.
 * @example { title: "Publications", items: [] }
 */
export const publicationsSectionDataSchema = createSectionSchema(publicationItemDataSchema);

/**
 * @remarks Validates the volunteer section structure.
 * @example { title: "Volunteer", items: [] }
 */
export const volunteerSectionDataSchema = createSectionSchema(volunteerItemDataSchema);

/**
 * @remarks Validates the references section structure.
 * @example { title: "References", items: [] }
 */
export const referencesSectionDataSchema = createSectionSchema(referenceItemDataSchema);

/**
 * @remarks Validates the supported section identifiers for drafts.
 * @example "skills"
 */
export const sectionTypeSchema = z.enum([
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
]);

/**
 * @remarks Validates the aggregate sections object for drafts.
 * @example { profiles: { title: "", items: [] }, experience: { title: "", items: [] }, education: { title: "", items: [] }, projects: { title: "", items: [] }, skills: { title: "", items: [] }, languages: { title: "", items: [] }, interests: { title: "", items: [] }, awards: { title: "", items: [] }, certifications: { title: "", items: [] }, publications: { title: "", items: [] }, volunteer: { title: "", items: [] }, references: { title: "", items: [] } }
 */
export const sectionsDataSchema = z.object({
	profiles: profilesSectionDataSchema,
	experience: experienceSectionDataSchema,
	education: educationSectionDataSchema,
	projects: projectsSectionDataSchema,
	skills: skillsSectionDataSchema,
	languages: languagesSectionDataSchema,
	interests: interestsSectionDataSchema,
	awards: awardsSectionDataSchema,
	certifications: certificationsSectionDataSchema,
	publications: publicationsSectionDataSchema,
	volunteer: volunteerSectionDataSchema,
	references: referencesSectionDataSchema,
});

/**
 * @remarks Validates a custom section item union for drafts.
 * @example { name: "" }
 */
export const customSectionItemDataSchema = z.union([
	profileItemDataSchema,
	experienceItemDataSchema,
	educationItemDataSchema,
	projectItemDataSchema,
	skillItemDataSchema,
	languageItemDataSchema,
	interestItemDataSchema,
	awardItemDataSchema,
	certificationItemDataSchema,
	publicationItemDataSchema,
	volunteerItemDataSchema,
	referenceItemDataSchema,
]);

/**
 * @remarks Validates a custom section structure for drafts.
 * @example { title: "Projects", type: "projects", items: [] }
 */
export const customSectionDataSchema = listItemDataSchema.extend({
	title: z.string(),
	type: sectionTypeSchema,
	items: z.array(customSectionItemDataSchema),
});

/**
 * @remarks Validates metadata for draft data.
 * @example { notes: "" }
 */
export const metadataDataSchema = z.object({
	notes: z.string(),
});

/**
 * @remarks Validates Draft Resume data while allowing empty values.
 * @example { picture: { url: "" }, basics: { name: "", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] }, summary: { title: "", content: "" }, sections: { profiles: { title: "", items: [] }, experience: { title: "", items: [] }, education: { title: "", items: [] }, projects: { title: "", items: [] }, skills: { title: "", items: [] }, languages: { title: "", items: [] }, interests: { title: "", items: [] }, awards: { title: "", items: [] }, certifications: { title: "", items: [] }, publications: { title: "", items: [] }, volunteer: { title: "", items: [] }, references: { title: "", items: [] } }, customSections: [], metadata: { notes: "" } }
 */
export const draftDataSchema = z.object({
	picture: pictureDataSchema,
	basics: basicsDataSchema,
	summary: summaryDataSchema,
	sections: sectionsDataSchema,
	customSections: z.array(customSectionDataSchema),
	metadata: metadataDataSchema,
});
