import type { MessageDescriptor } from "@lingui/core";
import type { BaseTemplate, Template, TemplateVariantFamily } from "@reactive-resume/schema/templates";
import { msg } from "@lingui/core/macro";
import {
	baseTemplateIds,
	getBaseTemplate,
	getTemplateAccentColor,
	getTemplateVariantFamily,
	templateIds,
} from "@reactive-resume/schema/templates";

export type TemplateMetadata = {
	name: string;
	description: MessageDescriptor | string;
	imageUrl: string;
	tags: string[];
	sidebarPosition: "left" | "right" | "none";
	accentColor: string;
	baseTemplate: BaseTemplate;
	family?: TemplateVariantFamily;
	isVariant?: boolean;
};

type BaseTemplateMetadata = Omit<TemplateMetadata, "accentColor" | "baseTemplate" | "family" | "isVariant">;

const baseTemplateMetadata = {
	azurill: {
		name: "Azurill",
		description: msg`Two-column with a bold colored sidebar and skill bars; great for creative or tech roles where visual flair is welcome.`,
		imageUrl: "/templates/jpg/azurill.jpg",
		tags: ["Two-column", "Creative", "Tech", "Visual flair"],
		sidebarPosition: "left",
	},
	bronzor: {
		name: "Bronzor",
		description: msg`Two-column, clean and professional with subtle section dividers; suits corporate, finance, or consulting positions.`,
		imageUrl: "/templates/jpg/bronzor.jpg",
		tags: ["Two-column", "Clean", "Professional", "Corporate", "Finance", "Consulting"],
		sidebarPosition: "none",
	},
	chikorita: {
		name: "Chikorita",
		description: msg`Two-column with a soft header accent and circular profile photo; ideal for marketing, HR, or client-facing roles.`,
		imageUrl: "/templates/jpg/chikorita.jpg",
		tags: ["Two-column", "Soft accent", "Marketing", "HR", "Client-facing"],
		sidebarPosition: "right",
	},
	ditgar: {
		name: "Ditgar",
		description: msg`Two-column with a dark teal sidebar and skills grid; modern feel for developers, data scientists, or technical PMs.`,
		imageUrl: "/templates/jpg/ditgar.jpg",
		tags: ["Two-column", "Modern", "Developer", "Data science", "Technical PM", "Dark sidebar"],
		sidebarPosition: "left",
	},
	ditto: {
		name: "Ditto",
		description: msg`Two-column, minimal and text-dense with no decorative elements; perfect for traditional industries or ATS-heavy applications.`,
		imageUrl: "/templates/jpg/ditto.jpg",
		tags: ["Two-column", "ATS friendly", "Minimal", "Text-dense", "Traditional", "No decoration"],
		sidebarPosition: "left",
	},
	gengar: {
		name: "Gengar",
		description: msg`Two-column with accent colors and clean typography; balanced choice for business analysts or operations roles.`,
		imageUrl: "/templates/jpg/gengar.jpg",
		tags: ["Two-column", "Accent colors", "Clean typography", "Business analyst", "Operations"],
		sidebarPosition: "left",
	},
	glalie: {
		name: "Glalie",
		description: msg`Two-column, minimal with light gray sidebar and subtle icons; professional and understated for legal, finance, or executive roles.`,
		imageUrl: "/templates/jpg/glalie.jpg",
		tags: ["Two-column", "Minimal", "Professional", "Legal", "Finance", "Executive", "Understated"],
		sidebarPosition: "left",
	},
	kakuna: {
		name: "Kakuna",
		description: msg`Single-column with a magenta left border accent; compact and efficient for entry-level or internship applications.`,
		imageUrl: "/templates/jpg/kakuna.jpg",
		tags: ["Single-column", "ATS friendly", "Compact", "Efficient", "Entry level", "Internship", "Magenta accent"],
		sidebarPosition: "none",
	},
	lapras: {
		name: "Lapras",
		description: msg`Single-column; polished and serious for senior or enterprise-level positions.`,
		imageUrl: "/templates/jpg/lapras.jpg",
		tags: ["Single-column", "ATS friendly", "Polished", "Senior", "Enterprise"],
		sidebarPosition: "none",
	},
	leafish: {
		name: "Leafish",
		description: msg`Two-column with a muted color sidebar; earthy and calm, suits sustainability, healthcare, or nonprofit sectors.`,
		imageUrl: "/templates/jpg/leafish.jpg",
		tags: ["Two-column", "Muted sidebar", "Earthy", "Calm", "Sustainability", "Healthcare", "Nonprofit"],
		sidebarPosition: "right",
	},
	meowth: {
		name: "Meowth",
		description: msg`Single-column with an inline three-column entry header (position, organization, period); compact and ATS-friendly, well-suited for Asian resume conventions (CN/JP/KR).`,
		imageUrl: "/templates/jpg/meowth.jpg",
		tags: ["Single-column", "ATS friendly", "Inline header", "Compact", "Asian style", "CN/JP/KR"],
		sidebarPosition: "none",
	},
	onyx: {
		name: "Onyx",
		description: msg`Single-column with a sidebar and clean grid layout; versatile for any professional or technical role.`,
		imageUrl: "/templates/jpg/onyx.jpg",
		tags: ["Single-column", "ATS friendly", "Sidebar", "Grid layout", "Versatile", "Professional", "Technical"],
		sidebarPosition: "none",
	},
	pikachu: {
		name: "Pikachu",
		description: msg`Two-column with a left margin color; simple and approachable for creative, editorial, or junior roles.`,
		imageUrl: "/templates/jpg/pikachu.jpg",
		tags: ["Two-column", "Simple", "Creative", "Editorial", "Junior", "Accent colors"],
		sidebarPosition: "left",
	},
	rhyhorn: {
		name: "Rhyhorn",
		description: msg`Single-column with a minimal top header and lots of whitespace; clean and modern for designers or content creators.`,
		imageUrl: "/templates/jpg/rhyhorn.jpg",
		tags: ["Single-column", "ATS friendly", "Minimal", "Clean", "Modern", "Designer", "Content creator", "Whitespace"],
		sidebarPosition: "none",
	},
	scizor: {
		name: "Scizor",
		description: msg`Single-column with uppercase section headings and a primary-color top rule on every page; polished for executive, consulting, or startup resumes.`,
		imageUrl: "/templates/jpg/scizor.jpg",
		tags: ["Single-column", "ATS friendly", "Uppercase headings", "Executive", "Consulting", "Startup"],
		sidebarPosition: "none",
	},
} as const satisfies Record<BaseTemplate, BaseTemplateMetadata>;

