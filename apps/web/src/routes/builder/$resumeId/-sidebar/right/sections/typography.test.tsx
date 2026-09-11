// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const state = vi.hoisted(() => ({ data: {} as ResumeData, update: vi.fn() }));

type SectionBaseProps = { children: ReactNode };

vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: SectionBaseProps) => <div>{children}</div>,
}));
vi.mock("@/components/typography/combobox", () => ({
	FontFamilyCombobox: () => null,
	FontWeightCombobox: () => null,
}));
vi.mock("@/features/resume/builder/draft", () => ({
	useResume: () => ({ data: state.data }),
	useUpdateResumeData: () => state.update,
}));

const { TypographySectionBuilder } = await import("./typography");

function Typography() {
	return (
		<I18nProvider i18n={i18n}>
			<TypographySectionBuilder />
		</I18nProvider>
	);
}

beforeEach(() => {
	i18n.loadAndActivate({ locale: "en-US", messages: {} });
	state.data = structuredClone(defaultResumeData);
	state.data.metadata.page.locale = "de-DE";
	state.update.mockReset().mockImplementation((recipe: (draft: ResumeData) => void) => {
		const next = structuredClone(state.data);
		recipe(next);
		state.data = next;
	});
});

describe("Typography hyphenation", () => {
	it("keeps legacy missing preferences absent when another font setting changes", () => {
		render(<Typography />);
		fireEvent.change(screen.getByDisplayValue("10"), { target: { value: "12" } });
		expect(state.data.metadata.typography.body.fontSize).toBe(12);
		expect(state.data.metadata.typography).not.toHaveProperty("hyphenation");
	});

	it.each([undefined, false])("keeps %s preferences off without saving on mount", (preference) => {
		state.data.metadata.typography.hyphenation = preference;
		render(<Typography />);

		const toggle = screen.getByRole("switch", { name: "Hyphenation" });
		expect(toggle).not.toBeChecked();
		expect(toggle).toHaveAccessibleDescription(
			"Currently available for German resumes. Uses the language set in Page.",
		);
		expect(state.update).not.toHaveBeenCalled();
	});

	it("saves opt-in and opt-out while preserving font settings and the resume language", () => {
		const before = structuredClone(state.data.metadata);
		const view = render(<Typography />);
		fireEvent.click(screen.getByText("Hyphenation"));
		expect(state.data.metadata.typography.hyphenation).toBe(true);
		expect(screen.getByRole("switch", { name: "Hyphenation" })).toBeChecked();

		view.unmount();
		render(<Typography />);
		expect(screen.getByRole("switch", { name: "Hyphenation" })).toBeChecked();
		fireEvent.click(screen.getByRole("switch", { name: "Hyphenation" }));
		expect(state.data.metadata.typography).toEqual({ ...before.typography, hyphenation: false });
		expect(state.data.metadata.page).toEqual(before.page);
	});

	it("retains the saved preference when the resume language changes", () => {
		state.data.metadata.typography.hyphenation = true;
		const view = render(<Typography />);
		state.data = structuredClone(state.data);
		state.data.metadata.page.locale = "en-US";
		view.rerender(<Typography />);

		expect(screen.getByRole("switch", { name: "Hyphenation" })).toBeChecked();
		expect(state.update).not.toHaveBeenCalled();
		fireEvent.change(screen.getByDisplayValue("10"), { target: { value: "12" } });
		expect(state.data.metadata.typography.hyphenation).toBe(true);
		expect(state.data.metadata.page.locale).toBe("en-US");
	});
});
