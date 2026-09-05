// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { BasicsSectionBuilder } from "./basics";
import { PictureSectionBuilder } from "./picture";

const state = vi.hoisted(() => ({ data: {} as ResumeData, update: vi.fn() }));

vi.mock("@/features/resume/builder/draft", () => ({
	useCurrentBuilderResumeSelector: (selector: (resume: { data: ResumeData }) => unknown) => selector(state),
	useUpdateResumeData: () => state.update,
}));

vi.mock("@/libs/tanstack-form", async () => {
	const { useForm } = await import("@tanstack/react-form");
	return { useAppForm: useForm };
});

vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		storage: {
			uploadFile: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
			deleteFile: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
		},
	},
}));

vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./custom-fields", () => ({ CustomFieldsSection: () => null }));
vi.mock("@/components/input/color-picker", () => ({ ColorPicker: () => null }));

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	state.data = structuredClone(defaultResumeData);
	state.update.mockReset();
	state.update.mockImplementation((update: (draft: ResumeData) => void) => update(state.data));
});

function renderSection(children: ReactNode) {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<I18nProvider i18n={i18n}>{children}</I18nProvider>
		</QueryClientProvider>,
	);
}

describe("builder field labels", () => {
	it("names and focuses the Website input while preserving URL edits", async () => {
		const user = userEvent.setup();
		renderSection(<BasicsSectionBuilder />);

		const input = screen.getByRole("textbox", { name: "Website" });
		expect(screen.getByLabelText("Website")).toBe(input);
		await user.click(screen.getByText("Website", { selector: "label" }));
		expect(input).toHaveFocus();

		fireEvent.change(input, { target: { value: "example.com/profile" } });
		await waitFor(() => expect(state.data.basics.website.url).toBe("https://example.com/profile"));
	});

	it("names and focuses Picture Size while preserving numeric edits", async () => {
		const user = userEvent.setup();
		renderSection(<PictureSectionBuilder />);

		const input = screen.getByRole("spinbutton", { name: "Size" });
		expect(screen.getByLabelText("Size")).toBe(input);
		await user.click(screen.getByText("Size", { selector: "label" }));
		expect(input).toHaveFocus();

		fireEvent.change(input, { target: { value: "144" } });
		await waitFor(() => expect(state.data.picture.size).toBe(144));
	});
});
