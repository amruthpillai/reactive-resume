// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

const updateResumeData = vi.hoisted(() => vi.fn());
const richInputProps = vi.hoisted(() => ({
	value: undefined as string | undefined,
	onChange: undefined as ((value: string) => void) | undefined,
}));

vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: { children: React.ReactNode }) => <div data-testid="section-base">{children}</div>,
}));
vi.mock("@/components/input/rich-input", () => ({
	RichInput: (props: { value: string; onChange: (value: string) => void }) => {
		richInputProps.value = props.value;
		richInputProps.onChange = props.onChange;
		return <textarea data-testid="rich-input" value={props.value} readOnly />;
	},
}));
vi.mock("@/components/resume/builder-resume-draft", () => ({
	useCurrentResume: () => ({
		data: { metadata: { notes: "saved notes" } },
	}),
	useUpdateResumeData: () => updateResumeData,
}));

const { NotesSectionBuilder } = await import("./notes");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("NotesSectionBuilder", () => {
	it("renders the privacy hint copy", () => {
		render(
			<I18nProvider i18n={i18n}>
				<NotesSectionBuilder />
			</I18nProvider>,
		);

		expect(screen.getByText(/personal notes specific to this resume/)).toBeInTheDocument();
	});

	it("seeds the rich input with the current notes value", () => {
		render(
			<I18nProvider i18n={i18n}>
				<NotesSectionBuilder />
			</I18nProvider>,
		);
		expect(richInputProps.value).toBe("saved notes");
	});

	it("forwards rich input changes through updateResumeData", () => {
		render(
			<I18nProvider i18n={i18n}>
				<NotesSectionBuilder />
			</I18nProvider>,
		);

		richInputProps.onChange?.("<p>new note</p>");

		expect(updateResumeData).toHaveBeenCalledTimes(1);

		// updateResumeData receives a recipe that mutates the draft.
		const recipe = updateResumeData.mock.calls[0]?.[0] as (draft: { metadata: { notes: string } }) => void;
		const draft = { metadata: { notes: "" } };
		recipe(draft);
		expect(draft.metadata.notes).toBe("<p>new note</p>");
	});
});
