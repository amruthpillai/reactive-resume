// @vitest-environment happy-dom
import { render, screen, within } from "@testing-library/react";
import { beforeAll, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeAccessibleText } from "./resume-accessible-text";

vi.mock("@/features/resume/builder/draft", () => ({ useResumeData: () => undefined }));
beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));
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
