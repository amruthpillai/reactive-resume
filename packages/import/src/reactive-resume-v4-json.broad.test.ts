import { describe, expect, it } from "vitest";
import { ReactiveResumeV4JSONImporter } from "./reactive-resume-v4-json";

const baseV4 = () => ({
	basics: {
		name: "Jane Doe",
		headline: "Senior Engineer",
		email: "jane@example.com",
		phone: "+1 555 0100",
		location: "Berlin",
		url: { label: "Site", href: "https://example.com" },
		customFields: [{ id: "cf1", icon: "globe", text: "https://example.com" }],
		picture: {
			url: "https://example.com/pic.jpg",
			size: 80,
			aspectRatio: 1,
			borderRadius: 0,
			effects: { hidden: false, border: true, grayscale: false },
		},
	},
	sections: {
		summary: {
			name: "Summary",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "summary",
			content: "<p>About me</p>",
		},
		awards: {
			name: "Awards",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "awards",
			items: [
				{ id: "a1", title: "Hackathon Winner", awarder: "Acme", date: "2023", summary: "" },
				{ title: "", awarder: "ghost" }, // filtered: no title
			],
		},
		certifications: {
			name: "Certifications",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "certifications",
			items: [
				{ id: "c1", name: "AWS Cert", issuer: "AWS", date: "2024" },
				{ name: "" }, // filtered
			],
		},
		education: {
			name: "Education",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "education",
			items: [
				{
					id: "edu1",
					institution: "MIT",
					studyType: "BS",
					area: "CS",
					score: "3.9",
					date: "2010-2014",
					summary: "Thesis...",
					url: { label: "", href: "https://mit.edu" },
				},
				{ studyType: "MS" }, // filtered: no institution
			],
		},
		experience: {
			name: "Experience",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "experience",
			items: [
				{
					id: "exp1",
					company: "Acme Corp",
					position: "Engineer",
					location: "Berlin",
					date: "2020-2024",
					summary: "Built stuff.",
					url: { label: "", href: "https://acme.example" },
				},
				{ position: "ghost" }, // filtered: no company
			],
		},
		volunteer: {
			name: "Volunteer",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "volunteer",
			items: [
				{ id: "v1", organization: "Org", location: "Berlin", date: "2022", summary: "" },
				{ organization: "" }, // filtered
			],
		},
		interests: {
			name: "Interests",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "interests",
			items: [
				{ id: "i1", name: "Cooking", keywords: ["pasta", "bread"] },
				{ name: "" }, // filtered
			],
		},
		languages: {
			name: "Languages",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "languages",
			items: [
				{ id: "l1", name: "English", description: "Native", level: 10 },
				{ name: "" }, // filtered
			],
		},
		profiles: {
			name: "Profiles",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "profiles",
			items: [
				{
					id: "p1",
					network: "GitHub",
					username: "jane",
					icon: "github",
					url: { label: "", href: "https://github.com/jane" },
				},
				{ network: "" }, // filtered
			],
		},
		projects: {
			name: "Projects",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "projects",
			items: [
				{
					id: "pr1",
					name: "Open CLI",
					date: "2022",
					summary: "Built a CLI",
					url: { label: "", href: "https://example.com" },
				},
				{ name: "" }, // filtered
			],
		},
		publications: {
			name: "Publications",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "publications",
			items: [
				{ id: "pub1", name: "Paper", publisher: "ACM", date: "2024" },
				{ name: "" }, // filtered
			],
		},
		references: {
			name: "References",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "references",
			items: [
				{ id: "r1", name: "Bob Smith", description: "Manager", summary: "Was great", url: { label: "", href: "" } },
				{ name: "" }, // filtered
			],
		},
		skills: {
			name: "Skills",
			columns: 1,
			separateLinks: false,
			visible: true,
			id: "skills",
			items: [
				{ id: "s1", name: "TypeScript", level: 10, keywords: ["node"], description: "Expert" },
				{ name: "" }, // filtered
			],
		},
	},
	metadata: {
		template: "onyx",
		layout: [[["experience", "education"], ["skills"]]],
		css: { value: "", visible: false },
		page: { margin: 14, format: "a4" as const, options: { breakLine: false, pageNumbers: false } },
		theme: { background: "#ffffff", text: "#000000", primary: "#dc2626" },
		typography: {
			font: { family: "IBM Plex Serif", subset: "latin", variants: ["regular"], size: 14.67 },
			lineHeight: 1.5,
			hideIcons: false,
			underlineLinks: false,
		},
		notes: "",
	},
});

