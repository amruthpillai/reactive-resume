// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

const mockNavigate = vi.fn();

vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/features/resume/builder/draft", () => ({
	useCurrentResume: () => ({
		data: { metadata: { template: "ditto" } },
	}),
}));
vi.mock("@tanstack/react-router", () => ({
	useParams: () => ({ resumeId: "resume-123" }),
	useNavigate: () => mockNavigate,
}));

const { TemplateSectionBuilder } = await import("./template");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	mockNavigate.mockClear();
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
		expect(screen.getByText("ATS friendly")).toBeInTheDocument();
	});

	it("navigates to /dashboard/templates with resume search param when preview is clicked", () => {
		renderTemplate();

		const preview = screen.getByAltText("Ditto").closest("button") as HTMLButtonElement;
		fireEvent.click(preview);

		expect(mockNavigate).toHaveBeenCalledWith({
			to: "/dashboard/templates",
			search: { resume: "resume-123" },
		});
	});

	it("renders the template preview image with the data-mapped URL", () => {
		renderTemplate();
		const img = screen.getByAltText("Ditto") as HTMLImageElement;
		expect(img.src).toContain("/templates/jpg/ditto.jpg");
	});
});
