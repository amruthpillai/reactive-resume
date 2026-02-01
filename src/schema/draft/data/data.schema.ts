/**
 * @packageDocumentation
 *
 * @remarks
 * Runtime validation schemas for DraftResume payloads.
 * This module intentionally owns the runtime contract. Compile-time types are derived
 * in `data.types.ts` to prevent divergence between validation and typing.
 *
 * Most consumers should import from the stable barrel `@/schema/draft/data`
 * to avoid coupling to internal filenames. This schema module must not import
 * from the barrel to keep dependencies acyclic.
 *
 * @see {@link ./index | DraftResume barrel}
 * @see {@link ./data.types | DraftResume types}
 */
import z from "zod";

/**
 * @remarks Accepts URL values or empty strings for iterative drafting.
 * @example ""
 * @example "https://example.com"
 */
export const urlValueSchema = z
	.union([z.string(), z.instanceof(URL)])
	.describe("The URL to show as a link. Must be a valid URL with a protocol (http:// or https://).");

/**
 * @remarks Validates a labeled URL structure.
 * @example { label: "Portfolio", url: "https://example.com" }
 */
export const labeledUrlSchema = z.object({
	label: z.string().describe("The label to display for the URL. Leave blank to display the URL as-is."),
	url: urlValueSchema,
});

/**
 * @remarks Defines the shared identity contract for draft list items.
 * @example { id: "exp-analytical-engine-7f3k" }
 */
export const listItemDataSchema = z.object({
	id: z.string().describe("The unique identifier for the item. Usually generated as a UUID."),
});

/**
 * @remarks Validates the picture data for a draft.
 * @example { url: "" }
 */
export const pictureDataSchema = z.object({
	url: urlValueSchema.describe(
		"The URL to the picture to display on the resume. Must be a valid URL with a protocol (http:// or https://).",
	),
});

/**
 * @remarks Validates a custom field entry for a draft.
 * @example { text: "Open to relocation", link: "" }
 */
export const customFieldDataSchema = listItemDataSchema.extend({
	text: z.string().describe("The text to display for the custom field."),
	link: urlValueSchema.describe("If the custom field should be a link, the URL to link to."),
});

/**
 * @remarks Validates the basics section for a draft.
 * @example { name: "", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] }
 */
export const basicsDataSchema = z.object({
	name: z.string().describe("The full name of the author of the resume."),
	headline: z.string().describe("The headline of the author of the resume."),
	email: z.string().describe("The email address of the author of the resume."),
	phone: z.string().describe("The phone number of the author of the resume."),
	location: z.string().describe("The location of the author of the resume."),
	website: labeledUrlSchema.describe("The website of the author of the resume."),
	customFields: z.array(customFieldDataSchema).describe("The custom fields to display on the resume."),
});

/**
 * @remarks Validates the summary section for a draft.
 * @example { title: "", content: "" }
 */
export const summaryDataSchema = z.object({
	title: z.string().describe("The title of the summary of the resume."),
	content: z.string().describe("The content of the summary of the resume. This should be a HTML-formatted string."),
});

/**
 * @remarks Validates a profile item entry.
 * @example { network: "", username: "", website: { label: "", url: "" } }
 */
export const profileItemDataSchema = listItemDataSchema.extend({
	network: z.string().describe("The name of the network or platform."),
	username: z.string().describe("The username of the author on the network or platform."),
	website: labeledUrlSchema.describe("The link to the profile of the author on the network or platform, if any."),
});

/**
 * @remarks Validates an experience item entry.
 * @example { company: "", position: "", location: "", period: "", website: { label: "", url: "" }, description: "" }
 */
export const experienceItemDataSchema = listItemDataSchema.extend({
	company: z.string().describe("The name of the company or organization."),
	position: z.string().describe("The position held at the company or organization."),
	location: z.string().describe("The location of the company or organization."),
	period: z.string().describe("The period of time the author was employed at the company or organization."),
	website: labeledUrlSchema.describe("The website of the company or organization, if any."),
	description: z.string().describe("The description of the experience. This should be a HTML-formatted string."),
});

/**
 * @remarks Validates an education item entry.
 * @example { school: "", degree: "", area: "", grade: "", location: "", period: "", website: { label: "", url: "" }, description: "" }
 */
