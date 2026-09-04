import { describe, expect, it } from "vitest";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";
import { parseResumeText } from "./plain-text";

const SAMPLE = `Ada Lovelace
Senior Software Engineer
Berlin, Germany | ada@example.com | +44 20 7946 0100 | https://ada.dev

SUMMARY
Engineer with 10 years building analytical systems.

WORK EXPERIENCE
Analytical Engines  Senior Engineer  Berlin
Jan 2020 - Present
• Led the difference engine rewrite
• Mentored four junior engineers
Babbage Ltd  Engineer  London
Mar 2016 - Dec 2019
• Built the punch card pipeline

EDUCATION
University of London  BSc Mathematics
2012 - 2016

SKILLS
TypeScript, Rust, PostgreSQL

LANGUAGES
English (Native)
German (B2)

CERTIFICATIONS
AWS Solutions Architect  Amazon  2021
`;

describe("parseResumeText", () => {
	const data = parseResumeText(SAMPLE);

	it("always returns schema-valid resume data", () => {
		expect(() => resumeDataSchema.parse(data)).not.toThrow();
	});

	it("reads the contact block", () => {
		expect(data.basics).toMatchObject({
			name: "Ada Lovelace",
			headline: "Senior Software Engineer",
			email: "ada@example.com",
			phone: "+44 20 7946 0100",
			location: "Berlin, Germany",
		});
		expect(data.basics.website.url).toBe("https://ada.dev");
	});

	it("reads the summary as rich text", () => {
		expect(data.summary.content).toBe("<p>Engineer with 10 years building analytical systems.</p>");
	});

	it("splits experience into one entry per role", () => {
		expect(data.sections.experience.items).toHaveLength(2);
		expect(data.sections.experience.items[0]).toMatchObject({
			company: "Analytical Engines",
			position: "Senior Engineer",
			location: "Berlin",
			period: "Jan 2020 - Present",
		});
		expect(data.sections.experience.items[1]).toMatchObject({
			company: "Babbage Ltd",
			position: "Engineer",
			period: "Mar 2016 - Dec 2019",
		});
	});

	it("keeps bullets as a list in the description", () => {
		expect(data.sections.experience.items[0]?.description).toBe(
			"<ul><li>Led the difference engine rewrite</li><li>Mentored four junior engineers</li></ul>",
		);
	});

	it("reads education", () => {
		expect(data.sections.education.items[0]).toMatchObject({
			school: "University of London",
			degree: "BSc Mathematics",
			period: "2012 - 2016",
		});
	});

	it("splits a comma separated skills line", () => {
		expect(data.sections.skills.items.map((item) => item.name)).toEqual(["TypeScript", "Rust", "PostgreSQL"]);
	});

	it("splits a language from its fluency", () => {
		expect(data.sections.languages.items).toMatchObject([
			{ language: "English", fluency: "Native" },
			{ language: "German", fluency: "B2" },
		]);
	});

	it("reads a trailing year as the certification date", () => {
		expect(data.sections.certifications.items[0]).toMatchObject({
			title: "AWS Solutions Architect",
			issuer: "Amazon",
			date: "2021",
		});
	});

	it("places every populated section on the page in document order", () => {
		expect(data.metadata.layout.pages[0]?.main).toEqual([
			"summary",
			"experience",
			"education",
			"skills",
			"languages",
			"certifications",
		]);
	});
});

describe("parseResumeText edge cases", () => {
	it("returns usable data for empty input", () => {
		const data = parseResumeText("");
		expect(() => resumeDataSchema.parse(data)).not.toThrow();
		expect(data.basics.name).toBe("");
		expect(data.metadata.layout.pages[0]?.main).toEqual([]);
	});

	it("does not mistake a date range for a phone number", () => {
		const data = parseResumeText("Ada Lovelace\nBerlin\n2016 - 2019\n");
		expect(data.basics.phone).toBe("");
	});

	it("keeps an unrecognized heading as a custom section", () => {
		const data = parseResumeText("Ada\n\nSKILLS\nRust\n\nSPEAKING\nGave a talk at a conference\n");
		expect(data.customSections).toHaveLength(1);
		expect(data.customSections[0]).toMatchObject({ type: "summary", title: "SPEAKING" });
		expect(data.metadata.layout.pages[0]?.main).toContain(data.customSections[0]?.id);
	});

	it("keeps unclassified header parts in the description rather than dropping them", () => {
		const data = parseResumeText("EXPERIENCE\nAcme  Engineer  Berlin  Remote  Contract\n2020 - 2022\n");
		expect(data.sections.experience.items[0]?.description).toContain("Remote");
		expect(data.sections.experience.items[0]?.description).toContain("Contract");
	});

	it("escapes markup found in the source text", () => {
		const data = parseResumeText("SUMMARY\nI write <script>alert(1)</script> safely\n");
		expect(data.summary.content).toContain("&lt;script&gt;");
		expect(data.summary.content).not.toContain("<script>");
	});

	it("treats a heading with a trailing colon as a heading", () => {
		const data = parseResumeText("Ada\n\nSkills:\nRust, Go\n");
		expect(data.sections.skills.items.map((item) => item.name)).toEqual(["Rust", "Go"]);
	});
});

describe("parseResumeText review findings", () => {
	it("keeps a section whose heading is the first one in the document", () => {
		const data = parseResumeText(
			"Ada Lovelace\nada@example.com\n\nCAREER HIGHLIGHTS\nShipped the difference engine\nMentored the team\n",
		);

		expect(data.customSections).toHaveLength(1);
		expect(data.customSections[0]).toMatchObject({ title: "CAREER HIGHLIGHTS" });
		expect(JSON.stringify(data)).toContain("Shipped the difference engine");
	});

	it("keeps one entry when company, position and dates sit on separate lines", () => {
		const data = parseResumeText(
			"EXPERIENCE\nAnalytical Engines\nSenior Engineer\nJan 2020 - Present\n• Led the rewrite\n",
		);

		expect(data.sections.experience.items).toHaveLength(1);
		expect(data.sections.experience.items[0]).toMatchObject({
			company: "Analytical Engines",
			position: "Senior Engineer",
			period: "Jan 2020 - Present",
		});
	});

	it("does not turn an uppercase company name into a section heading", () => {
		const data = parseResumeText("EXPERIENCE\nACME CORPORATION\nJan 2020 - Present\n• Did the work\n");

		expect(data.customSections).toHaveLength(0);
		expect(data.sections.experience.items[0]).toMatchObject({ company: "ACME CORPORATION" });
	});

	it("escapes single quotes in extracted text", () => {
		const data = parseResumeText("SUMMARY\nIt's a resume\n");
		expect(data.summary.content).toContain("&#39;");
	});
});