const importer = new ReactiveResumeV4JSONImporter();

describe("ReactiveResumeV4JSONImporter — broad section mapping", () => {
	const v4 = baseV4();
	const result = importer.parse(JSON.stringify(v4));

	it("maps basics fields (name, headline, contact, website, customFields)", () => {
		expect(result.basics.name).toBe("Jane Doe");
		expect(result.basics.headline).toBe("Senior Engineer");
		expect(result.basics.email).toBe("jane@example.com");
		expect(result.basics.location).toBe("Berlin");
		expect(result.basics.website.url).toBe("https://example.com");
		expect(result.basics.customFields).toHaveLength(1);
		expect(result.basics.customFields[0]).toMatchObject({ icon: "globe", text: "https://example.com" });
	});

	it("maps picture with border on", () => {
		expect(result.picture.url).toBe("https://example.com/pic.jpg");
		expect(result.picture.hidden).toBe(false);
		expect(result.picture.borderWidth).toBeGreaterThan(0);
	});

	it("maps summary content", () => {
		expect(result.summary.content).toBe("<p>About me</p>");
		expect(result.summary.hidden).toBe(false);
	});

	it("filters items by required field across every section", () => {
		expect(result.sections.awards.items).toHaveLength(1);
		expect(result.sections.certifications.items).toHaveLength(1);
		expect(result.sections.education.items).toHaveLength(1);
		expect(result.sections.experience.items).toHaveLength(1);
		expect(result.sections.volunteer.items).toHaveLength(1);
		expect(result.sections.interests.items).toHaveLength(1);
		expect(result.sections.languages.items).toHaveLength(1);
		expect(result.sections.profiles.items).toHaveLength(1);
		expect(result.sections.projects.items).toHaveLength(1);
		expect(result.sections.publications.items).toHaveLength(1);
		expect(result.sections.references.items).toHaveLength(1);
		expect(result.sections.skills.items).toHaveLength(1);
	});

	it("maps experience items (company, position, period, description)", () => {
		const exp = result.sections.experience.items[0] as {
			company?: string;
			position?: string;
			period?: string;
			description?: string;
		};
		expect(exp.company).toBe("Acme Corp");
		expect(exp.position).toBe("Engineer");
		expect(exp.period).toBe("2020-2024");
		expect(exp.description).toBe("Built stuff.");
	});

	it("maps education items including degree+area", () => {
		const edu = result.sections.education.items[0] as {
			school?: string;
			degree?: string;
			area?: string;
			grade?: string;
		};
		expect(edu.school).toBe("MIT");
		expect(edu.degree).toBe("BS");
		expect(edu.area).toBe("CS");
		expect(edu.grade).toBe("3.9");
	});

	it("maps awards with title + awarder + date", () => {
		const award = result.sections.awards.items[0] as { title?: string; awarder?: string; date?: string };
		expect(award.title).toBe("Hackathon Winner");
		expect(award.awarder).toBe("Acme");
		expect(award.date).toBe("2023");
	});

	it("maps certifications (renaming name → title) and references (description → position)", () => {
		const cert = result.sections.certifications.items[0] as { title?: string };
		expect(cert.title).toBe("AWS Cert");

		const ref = result.sections.references.items[0] as { name?: string; position?: string; description?: string };
		expect(ref.name).toBe("Bob Smith");
		expect(ref.position).toBe("Manager");
		expect(ref.description).toBe("Was great");
	});

	it("scales language level 10 → 5 and skill level 10 → 5", () => {
		const language = result.sections.languages.items[0] as { level?: number };
		expect(language.level).toBe(5);

		const skill = result.sections.skills.items[0] as { level?: number };
		expect(skill.level).toBe(5);
	});

	it("invalid JSON throws", () => {
		expect(() => importer.parse("not json")).toThrow();
	});
});