export const educationItemDataSchema = listItemDataSchema.extend({
	school: z.string().describe("The name of the school or institution."),
	degree: z.string().describe("The degree or qualification obtained."),
	area: z.string().describe("The area of study or specialization."),
	grade: z.string().describe("The grade or score achieved."),
	location: z.string().describe("The location of the school or institution."),
	period: z.string().describe("The period of time the education was obtained over."),
	website: labeledUrlSchema.describe("The website of the school or institution, if any."),
	description: z.string().describe("The description of the education. This should be a HTML-formatted string."),
});

/**
 * @remarks Validates a project item entry.
 * @example { name: "", period: "", website: { label: "", url: "" }, description: "" }
 */
export const projectItemDataSchema = listItemDataSchema.extend({
	name: z.string().describe("The name of the project."),
	period: z.string().describe("The period of time the project was worked on."),
	website: labeledUrlSchema.describe("The link to the project, if any."),
	description: z.string().describe("The description of the project. This should be a HTML-formatted string."),
});

/**
 * @remarks Validates a skill item entry.
 * @example { name: "", proficiency: "", level: 0, keywords: [] }
 */
export const skillItemDataSchema = listItemDataSchema.extend({
	name: z.string().describe("The name of the skill."),
	proficiency: z
		.string()
		.describe(
			"The proficiency level of the skill. Can be any text, such as 'Beginner', 'Intermediate', 'Advanced', etc.",
		),
	level: z
		.number()
		.describe(
			"The proficiency level of the skill, defined as a number between 0 and 5. If set to 0, the icons displaying the level will be hidden.",
		),
	keywords: z
		.array(z.string())
		.describe("The keywords associated with the skill, if any. These are displayed as tags below the name."),
});

/**
 * @remarks Validates a language item entry.
 * @example { language: "", fluency: "", level: 0 }
 */
export const languageItemDataSchema = listItemDataSchema.extend({
	language: z.string().describe("The name of the language the author knows."),
	fluency: z
		.string()
		.describe(
			"The fluency level of the language. Can be any text, such as 'Native', 'Fluent', 'Conversational', etc. or can also be a CEFR level (A1, A2, B1, B2, C1, C2).",
		),
	level: z
		.number()
		.describe(
			"The proficiency level of the language, defined as a number between 0 and 5. If set to 0, the icons displaying the level will be hidden.",
		),
});

/**
 * @remarks Validates an interest item entry.
 * @example { name: "", keywords: [] }
 */
export const interestItemDataSchema = listItemDataSchema.extend({
	name: z.string().describe("The name of the interest/hobby."),
	keywords: z
		.array(z.string())
		.describe("The keywords associated with the interest/hobby, if any. These are displayed as tags below the name."),
});

/**
 * @remarks Validates an award item entry.
 * @example { title: "", awarder: "", date: "", website: { label: "", url: "" }, description: "" }
 */
export const awardItemDataSchema = listItemDataSchema.extend({
	title: z.string().describe("The title of the award."),
	awarder: z.string().describe("The awarder of the award."),
	date: z.string().describe("The date when the award was received."),
	website: labeledUrlSchema.describe("The website of the award, if any."),
	description: z.string().describe("The description of the award. This should be a HTML-formatted string."),
});

/**
 * @remarks Validates a certification item entry.
 * @example { title: "", issuer: "", date: "", website: { label: "", url: "" }, description: "" }
 */
export const certificationItemDataSchema = listItemDataSchema.extend({
	title: z.string().describe("The title of the certification."),
	issuer: z.string().describe("The issuer of the certification."),
	date: z.string().describe("The date when the certification was received."),
	website: labeledUrlSchema.describe("The website of the certification, if any."),
	description: z.string().describe("The description of the certification. This should be a HTML-formatted string."),
});

/**
 * @remarks Validates a publication item entry.
 * @example { title: "", publisher: "", date: "", website: { label: "", url: "" }, description: "" }
 */
export const publicationItemDataSchema = listItemDataSchema.extend({
	title: z.string().describe("The title of the publication."),
	publisher: z.string().describe("The publisher of the publication."),
	date: z.string().describe("The date when the publication was published."),
	website: labeledUrlSchema.describe("The link to the publication, if any."),
	description: z.string().describe("The description of the publication. This should be a HTML-formatted string."),
});

/**
 * @remarks Validates a volunteer item entry.
 * @example { organization: "", location: "", period: "", website: { label: "", url: "" }, description: "" }
 */
