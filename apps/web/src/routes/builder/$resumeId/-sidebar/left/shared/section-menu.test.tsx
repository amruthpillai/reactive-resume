// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { SectionDropdownMenu } from "./section-menu";

const mockUpdateResumeData = vi.fn();

vi.mock("@/features/resume/builder/draft", () => ({
	useCurrentResume: () => ({
		data: {
			sections: {
				skills: {
					title: "Skills",
					columns: 2,
					hidden: false,
					layout: "default",
					items: [],
				},
			},
		},
	}),
	useUpdateResumeData: () => mockUpdateResumeData,
}));

vi.mock("@/hooks/use-confirm", () => ({
	useConfirm: () => vi.fn(),
}));

vi.mock("@/hooks/use-prompt", () => ({
	usePrompt: () => vi.fn(),
}));

vi.mock("@/dialogs/store", () => ({
	useDialogStore: () => ({
		openDialog: vi.fn(),
	}),
}));

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	mockUpdateResumeData.mockClear();
});

describe("SkillsSectionDropdownMenu", () => {
	it("updates resume data correctly when selecting 'inline' for skills section", async () => {
		render(
			<I18nProvider i18n={i18n}>
				<SectionDropdownMenu type="skills" />
			</I18nProvider>,
		);

		screen.getByRole("button", { name: "Section options" }).click();

		(await screen.findByRole("menuitem", { name: /columns/i })).click();

		(await screen.findByRole("menuitemradio", { name: /inline/i })).click();

		expect(mockUpdateResumeData).toHaveBeenCalledTimes(1);
		expect(mockUpdateResumeData).toHaveBeenCalledWith(expect.any(Function));

		const mutation = mockUpdateResumeData.mock.calls[0][0];
		const mockDraft = {
			sections: {
				skills: {
					title: "Skills",
					columns: 2,
					hidden: false,
					layout: "default",
					items: [],
				},
			},
		};

		mutation(mockDraft);

		expect(mockDraft.sections.skills.layout).toBe("inline");
		expect(mockDraft.sections.skills.columns).toBe(1);
	});

	it("updates resume data correctly when selecting numeric columns for skills section", async () => {
		render(
			<I18nProvider i18n={i18n}>
				<SectionDropdownMenu type="skills" />
			</I18nProvider>,
		);

		screen.getByRole("button", { name: "Section options" }).click();

		(await screen.findByRole("menuitem", { name: /columns/i })).click();

		(await screen.findByRole("menuitemradio", { name: /3 columns/i })).click();

		expect(mockUpdateResumeData).toHaveBeenCalledTimes(1);
		expect(mockUpdateResumeData).toHaveBeenCalledWith(expect.any(Function));

		const mutation = mockUpdateResumeData.mock.calls[0][0];
		const mockDraft = {
			sections: {
				skills: {
					title: "Skills",
					columns: 2,
					hidden: false,
					layout: "default",
					items: [],
				},
			},
		};

		mutation(mockDraft);

		expect(mockDraft.sections.skills.layout).toBe("default");
		expect(mockDraft.sections.skills.columns).toBe(3);
	});
});
