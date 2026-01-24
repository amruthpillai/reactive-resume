import z from "zod";
import { templateSchema } from "../templates";

export const iconSchema = z
	.string()
	.describe(
		"The icon to display for the custom field. Must be a valid icon name from @phosphor-icons/web icon set, or an empty string to hide. Default to '' (empty string) when unsure which icons are available.",
	);

export const urlSchema = z.object({
	url: z.string().describe("The URL to show as a link. Must be a valid URL with a protocol (http:// or https://)."),
	label: z.string().describe("The label to display for the URL. Leave blank to display the URL as-is."),
});

export const pictureSchema = z.object({
	hidden: z.boolean().describe("Whether to hide the picture from the resume."),
	url: z
		.string()
		.describe(
			"The URL to the picture to display on the resume. Must be a valid URL with a protocol (http:// or https://).",
		),
	size: z
		.number()
		.min(32)
		.max(512)
		.describe("The size of the picture to display on the resume, defined in points (pt)."),
	rotation: z
		.number()
		.min(0)
		.max(360)
		.describe("The rotation of the picture to display on the resume, defined in degrees (°)."),
	aspectRatio: z
		.number()
		.min(0.5)
		.max(2.5)
		.describe(
			"The aspect ratio of the picture to display on the resume, defined as width / height (e.g. 1.5 for 1.5:1 or 0.5 for 1:2).",
		),
	borderRadius: z
		.number()
		.min(0)
		.max(100)
		.describe("The border radius of the picture to display on the resume, defined in points (pt)."),
	borderColor: z
		.string()
		.describe("The color of the border of the picture to display on the resume, defined as rgba(r, g, b, a)."),
	borderWidth: z
		.number()
		.min(0)
		.describe("The width of the border of the picture to display on the resume, defined in points (pt)."),
	shadowColor: z
		.string()
		.describe("The color of the shadow of the picture to display on the resume, defined as rgba(r, g, b, a)."),
	shadowWidth: z
		.number()
		.min(0)
		.describe("The width of the shadow of the picture to display on the resume, defined in points (pt)."),
});

export const customFieldSchema = z.object({
	id: z.string().describe("The unique identifier for the custom field. Usually generated as a UUID."),
	icon: iconSchema,
	text: z.string().describe("The text to display for the custom field."),
	link: z.url().or(z.literal("")).describe("If the custom field should be a link, the URL to link to.").catch(""),
});

export const basicsSchema = z.object({
	name: z.string().describe("The full name of the author of the resume."),
	headline: z.string().describe("The headline of the author of the resume."),
	email: z.email().or(z.literal("")).describe("The email address of the author of the resume."),
	phone: z.string().describe("The phone number of the author of the resume."),
	location: z.string().describe("The location of the author of the resume."),
	website: urlSchema.describe("The website of the author of the resume."),
	customFields: z.array(customFieldSchema).describe("The custom fields to display on the resume."),
});

export const summarySchema = z.object({
	title: z.string().describe("The title of the summary of the resume."),
	columns: z.number().describe("The number of columns the summary should span across."),
	hidden: z.boolean().describe("Whether to hide the summary from the resume."),
	content: z.string().describe("The content of the summary of the resume. This should be a HTML-formatted string."),
});

export const baseItemSchema = z.object({
	id: z.string().describe("The unique identifier for the item. Usually generated as a UUID."),
	hidden: z.boolean().describe("Whether to hide the item from the resume."),
});

export const awardItemSchema = baseItemSchema.extend({
	title: z.string().min(1).describe("The title of the award."),
	awarder: z.string().describe("The awarder of the award."),
	date: z.string().describe("The date when the award was received."),
	website: urlSchema.describe("The website of the award, if any."),
	description: z.string().describe("The description of the award. This should be a HTML-formatted string."),
});

export const certificationItemSchema = baseItemSchema.extend({
	title: z.string().min(1).describe("The title of the certification."),
	issuer: z.string().describe("The issuer of the certification."),
	date: z.string().describe("The date when the certification was received."),
	website: urlSchema.describe("The website of the certification, if any."),
	description: z.string().describe("The description of the certification. This should be a HTML-formatted string."),
});

export const educationItemSchema = baseItemSchema.extend({
	school: z.string().min(1).describe("The name of the school or institution."),
	degree: z.string().describe("The degree or qualification obtained."),
	area: z.string().describe("The area of study or specialization."),
	grade: z.string().describe("The grade or score achieved."),
	location: z.string().describe("The location of the school or institution."),
	period: z.string().describe("The period of time the education was obtained over."),
	website: urlSchema.describe("The website of the school or institution, if any."),
	description: z.string().describe("The description of the education. This should be a HTML-formatted string."),
});

