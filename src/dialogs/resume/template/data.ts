import type { Plan } from "@/utils/plan";
import type { Template } from "@/schema/templates";

export type TemplateMetadata = {
	name: string;
	description: string;
	imageUrl: string;
	tags: string[];
	sidebarPosition: "left" | "right" | "none";
	tier: Plan;
};

export const templates = {
	azurill: {
		name: "Azurill",
		description: "Two-column with a bold colored sidebar and skill bars; great for creative or tech roles where visual flair is welcome.",
		imageUrl: "/templates/jpg/azurill.jpg",
		tags: ["Two-column", "Creative", "Tech", "Visual flair"],
		sidebarPosition: "left",
		tier: "pro",
	},
	bronzor: {
		name: "Bronzor",
		description: "Two-column, clean and professional with subtle section dividers; suits corporate, finance, or consulting positions.",
		imageUrl: "/templates/jpg/bronzor.jpg",
		tags: ["Two-column", "Clean", "Professional", "Corporate", "Finance", "Consulting"],
		sidebarPosition: "none",
		tier: "free",
	},
	chikorita: {
		name: "Chikorita",
		description: "Two-column with a soft header accent and circular profile photo; ideal for marketing, HR, or client-facing roles.",
		imageUrl: "/templates/jpg/chikorita.jpg",
		tags: ["Two-column", "Soft accent", "Marketing", "HR", "Client-facing"],
		sidebarPosition: "right",
		tier: "pro",
	},
	ditgar: {
		name: "Ditgar",
		description: "Two-column with a dark teal sidebar and skills grid; modern feel for developers, data scientists, or technical PMs.",
		imageUrl: "/templates/jpg/ditgar.jpg",
		tags: ["Two-column", "Modern", "Developer", "Data science", "Technical PM", "Dark sidebar"],
		sidebarPosition: "left",
		tier: "pro",
	},
	ditto: {
		name: "Ditto",
		description: "Two-column, minimal and text-dense with no decorative elements; perfect for traditional industries or ATS-heavy applications.",
		imageUrl: "/templates/jpg/ditto.jpg",
		tags: ["Two-column", "ATS friendly", "Minimal", "Text-dense", "Traditional", "No decoration"],
		sidebarPosition: "left",
		tier: "free",
	},
	gengar: {
		name: "Gengar",
		description: "Two-column with accent colors and clean typography; balanced choice for business analysts or operations roles.",
		imageUrl: "/templates/jpg/gengar.jpg",
		tags: ["Two-column", "Accent colors", "Clean typography", "Business analyst", "Operations"],
		sidebarPosition: "left",
		tier: "pro",
	},
	glalie: {
		name: "Glalie",
		description: "Two-column, minimal with light gray sidebar and subtle icons; professional and understated for legal, finance, or executive roles.",
		imageUrl: "/templates/jpg/glalie.jpg",
		tags: ["Two-column", "Minimal", "Professional", "Legal", "Finance", "Executive", "Understated"],
		sidebarPosition: "left",
		tier: "pro",
	},
	kakuna: {
		name: "Kakuna",
		description: "Single-column with a magenta left border accent; compact and efficient for entry-level or internship applications.",
		imageUrl: "/templates/jpg/kakuna.jpg",
		tags: ["Single-column", "ATS friendly", "Compact", "Efficient", "Entry level", "Internship", "Magenta accent"],
		sidebarPosition: "none",
		tier: "free",
	},
	lapras: {
		name: "Lapras",
		description: "Single-column; polished and serious for senior or enterprise-level positions.",
		imageUrl: "/templates/jpg/lapras.jpg",
		tags: ["Single-column", "ATS friendly", "Polished", "Senior", "Enterprise"],
		sidebarPosition: "none",
		tier: "pro",
	},
	leafish: {
		name: "Leafish",
		description: "Two-column with a muted color sidebar; earthy and calm, suits sustainability, healthcare, or nonprofit sectors.",
		imageUrl: "/templates/jpg/leafish.jpg",
		tags: ["Two-column", "Muted sidebar", "Earthy", "Calm", "Sustainability", "Healthcare", "Nonprofit"],
		sidebarPosition: "right",
		tier: "pro",
	},
	onyx: {
		name: "Onyx",
		description: "Single-column with a sidebar and clean grid layout; versatile for any professional or technical role.",
		imageUrl: "/templates/jpg/onyx.jpg",
		tags: ["Single-column", "ATS friendly", "Sidebar", "Grid layout", "Versatile", "Professional", "Technical"],
		sidebarPosition: "none",
		tier: "pro",
	},
	pikachu: {
		name: "Pikachu",
		description: "Two-column with a left margin color; simple and approachable for creative, editorial, or junior roles.",
		imageUrl: "/templates/jpg/pikachu.jpg",
		tags: ["Two-column", "Simple", "Creative", "Editorial", "Junior", "Accent colors"],
		sidebarPosition: "left",
		tier: "pro",
	},
	rhyhorn: {
		name: "Rhyhorn",
		description: "Single-column with a minimal top header and lots of whitespace; clean and modern for designers or content creators.",
		imageUrl: "/templates/jpg/rhyhorn.jpg",
		tags: ["Single-column", "ATS friendly", "Minimal", "Clean", "Modern", "Designer", "Content creator", "Whitespace"],
		sidebarPosition: "none",
		tier: "pro",
	},
} as const satisfies Record<Template, TemplateMetadata>;
