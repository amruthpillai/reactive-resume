import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { EvaluationCorpus, ExpectedToken } from "./metrics";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

export type ExportVariant = "two-column" | "full-width";

export type SyntheticCorpus = EvaluationCorpus & {
	data: ResumeData;
	hiddenTokens: readonly string[];
	links: readonly string[];
};

const token = (value: string, group: string): ExpectedToken => ({ value, group });

const text = (html: string) => html.replace(/<[^>]+>/g, " ");

const SUMMARY_HTML =
	"<p>summary-signal-alpha leads longline-calibration with multilingual 東京大学 context and durable systems.</p>";
const EXPERIENCE_ROLE_ONE_HTML =
	"<ul><li><p>role-bullet-alpha shipped resilient pipeline-observability under longline-pressure.</p></li><li><p>role-bullet-beta measured queue-latency and improved release-safety.</p></li></ul>";
const EXPERIENCE_ROLE_TWO_HTML =
	"<p>role-bullet-gamma guided distributed-runtime migration for platform-reliability.</p>";
const EDUCATION_HTML = "<p>education-signal-delta researched multilingual retrieval and evaluation.</p>";
const PROJECT_HTML = "<p>project-signal-epsilon demonstrates export-fixture determinism.</p>";
const CUSTOM_HTML = "<p>custom-signal-zeta preserves authored custom content and free-text dates.</p>";

const expectedTokens: readonly ExpectedToken[] = [
	...[
		"Mira Kova",
		"Principal Systems Architect",
		"mira.kova@example.com",
		"+49 30 555 0142",
		"Berlin 東京",
		"mirakova.dev",
		"orbit-field-omega",
	].map((value) => token(value, "header")),
	...["Profiles", "OrbitNet", "orbit-profile-omega", "orbit.example/profile"].map((value) => token(value, "profiles")),
	...["Summary"].map((value) => token(value, "summary")),
	...[text(SUMMARY_HTML)].map((value) => token(value, "summary")),
	...["Experience"].map((value) => token(value, "experience")),
	...[
		"Northstar Robotics",
		"2018-02 — Present",
		"Berlin",
		"Staff Platform Engineer",
		"2018-02 to 2020-12",
		text(EXPERIENCE_ROLE_ONE_HTML),
		"Principal Reliability Engineer",
		"2021 / Present",
		text(EXPERIENCE_ROLE_TWO_HTML),
		"northstar.example/jobs",
	].map((value) => token(value, "experience")),
	...["Education"].map((value) => token(value, "education")),
	...[
		"東京大学",
		"Master of Computer Science",
		"Distributed Systems",
		"3.98 GPA",
		"2014 — 2018 (long academic period)",
		"東京",
		text(EDUCATION_HTML),
		"u-tokyo.example/program",
	].map((value) => token(value, "education")),
	...["Skills", "TypeScript", "Advanced", "skill-keyword-alpha", "Kubernetes", "Expert", "skill-keyword-beta"].map(
		(value) => token(value, "skills"),
	),
	...["Export Observatory", "2022 to Winter 2024", text(PROJECT_HTML), "project.example/observatory"].map((value) =>
		token(value, "projects"),
	),
	...["Custom Evidence", text(CUSTOM_HTML)].map((value) => token(value, "custom")),
];

const HIDDEN_TOKENS = ["Hidden Confidential", "hidden-signal-theta", "https://hidden.example"] as const;

const resolveWebsite = (url: string, label: string) => ({ url, label, inlineLink: false });

