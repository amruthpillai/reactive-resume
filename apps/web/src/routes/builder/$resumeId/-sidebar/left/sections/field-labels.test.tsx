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

const state = vi.hoisted(() => ({ data: {} as ResumeData, update: vi.fn(), uploadFile: vi.fn() }));

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
			uploadFile: { mutationOptions: () => ({ mutationFn: state.uploadFile }) },
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
	state.uploadFile.mockReset();
	state.uploadFile.mockResolvedValue({ url: "/uploads/picture.png" });
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

		await user.type(input, "example.com/profile");
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

	it("persists named fit choices and previews contain without cropping", async () => {
		const user = userEvent.setup();
		renderSection(<PictureSectionBuilder />);

		expect(screen.getByRole("group", { name: "Fit" })).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Contain" }));
		await waitFor(() => expect(state.data.picture.fit).toBe("contain"));

		const file = new File(["full-image"], "full.png", { type: "image/png" });
		await user.upload(screen.getAllByLabelText("Upload picture")[0] as HTMLInputElement, file);

		await waitFor(() => expect(state.uploadFile).toHaveBeenCalledOnce());
		expect(state.uploadFile.mock.calls[0]?.[0]).toBe(file);
		const preview = screen.getByRole("button", { name: "Delete picture" }).querySelector("img");
		expect(preview).toBeInTheDocument();
		expect(getComputedStyle(preview as HTMLImageElement).objectFit).toBe("contain");
		expect(screen.queryByRole("dialog", { name: "Crop picture" })).not.toBeInTheDocument();
	});

	it("keeps cover uploads in cancelable crop flow", async () => {
		const user = userEvent.setup();
		renderSection(<PictureSectionBuilder />);

		const file = new File(["crop-image"], "crop.png", { type: "image/png" });
		await user.upload(screen.getAllByLabelText("Upload picture")[0] as HTMLInputElement, file);
		const dialog = screen.getByRole("dialog", { name: "Crop picture" });
		expect(dialog).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(dialog).not.toBeInTheDocument();
		expect(state.uploadFile).not.toHaveBeenCalled();
	});

	it("retries the same full contain file after an upload error", async () => {
		state.uploadFile.mockRejectedValueOnce(new Error("Upload failed"));
		const user = userEvent.setup();
		renderSection(<PictureSectionBuilder />);

		await user.click(screen.getByRole("button", { name: "Contain" }));
		const file = new File(["full-image"], "full.png", { type: "image/png" });
		const input = screen.getAllByLabelText("Upload picture")[0] as HTMLInputElement;
		await user.upload(input, file);

		await waitFor(() => expect(state.uploadFile).toHaveBeenCalledOnce());
		expect(state.data.picture.url).toBe("");
		expect(screen.queryByRole("dialog", { name: "Crop picture" })).not.toBeInTheDocument();
		await waitFor(() => expect(input.files).toHaveLength(0));

		await user.upload(input, file);
		await waitFor(() => expect(state.uploadFile).toHaveBeenCalledTimes(2));
		expect(state.uploadFile.mock.calls[0]?.[0]).toBe(file);
		expect(state.uploadFile.mock.calls[1]?.[0]).toBe(file);
	});

	it("disables fit and upload controls inside the builder lock fieldset", () => {
		renderSection(
			<fieldset disabled>
				<PictureSectionBuilder />
			</fieldset>,
		);

		expect(screen.getByRole("button", { name: "Contain" })).toBeDisabled();
		expect(screen.getAllByLabelText("Upload picture")[0]).toBeDisabled();
	});
});
