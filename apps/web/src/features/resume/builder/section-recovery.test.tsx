// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Resume } from "./draft";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { ConfirmDialogProvider } from "@/hooks/use-confirm";
import { CustomSectionBuilder } from "@/routes/builder/$resumeId/-sidebar/left/sections/custom";
import { useResumeStore } from "./draft";
import {
	focusLeftSidebarSection,
	getVisibleLeftSidebarSections,
	SectionEditorList,
	SectionRecovery,
} from "./section-recovery";

const routerParams = vi.hoisted(() => ({ resumeId: "section-recovery" }));

vi.mock("@tanstack/react-router", () => ({
	useParams: () => routerParams,
}));

vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		resume: {
			getById: { queryOptions: () => ({ queryKey: ["resume", "section-recovery"] }) },
			patch: { call: vi.fn() },
			update: { call: vi.fn(() => new Promise(() => undefined)) },
		},
	},
	streamClient: { resume: { updates: { subscribe: vi.fn() } } },
}));

vi.mock("@reactive-resume/ui/components/toast", () => ({
	toast: { add: vi.fn(), close: vi.fn() },
}));

function makeResume(data: ResumeData, isLocked = false): Resume {
	return {
		id: routerParams.resumeId,
		name: "Section Recovery",
		slug: "section-recovery",
		tags: [],
		data,
		isLocked,
		updatedAt: new Date("2026-09-06T00:00:00.000Z"),
	};
}

function makeHiddenData(): ResumeData {
	const data = structuredClone(sampleResumeData);
	data.summary.hidden = true;
	data.sections.experience.hidden = true;
	data.sections.experience.title = "Work History";
	data.customSections[0].hidden = true;
	data.customSections[0].title = "Earlier Roles";
	return data;
}

function renderRecovery(data = makeHiddenData(), isLocked = false) {
	useResumeStore.getState().initialize(makeResume(data, isLocked));
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<I18nProvider i18n={i18n}>
				<fieldset disabled={isLocked}>
					<SectionRecovery />
				</fieldset>
			</I18nProvider>
		</QueryClientProvider>,
	);
}

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	vi.useFakeTimers();
	useResumeStore.getState().reset();
});

afterEach(() => {
	cleanup();
	vi.clearAllTimers();
	vi.useRealTimers();
	useResumeStore.getState().reset();
});

describe("hidden section recovery", () => {
	it("keeps Picture, Basics, and Custom editors while removing hidden printable editors", () => {
		const visible = getVisibleLeftSidebarSections(makeHiddenData());

		expect(visible).toContain("picture");
		expect(visible).toContain("basics");
		expect(visible).toContain("custom");
		expect(visible).not.toContain("summary");
		expect(visible).not.toContain("experience");
	});

	it("does not mount full editors for hidden printable sections", () => {
		useResumeStore.getState().initialize(makeResume(makeHiddenData()));
		render(
			<QueryClientProvider client={new QueryClient()}>
				<I18nProvider i18n={i18n}>
					<SectionEditorList renderSection={(section) => <div data-testid={`editor-${section}`} />} />
				</I18nProvider>
			</QueryClientProvider>,
		);

		expect(screen.getByTestId("editor-picture")).toBeInTheDocument();
		expect(screen.getByTestId("editor-basics")).toBeInTheDocument();
		expect(screen.getByTestId("editor-custom")).toBeInTheDocument();
		expect(screen.queryByTestId("editor-summary")).not.toBeInTheDocument();
		expect(screen.queryByTestId("editor-experience")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Show Work History section" })).toBeInTheDocument();
	});

	it("keeps the custom editor container while omitting only hidden custom children", () => {
		const data = makeHiddenData();
		useResumeStore.getState().initialize(makeResume(data));
		render(
			<QueryClientProvider client={new QueryClient()}>
				<I18nProvider i18n={i18n}>
					<ConfirmDialogProvider>
						<CustomSectionBuilder />
					</ConfirmDialogProvider>
				</I18nProvider>
			</QueryClientProvider>,
		);

		expect(screen.queryByText("Earlier Roles")).not.toBeInTheDocument();
		expect(screen.getAllByText("Cover Letter").length).toBeGreaterThan(0);
		expect(screen.getByRole("button", { name: "Add a new custom section" })).toBeInTheDocument();
	});

	it("lists hidden built-in, summary, and custom sections by effective title", () => {
		renderRecovery();

		expect(screen.getByRole("region", { name: "Hidden sections" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Show Summary section" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Show Work History section" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Show Earlier Roles section" })).toBeInTheDocument();
	});

	it("shows via keyboard, changes only hidden state, and participates in undo and redo", async () => {
		const data = makeHiddenData();
		const before = structuredClone(data);
		vi.useRealTimers();
		const user = userEvent.setup();
		renderRecovery(data);
		const show = screen.getByRole("button", { name: "Show Work History section" });

		show.focus();
		await user.keyboard("{Enter}");

		const shown = useResumeStore.getState().resume?.data;
		expect(shown?.sections.experience.hidden).toBe(false);
		expect({ ...shown?.sections.experience, hidden: true }).toEqual(before.sections.experience);
		expect(shown?.metadata.layout).toEqual(before.metadata.layout);
		expect(screen.queryByRole("button", { name: "Show Work History section" })).not.toBeInTheDocument();

		act(() => useResumeStore.getState().undo());
		expect(useResumeStore.getState().resume?.data.sections.experience.hidden).toBe(true);
		expect(screen.getByRole("button", { name: "Show Work History section" })).toBeInTheDocument();

		act(() => useResumeStore.getState().redo());
		expect(useResumeStore.getState().resume?.data.sections.experience.hidden).toBe(false);
	});

	it("shows an unplaced hidden section without choosing a layout location", () => {
		const data = makeHiddenData();
		for (const page of data.metadata.layout.pages) {
			page.main = page.main.filter((id) => id !== "experience");
			page.sidebar = page.sidebar.filter((id) => id !== "experience");
		}
		const layoutBefore = structuredClone(data.metadata.layout);
		renderRecovery(data);

		act(() => screen.getByRole("button", { name: "Show Work History section" }).click());

		expect(useResumeStore.getState().resume?.data.sections.experience.hidden).toBe(false);
		expect(useResumeStore.getState().resume?.data.metadata.layout).toEqual(layoutBefore);
	});

	it("disables recovery actions for a locked resume", () => {
		renderRecovery(makeHiddenData(), true);
		const show = screen.getByRole("button", { name: "Show Work History section" });

		expect(show).toBeDisabled();
		show.click();
		expect(useResumeStore.getState().resume?.data.sections.experience.hidden).toBe(true);
		expect(useResumeStore.getState().undoStack).toHaveLength(0);
	});

	it("reopens a collapsed recovery group before focusing and scrolling the hidden section", async () => {
		vi.useRealTimers();
		const user = userEvent.setup();
		const scrollIntoView = vi.fn();
		Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
			configurable: true,
			value: scrollIntoView,
		});
		renderRecovery();
		const trigger = screen.getByRole("button", { name: "Hidden sections" });

		await user.click(trigger);
		await waitFor(() => expect(document.getElementById("sidebar-hidden-experience")).toBeNull());

		focusLeftSidebarSection("experience");

		await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
		const recoveryEntry = await waitFor(() => {
			const entry = document.getElementById("sidebar-hidden-experience");
			expect(entry).not.toBeNull();
			return entry;
		});
		await waitFor(() => expect(recoveryEntry).toHaveFocus());
		expect(scrollIntoView).toHaveBeenCalledWith({
			block: "start",
			inline: "nearest",
			behavior: "smooth",
		});
	});
});
