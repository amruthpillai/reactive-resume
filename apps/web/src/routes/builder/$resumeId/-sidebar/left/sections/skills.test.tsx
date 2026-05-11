// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

const sectionItems = vi.hoisted(() => [
	{ id: "s1", name: "TypeScript", proficiency: "Expert", level: 5, keywords: [], description: "", hidden: false },
	{ id: "s2", name: "Go", proficiency: "Intermediate", level: 3, keywords: [], description: "", hidden: false },
]);

vi.mock("@/components/resume/builder-resume-draft", () => ({
	useCurrentResume: () => ({
		data: { sections: { skills: { title: "Skills", columns: 1, hidden: false, items: sectionItems } } },
	}),
	useUpdateResumeData: () => vi.fn(),
}));
vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className} data-testid="section-base">
			{children}
		</div>
	),
}));
vi.mock("../shared/section-item", () => ({
	SectionAddItemButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
	SectionItem: ({ title, subtitle }: { title: string; subtitle: string }) => (
		<div>
			<span data-testid="item-title">{title}</span>
			<span data-testid="item-subtitle">{subtitle}</span>
		</div>
	),
}));

const { SkillsSectionBuilder } = await import("./skills");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("SkillsSectionBuilder", () => {
	it("renders one SectionItem per skill, mapping name → title and proficiency → subtitle", () => {
		render(
			<I18nProvider i18n={i18n}>
				<SkillsSectionBuilder />
			</I18nProvider>,
		);

		expect(screen.getAllByTestId("item-title").map((el) => el.textContent)).toEqual(["TypeScript", "Go"]);
		expect(screen.getAllByTestId("item-subtitle").map((el) => el.textContent)).toEqual(["Expert", "Intermediate"]);
	});

	it("renders an Add a new skill affordance", () => {
		render(
			<I18nProvider i18n={i18n}>
				<SkillsSectionBuilder />
			</I18nProvider>,
		);
		expect(screen.getByRole("button", { name: "Add a new skill" })).toBeInTheDocument();
	});
});
