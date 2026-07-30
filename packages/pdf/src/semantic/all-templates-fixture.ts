import type { Template } from "@reactive-resume/schema/templates";
import { createSampleResumeData } from "@reactive-resume/schema/resume/sample";

export const comprehensiveStylesheet = {
	languageVersion: 1,
	text: `@version 1;
:root { --accent: var(--resume-primary-color); }
header > name { color: var(--accent); }
section:is([type="experience"], [type="education"]) > section-heading { text-transform: uppercase; }
section[id="projects"] > section-items > item { padding: 6pt; }
section[id="experience"] item[id="experience-item-2"] field[name="period"] { color: var(--accent); }
rich-text list-item > list-item-content { line-height: 1.25; }
region[placement="sidebar"] section { background-color: rgba(0, 0, 0, 0.04); }
section[type="projects"] { break-inside: avoid; -resume-min-presence-ahead: 24pt; }
@media (max-width: 600pt) { region[placement="sidebar"] section-heading { font-size: 9pt; } }
resume[template="azurill"] template-part[name="timeline-dot"] { background-color: var(--accent); }
`,
} as const;

export const buildAllTemplatesFixture = (template: Template) => {
	const data = structuredClone(createSampleResumeData("Semantic CSS Acceptance"));
	data.summary.content = [
		"<h1>Heading</h1>",
		"<blockquote><p>Quote</p></blockquote>",
		"<p><strong>Strong</strong> <em>Emphasis</em> <u>Underline</u> <s>Strike</s> <code>Code</code>",
		'<span style="color: #ff0000">Span</span> <mark data-color="#ffff00">Mark</mark><br>Break</p>',
		"<ul><li>Unordered</li></ul><ol><li>Ordered</li></ol><hr>",
	].join("");
	const firstExperience = data.sections.experience.items[0];
	if (!firstExperience) throw new Error("The comprehensive fixture requires an experience item.");
	firstExperience.roles = [
		{
			id: "experience-role-1",
			position: "Technical Lead",
			period: "2024",
			description: "<p>Led the semantic migration.</p>",
		},
	];
	data.sections.experience.items.push({
		...structuredClone(firstExperience),
		id: "experience-item-2",
		company: "Semantic Systems",
		roles: [],
	});
	const reference = data.sections.references.items[0];
	if (!reference) throw new Error("The comprehensive fixture requires a reference item.");
	reference.position = "Engineering Director";
	reference.phone = "+1 555 0100";
	reference.description = "<p>Available for a reference.</p>";
	for (const certification of data.sections.certifications.items) {
		certification.description = "<p>Verified certification.</p>";
	}
	data.metadata.template = template;
	data.metadata.stylesheet = {
		mode: "semantic",
		source: comprehensiveStylesheet,
		applied: comprehensiveStylesheet,
	};
	return data;
};