export const volunteerItemDataSchema = listItemDataSchema.extend({
	organization: z.string().describe("The name of the organization or company."),
	location: z.string().describe("The location of the organization or company."),
	period: z.string().describe("The period of time the author was volunteered at the organization or company."),
	website: labeledUrlSchema.describe("The link to the organization or company, if any."),
	description: z
		.string()
		.describe("The description of the volunteer experience. This should be a HTML-formatted string."),
});

/**
 * @remarks Validates a reference item entry.
 * @example { name: "", position: "", website: { label: "", url: "" }, phone: "", description: "" }
 */
export const referenceItemDataSchema = listItemDataSchema.extend({
	name: z.string().describe("The name of the reference, or a note such as 'Available upon request'."),
	position: z.string().describe("The position or job title of the reference."),
	website: labeledUrlSchema.describe("The website or LinkedIn profile of the reference, if any."),
	phone: z.string().describe("The phone number of the reference."),
	description: z
		.string()
		.describe(
			"The description of the reference. Can be used to display a quote, a testimonial, etc. This should be a HTML-formatted string.",
		),
});

/**
 * @remarks Builds section schemas with a shared structure and item schema.
 * @param itemSchema - The schema used to validate section items.
 * @returns A schema with a title and list of items.
 */
const createSectionSchema = <TItemSchema extends z.ZodTypeAny>(itemSchema: TItemSchema) =>
	z.object({
		title: z.string().describe("The title of the section."),
		items: z.array(itemSchema).describe("The items to display in the section."),
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
	profiles: profilesSectionDataSchema.describe("The section to display the profiles of the author."),
	experience: experienceSectionDataSchema.describe("The section to display the experience of the author."),
	education: educationSectionDataSchema.describe("The section to display the education of the author."),
	projects: projectsSectionDataSchema.describe("The section to display the projects of the author."),
	skills: skillsSectionDataSchema.describe("The section to display the skills of the author."),
	languages: languagesSectionDataSchema.describe("The section to display the languages of the author."),
	interests: interestsSectionDataSchema.describe("The section to display the interests of the author."),
	awards: awardsSectionDataSchema.describe("The section to display the awards of the author."),
	certifications: certificationsSectionDataSchema.describe("The section to display the certifications of the author."),
	publications: publicationsSectionDataSchema.describe("The section to display the publications of the author."),
	volunteer: volunteerSectionDataSchema.describe("The section to display the volunteer experience of the author."),
	references: referencesSectionDataSchema.describe("The section to display the references of the author."),
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
	title: z.string().describe("The title of the section."),
	type: sectionTypeSchema.describe(
		"The type of items this custom section contains. Determines which item schema and form fields to use.",
	),
	items: z
		.array(customSectionItemDataSchema)
		.describe("The items to display in the custom section. Items follow the schema of the section type."),
});

/**
 * @remarks Validates metadata for draft data.
 * @example { notes: "" }
 */
export const metadataDataSchema = z.object({
	notes: z
		.string()
		.describe(
			"Personal notes for the resume. Can be used to add any additional information or instructions for the resume. These notes are not displayed on the resume, they are only visible to the author of the resume when editing the resume. This should be a HTML-formatted string.",
		),
});

/**
 * @remarks Validates Draft Resume data while allowing empty values.
 * @example { picture: { url: "" }, basics: { name: "", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] }, summary: { title: "", content: "" }, sections: { profiles: { title: "", items: [] }, experience: { title: "", items: [] }, education: { title: "", items: [] }, projects: { title: "", items: [] }, skills: { title: "", items: [] }, languages: { title: "", items: [] }, interests: { title: "", items: [] }, awards: { title: "", items: [] }, certifications: { title: "", items: [] }, publications: { title: "", items: [] }, volunteer: { title: "", items: [] }, references: { title: "", items: [] } }, customSections: [], metadata: { notes: "" } }
 */
export const draftDataSchema = z.object({
	picture: pictureDataSchema.describe("Configuration for photograph displayed on the resume"),
	basics: basicsDataSchema.describe(
		"Basic information about the author, such as name, email, phone, location, and website",
	),
	summary: summaryDataSchema.describe("Summary section of the resume, useful for a short bio or introduction"),
	sections: sectionsDataSchema.describe(
		"Various sections of the resume, such as experience, education, projects, etc.",
	),
	customSections: z
		.array(customSectionDataSchema)
		.describe("Custom sections of the resume, such as a custom section for notes, etc."),
	metadata: metadataDataSchema.describe(
		"Metadata for the resume, such as template, layout, typography, etc. This section describes the overall design and appearance of the resume.",
	),
});
