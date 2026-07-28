import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";

type HostNode = {
	type: string;
	value?: string;
	children?: HostNode[];
};

const textValues = (node: HostNode): string[] => [
	...(node.type === "TEXT_INSTANCE" && node.value ? [node.value] : []),
	...(node.children ?? []).flatMap((child) => textValues(child)),
];

const renderTextValues = async (data: ResumeData, template: Template): Promise<string[]> => {
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();
	return textValues(instance.container.document as HostNode);
};

const semanticFixture = (rule: string): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics = {
		name: "Ada Lovelace",
		headline: "",
		email: "",
		phone: "",
		location: "",
		website: { url: "", label: "" },
		customFields: [],
	};
	const stylesheet = { languageVersion: 1, text: `@rr-version 1; ${rule}` };
	data.metadata.stylesheet = { mode: "semantic", source: stylesheet, applied: stylesheet };
	return data;
};

const expectBefore = (values: readonly string[], first: string, second: string) => {
	expect(values.indexOf(first), `${first} before ${second}`).toBeLessThan(values.indexOf(second));
};

describe("semantic sibling ordering reaches final PDF output", () => {
	it("projects contact-list hide and order onto existing contact siblings", async () => {
		const data = semanticFixture(`
			contact-item[name="location"] { display: none; }
			contact-item[name="phone"] { order: -1; }
		`);
		data.basics.email = "ada@example.com";
		data.basics.phone = "+44 123";
		data.basics.location = "London";
		data.metadata.layout.pages = [{ fullWidth: true, main: [], sidebar: [] }];

		const values = await renderTextValues(data, "onyx");

		expectBefore(values, "+44 123", "ada@example.com");
		expect(values).not.toContain("London");
	});

	it("projects nested-role hide and order through their item owner", async () => {
		const data = semanticFixture(`
			item[id="role-2"] { display: none; }
			item[id="role-3"] { order: -1; }
		`);
		data.sections.experience.items = [
			{
				id: "experience-1",
				hidden: false,
				company: "Analytical Engines",
				position: "",
				location: "",
				period: "",
				website: { url: "", label: "", inlineLink: false },
				description: "",
				roles: [
					{ id: "role-1", position: "First role", period: "", description: "" },
					{ id: "role-2", position: "Hidden role", period: "", description: "" },
					{ id: "role-3", position: "Last role", period: "", description: "" },
				],
			},
		];
		data.metadata.layout.pages = [{ fullWidth: true, main: ["experience"], sidebar: [] }];

		const values = await renderTextValues(data, "onyx");

		expectBefore(values, "Last role", "First role");
		expect(values).not.toContain("Hidden role");
	});

	it("projects hide and order across Meowth's existing inline-header part siblings", async () => {
		const data = semanticFixture(`
			template-part[name="inline-item-header-leading"] { display: none; }
			template-part[name="inline-item-header-trailing"] { order: -1; }
		`);
		data.sections.experience.items = [
			{
				id: "experience-1",
				hidden: false,
				company: "Analytical Engines",
				position: "Engineer",
				location: "London",
				period: "1842",
				website: { url: "", label: "", inlineLink: false },
				description: "",
				roles: [],
			},
		];
		data.metadata.layout.pages = [{ fullWidth: true, main: ["experience"], sidebar: [] }];

		const values = await renderTextValues(data, "meowth");

		expectBefore(values, "1842", "Analytical Engines");
		expect(values).not.toContain("Engineer");
		expect(values).not.toContain("London");
	});

	it("projects rich-text descendant hide and order before renderer mapping", async () => {
		const data = semanticFixture(`
			rich-text > list { display: none; }
			paragraph > underline { order: -1; }
		`);
		data.summary.content = "<ul><li>Hidden run</li></ul><p><strong>First run</strong><u>Last run</u></p>";
		data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];

		const values = await renderTextValues(data, "onyx");

		expectBefore(values, "Last run", "First run");
		expect(values).not.toContain("Hidden run");
	});
});
