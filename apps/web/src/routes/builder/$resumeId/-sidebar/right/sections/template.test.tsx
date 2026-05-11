// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useDialogStore } from "@/dialogs/store";

vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/resume/builder-resume-draft", () => ({
	useCurrentResume: () => ({
		data: { metadata: { template: "ditto" } },
	}),
}));

const { TemplateSectionBuilder } = await import("./template");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	useDialogStore.setState({ open: false, activeDialog: null, onBeforeClose: null });
});

const renderTemplate = () =>
	render(
		<I18nProvider i18n={i18n}>
			<TemplateSectionBuilder />
		</I18nProvider>,
	);

describe("TemplateSectionBuilder", () => {
	it("renders the current template's display name", () => {
		renderTemplate();
		expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Ditto");
	});

	it("renders the template tags as badges", () => {
		renderTemplate();
		// Ditto's tags include 'ATS friendly' per templates/data.
		expect(screen.getByText("ATS friendly")).toBeInTheDocument();
	});

	it("opens the template gallery dialog when the preview is clicked", () => {
		renderTemplate();

		const preview = screen.getByAltText("Ditto").closest("button") as HTMLButtonElement;
		fireEvent.click(preview);

		const state = useDialogStore.getState();
		expect(state.open).toBe(true);
		expect(state.activeDialog?.type).toBe("resume.template.gallery");
	});

	it("renders the template preview image with the data-mapped URL", () => {
		renderTemplate();
		const img = screen.getByAltText("Ditto") as HTMLImageElement;
		expect(img.src).toContain("/templates/jpg/ditto.jpg");
	});
});
