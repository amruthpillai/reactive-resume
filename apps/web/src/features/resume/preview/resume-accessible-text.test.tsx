// @vitest-environment happy-dom
import { render, screen, within } from "@testing-library/react";
import { beforeAll, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { ResumeAccessibleText } from "./resume-accessible-text";

vi.mock("@/features/resume/builder/draft", () => ({ useResumeData: () => undefined }));
beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

function renderAccessibleText(data: typeof sampleResumeData) {
	return render(
		<I18nProvider i18n={i18n}>
			<ResumeAccessibleText data={data} />
		</I18nProvider>,
	);
}
it.each([false, true])("exposes keyword list semantics for custom=%s", (custom) => {
	const data = structuredClone(defaultResumeData);
	Object.assign(data.sections.skills, { keywordLayout: "list" });
	data.sections.skills.items = [
		{
			id: "skill",
			name: "Engineering",
			hidden: false,
			icon: "",
			iconColor: "",
			proficiency: "Expert",
			level: 3,
			keywords: ["Alpha", "Beta", "Gamma"],
		},
	];
	if (custom) {
		data.customSections = [{ ...data.sections.skills, id: "custom", type: "skills" }];
		data.sections.skills.items = [];
	}
	render(
		<I18nProvider i18n={i18n}>
			<ResumeAccessibleText data={data} />
		</I18nProvider>,
	);
	const keyword = screen.getByText("Alpha");
	expect(keyword.tagName).toBe("LI");
	const list = keyword.parentElement;
	if (!list) throw new Error("Missing keyword list");
	expect(within(list).getAllByRole("listitem")).toHaveLength(3);
});

it("retains section labels when visual heading is disabled", () => {
	const data = structuredClone(defaultResumeData);
	data.sections.skills.showHeading = false;
	data.sections.skills.items = [
		{
			id: "skill",
			name: "TypeScript",
			hidden: false,
			icon: "",
			iconColor: "",
			proficiency: "Expert",
			level: 3,
			keywords: [],
		},
	];

	render(
		<I18nProvider i18n={i18n}>
			<ResumeAccessibleText data={data} />
		</I18nProvider>,
	);

	expect(screen.getByRole("heading", { level: 2, name: "Skills" })).toBeInTheDocument();
});

it("characterizes stable heading, hidden-content, contact, and reading-order behavior", () => {
	const data = structuredClone(sampleResumeData);
	data.sections.skills.hidden = true;
	data.sections.experience.items[0].company = "Visible Company";
	data.sections.experience.items[0].position = "Visible Position";
	data.sections.experience.items[0].description = "<p>Visible description token.</p>";
	data.sections.projects.items = [];
	data.customSections = [
		{
			id: "custom-visible",
			type: "projects",
			title: "Unplaced Custom Section",
			icon: "",
			columns: 1,
			hidden: false,
			showHeading: false,
			keepTogether: false,
			startOnNewPage: false,
			items: [
				{
					id: "custom-visible-item",
					hidden: false,
					name: "Unplaced Item",
					period: "",
					website: { url: "", label: "", inlineLink: false },
					description: "<p>Unplaced description token.</p>",
				},
			],
		},
		{
			id: "custom-hidden-item",
			type: "projects",
			title: "Hidden Custom Section",
			icon: "",
			columns: 1,
			hidden: false,
			showHeading: true,
			keepTogether: false,
			startOnNewPage: false,
			items: [
				{
					id: "custom-hidden-item-value",
					hidden: true,
					name: "Hidden Custom Item",
					period: "",
					website: { url: "", label: "", inlineLink: false },
					description: "<p>Hidden custom description.</p>",
				},
			],
		},
	];

	renderAccessibleText(data);

	expect(screen.getByRole("heading", { level: 1, name: data.basics.name })).toBeInTheDocument();
	expect(screen.getByRole("heading", { level: 2, name: "Experience" })).toBeInTheDocument();
	expect(screen.getByRole("link", { name: "davidkowalski.games" })).toHaveAttribute("href", data.basics.website.url);
	expect(screen.queryByText("Performance Optimization")).not.toBeInTheDocument();
	expect(screen.queryByText("Hidden Custom Item")).not.toBeInTheDocument();
	expect(screen.getByText("Unplaced Item")).toBeInTheDocument();
});

it("exposes entry and subordinate-role headings with safe nested rich-text lists", () => {
	// Characterization before this change: item labels had no heading elements and rich-text lists were flattened into one paragraph.
	const data = structuredClone(sampleResumeData);
	data.sections.experience.items = [
		{
			...data.sections.experience.items[0],
			id: "hierarchy-item",
			company: "Acme Company",
			position: "",
			description:
				'<p>Summary <strong>emphasis</strong>.</p><ul><li>First bullet</li><li><em>Second bullet</em><ol><li>Nested bullet</li></ol></li></ul><p><a href="javascript:alert(1)">Unsafe link</a></p><script>alert(1)</script>',
			roles: [
				{
					id: "hierarchy-role",
					position: "Lead Role",
					period: "2020 - 2022",
					description: "<p>Role <strong>detail</strong>.</p>",
				},
			],
		},
		{
			...data.sections.experience.items[0],
			id: "blank-primary-item",
			company: "",
			position: "",
			description: "<p>Blank primary body.</p>",
			roles: [],
		},
	];
	data.sections.projects.items = [];

	renderAccessibleText(data);

	expect(screen.getByRole("heading", { level: 3, name: "Acme Company" })).toBeInTheDocument();
	expect(screen.getByRole("heading", { level: 4, name: "Lead Role" })).toBeInTheDocument();
	const experience = screen.getAllByRole("heading", { level: 2, name: "Experience" })[0]?.parentElement;
	expect(experience?.querySelectorAll("h3")).toHaveLength(1);
	expect(screen.getByText("First bullet").tagName).toBe("LI");
	expect(screen.getByText("Nested bullet").tagName).toBe("LI");
	expect(screen.getByText("emphasis").tagName).toBe("STRONG");
	expect(screen.getByText("Second bullet").tagName).toBe("EM");
	expect(screen.queryByRole("link", { name: "Unsafe link" })).not.toBeInTheDocument();
	expect(screen.queryByText("alert(1)")).not.toBeInTheDocument();
	expect(screen.getByText("Acme Company")).toHaveTextContent("Acme Company");
});

it.each(["   ", "<script>alert(1)</script>", "<style>.hidden { display: none; }</style>", "<iframe>ignored</iframe>"])(
	"omits summary section when content has no renderable text: %s",
	(content) => {
		const data = structuredClone(sampleResumeData);
		data.summary.content = content;

		renderAccessibleText(data);

		const summaryTitle = data.summary.title?.trim() || "Summary";
		expect(screen.queryByRole("heading", { level: 2, name: summaryTitle })).not.toBeInTheDocument();
	},
);

it("promotes role heading to H3 when experience company is blank", () => {
	const data = structuredClone(sampleResumeData);
	data.sections.experience.items = [
		{
			...data.sections.experience.items[0],
			id: "blank-company-item",
			company: "",
			position: "",
			roles: [
				{
					id: "blank-company-role",
					position: "Role Without Company",
					period: "2020 - 2022",
					description: "<p>Role detail.</p>",
				},
			],
		},
	];

	renderAccessibleText(data);

	expect(screen.getByRole("heading", { level: 3, name: "Role Without Company" })).toBeInTheDocument();
	expect(screen.queryByRole("heading", { level: 4, name: "Role Without Company" })).not.toBeInTheDocument();
});