export const experienceItemSchema = baseItemSchema.extend({
	company: z.string().min(1).describe("The name of the company or organization."),
	position: z.string().describe("The position held at the company or organization."),
	location: z.string().describe("The location of the company or organization."),
	period: z.string().describe("The period of time the author was employed at the company or organization."),
	website: urlSchema.describe("The website of the company or organization, if any."),
	description: z.string().describe("The description of the experience. This should be a HTML-formatted string."),
});

export const interestItemSchema = baseItemSchema.extend({
	icon: iconSchema,
	name: z.string().min(1).describe("The name of the interest/hobby."),
	keywords: z
		.array(z.string())
		.catch([])
		.describe("The keywords associated with the interest/hobby, if any. These are displayed as tags below the name."),
});

export const languageItemSchema = baseItemSchema.extend({
	language: z.string().min(1).describe("The name of the language the author knows."),
	fluency: z
		.string()
		.describe(
			"The fluency level of the language. Can be any text, such as 'Native', 'Fluent', 'Conversational', etc. or can also be a CEFR level (A1, A2, B1, B2, C1, C2).",
		),
	level: z
		.number()
		.min(0)
		.max(5)
		.catch(0)
		.describe(
			"The proficiency level of the language, defined as a number between 0 and 5. If set to 0, the icons displaying the level will be hidden.",
		),
});

export const profileItemSchema = baseItemSchema.extend({
	icon: iconSchema,
	network: z.string().min(1).describe("The name of the network or platform."),
	username: z.string().describe("The username of the author on the network or platform."),
	website: urlSchema.describe("The link to the profile of the author on the network or platform, if any."),
});

export const projectItemSchema = baseItemSchema.extend({
	name: z.string().min(1).describe("The name of the project."),
	period: z.string().describe("The period of time the project was worked on."),
	website: urlSchema.describe("The link to the project, if any."),
	description: z.string().describe("The description of the project. This should be a HTML-formatted string."),
});

export const publicationItemSchema = baseItemSchema.extend({
	title: z.string().min(1).describe("The title of the publication."),
	publisher: z.string().describe("The publisher of the publication."),
	date: z.string().describe("The date when the publication was published."),
	website: urlSchema.describe("The link to the publication, if any."),
	description: z.string().describe("The description of the publication. This should be a HTML-formatted string."),
});

export const referenceItemSchema = baseItemSchema.extend({
	name: z.string().min(1).describe("The name of the reference, or a note such as 'Available upon request'."),
	position: z.string().describe("The position or job title of the reference."),
	website: urlSchema.describe("The website or LinkedIn profile of the reference, if any."),
	phone: z.string().describe("The phone number of the reference."),
	description: z
		.string()
		.describe(
			"The description of the reference. Can be used to display a quote, a testimonial, etc. This should be a HTML-formatted string.",
		),
});

export const skillItemSchema = baseItemSchema.extend({
	icon: iconSchema,
	name: z.string().min(1).describe("The name of the skill."),
	proficiency: z
		.string()
		.describe(
			"The proficiency level of the skill. Can be any text, such as 'Beginner', 'Intermediate', 'Advanced', etc.",
		),
	level: z
		.number()
		.min(0)
		.max(5)
		.catch(0)
		.describe(
			"The proficiency level of the skill, defined as a number between 0 and 5. If set to 0, the icons displaying the level will be hidden.",
		),
	keywords: z
		.array(z.string())
		.catch([])
		.describe("The keywords associated with the skill, if any. These are displayed as tags below the name."),
});

export const volunteerItemSchema = baseItemSchema.extend({
	organization: z.string().min(1).describe("The name of the organization or company."),
	location: z.string().describe("The location of the organization or company."),
	period: z.string().describe("The period of time the author was volunteered at the organization or company."),
	website: urlSchema.describe("The link to the organization or company, if any."),
	description: z
		.string()
		.describe("The description of the volunteer experience. This should be a HTML-formatted string."),
});

export const baseSectionSchema = z.object({
	title: z.string().describe("The title of the section."),
	columns: z.number().describe("The number of columns the section should span across."),
	hidden: z.boolean().describe("Whether to hide the section from the resume."),
});

export const awardsSectionSchema = baseSectionSchema.extend({
	items: z.array(awardItemSchema).describe("The items to display in the awards section."),
});

