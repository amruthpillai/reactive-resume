import type { ExperienceItem, ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { lintResumeForAts } from "./index";

const NOW = new Date("2024-06-15T00:00:00Z");

const experienceItem = (overrides: Partial<ExperienceItem> = {}): ExperienceItem => ({
	id: "exp-1",
	hidden: false,
	company: "Analytical Engines",
	position: "Engineer",
	location: "London",
	period: "Jan 2020 - Present",
	website: { url: "", label: "", inlineLink: false },
	description: "<p>Designed and shipped the difference engine.</p>",
	roles: [],
	...overrides,
});

function makeResume(mutate: (data: ResumeData) => void = () => undefined): ResumeData {
	const data = structuredClone(defaultResumeData);

	data.basics.name = "Ada Lovelace";
	data.basics.email = "ada@example.com";
	data.basics.phone = "+44 20 7946 0100";
	data.basics.location = "London, UK";
	data.sections.experience.items = [experienceItem()];
	data.metadata.layout.pages = [{ fullWidth: false, main: ["experience"], sidebar: [] }];

	mutate(data);
	return data;
}

const lint = (data: ResumeData) => lintResumeForAts(data, { now: NOW });
const codesOf = (data: ResumeData) => lint(data).findings.map((item) => item.code);

describe("lintResumeForAts", () => {
	it("reports nothing on a well-formed resume", () => {
		expect(lint(makeResume()).findings).toEqual([]);
	});

	it("counts every rule as passed when nothing fires", () => {
		const report = lint(makeResume());
		expect(report.passedRules).toBe(report.totalRules);
		expect(report.counts).toEqual({ error: 0, warning: 0, info: 0 });
	});

	it("flags the gaps in a blank resume", () => {
		const codes = codesOf(defaultResumeData);
		expect(codes).toContain("MISSING_NAME");
		expect(codes).toContain("MISSING_EMAIL");
		expect(codes).toContain("MISSING_PHONE");
		expect(codes).toContain("NO_VISIBLE_EXPERIENCE");
		expect(codes).toContain("EMPTY_RENDERED_SECTION");
	});

	it("sorts findings by severity", () => {
		const report = lint(defaultResumeData);
		const severities = report.findings.map((item) => item.severity);
		expect(severities).toEqual([...severities].sort((a, b) => (a === b ? 0 : a === "error" ? -1 : 1)));
	});
});

describe("contact rules", () => {
	it("flags a malformed email instead of a missing one", () => {
		const codes = codesOf(makeResume((data) => (data.basics.email = "ada at example dot com")));
		expect(codes).toContain("MALFORMED_EMAIL");
		expect(codes).not.toContain("MISSING_EMAIL");
	});

	it("flags a link with no protocol", () => {
		const report = lint(makeResume((data) => (data.basics.website.url = "example.com/ada")));
		expect(report.findings).toContainEqual({
			code: "MALFORMED_URL",
			severity: "warning",
			pointer: "/basics/website/url",
			params: { value: "example.com/ada" },
		});
	});

	it("accepts mailto and tel links in custom fields", () => {
		const data = makeResume((resume) => {
			resume.basics.customFields = [
				{ id: "a", icon: "", text: "Mail", link: "mailto:ada@example.com" },
				{ id: "b", icon: "", text: "Phone", link: "tel:+442079460100" },
			];
		});
		expect(codesOf(data)).not.toContain("MALFORMED_URL");
	});

	it("notes a visible picture", () => {
		expect(codesOf(makeResume((data) => (data.picture.url = "/uploads/ada.png")))).toContain("PICTURE_PRESENT");
	});

	it("ignores a hidden picture", () => {
		const data = makeResume((resume) => {
			resume.picture.url = "/uploads/ada.png";
			resume.picture.hidden = true;
		});
		expect(codesOf(data)).not.toContain("PICTURE_PRESENT");
	});
});

describe("date rules", () => {
	it("flags an unreadable period at the offending item", () => {
		const data = makeResume((resume) => {
			resume.sections.experience.items = [experienceItem({ period: "a while back" })];
		});

		expect(lint(data).findings).toContainEqual({
			code: "UNPARSEABLE_PERIOD",
			severity: "error",
			pointer: "/sections/experience/items/0/period",
			params: { value: "a while back" },
		});
	});

	it("requires a period on experience", () => {
		const data = makeResume((resume) => {
			resume.sections.experience.items = [experienceItem({ period: "" })];
		});
		expect(codesOf(data)).toContain("EMPTY_PERIOD");
	});

	it("does not require a period on projects", () => {
		const data = makeResume((resume) => {
			resume.sections.projects.items = [
				{
					id: "p1",
					hidden: false,
					name: "Difference Engine",
					period: "",
					website: { url: "", label: "", inlineLink: false },
					description: "<p>A machine.</p>",
				},
			];
			resume.metadata.layout.pages = [{ fullWidth: false, main: ["experience", "projects"], sidebar: [] }];
		});

		expect(codesOf(data)).not.toContain("EMPTY_PERIOD");
	});

	it("flags a period that runs backwards", () => {
		const data = makeResume((resume) => {
			resume.sections.experience.items = [experienceItem({ period: "Mar 2022 - Jan 2020" })];
		});
		expect(codesOf(data)).toContain("REVERSED_PERIOD");
	});

	it("flags a period starting in the future", () => {
		const data = makeResume((resume) => {
			resume.sections.experience.items = [experienceItem({ period: "Jan 2030 - Present" })];
		});
		expect(codesOf(data)).toContain("FUTURE_DATED_PERIOD");
	});

	it("checks periods on nested roles", () => {
		const data = makeResume((resume) => {
			resume.sections.experience.items = [
				experienceItem({
					roles: [{ id: "r1", position: "Junior Engineer", period: "whenever", description: "<p>Work.</p>" }],
				}),
			];
		});

		expect(lint(data).findings.map((item) => item.pointer)).toContain("/sections/experience/items/0/roles/0/period");
	});

	it("flags an unreadable single date", () => {
		const data = makeResume((resume) => {
			resume.sections.awards.items = [
				{
					id: "a1",
					hidden: false,
					title: "Turing Award",
					awarder: "ACM",
					date: "some time ago",
					website: { url: "", label: "", inlineLink: false },
					description: "",
				},
			];
			resume.metadata.layout.pages = [{ fullWidth: false, main: ["experience", "awards"], sidebar: [] }];
		});

		expect(codesOf(data)).toContain("UNPARSEABLE_DATE");
	});

	it("ignores hidden items", () => {
		const data = makeResume((resume) => {
			resume.sections.experience.items = [
				experienceItem(),
				experienceItem({ id: "exp-2", period: "???", hidden: true }),
			];
		});
		expect(codesOf(data)).not.toContain("UNPARSEABLE_PERIOD");
	});
});

describe("structure rules", () => {
	it("flags content that is never placed on a page", () => {
		const data = makeResume((resume) => {
			resume.sections.education.items = [
				{
					id: "e1",
					hidden: false,
					school: "University of London",
					degree: "BSc",
					area: "Mathematics",
					grade: "",
					location: "London",
					period: "2016 - 2019",
					website: { url: "", label: "", inlineLink: false },
					description: "",
				},
			];
		});

		expect(lint(data).findings).toContainEqual({
			code: "SECTION_MISSING_FROM_LAYOUT",
			severity: "error",
			pointer: "/sections/education",
			params: { section: "education" },
		});
	});

	it("flags a placed section with no items", () => {
		const data = makeResume((resume) => {
			resume.metadata.layout.pages = [{ fullWidth: false, main: ["experience", "skills"], sidebar: [] }];
		});
		expect(codesOf(data)).toContain("EMPTY_RENDERED_SECTION");
	});

	it("flags an experience entry with no narrative", () => {
		const data = makeResume((resume) => {
			resume.sections.experience.items = [experienceItem({ description: "<p></p>" })];
		});
		expect(codesOf(data)).toContain("MISSING_EXPERIENCE_DESCRIPTION");
	});

	it("accepts an experience entry whose narrative lives on its roles", () => {
		const data = makeResume((resume) => {
			resume.sections.experience.items = [
				experienceItem({
					description: "",
					roles: [{ id: "r1", position: "Engineer", period: "2020 - 2022", description: "<p>Shipped it.</p>" }],
				}),
			];
		});
		expect(codesOf(data)).not.toContain("MISSING_EXPERIENCE_DESCRIPTION");
	});

	it("counts a custom section of type experience as experience", () => {
		const data = makeResume((resume) => {
			resume.sections.experience.items = [];
			resume.customSections = [
				{
					id: "custom-exp",
					type: "experience",
					title: "Work Experience",
					icon: "briefcase",
					columns: 1,
					hidden: false,
					keepTogether: false,
					startOnNewPage: false,
					items: [experienceItem()],
				},
			];
			resume.metadata.layout.pages = [{ fullWidth: false, main: ["custom-exp"], sidebar: [] }];
		});

		expect(codesOf(data)).not.toContain("NO_VISIBLE_EXPERIENCE");
	});
});

describe("cover letter sections", () => {
	it("exempts cover letters from resume rules", () => {
		const data = makeResume((resume) => {
			resume.customSections = [
				{
					id: "cover",
					type: "cover-letter",
					title: "Cover Letter",
					icon: "envelope-simple",
					columns: 1,
					hidden: false,
					keepTogether: false,
					startOnNewPage: false,
					items: [{ id: "c1", hidden: false, recipient: "<p>Hiring Manager</p>", content: "<p>Dear team,</p>" }],
				},
			];
			resume.metadata.layout.pages = [{ fullWidth: false, main: ["experience", "cover"], sidebar: [] }];
		});

		expect(lint(data).findings.filter((item) => item.pointer.startsWith("/customSections"))).toEqual([]);
	});
});

describe("layout rules", () => {
	it("flags a prose section split into columns", () => {
		const data = makeResume((resume) => (resume.sections.experience.columns = 2));
		expect(codesOf(data)).toContain("MULTI_COLUMN_PROSE_SECTION");
	});

	it("flags a prose section parked in the sidebar", () => {
		const data = makeResume((resume) => {
			resume.metadata.layout.pages = [{ fullWidth: false, main: [], sidebar: ["experience"] }];
		});
		expect(codesOf(data)).toContain("PROSE_SECTION_IN_SIDEBAR");
	});

	it("treats a full-width page's sidebar as the main column", () => {
		const data = makeResume((resume) => {
			resume.metadata.layout.pages = [{ fullWidth: true, main: [], sidebar: ["experience"] }];
		});
		expect(codesOf(data)).not.toContain("PROSE_SECTION_IN_SIDEBAR");
	});

	it("leaves short-list sections in the sidebar alone", () => {
		const data = makeResume((resume) => {
			resume.sections.skills.items = [
				{
					id: "s1",
					hidden: false,
					icon: "",
					iconColor: "",
					name: "Mathematics",
					proficiency: "",
					level: 0,
					keywords: [],
				},
			];
			resume.metadata.layout.pages = [{ fullWidth: false, main: ["experience"], sidebar: ["skills"] }];
		});

		expect(codesOf(data)).not.toContain("PROSE_SECTION_IN_SIDEBAR");
	});
});

describe("title rules", () => {
	it("flags an unconventional heading", () => {
		const data = makeResume((resume) => (resume.sections.experience.title = "Where I've Been"));
		expect(codesOf(data)).toContain("NON_STANDARD_SECTION_TITLE");
	});

	it("accepts a conventional heading regardless of case", () => {
		const data = makeResume((resume) => (resume.sections.experience.title = "Work Experience"));
		expect(codesOf(data)).not.toContain("NON_STANDARD_SECTION_TITLE");
	});

	it("stays quiet on a localized resume", () => {
		const data = makeResume((resume) => {
			resume.sections.experience.title = "Berufserfahrung";
			resume.metadata.page.locale = "de-DE";
		});
		expect(codesOf(data)).not.toContain("NON_STANDARD_SECTION_TITLE");
	});
});

describe("typography rules", () => {
	it("flags a small body font", () => {
		expect(codesOf(makeResume((data) => (data.metadata.typography.body.fontSize = 8)))).toContain("SMALL_BODY_FONT");
	});

	it("flags a tight line height", () => {
		expect(codesOf(makeResume((data) => (data.metadata.typography.body.lineHeight = 1)))).toContain(
			"TIGHT_LINE_HEIGHT",
		);
	});

	it("flags each tight margin axis", () => {
		const data = makeResume((resume) => {
			resume.metadata.page.marginX = 4;
			resume.metadata.page.marginY = 4;
		});

		expect(
			lint(data)
				.findings.filter((item) => item.code === "TIGHT_PAGE_MARGINS")
				.map((item) => item.pointer),
		).toEqual(["/metadata/page/marginX", "/metadata/page/marginY"]);
	});
});

describe("sample resume", () => {
	it("raises no errors on the resume the product ships as its example", () => {
		expect(lint(sampleResumeData).findings.filter((item) => item.severity === "error")).toEqual([]);
	});
});