export function createSyntheticCorpus(variant: ExportVariant): SyntheticCorpus {
	const data = structuredClone(sampleResumeData);
	data.picture.hidden = true;
	data.basics = {
		name: "Mira Kova",
		headline: "Principal Systems Architect",
		email: "mira.kova@example.com",
		phone: "+49 30 555 0142",
		location: "Berlin 東京",
		website: resolveWebsite("https://mirakova.dev", "mirakova.dev"),
		customFields: [
			{
				id: "synthetic-field-omega",
				icon: "",
				text: "orbit-field-omega",
				link: "https://orbit.example/omega",
			},
		],
	};
	data.summary = {
		...data.summary,
		title: "Summary",
		content: SUMMARY_HTML,
	};
	data.sections.profiles = {
		...data.sections.profiles,
		title: "Profiles",
		items: [
			{
				id: "synthetic-profile-omega",
				hidden: false,
				icon: "",
				iconColor: "",
				network: "OrbitNet",
				username: "orbit-profile-omega",
				website: resolveWebsite("https://orbit.example/profile", "orbit.example/profile"),
			},
		],
	};
	data.sections.experience = {
		...data.sections.experience,
		title: "Experience",
		items: [
			{
				id: "synthetic-experience-northstar",
				hidden: false,
				company: "Northstar Robotics",
				position: "",
				location: "Berlin",
				period: "2018-02 — Present",
				website: resolveWebsite("https://northstar.example/jobs", "northstar.example/jobs"),
				roles: [
					{
						id: "synthetic-role-staff",
						position: "Staff Platform Engineer",
						period: "2018-02 to 2020-12",
						description: EXPERIENCE_ROLE_ONE_HTML,
					},
					{
						id: "synthetic-role-principal",
						position: "Principal Reliability Engineer",
						period: "2021 / Present",
						description: EXPERIENCE_ROLE_TWO_HTML,
					},
				],
				description: "",
			},
			{
				id: "synthetic-hidden-experience",
				hidden: true,
				company: HIDDEN_TOKENS[0],
				position: "",
				location: "",
				period: "",
				website: resolveWebsite("https://hidden.example", "hidden.example"),
				roles: [],
				description: `<p>${HIDDEN_TOKENS[1]}</p>`,
			},
		],
	};
	data.sections.education = {
		...data.sections.education,
		title: "Education",
		items: [
			{
				id: "synthetic-education-tokyo",
				hidden: false,
				school: "東京大学",
				degree: "Master of Computer Science",
				area: "Distributed Systems",
				grade: "3.98 GPA",
				location: "東京",
				period: "2014 — 2018 (long academic period)",
				website: resolveWebsite("https://u-tokyo.example/program", "u-tokyo.example/program"),
				description: EDUCATION_HTML,
			},
		],
	};
	data.sections.skills = {
		...data.sections.skills,
		title: "Skills",
		items: [
			{
				id: "synthetic-skill-typescript",
				hidden: false,
				icon: "",
				iconColor: "",
				name: "TypeScript",
				proficiency: "Advanced",
				level: 4,
				keywords: ["skill-keyword-alpha"],
			},
			{
				id: "synthetic-skill-kubernetes",
				hidden: false,
				icon: "",
				iconColor: "",
				name: "Kubernetes",
				proficiency: "Expert",
				level: 5,
				keywords: ["skill-keyword-beta"],
			},
		],
	};
	data.sections.projects = {
		...data.sections.projects,
		title: "Projects",
		items: [
			{
				id: "synthetic-project-observatory",
				hidden: false,
				name: "Export Observatory",
				period: "2022 to Winter 2024",
				website: resolveWebsite("https://project.example/observatory", "project.example/observatory"),
				description: PROJECT_HTML,
			},
		],
	};
	data.customSections = [
		{
			id: "custom-ats-evidence",
			type: "summary",
			title: "Custom Evidence",
			icon: "",
			columns: 1,
			hidden: false,
			showHeading: true,
			keepTogether: false,
			startOnNewPage: false,
			items: [{ id: "synthetic-custom-zeta", hidden: false, content: CUSTOM_HTML }],
		},
	];

	const mainSections = ["profiles", "summary", "experience", "education", "projects"];
	const sidebarSections = ["skills", "custom-ats-evidence"];
	const page = {
		fullWidth: variant === "full-width",
		main: variant === "full-width" ? [...mainSections, ...sidebarSections] : mainSections,
		sidebar: variant === "full-width" ? [] : sidebarSections,
	};
	data.metadata = {
		...data.metadata,
		template: variant === "full-width" ? "onyx" : "gengar",
		layout: { ...data.metadata.layout, pages: [page] },
		page: { ...data.metadata.page, locale: "en-US", hideIcons: true, hideSectionIcons: true },
	};

	return {
		name: `ats-${variant}`,
		tokens: expectedTokens,
		data,
		hiddenTokens: HIDDEN_TOKENS,
		links: [
			"https://mirakova.dev",
			"mailto:mira.kova@example.com",
			"tel:+49 30 555 0142",
			"https://orbit.example/omega",
			"https://orbit.example/profile",
			"https://northstar.example/jobs",
			"https://u-tokyo.example/program",
			"https://project.example/observatory",
		],
	};
}
