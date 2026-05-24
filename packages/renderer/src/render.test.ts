import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { render } from "./render";

const minimalFiles: Record<string, string> = {
	"index.html": `<!DOCTYPE html>
<html>
<head>{{ metadata.css | safe }}</head>
<body>
<h1>{{ basics.name }}</h1>
{% for page in metadata.layout.pages %}
  {% for sectionId in page.main %}
    {% include "sections/" + sectionId + ".html" ignore missing %}
  {% endfor %}
{% endfor %}
</body>
</html>`,
	"sections/experience.html": `<section>
<h2>{{ sections.experience.title }}</h2>
  {% for item in sections.experience.items | selectVisible %}
<div class="exp">
  <strong>{{ item.company }}</strong>
  {{ item.description | richText }}
  {% if item.extensions.additionalHtml %}{{ item.extensions.additionalHtml | richText }}{% endif %}
  <resume-slot id="additionalHtml" item-type="experienceItem" type="rich-text" label="Additional section" />
</div>
{% endfor %}
</section>`,
	"sections/skills.html": `{% set section = sectionById[sectionId] %}
<section>
<h2>{{ section.title }}</h2>
{% for item in section.items | selectVisible %}
<div class="skill">{{ item.name }}</div>
{% endfor %}
</section>`,
};

const minimalMetadata: TemplateMetadata = {
	id: "test",
	name: "Test",
	sidebarPosition: "none",
	tags: [],
	fonts: [],
	typography: [],
};

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

const loadAzurillTemplate = (): { files: Record<string, string>; metadata: TemplateMetadata } => {
	const templatesDir = join(repoRoot, "packages/pdf/src/templates");
	const sharedHtmlDir = join(templatesDir, "shared-html");
	const azurillHtmlDir = join(templatesDir, "azurill/html");
	const files: Record<string, string> = {
		"macros.html": readFileSync(join(sharedHtmlDir, "macros.html"), "utf-8"),
	};

	for (const file of readdirSync(join(sharedHtmlDir, "sections"))) {
		files[`sections/${file}`] = readFileSync(join(sharedHtmlDir, "sections", file), "utf-8");
	}

	files["index.html"] = readFileSync(join(azurillHtmlDir, "index.html"), "utf-8");

	for (const file of readdirSync(join(azurillHtmlDir, "sections"))) {
		files[`sections/${file}`] = readFileSync(join(azurillHtmlDir, "sections", file), "utf-8");
	}

	const metadata = JSON.parse(readFileSync(join(azurillHtmlDir, "template.json"), "utf-8")) as TemplateMetadata;

	return { files, metadata };
};

const makeData = (): ResumeData =>
	({
		basics: {
			name: "Khaled AbuShqear",
			headline: "Infrastructure Engineer",
			email: "q@example.com",
			phone: "",
			location: "",
			website: { url: "", label: "" },
			customFields: [],
		},
		picture: {
			hidden: true,
			url: "",
			size: 64,
			rotation: 0,
			aspectRatio: 1,
			borderRadius: 0,
			borderColor: "rgba(0,0,0,0)",
			borderWidth: 0,
			shadowColor: "rgba(0,0,0,0)",
			shadowWidth: 0,
		},
		summary: { title: "", columns: 1, hidden: false, content: "" },
		sections: {
			experience: {
				title: "Experience",
				columns: 1,
				hidden: false,
				items: [
					{
						id: "exp-1",
						hidden: false,
						company: "Careem",
						position: "Infrastructure Engineer",
						location: "Dubai",
						period: "Feb 2023 – Present",
						website: { url: "", label: "", inlineLink: false },
						description: "<p>Built platform infrastructure.</p>",
						roles: [],
						extensions: { additionalHtml: "<p>Extra content.</p>" },
					},
					{
						id: "exp-2",
						hidden: true,
						company: "Hidden Corp",
						position: "Engineer",
						location: "",
						period: "",
						website: { url: "", label: "", inlineLink: false },
						description: "",
						roles: [],
						extensions: {},
					},
				],
			},
			skills: {
				title: "Skills",
				columns: 1,
				hidden: false,
				items: [
					{
						id: "skill-1",
						hidden: false,
						name: "TypeScript",
						proficiency: "Advanced",
						level: 4,
						keywords: [],
						icon: "",
						iconColor: "",
						extensions: {},
					},
					{
						id: "skill-2",
						hidden: false,
						name: "Rust",
						proficiency: "Intermediate",
						level: 3,
						keywords: [],
						icon: "",
						iconColor: "",
						extensions: {},
					},
				],
			},
		},
		customSections: [],
		metadata: {
			template: "test",
			layout: { pages: [{ main: ["experience"], sidebar: [], fullWidth: false }], sidebarWidth: 35 },
			page: { format: "a4", gapX: 4, gapY: 6, marginX: 14, marginY: 12, locale: "en-US", hideIcons: false },
			design: {
				colors: { primary: "rgba(220,38,38,1)", text: "rgba(0,0,0,1)", background: "rgba(255,255,255,1)" },
				level: { icon: "", type: "circle" },
			},
			typography: {
				body: { fontFamily: "IBM Plex Serif", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 },
				heading: { fontFamily: "IBM Plex Serif", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 },
				slots: {},
			},
			notes: "",
		},
	}) as unknown as ResumeData;

