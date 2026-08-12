// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const resumeState = vi.hoisted(() => ({ data: undefined as ResumeData | undefined }));
const sidebarState = vi.hoisted(() => ({ toggleSidebar: vi.fn() }));
const sectionState = vi.hoisted(() => ({ setCollapsed: vi.fn() }));

type SectionBaseProps = { children: React.ReactNode };
type SectionStoreSelector = (state: { setCollapsed: typeof sectionState.setCollapsed }) => unknown;

vi.mock("@/features/resume/builder/draft", () => ({
	useResumeData: () => resumeState.data,
}));
vi.mock("../../../-store/sidebar", () => ({
	useBuilderSidebar: () => sidebarState,
}));
vi.mock("../../../-store/section", () => ({
	useSectionStore: (selector: SectionStoreSelector) => selector(sectionState),
}));
vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: SectionBaseProps) => <div>{children}</div>,
}));

const { AtsCheckSectionBuilder } = await import("./ats-check");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
	Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
	vi.clearAllMocks();
	resumeState.data = undefined;
});

function makeResume(mutate: (data: ResumeData) => void = () => undefined): ResumeData {
	const data = structuredClone(defaultResumeData);

	data.basics.name = "Ada Lovelace";
	data.basics.email = "ada@example.com";
	data.basics.phone = "+44 20 7946 0100";
	data.basics.location = "London, UK";
	data.sections.experience.items = [
		{
			id: "exp-1",
			hidden: false,
			company: "Analytical Engines",
			position: "Engineer",
			location: "London",
			period: "Jan 2020 - Present",
			website: { url: "", label: "", inlineLink: false },
			description: "<p>Designed and shipped the difference engine.</p>",
			roles: [],
		},
	];
	data.metadata.layout.pages = [{ fullWidth: false, main: ["experience"], sidebar: [] }];

	mutate(data);
	return data;
}

const renderPanel = () =>
	render(
		<I18nProvider i18n={i18n}>
			<AtsCheckSectionBuilder />
		</I18nProvider>,
	);

describe("AtsCheckSectionBuilder", () => {
	it("renders nothing before the resume is ready", () => {
		const { container } = renderPanel();
		expect(container).toBeEmptyDOMElement();
	});

	it("reports a clean resume as fully passing", () => {
		resumeState.data = makeResume();
		renderPanel();

		expect(screen.getByText("22 of 22 checks passed")).toBeTruthy();
		expect(screen.getByText(/Every check passed/)).toBeTruthy();
	});

	it("lists a finding with its title and remedy", () => {
		resumeState.data = makeResume((data) => {
			data.basics.email = "ada at example dot com";
		});
		renderPanel();

		expect(screen.getByText("This email address will not be recognized.")).toBeTruthy();
		expect(screen.getByText(/Use a plain address/)).toBeTruthy();
		expect(screen.getByText("21 of 22 checks passed")).toBeTruthy();
	});

	it("counts findings by severity", () => {
		resumeState.data = makeResume((data) => {
			data.basics.email = "";
			data.picture.url = "/uploads/ada.png";
		});
		renderPanel();

		expect(screen.getByText("1 error")).toBeTruthy();
		expect(screen.getByText("1 note")).toBeTruthy();
	});

	it("opens the owning sidebar section when a finding's location is clicked", () => {
		resumeState.data = makeResume((data) => {
			data.basics.email = "";
		});
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: /Basics/ }));

		expect(sidebarState.toggleSidebar).toHaveBeenCalledWith("left", true);
		expect(sectionState.setCollapsed).toHaveBeenCalledWith("basics", false);
	});

	it("points typography findings at the right sidebar", () => {
		resumeState.data = makeResume((data) => {
			data.metadata.typography.body.fontSize = 8;
		});
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: /Typography/ }));

		expect(sidebarState.toggleSidebar).toHaveBeenCalledWith("right", true);
		expect(sectionState.setCollapsed).toHaveBeenCalledWith("typography", false);
	});
});