const templateFamilyMetadata = {
	executive: {
		label: "Executive",
		tags: ["Executive", "Leadership", "Board-ready"],
		description: (baseName: string) =>
			`${baseName} tuned for senior leaders, directors, founders, and executives who need crisp impact statements and board-ready structure.`,
	},
	"ats-classic": {
		label: "ATS Classic",
		tags: ["ATS friendly", "Conservative", "Recruiter scan"],
		description: (baseName: string) =>
			`${baseName} configured as a conservative ATS-first layout with direct headings, dense content, and minimal visual noise.`,
	},
	"tech-lead": {
		label: "Tech Lead",
		tags: ["Technology", "Engineering leadership", "Systems"],
		description: (baseName: string) =>
			`${baseName} positioned for software engineers, architects, and technical leads who need space for systems, tools, and outcomes.`,
	},
	product: {
		label: "Product",
		tags: ["Product", "Strategy", "Roadmaps"],
		description: (baseName: string) =>
			`${baseName} adapted for product managers and product owners, balancing discovery, delivery, analytics, and stakeholder impact.`,
	},
	creative: {
		label: "Creative",
		tags: ["Creative", "Portfolio", "Brand"],
		description: (baseName: string) =>
			`${baseName} styled for designers, writers, marketers, and creators who want personality while keeping the resume readable.`,
	},
	healthcare: {
		label: "Healthcare",
		tags: ["Healthcare", "Care delivery", "Compliance"],
		description: (baseName: string) =>
			`${baseName} tailored for clinical, administrative, and allied-health roles with emphasis on credentials, care quality, and compliance.`,
	},
	finance: {
		label: "Finance",
		tags: ["Finance", "Risk", "Analysis"],
		description: (baseName: string) =>
			`${baseName} tuned for finance, accounting, audit, banking, and analyst roles where precision and measurable results matter.`,
	},
	legal: {
		label: "Legal",
		tags: ["Legal", "Compliance", "Professional"],
		description: (baseName: string) =>
			`${baseName} adapted for legal, compliance, contracts, and policy roles with a restrained professional presentation.`,
	},
	education: {
		label: "Education",
		tags: ["Education", "Teaching", "Student outcomes"],
		description: (baseName: string) =>
			`${baseName} focused for teachers, trainers, academic staff, and education leaders highlighting programs and learner outcomes.`,
	},
	engineering: {
		label: "Engineering",
		tags: ["Engineering", "Projects", "Technical delivery"],
		description: (baseName: string) =>
			`${baseName} shaped for mechanical, civil, electrical, and industrial engineering resumes with project and certification emphasis.`,
	},
	sales: {
		label: "Sales",
		tags: ["Sales", "Revenue", "Targets"],
		description: (baseName: string) =>
			`${baseName} optimized for sales, account management, and business development roles with quota, revenue, and pipeline focus.`,
	},
	operations: {
		label: "Operations",
		tags: ["Operations", "Process", "Execution"],
		description: (baseName: string) =>
			`${baseName} structured for operations, logistics, supply chain, and administration roles where process wins need to stand out.`,
	},
	hospitality: {
		label: "Hospitality",
		tags: ["Hospitality", "Customer service", "Frontline"],
		description: (baseName: string) =>
			`${baseName} tuned for hospitality, retail, service, and customer-facing roles with clear skills and reliability signals.`,
	},
	construction: {
		label: "Construction",
		tags: ["Construction", "Skilled trades", "Field work"],
		description: (baseName: string) =>
			`${baseName} adapted for construction, HVAC, electrical, plumbing, field service, and skilled-trade experience.`,
	},
	"entry-level": {
		label: "Entry Level",
		tags: ["Entry level", "Internship", "Early career"],
		description: (baseName: string) =>
			`${baseName} arranged for early-career candidates, career changers, students, and internship applications.`,
	},
	international: {
		label: "International",
		tags: ["International", "Multilingual", "Global"],
		description: (baseName: string) =>
			`${baseName} prepared for multilingual and international applications where compact structure and global readability matter.`,
	},
	academic: {
		label: "Academic",
		tags: ["Academic", "Research", "Publications"],
		description: (baseName: string) =>
			`${baseName} oriented for academic CVs, researchers, lecturers, and applicants who need publications and credentials to scan well.`,
	},
} as const satisfies Record<
	TemplateVariantFamily,
	{
		label: string;
		tags: string[];
		description: (baseName: string) => string;
	}