describe("render", () => {
	it("outputs basics.name in the HTML", () => {
		const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
		expect(html).toContain("Khaled AbuShqear");
	});

	it("strips <resume-slot> tags from output", () => {
		const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
		expect(html).not.toContain("<resume-slot");
	});

	it("injects CSS custom properties block", () => {
		const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
		expect(html).toContain("--resume-primary");
		expect(html).toContain("--resume-sidebar-width");
	});

	it("renders HTML description fields through the richText filter", () => {
		const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
		expect(html).toContain("<p>Built platform infrastructure.</p>");
	});

	it("renders extension values through the richText filter", () => {
		const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
		expect(html).toContain("<p>Extra content.</p>");
		expect(html).toContain("<p>Built platform infrastructure.</p>");
	});

	it("normalizes inline-only rich text through the richText filter", () => {
		const data = makeData();
		data.sections.experience.items[0].description = "Intro <strong>text</strong>";
		data.sections.experience.items[0].extensions.additionalHtml = "before <em>after</em>";

		const html = render(minimalFiles, data, minimalMetadata, "test", "http://localhost:3001");

		expect(html).toContain("<p>Intro <strong>text</strong></p>");
		expect(html).toContain("<p>before <em>after</em></p>");
	});

	it("filters hidden items via selectVisible", () => {
		const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
		expect(html).not.toContain("Hidden Corp");
		expect(html).toContain("Careem");
	});

	it("dispatches sections via layout pages", () => {
		const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
		expect(html).toContain("Careem");
	});

	it("provides sectionById for shared section partials", () => {
		const files = {
			...minimalFiles,
			"index.html": `<!DOCTYPE html>
<html>
<head>{{ metadata.css | safe }}</head>
<body>
{% for page in metadata.layout.pages %}
  {% for sectionId in page.main %}
    {% include "sections/" + sectionId + ".html" ignore missing %}
  {% endfor %}
{% endfor %}
</body>
</html>`,
		};
		const data = makeData();
		data.metadata.layout.pages = [{ main: ["skills"], sidebar: [], fullWidth: true }];

		const html = render(files, data, minimalMetadata, "test", "http://localhost:3001");

		expect(html).toContain("Skills");
		expect(html).toContain("TypeScript");
	});

	it("renders all visible items when shared partials filter section items", () => {
		const files = {
			...minimalFiles,
			"sections/skills.html": `{% set section = sectionById[sectionId] %}
{% set items = section.items | selectVisible %}
<section>
{% for item in items %}
<div class="skill">{{ item.name }}</div>
{% endfor %}
</section>`,
		};
		const data = makeData();
		data.metadata.layout.pages = [{ main: ["skills"], sidebar: [], fullWidth: true }];

		const html = render(files, data, minimalMetadata, "test", "http://localhost:3001");

		expect(html).toContain("TypeScript");
		expect(html).toContain("Rust");
	});

	it("resolves default section titles when the stored title is empty", () => {
		const files = {
			...minimalFiles,
			"sections/skills.html": `{% set section = sectionById[sectionId] %}
<section>
<h2>{{ getSectionTitle(sectionId, section.title) }}</h2>
</section>`,
		};
		const data = makeData();
		data.sections.skills.title = "";
		data.metadata.layout.pages = [{ main: ["skills"], sidebar: [], fullWidth: true }];

		const html = render(files, data, minimalMetadata, "test", "http://localhost:3001");

		expect(html).toContain("Skills");
	});

	it("renders Azurill with body-bold profile titles and matching font faces", () => {
		const { files, metadata } = loadAzurillTemplate();
		const html = render(files, sampleResumeData, metadata, "azurill", "http://localhost:3000");

		expect(html).toContain("--resume-weight-body-bold: 600");
		expect(html).toContain('font-family: "IBM Plex Serif"');
		expect(html).toContain("font-weight: 600");
		expect(html).toContain('<strong class="item-title">GitHub</strong>');
		expect(html).toContain('<strong class="item-title">LinkedIn</strong>');
		expect(html).toContain("a.contact-item {");
		expect(html).toContain("text-decoration: underline;");
		expect(html).toContain('class="contact-item-text"');
		expect(html).toContain(".section-items.section-items-single::before");
		expect(html).toContain(".rich-text a { text-decoration: underline; color: inherit; }");
		expect(html).toContain("David Kowalski");
		expect(html).toContain("Summary");
	});

	it("renders custom cover-letter sections from the shared HTML dispatcher", () => {
		const { files, metadata } = loadAzurillTemplate();
		const html = render(files, sampleResumeData, metadata, "azurill", "http://localhost:3000");

		expect(html).toContain("Hiring Manager");
		expect(html).toContain("Sunrise Games Studio");
		expect(html).toContain("Dear Hiring Manager,");
		expect(html).toContain("Sincerely,");
		expect(html).toContain("cover-letter-section");
	});
});