export const certificationsSectionSchema = baseSectionSchema.extend({
	items: z.array(certificationItemSchema).describe("The items to display in the certifications section."),
});

export const educationSectionSchema = baseSectionSchema.extend({
	items: z.array(educationItemSchema).describe("The items to display in the education section."),
});

export const experienceSectionSchema = baseSectionSchema.extend({
	items: z.array(experienceItemSchema).describe("The items to display in the experience section."),
});

export const interestsSectionSchema = baseSectionSchema.extend({
	items: z.array(interestItemSchema).describe("The items to display in the interests section."),
});

export const languagesSectionSchema = baseSectionSchema.extend({
	items: z.array(languageItemSchema).describe("The items to display in the languages section."),
});

export const profilesSectionSchema = baseSectionSchema.extend({
	items: z.array(profileItemSchema).describe("The items to display in the profiles section."),
});

export const projectsSectionSchema = baseSectionSchema.extend({
	items: z.array(projectItemSchema).describe("The items to display in the projects section."),
});

export const publicationsSectionSchema = baseSectionSchema.extend({
	items: z.array(publicationItemSchema).describe("The items to display in the publications section."),
});

export const referencesSectionSchema = baseSectionSchema.extend({
	items: z.array(referenceItemSchema).describe("The items to display in the references section."),
});

export const skillsSectionSchema = baseSectionSchema.extend({
	items: z.array(skillItemSchema).describe("The items to display in the skills section."),
});

export const volunteerSectionSchema = baseSectionSchema.extend({
	items: z.array(volunteerItemSchema).describe("The items to display in the volunteer section."),
});

export const sectionsSchema = z.object({
	profiles: profilesSectionSchema.describe("The section to display the profiles of the author."),
	experience: experienceSectionSchema.describe("The section to display the experience of the author."),
	education: educationSectionSchema.describe("The section to display the education of the author."),
	projects: projectsSectionSchema.describe("The section to display the projects of the author."),
	skills: skillsSectionSchema.describe("The section to display the skills of the author."),
	languages: languagesSectionSchema.describe("The section to display the languages of the author."),
	interests: interestsSectionSchema.describe("The section to display the interests of the author."),
	awards: awardsSectionSchema.describe("The section to display the awards of the author."),
	certifications: certificationsSectionSchema.describe("The section to display the certifications of the author."),
	publications: publicationsSectionSchema.describe("The section to display the publications of the author."),
	volunteer: volunteerSectionSchema.describe("The section to display the volunteer experience of the author."),
	references: referencesSectionSchema.describe("The section to display the references of the author."),
});

export type SectionType = keyof z.infer<typeof sectionsSchema>;
export type SectionData<T extends SectionType = SectionType> = z.infer<typeof sectionsSchema>[T];
export type SectionItem<T extends SectionType = SectionType> = SectionData<T>["items"][number];

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

export const customSectionItemSchema = z.union([
	profileItemSchema,
	experienceItemSchema,
	educationItemSchema,
	projectItemSchema,
	skillItemSchema,
	languageItemSchema,
	interestItemSchema,
	awardItemSchema,
	certificationItemSchema,
	publicationItemSchema,
	volunteerItemSchema,
	referenceItemSchema,
]);

export type CustomSectionItem = z.infer<typeof customSectionItemSchema>;

export const customSectionSchema = baseSectionSchema.extend({
	id: z.string().describe("The unique identifier for the custom section. Usually generated as a UUID."),
	type: sectionTypeSchema.describe(
		"The type of items this custom section contains. Determines which item schema and form fields to use.",
	),
	items: z
		.array(customSectionItemSchema)
		.describe("The items to display in the custom section. Items follow the schema of the section type."),
});

export type CustomSection = z.infer<typeof customSectionSchema>;

export const customSectionsSchema = z.array(customSectionSchema);

export const fontWeightSchema = z.enum(["100", "200", "300", "400", "500", "600", "700", "800", "900"]);

export const typographyItemSchema = z.object({
	fontFamily: z.string().describe("The family of the font to use. Must be a font that is available on Google Fonts."),
	fontWeights: z
		.array(fontWeightSchema)
		.catch(["400"])
		.describe(
			"The weight of the font, defined as a number between 100 and 900. Default to 400 when unsure if the weight is available in the font.",
		),
	fontSize: z.number().min(6).max(24).catch(11).describe("The size of the font to use, defined in points (pt)."),
	lineHeight: z
		.number()
		.min(0.5)
		.max(4)
		.catch(1.5)
		.describe("The line height of the font to use, defined as a multiplier of the font size (e.g. 1.5 for 1.5x)."),
});

