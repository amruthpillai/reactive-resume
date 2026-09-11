// @vitest-environment happy-dom

import type { Resume } from "@/features/resume/builder/draft";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { SectionDropdownMenu } from "./section-menu";

const mocks = vi.hoisted(() => ({
	updateResumeData: vi.fn(),
	toastAdd: vi.fn(),
	resume: { value: {} as Resume },
}));

vi.mock("@/features/resume/builder/draft", () => ({
	useCurrentResume: () => mocks.resume.value,
	useUpdateResumeData: () => mocks.updateResumeData,
}));

vi.mock("@reactive-resume/ui/components/toast", () => ({
	toast: { add: mocks.toastAdd },
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
	mocks.updateResumeData.mockClear();
	mocks.toastAdd.mockClear();
	mocks.resume.value = {
		isLocked: false,
		data: {
			metadata: { page: { locale: "en-US" } },
			sections: {
				skills: {
					title: "Skills",
					columns: 2,
					hidden: false,
					layout: "default",
					items: [],
				},
				experience: {
					title: "Experience",
					columns: 1,
					hidden: false,
					items: [
						{ id: "unknown", company: "Mystery Co", period: "Recently" },
						{ id: "older", company: "Older Co", period: "2018 - 2020" },
						{ id: "current", company: "Current Co", period: "2023 - Present" },
					],
				},
				education: {
					title: "Education",
					columns: 1,
					hidden: false,
					items: [
						{ id: "earlier", school: "Earlier School", period: "2016 - 2020" },
						{ id: "later", school: "Later School", period: "2020 - 2024" },
					],
				},
			},
		},
	} as unknown as Resume;
});

function openSectionOptions() {
	fireEvent.click(screen.getByRole("button", { name: "Section options" }));
	return screen.findByRole("menu");
}

describe("SkillsSectionDropdownMenu", () => {
	it("selects keyword bullets without changing item layout or columns", async () => {
		render(
			<I18nProvider i18n={i18n}>
				<SectionDropdownMenu type="skills" />
			</I18nProvider>,
		);
		screen.getByRole("button", { name: "Section options" }).click();
		(await screen.findByRole("menuitem", { name: "Keyword layout" })).click();
		(await screen.findByRole("menuitemradio", { name: "Bulleted list" })).click();
		const draft = { sections: { skills: { layout: "default", columns: 2, keywordLayout: "inline", items: [] } } };
		mocks.updateResumeData.mock.calls[0][0](draft);
		expect(draft.sections.skills).toEqual({ layout: "default", columns: 2, keywordLayout: "list", items: [] });
	});

	it("updates resume data correctly when selecting 'inline' for skills section", async () => {
		render(
			<I18nProvider i18n={i18n}>
				<SectionDropdownMenu type="skills" />
			</I18nProvider>,
		);

		await openSectionOptions();

		(await screen.findByRole("menuitem", { name: /columns/i })).click();

		(await screen.findByRole("menuitemradio", { name: /inline/i })).click();

		expect(mocks.updateResumeData).toHaveBeenCalledTimes(1);
		expect(mocks.updateResumeData).toHaveBeenCalledWith(expect.any(Function));

		const mutation = mocks.updateResumeData.mock.calls[0][0];
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

		await openSectionOptions();

		(await screen.findByRole("menuitem", { name: /columns/i })).click();

		(await screen.findByRole("menuitemradio", { name: /3 columns/i })).click();

		expect(mocks.updateResumeData).toHaveBeenCalledTimes(1);
		expect(mocks.updateResumeData).toHaveBeenCalledWith(expect.any(Function));

		const mutation = mocks.updateResumeData.mock.calls[0][0];
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

describe("heading visibility", () => {
	it("toggles heading visibility without changing section visibility", async () => {
		render(
			<I18nProvider i18n={i18n}>
				<SectionDropdownMenu type="experience" />
			</I18nProvider>,
		);

		await openSectionOptions();
		fireEvent.click(await screen.findByRole("menuitem", { name: "Hide heading" }));

		expect(mocks.updateResumeData).toHaveBeenCalledTimes(1);
		const mutation = mocks.updateResumeData.mock.calls[0]?.[0] as (draft: Resume["data"]) => void;
		const draft = structuredClone(mocks.resume.value.data);
		mutation(draft);

		expect(draft.sections.experience.showHeading).toBe(false);
		expect(draft.sections.experience.hidden).toBe(false);
	});
});

describe("chronological section sorting", () => {
	it("sorts Experience once through one draft mutation and names only unresolved items", async () => {
		render(
			<I18nProvider i18n={i18n}>
				<SectionDropdownMenu type="experience" />
			</I18nProvider>,
		);

		await openSectionOptions();
		fireEvent.click(await screen.findByRole("menuitem", { name: "Sort by date" }));

		expect(mocks.updateResumeData).toHaveBeenCalledTimes(1);
		const mutation = mocks.updateResumeData.mock.calls[0]?.[0] as (draft: Resume["data"]) => void;
		const draft = structuredClone(mocks.resume.value.data);
		mutation(draft);

		expect(draft.sections.experience.items.map(({ id }) => id)).toEqual(["current", "older", "unknown"]);
		expect(mocks.toastAdd).toHaveBeenCalledWith({
			type: "warning",
			description: "Could not sort these items; they stayed at the end: Mystery Co.",
		});
	});

	it("sorts Education once without showing an unresolved notice", async () => {
		render(
			<I18nProvider i18n={i18n}>
				<SectionDropdownMenu type="education" />
			</I18nProvider>,
		);

		await openSectionOptions();
		fireEvent.click(await screen.findByRole("menuitem", { name: "Sort by date" }));

		expect(mocks.updateResumeData).toHaveBeenCalledTimes(1);
		const mutation = mocks.updateResumeData.mock.calls[0]?.[0] as (draft: Resume["data"]) => void;
		const draft = structuredClone(mocks.resume.value.data);
		mutation(draft);

		expect(draft.sections.education.items.map(({ id }) => id)).toEqual(["later", "earlier"]);
		expect(mocks.toastAdd).not.toHaveBeenCalled();
	});

	it("disables sorting when the resume is locked", async () => {
		mocks.resume.value = { ...mocks.resume.value, isLocked: true };
		render(
			<I18nProvider i18n={i18n}>
				<SectionDropdownMenu type="experience" />
			</I18nProvider>,
		);

		await openSectionOptions();
		const sortItem = await screen.findByRole("menuitem", { name: "Sort by date" });

		expect(sortItem).toHaveAttribute("aria-disabled", "true");
		fireEvent.keyDown(sortItem, { key: "Escape" });
		expect(mocks.updateResumeData).not.toHaveBeenCalled();
	});

	it("does not offer date sorting for other built-in sections", async () => {
		render(
			<I18nProvider i18n={i18n}>
				<SectionDropdownMenu type="skills" />
			</I18nProvider>,
		);

		await openSectionOptions();

		expect(screen.queryByRole("menuitem", { name: "Sort by date" })).not.toBeInTheDocument();
	});
});
