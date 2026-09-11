// @vitest-environment happy-dom

import type { ExperienceItem, ResumeData } from "@reactive-resume/schema/resume/data";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const resumeState = vi.hoisted(() => ({ data: undefined as ResumeData | undefined }));
const sidebarState = vi.hoisted(() => ({ toggleSidebar: vi.fn() }));
const sectionState = vi.hoisted(() => ({ setCollapsed: vi.fn() }));

const deepCheckMocks = vi.hoisted(() => ({
	createResumePdfBlob: vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })),
	runAtsCheck: vi.fn(async () => ({
		report: {
			version: 1 as const,
			score: 91,
			cappedBy: [],
			categories: [],
			checks: [],
			findings: [],
			tips: [],
			counts: { blocker: 0, warning: 0, tip: 0 },
			applicableChecks: 40,
			passedChecks: 40,
			skippedChecks: 2,
			jd: null,
			file: { name: "resume.pdf", sizeBytes: 4, magicBytesOk: true },
			document: { pageCount: 1, truncated: false, wordCount: 320, operatorsAvailable: true },
		},
		fullText: "Ada Lovelace",
	})),
}));

type SectionBaseProps = { children: React.ReactNode };
type SectionStoreSelector = (state: { setCollapsed: typeof sectionState.setCollapsed }) => unknown;

// The renderer and the engine are exercised by their own tests; here they only have to be callable.
vi.mock("@/features/resume/export/pdf-document", () => ({
	createResumePdfBlob: deepCheckMocks.createResumePdfBlob,
}));
vi.mock("@/features/ats-checker/run-ats-check", () => ({
	runAtsCheck: deepCheckMocks.runAtsCheck,
	blobToPdfFile: (blob: Blob, name: string) => new File([blob], name, { type: "application/pdf" }),
}));
vi.mock("@/features/ats-checker/report/report-view", () => ({
	AtsPdfReportView: ({ report }: { report: { score: number } }) => <div>Deep report: {report.score}</div>,
}));
vi.mock("@/features/ats-checker/ai-review/ai-review-card", () => ({
	AiReviewCard: () => <div>AI review card</div>,
}));

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
	document.body.innerHTML = "";
});

const experienceItem = (overrides: Partial<ExperienceItem> = {}): ExperienceItem => ({
	id: "exp-1",
	hidden: false,
	company: "Analytical Engines",
	position: "Engineer",
	location: "London",
	period: "Jan 2020 - Present",
	website: { url: "", label: "", inlineLink: false },
	description: "<p>Designed and shipped the difference engine.</p>",
	roles: [],
	...overrides,
});

function makeResume(mutate: (data: ResumeData) => void = () => undefined): ResumeData {
	const data = structuredClone(defaultResumeData);

	data.basics.name = "Ada Lovelace";
	data.basics.email = "ada@example.com";
	data.basics.phone = "+44 20 7946 0100";
	data.basics.location = "London, UK";
	data.sections.experience.items = [experienceItem()];
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
	it("shows no checks at all before the resume is ready", () => {
		renderPanel();

		expect(screen.queryByText(/checks passed/)).toBeNull();
		expect(screen.queryByText(/Deep check/)).toBeNull();
	});

	it("reports a clean resume as fully passing", () => {
		resumeState.data = makeResume();
		renderPanel();

		expect(screen.getByText("21 of 21 checks passed")).toBeTruthy();
		expect(screen.getByText(/Every check passed/)).toBeTruthy();
	});

	it("lists a finding with its title and remedy", () => {
		resumeState.data = makeResume((data) => {
			data.basics.email = "ada at example dot com";
		});
		renderPanel();

		expect(screen.getByText("This email address will not be recognized.")).toBeTruthy();
		expect(screen.getByText(/Use a plain address/)).toBeTruthy();
		expect(screen.getByText("20 of 21 checks passed")).toBeTruthy();
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

describe("the deep check tier", () => {
	beforeEach(() => {
		resumeState.data = makeResume();
	});

	it("offers a deep check alongside the live lint", () => {
		renderPanel();

		expect(screen.getByText("Deep check")).toBeTruthy();
		expect(screen.getByRole("button", { name: /Run deep check/ })).toBeTruthy();
	});

	it("renders the current resume to PDF and reports on those bytes", async () => {
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: /Run deep check/ }));

		await waitFor(() => expect(screen.getByText(/Deep report: 91/)).toBeTruthy());
		expect(deepCheckMocks.createResumePdfBlob).toHaveBeenCalledWith(resumeState.data);
		expect(deepCheckMocks.runAtsCheck).toHaveBeenCalledWith(expect.any(File), { jobDescription: "" });
	});

	it("offers the AI review only once a deep check has produced a report", async () => {
		renderPanel();

		expect(screen.queryByText("AI review card")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: /Run deep check/ }));

		await waitFor(() => expect(screen.getByText("AI review card")).toBeTruthy());
	});

	it("passes a pasted job description through to the check", async () => {
		renderPanel();

		fireEvent.change(screen.getByLabelText(/Job description/), { target: { value: "Kubernetes" } });
		fireEvent.click(screen.getByRole("button", { name: /Run deep check/ }));

		await waitFor(() =>
			expect(deepCheckMocks.runAtsCheck).toHaveBeenCalledWith(expect.any(File), { jobDescription: "Kubernetes" }),
		);
	});

	it("says so plainly when the check cannot finish", async () => {
		deepCheckMocks.createResumePdfBlob.mockRejectedValueOnce(new Error("render failed"));
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: /Run deep check/ }));

		await waitFor(() => expect(screen.getByText(/could not finish/)).toBeTruthy());
	});
});

describe("navigating to a finding", () => {
	const stubElement = (id: string) => {
		const element = document.createElement("div");
		element.id = id;
		element.scrollIntoView = vi.fn();
		document.body.append(element);
		return element;
	};

	it("scrolls to the item a finding belongs to, not the section header", () => {
		const section = stubElement("sidebar-experience");
		const item = stubElement("resume-item-exp-1");

		resumeState.data = makeResume((data) => {
			data.sections.experience.items = [experienceItem({ period: "nonsense" })];
		});
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: /Experience/ }));

		expect(item.scrollIntoView).toHaveBeenCalled();
		expect(section.scrollIntoView).not.toHaveBeenCalled();
	});

	it("sends two findings in the same section to different items", () => {
		const first = stubElement("resume-item-exp-1");
		const second = stubElement("resume-item-exp-2");

		resumeState.data = makeResume((data) => {
			data.sections.experience.items = [
				experienceItem({ id: "exp-1", period: "nonsense" }),
				experienceItem({ id: "exp-2", period: "gibberish" }),
			];
		});
		renderPanel();

		const buttons = screen.getAllByRole("button", { name: /Experience · Item/ });
		fireEvent.click(buttons[0] as HTMLElement);
		fireEvent.click(buttons[1] as HTMLElement);

		expect(first.scrollIntoView).toHaveBeenCalledOnce();
		expect(second.scrollIntoView).toHaveBeenCalledOnce();
	});

	it("falls back to the section header when the item is not mounted", () => {
		const section = stubElement("sidebar-experience");

		resumeState.data = makeResume((data) => {
			data.sections.experience.items = [experienceItem({ period: "nonsense" })];
		});
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: /Experience/ }));

		expect(section.scrollIntoView).toHaveBeenCalled();
	});
});