export const pageLayoutSchema = z.object({
	fullWidth: z
		.boolean()
		.describe(
			"Whether the layout of the page should be full width. If true, the main column will span the entire width of the page. This means that there should be no items in the sidebar column.",
		),
	main: z
		.array(z.string())
		.describe(
			"The items to display in the main column of the page. A string array of section IDs (experience, education, projects, skills, languages, interests, awards, certifications, publications, volunteer, references, profiles, summary or UUIDs for custom sections).",
		),
	sidebar: z
		.array(z.string())
		.describe(
			"The items to display in the sidebar column of the page. A string array of section IDs (experience, education, projects, skills, languages, interests, awards, certifications, publications, volunteer, references, profiles, summary or UUIDs for custom sections).",
		),
});

export const layoutSchema = z.object({
	sidebarWidth: z
		.number()
		.min(10)
		.max(50)
		.catch(35)
		.describe("The width of the sidebar column, defined as a percentage of the page width."),
	pages: z.array(pageLayoutSchema).describe("The pages to display in the layout."),
});

export const cssSchema = z.object({
	enabled: z.boolean().describe("Whether to enable custom CSS for the resume."),
	value: z.string().describe("The custom CSS to apply to the resume. This should be a valid CSS string."),
});

export const pageSchema = z.object({
	gapX: z.number().min(0).describe("The horizontal gap between the sections of the page, defined in points (pt)."),
	gapY: z.number().min(0).describe("The vertical gap between the sections of the page, defined in points (pt)."),
	marginX: z.number().min(0).describe("The horizontal margin of the page, defined in points (pt)."),
	marginY: z.number().min(0).describe("The vertical margin of the page, defined in points (pt)."),
	format: z.enum(["a4", "letter"]).describe("The format of the page. Can be 'a4' or 'letter'."),
	locale: z
		.string()
		.describe("The locale of the page. Used for displaying pre-translated section headings, if not overridden.")
		.catch("en-US"),
	hideIcons: z.boolean().describe("Whether to hide the icons of the sections.").catch(false),
});

export const levelDesignSchema = z.object({
	icon: iconSchema,
	type: z
		.enum(["hidden", "circle", "square", "rectangle", "rectangle-full", "progress-bar", "icon"])
		.describe(
			"The type of the level design. 'hidden' will hide the level design, 'circle' will display a circle, 'square' will display a square, 'rectangle' will display a rectangle, 'rectangle-full' will display a full rectangle, 'progress-bar' will display a progress bar, and 'icon' will display an icon. If 'icon' is selected, the icon to display should be specified in the 'icon' field.",
		),
});

export const colorDesignSchema = z.object({
	primary: z.string().describe("The primary color of the design, defined as rgba(r, g, b, a)."),
	text: z
		.string()
		.describe("The text color of the design, defined as rgba(r, g, b, a). Usually set to black: rgba(0, 0, 0, 1)."),
	background: z
		.string()
		.describe(
			"The background color of the design, defined as rgba(r, g, b, a). Usually set to white: rgba(255, 255, 255, 1).",
		),
});

export const designSchema = z.object({
	level: levelDesignSchema,
	colors: colorDesignSchema,
});

export const typographySchema = z.object({
	body: typographyItemSchema.describe("The typography for the body of the resume."),
	heading: typographyItemSchema.describe("The typography for the headings of the resume."),
});

export const metadataSchema = z.object({
	template: templateSchema
		.catch("onyx")
		.describe("The template to use for the resume. Determines the overall design and appearance of the resume."),
	layout: layoutSchema.describe(
		"The layout of the resume. Determines the structure and arrangement of the sections on the resume.",
	),
	css: cssSchema.describe(
		"Custom CSS to apply to the resume. Can be used to override the default styles of the template.",
	),
	page: pageSchema.describe(
		"The page settings of the resume. Determines the margins, format, and locale of the resume.",
	),
	design: designSchema.describe(
		"The design settings of the resume. Determines the colors, level designs, and typography of the resume.",
	),
	typography: typographySchema.describe(
		"The typography settings of the resume. Determines the fonts and sizes of the body and headings of the resume.",
	),
	notes: z
		.string()
		.describe(
			"Personal notes for the resume. Can be used to add any additional information or instructions for the resume. These notes are not displayed on the resume, they are only visible to the author of the resume when editing the resume. This should be a HTML-formatted string.",
		),
});

