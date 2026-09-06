import { defaultResumeData } from "@reactive-resume/schema/resume/default";

type SkillKeywordFixtureOptions = {
	keywordLayout?: "inline" | "list";
	layout?: "default" | "inline";
	columns?: number;
	custom?: boolean;
	keywords?: string[];
};

export function createSkillKeywordFixture({
	keywordLayout = "inline",
	layout = "default",
	columns = 1,
	custom = false,
	keywords = ["Alpha", "Beta", "Gamma"],
}: SkillKeywordFixtureOptions = {}) {
	const data = structuredClone(defaultResumeData);
	data.metadata.template = "leafish";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.page.hideIcons = true;
	data.metadata.layout.pages = [{ fullWidth: true, main: [custom ? "custom-skills" : "skills"], sidebar: [] }];
	Object.assign(data.sections.skills, { keywordLayout, layout, columns });
	data.sections.skills.items = [
		{
			id: "skill",
			hidden: false,
			icon: "",
			iconColor: "",
			name: "Engineering",
			proficiency: "Experienced",
			level: 3,
			keywords,
		},
	];
	if (custom) data.customSections = [{ ...data.sections.skills, id: "custom-skills", type: "skills" }];
	return data;
}