>;

const uniqueTags = (...tagGroups: string[][]) => Array.from(new Set(tagGroups.flat())).slice(0, 10);

export const baseTemplates = Object.fromEntries(
	baseTemplateIds.map((template) => [
		template,
		{
			...baseTemplateMetadata[template],
			accentColor: getTemplateAccentColor(template),
			baseTemplate: template,
		},
	]),
) as unknown as Record<BaseTemplate, TemplateMetadata>;

const createTemplateMetadata = (template: Template): TemplateMetadata => {
	const baseTemplate = getBaseTemplate(template);
	const baseMetadata = baseTemplates[baseTemplate];
	const family = getTemplateVariantFamily(template);

	if (!family) return baseMetadata;

	const familyMetadata = templateFamilyMetadata[family];

	return {
		name: `${familyMetadata.label} ${baseMetadata.name}`,
		description: familyMetadata.description(baseMetadata.name),
		imageUrl: baseMetadata.imageUrl,
		tags: uniqueTags(familyMetadata.tags, baseMetadata.tags.slice(0, 5), [`Base: ${baseMetadata.name}`]),
		sidebarPosition: baseMetadata.sidebarPosition,
		accentColor: baseMetadata.accentColor,
		baseTemplate,
		family,
		isVariant: true,
	};
};

export const templates = Object.fromEntries(
	templateIds.map((template) => [template, createTemplateMetadata(template)]),
) as Record<Template, TemplateMetadata>;

export const featuredTemplateIds = [
	...baseTemplateIds,
	"ditto-ats-classic",
	"scizor-executive",
	"meowth-international",
	"azurill-creative",
	"ditgar-tech-lead",
	"bronzor-finance",
	"leafish-healthcare",
	"rhyhorn-academic",
] as const satisfies readonly Template[];

export const getTemplateDescription = (
	description: TemplateMetadata["description"],
	translate: (descriptor: MessageDescriptor) => string,
) => {
	return typeof description === "string" ? description : translate(description);
};