export const resumeDataSchema = z.object({
	picture: pictureSchema.describe("Configuration for photograph displayed on the resume"),
	basics: basicsSchema.describe(
		"Basic information about the author, such as name, email, phone, location, and website",
	),
	summary: summarySchema.describe("Summary section of the resume, useful for a short bio or introduction"),
	sections: sectionsSchema.describe("Various sections of the resume, such as experience, education, projects, etc."),
	customSections: customSectionsSchema.describe(
		"Custom sections of the resume, such as a custom section for notes, etc.",
	),
	metadata: metadataSchema.describe(
		"Metadata for the resume, such as template, layout, typography, etc. This section describes the overall design and appearance of the resume.",
	),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;

export const defaultResumeData: ResumeData = {
	picture: {
		hidden: false,
		url: "",
		size: 80,
		rotation: 0,
		aspectRatio: 1,
		borderRadius: 0,
		borderColor: "rgba(0, 0, 0, 0.5)",
		borderWidth: 0,
		shadowColor: "rgba(0, 0, 0, 0.5)",
		shadowWidth: 0,
	},
	basics: {
		name: "",
		headline: "",
		email: "",
		phone: "",
		location: "",
		website: { url: "", label: "" },
		customFields: [],
	},
	summary: {
		title: "",
		columns: 1,
		hidden: false,
		content: "",
	},
	sections: {
		profiles: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		experience: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		education: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		projects: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		skills: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		languages: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		interests: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		awards: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		certifications: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		publications: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		volunteer: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		references: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
	},
	customSections: [],
	metadata: {
		template: "onyx",
		layout: {
			sidebarWidth: 35,
			pages: [
				{
					fullWidth: false,
					main: ["profiles", "summary", "education", "experience", "projects", "volunteer", "references"],
					sidebar: ["skills", "certifications", "awards", "languages", "interests", "publications"],
				},
			],
		},
		css: { enabled: false, value: "" },
		page: { gapX: 4, gapY: 6, marginX: 14, marginY: 12, format: "a4", locale: "en-US", hideIcons: false },
		design: {
			colors: {
				primary: "rgba(220, 38, 38, 1)",
				text: "rgba(0, 0, 0, 1)",
				background: "rgba(255, 255, 255, 1)",
			},
			level: {
				icon: "star",
				type: "circle",
			},
		},
		typography: {
			body: {
				fontFamily: "IBM Plex Serif",
				fontWeights: ["400", "500"],
				fontSize: 10,
				lineHeight: 1.5,
			},
			heading: {
				fontFamily: "IBM Plex Serif",
				fontWeights: ["600"],
				fontSize: 14,
				lineHeight: 1.5,
			},
		},
		notes: "",
	},
};

export const sampleResumeData: ResumeData = {
	picture: {
		hidden: false,
		url: `https://i.imgur.com/o4Jpt1p.jpeg`,
		size: 100,
		rotation: 0,
		aspectRatio: 1,
		borderRadius: 0,
		borderColor: "rgba(0, 0, 0, 0.5)",
		borderWidth: 0,
		shadowColor: "rgba(0, 0, 0, 0.5)",
		shadowWidth: 0,
	},
	basics: {
		name: "David Kowalski",
		headline: "Game Developer | Unity & Unreal Engine Specialist",
		email: "david.kowalski@email.com",
		phone: "+1 (555) 291-4756",
		location: "Seattle, WA",
		website: {
			url: "https://davidkowalski.games",
			label: "davidkowalski.games",
		},
		customFields: [
			{
				id: "cf1",
				icon: "github-logo",
				text: "github.com/dkowalski-dev",
				link: "https://github.com/dkowalski-dev",
			},
			{
				id: "cf2",
				icon: "game-controller",
				text: "itch.io/dkowalski",
				link: "https://itch.io/dkowalski",
			},
		],
	},
	summary: {
		title: "Professional Summary",
		columns: 1,
		hidden: false,
		content:
			"<p>Passionate game developer with 5+ years of professional experience creating engaging gameplay systems and polished player experiences across multiple platforms. Specialized in Unity and Unreal Engine with strong expertise in C#, C++, and game design principles. Proven ability to collaborate effectively with cross-functional teams including designers, artists, and QA to deliver high-quality games on time and within scope. Deep understanding of game mechanics, AI systems, physics, and performance optimization for PC, console, and mobile platforms.</p>",
	},
	sections: {
		profiles: {
			title: "Online Presence",
			columns: 3,
			hidden: false,
			items: [
				{
					id: "profile1",
					hidden: false,
					icon: "github-logo",
					network: "GitHub",
					username: "dkowalski-dev",
					website: {
						url: "https://github.com/dkowalski-dev",
						label: "github.com/dkowalski-dev",
					},
				},
				{
					id: "profile2",
					hidden: false,
					icon: "linkedin-logo",
					network: "LinkedIn",
					username: "davidkowalski",
					website: {
						url: "https://linkedin.com/in/davidkowalski",
						label: "linkedin.com/in/davidkowalski",
					},
				},
				{
					id: "profile3",
					hidden: false,
					icon: "game-controller",
					network: "itch.io",
					username: "dkowalski",
					website: {
						url: "https://itch.io/dkowalski",
						label: "itch.io/dkowalski",
					},
				},
			],
		},
		experience: {
			title: "Professional Experience",
			columns: 1,
			hidden: false,
			items: [
				{
					id: "exp1",
					hidden: false,
					company: "Cascade Studios",
					position: "Senior Game Developer",
					location: "Seattle, WA",
					period: "March 2022 - Present",
					website: {
						url: "",
						label: "",
					},
					description:
						"<ul><li>Lead gameplay programmer on an unannounced AAA action-adventure title built in Unreal Engine 5 for PC and next-gen consoles</li><li>Architected and implemented core combat system including hit detection, combo mechanics, and enemy AI behavior trees serving 15+ enemy types</li><li>Developed custom editor tools in C++ that reduced level designer iteration time by 40% and improved workflow efficiency across the team</li><li>Optimized rendering pipeline and gameplay systems to maintain 60 FPS performance target on all supported platforms, achieving 95% frame rate stability</li><li>Mentor two junior developers on programming best practices, code architecture, and game engine fundamentals</li><li>Collaborate with design team to prototype and iterate on new gameplay mechanics, balancing player agency with technical feasibility</li><li>Participate in code reviews and maintain high code quality standards across 200K+ lines of C++ codebase</li></ul>",
				},
				{
					id: "exp2",
					hidden: false,
					company: "Pixel Forge Interactive",
					position: "Game Developer",
					location: "Bellevue, WA",
					period: "June 2020 - February 2022",
					website: {
						url: "",
						label: "",
					},
					description:
						"<ul><li>Core developer on 'Starbound Odyssey,' a sci-fi roguelike that achieved 500K+ sales on Steam with 'Very Positive' user reviews</li><li>Implemented procedural generation systems for level layouts, enemy encounters, and loot drops using Unity and C#</li><li>Designed and programmed player progression systems including skill trees, equipment upgrades, and meta-progression mechanics</li><li>Created robust save/load system supporting cloud saves and cross-platform play between PC and Nintendo Switch</li><li>Integrated third-party SDKs for analytics (GameAnalytics), achievements (Steamworks), and multiplayer networking (Photon)</li><li>Fixed critical bugs and balanced gameplay based on community feedback and telemetry data, releasing 12 post-launch content updates</li><li>Worked closely with artists to implement VFX, animations, and shaders that enhanced visual polish while maintaining performance targets</li></ul>",
				},
				{
					id: "exp3",
					hidden: false,
					company: "Mobile Games Studio",
					position: "Junior Game Developer",
					location: "Remote",
					period: "September 2018 - May 2020",
					website: {
						url: "",
						label: "",
					},
					description:
						"<ul><li>Contributed to development of three mobile puzzle games built in Unity, collectively downloaded 2M+ times on iOS and Android</li><li>Implemented UI systems, touch controls, and gesture recognition optimized for mobile devices and various screen sizes</li><li>Developed monetization features including rewarded video ads, in-app purchases, and daily reward systems that increased retention by 25%</li><li>Optimized memory usage and load times for mobile platforms, reducing app size by 35% through asset compression and code optimization</li><li>Collaborated with game designers to balance puzzle difficulty curves and progression pacing using A/B testing data</li><li>Maintained live operations for released games, pushing regular content updates and seasonal events to sustain player engagement</li></ul>",
				},
			],
		},
		education: {
			title: "Education",
			columns: 1,
			hidden: false,
			items: [
				{
					id: "edu1",
					hidden: false,
					school: "University of Washington",
					degree: "Bachelor of Science",
					area: "Computer Science",
					grade: "3.6 GPA",
					location: "Seattle, WA",
					period: "2014 - 2018",
					website: {
						url: "",
						label: "",
					},
					description:
						"<p>Concentration in Game Development. Relevant Coursework: Game Engine Architecture, Computer Graphics, Artificial Intelligence, Physics Simulation, 3D Mathematics, Software Engineering, Data Structures & Algorithms</p>",
				},
			],
		},
		projects: {
			title: "Notable Projects",
			columns: 1,
			hidden: false,
			items: [
				{
					id: "proj1",
					hidden: false,
					name: "Echoes of the Void (Indie Game)",
					period: "2023 - Present",
					website: {
						url: "https://itch.io/echoes-of-the-void",
						label: "View on itch.io",
					},
					description:
						"<p>Solo developer for a narrative-driven 2D platformer built in Unity. Features custom dialogue system, branching story paths, and atmospheric pixel art. Currently in development with demo released on itch.io garnering 5K+ downloads and positive community feedback. Planned Steam release Q2 2025.</p>",
				},
				{
					id: "proj2",
					hidden: false,
					name: "Open Source: Unity Dialogue Framework",
					period: "2021 - 2023",
					website: {
						url: "https://github.com/dkowalski-dev/unity-dialogue",
						label: "View on GitHub",
					},
					description:
						"<p>Created and maintain an open-source dialogue system for Unity with visual node-based editor, localization support, and voice acting integration. Project has 800+ GitHub stars and is actively used by indie developers worldwide. Includes comprehensive documentation and example projects.</p>",
				},
				{
					id: "proj3",
					hidden: false,
					name: "Game Jam Participation",
					period: "2019 - Present",
					website: {
						url: "",
						label: "",
					},
					description:
						"<p>Regular participant in Ludum Dare and Global Game Jam events. Created 12+ game prototypes exploring experimental mechanics and art styles. Won 'Best Gameplay' award at Ludum Dare 48 with puzzle game 'Deeper and Deeper' that ranked in top 5% overall.</p>",
				},
			],
		},
		skills: {
			title: "Technical Skills",
			columns: 1,
			hidden: false,
			items: [
				{
					id: "skill1",
					hidden: false,
					icon: "code",
					name: "Unity Engine",
					proficiency: "Expert",
					level: 5,
					keywords: ["C#", "Editor Tools", "Performance Profiling"],
				},
				{
					id: "skill2",
					hidden: false,
					icon: "brackets-curly",
					name: "Unreal Engine",
					proficiency: "Advanced",
					level: 4,
					keywords: ["C++", "Blueprints", "UE5 Features"],
				},
				{
					id: "skill3",
					hidden: false,
					icon: "cpu",
					name: "Programming Languages",
					proficiency: "Expert",
					level: 5,
					keywords: ["C#", "C++", "Python", "HLSL/GLSL"],
				},
				{
					id: "skill4",
					hidden: false,
					icon: "brain",
					name: "Game AI",
					proficiency: "Advanced",
					level: 4,
					keywords: ["Behavior Trees", "FSM", "Pathfinding", "Navigation"],
				},
				{
					id: "skill5",
					hidden: false,
					icon: "shooting-star",
					name: "Physics & Mathematics",
					proficiency: "Advanced",
					level: 4,
					keywords: ["3D Math", "Collision Detection", "Rigid Body Dynamics"],
				},
				{
					id: "skill6",
					hidden: false,
					icon: "chart-line-up",
					name: "Performance Optimization",
					proficiency: "Advanced",
					level: 4,
					keywords: ["Profiling", "Memory Management", "Frame Rate"],
				},
			],
		},
		languages: {
			title: "Languages",
			columns: 2,
			hidden: false,
			items: [
				{
					id: "lang1",
					hidden: false,
					language: "English",
					fluency: "Native",
					level: 5,
				},
				{
					id: "lang2",
					hidden: false,
					language: "Polish",
					fluency: "Conversational",
					level: 3,
				},
			],
		},
		interests: {
			title: "Interests",
			columns: 1,
			hidden: false,
			items: [
				{
					id: "int1",
					hidden: false,
					icon: "game-controller",
					name: "Game Design",
					keywords: ["Mechanics", "Level Design", "Player Psychology"],
				},
				{
					id: "int2",
					hidden: false,
					icon: "robot",
					name: "AI & Procedural Generation",
					keywords: ["PCG", "Machine Learning", "Emergent Gameplay"],
				},
				{
					id: "int3",
					hidden: false,
					icon: "book-open",
					name: "Indie Game Development",
					keywords: ["Solo Dev", "Game Jams", "Community"],
				},
				{
					id: "int4",
					hidden: false,
					icon: "pen-nib",
					name: "Technical Art",
					keywords: ["Shaders", "VFX", "Optimization"],
				},
			],
		},
		awards: {
			title: "Awards & Recognition",
			columns: 1,
			hidden: false,
			items: [
				{
					id: "award1",
					hidden: false,
					title: "Best Gameplay - Ludum Dare 48",
					awarder: "Ludum Dare",
					date: "April 2021",
					website: {
						url: "",
						label: "",
					},
					description:
						"<p>Awarded for puzzle game 'Deeper and Deeper' which ranked in the top 5% overall among 3,000+ submissions</p>",
				},
				{
					id: "award2",
					hidden: false,
					title: "Employee Excellence Award",
					awarder: "Pixel Forge Interactive",
					date: "December 2021",
					website: {
						url: "",
						label: "",
					},
					description:
						"<p>Recognized for exceptional contributions to 'Starbound Odyssey' development and dedication to code quality</p>",
				},
			],
		},
		certifications: {
			title: "Certifications",
			columns: 1,
			hidden: false,
			items: [
				{
					id: "cert1",
					hidden: false,
					title: "Unity Certified Expert: Programmer",
					issuer: "Unity Technologies",
					date: "March 2022",
					website: {
						url: "",
						label: "",
					},
					description: "",
				},
				{
					id: "cert2",
					hidden: false,
					title: "Unreal Engine 5 C++ Developer",
					issuer: "Epic Games (Udemy)",
					date: "June 2023",
					website: {
						url: "",
						label: "",
					},
					description: "",
				},
			],
		},
		publications: {
			title: "Publications & Talks",
			columns: 1,
			hidden: false,
			items: [
				{
					id: "pub1",
					hidden: false,
					title: "Optimizing Unity Games for Mobile: A Practical Guide",
					publisher: "Game Developer Magazine",
					date: "September 2021",
					website: {
						url: "",
						label: "",
					},
					description:
						"<p>Technical article covering mobile optimization techniques including draw call batching, LOD systems, and memory management</p>",
				},
				{
					id: "pub2",
					hidden: false,
					title: "Building Modular Dialogue Systems",
					publisher: "Seattle Indie Game Developers Meetup",
					date: "May 2022",
					website: {
						url: "",
						label: "",
					},
					description:
						"<p>Presented talk on designing flexible dialogue systems for narrative games, attended by 60+ local developers</p>",
				},
			],
		},
		volunteer: {
			title: "Community Involvement",
			columns: 1,
			hidden: false,
			items: [
				{
					id: "vol1",
					hidden: false,
					organization: "Seattle Indies",
					location: "Seattle, WA",
					period: "2020 - Present",
					website: {
						url: "",
						label: "",
					},
					description:
						"<p>Active member of local indie game development community. Organize monthly game showcases and provide mentorship to aspiring game developers through code reviews and technical guidance.</p>",
				},
				{
					id: "vol2",
					hidden: false,
					organization: "Code.org Game Development Workshops",
					location: "Seattle, WA",
					period: "2021 - Present",
					website: {
						url: "",
						label: "",
					},
					description:
						"<p>Volunteer instructor teaching basic game programming concepts to middle school students. Led 8+ workshops introducing Unity fundamentals and game design principles.</p>",
				},
			],
		},
		references: {
			title: "References",
			columns: 1,
			hidden: false,
			items: [
				{
					id: "ref1",
					hidden: false,
					name: "Available upon request",
					position: "",
					website: { url: "", label: "" },
					phone: "",
					description: "",
				},
			],
		},
	},
	customSections: [],
	metadata: {
		template: "onyx",
		layout: {
			sidebarWidth: 35,
			pages: [
				{
					fullWidth: false,
					main: ["profiles", "summary", "education", "experience", "projects", "volunteer", "references"],
					sidebar: ["skills", "certifications", "awards", "languages", "interests", "publications"],
				},
			],
		},
		css: {
			enabled: false,
			value: "",
		},
		page: {
			gapX: 4,
			gapY: 6,
			marginX: 18,
			marginY: 16,
			format: "a4",
			locale: "en-US",
			hideIcons: false,
		},
		design: {
			level: {
				icon: "star",
				type: "circle",
			},
			colors: {
				primary: "rgba(239, 68, 68, 1)",
				text: "rgba(0, 0, 0, 1)",
				background: "rgba(255, 255, 255, 1)",
			},
		},
		typography: {
			body: {
				fontFamily: "IBM Plex Serif",
				fontWeights: ["400", "600"],
				fontSize: 11,
				lineHeight: 1.5,
			},
			heading: {
				fontFamily: "Oswald",
				fontWeights: ["600"],
				fontSize: 15,
				lineHeight: 1.5,
			},
		},
		notes: "",
	},
};
