import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { renderBuiltInSection, renderCustomSection } from "./section-renderers";

function fixture() {
	const section = structuredClone(defaultResumeData.sections.skills);
	Object.assign(section, { keywordLayout: "list" });
	section.items = [
		{
			id: "one",
			hidden: false,
			name: "Engineering",
			proficiency: "Expert",
			level: 3,
			icon: "",
			iconColor: "",
			keywords: ["Alpha", "Beta", "Gamma"],
		},
	];
	return section;
}

describe("skill keyword lists", () => {
	it.each([false, true])("emits real bullet paragraphs for custom=%s", (custom) => {
		const section = fixture();
		const paragraphs = custom
			? renderCustomSection({ ...section, id: "custom", type: "skills" }, "000000")
			: renderBuiltInSection("skills", section, "000000");
		const xml = JSON.stringify(paragraphs.map((paragraph) => paragraph.prepForXml({ stack: [] } as never)));
		expect(xml.match(/w:numPr/g)).toHaveLength(3);
		for (const keyword of ["Alpha", "Beta", "Gamma"]) expect(xml.split(keyword)).toHaveLength(2);
		expect(xml).not.toContain("Alpha, Beta");
	});
});
