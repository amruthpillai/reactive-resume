// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandList } from "@reactive-resume/ui/components/command";
import { useCommandPaletteStore } from "../store";

const mocks = vi.hoisted(() => ({
	pathname: "/",
	resumeQueryOptions: vi.fn((options?: unknown) => ({ entity: "resumes", ...(options ?? {}) })),
	applicationsListQueryOptions: vi.fn(() => ({ entity: "applications" })),
	threadsQueryOptions: vi.fn((options?: unknown) => ({ entity: "threads", ...(options ?? {}) })),
	navigate: vi.fn(),
	openDialog: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-hotkeys", () => ({
	useHotkeys: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mocks.navigate,
	useRouteContext: () => ({ session: { user: { id: "user-1" } } }),
	useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => unknown }) =>
		select({ location: { pathname: mocks.pathname } }),
}));

vi.mock("@/dialogs/store", () => ({
	useDialogStore: () => ({ openDialog: mocks.openDialog }),
}));

vi.mock("@/features/applications/queries", () => ({
	applicationsListQueryOptions: mocks.applicationsListQueryOptions,
}));

vi.mock("@/features/theme/provider", () => ({
	useTheme: () => ({ setTheme: vi.fn(), theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		resume: {
			list: {
				queryOptions: mocks.resumeQueryOptions,
			},
		},
		agent: {
			threads: {
				list: {
					queryOptions: mocks.threadsQueryOptions,
				},
			},
		},
	},
}));

const { CommandPalette } = await import("../index");
const { ResumesCommandGroup } = await import("./resumes");
const { NavigationCommandGroup } = await import("./navigation");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	vi.clearAllMocks();
	mocks.pathname = "/";
	useCommandPaletteStore.setState({ open: false, search: "", pages: [] });
});

const mockUseQueryData = (getData: (entity: string | undefined) => unknown) => {
	vi.mocked(useQuery).mockImplementation(((options: unknown) => {
		return { data: getData((options as { entity?: string }).entity), isLoading: false } as ReturnType<typeof useQuery>;
	}) as typeof useQuery);
};

const renderGroup = () =>
	render(
		<I18nProvider i18n={i18n}>
			<Command>
				<CommandList>
					<ResumesCommandGroup />
				</CommandList>
			</Command>
		</I18nProvider>,
	);

function TestCommandPalette() {
	return (
		<I18nProvider i18n={i18n}>
			<CommandPalette />
		</I18nProvider>
	);
}

describe("ResumesCommandGroup", () => {
	it.each([
		["resumes", "", "Create a new resume"],
		["applications", "{ArrowDown}", "New Application"],
		["threads", "{ArrowDown}{ArrowDown}", "New Thread"],
	])("opens the %s list page from the root palette with Enter", async (page, keys, createLabel) => {
		mockUseQueryData((entity) => {
			if (entity === "resumes") return [{ id: "resume-1", name: "Evil Apricot Pike", slug: "apricot" }];
			if (entity === "applications")
				return [{ id: "application-1", company: "Umbrella", role: "Staff Engineer", archived: false }];
			if (entity === "threads")
				return [{ id: "thread-1", title: "Cover letter rewrite", resumeName: "Product Resume" }];
			return [];
		});

		useCommandPaletteStore.setState({ open: true });
		render(<TestCommandPalette />);
		await userEvent.click(screen.getByRole("combobox"));
		await userEvent.keyboard(`${keys}{Enter}`);

		expect(useCommandPaletteStore.getState().pages).toEqual([page]);
		expect(await screen.findByText(createLabel)).toBeInTheDocument();
		expect(screen.queryByText("No commands match that search.")).not.toBeInTheDocument();
	});

	it.each([
		["resumes", "", "Create a new resume", "Evil Apricot Pike"],
		["applications", "{ArrowDown}", "New Application", "Umbrella"],
		["threads", "{ArrowDown}{ArrowDown}", "New Thread", "Cover letter rewrite"],
	])("keeps arrow-key navigation active on the %s list page", async (_page, keys, createLabel, itemLabel) => {
		mockUseQueryData((entity) => {
			if (entity === "resumes") return [{ id: "resume-1", name: "Evil Apricot Pike", slug: "apricot" }];
			if (entity === "applications")
				return [{ id: "application-1", company: "Umbrella", role: "Staff Engineer", archived: false }];
			if (entity === "threads")
				return [{ id: "thread-1", title: "Cover letter rewrite", resumeName: "Product Resume" }];
			return [];
		});

		useCommandPaletteStore.setState({ open: true });
		render(<TestCommandPalette />);
		await userEvent.click(screen.getByRole("combobox"));
		await userEvent.keyboard(`${keys}{Enter}`);
		const createItem = await screen.findByText(createLabel);
		await userEvent.keyboard("{ArrowDown}");

		expect((await screen.findByText(itemLabel)).closest("[cmdk-item]")).toHaveAttribute("aria-selected", "true");
		await userEvent.keyboard("{ArrowUp}");

		expect(createItem.closest("[cmdk-item]")).toHaveAttribute("aria-selected", "true");
	});

	it("does not show resume results beside the root categories on the resumes route", () => {
		mocks.pathname = "/dashboard/resumes";
		mockUseQueryData((entity) =>
			entity === "resumes" ? [{ id: "resume-1", name: "Evil Apricot Pike", slug: "apricot" }] : [],
		);

		renderGroup();

		expect(screen.getAllByText("Resumes")).toHaveLength(1);
		expect(screen.queryByText("Create a new resume")).not.toBeInTheDocument();
		expect(screen.queryByText("Evil Apricot Pike")).not.toBeInTheDocument();
	});

	it("loads resumes with the default list input after opening the resumes command page", () => {
		useCommandPaletteStore.setState({ pages: ["resumes"] });
		mockUseQueryData((entity) =>
			entity === "resumes" ? [{ id: "resume-1", name: "Evil Apricot Pike", slug: "apricot" }] : [],
		);

		renderGroup();

		expect(mocks.resumeQueryOptions).toHaveBeenCalledWith({
			enabled: true,
			input: { sort: "lastUpdatedAt", tags: [] },
		});
		expect(screen.getByText("Evil Apricot Pike")).toBeInTheDocument();
	});

	it("filters resume results from the command palette search", () => {
		useCommandPaletteStore.setState({ pages: ["resumes"], search: "apri" });
		mockUseQueryData((entity) =>
			entity === "resumes"
				? [
						{ id: "resume-1", name: "Evil Apricot Pike", slug: "apricot" },
						{ id: "resume-2", name: "Quiet Banana", slug: "banana" },
					]
				: [],
		);

		renderGroup();

		expect(screen.getByText("Evil Apricot Pike")).toBeInTheDocument();
		expect(screen.queryByText("Quiet Banana")).not.toBeInTheDocument();
	});

	it("loads applications on the applications page", () => {
		useCommandPaletteStore.setState({ pages: ["applications"] });
		mockUseQueryData((entity) =>
			entity === "applications"
				? [{ id: "application-1", company: "Umbrella", role: "Staff Engineer", archived: false }]
				: [],
		);

		renderGroup();

		expect(screen.getByText("Umbrella")).toBeInTheDocument();
		expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
	});

	it("filters application results from the command palette search", () => {
		useCommandPaletteStore.setState({ pages: ["applications"], search: "umbrella" });
		mockUseQueryData((entity) =>
			entity === "applications"
				? [
						{ id: "application-1", company: "Umbrella", role: "Staff Engineer", archived: false },
						{ id: "application-2", company: "Wayne Enterprises", role: "Product Engineer", archived: false },
					]
				: [],
		);

		renderGroup();

		expect(screen.getByText("Umbrella")).toBeInTheDocument();
		expect(screen.queryByText("Wayne Enterprises")).not.toBeInTheDocument();
	});

	it("opens the selected application by id", () => {
		useCommandPaletteStore.setState({ pages: ["applications"] });
		mockUseQueryData((entity) =>
			entity === "applications"
				? [{ id: "application-1", company: "Umbrella", role: "Staff Engineer", archived: false }]
				: [],
		);

		renderGroup();
		fireEvent.click(screen.getByText("Umbrella"));

		expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/dashboard/applications",
			search: { applicationId: "application-1" },
		});
	});

	it("loads threads on agent pages", () => {
		useCommandPaletteStore.setState({ pages: ["threads"] });
		mockUseQueryData((entity) =>
			entity === "threads" ? [{ id: "thread-1", title: "Cover letter rewrite", resumeName: "Product Resume" }] : [],
		);

		renderGroup();

		expect(screen.getByText("Cover letter rewrite")).toBeInTheDocument();
		expect(screen.getByText("Product Resume")).toBeInTheDocument();
	});

	it("filters thread results from the command palette search", () => {
		useCommandPaletteStore.setState({ pages: ["threads"], search: "cover" });
		mockUseQueryData((entity) =>
			entity === "threads"
				? [
						{ id: "thread-1", title: "Cover letter rewrite", resumeName: "Product Resume" },
						{ id: "thread-2", title: "Resume cleanup", resumeName: "Staff Resume" },
					]
				: [],
		);

		renderGroup();

		expect(screen.getByText("Cover letter rewrite")).toBeInTheDocument();
		expect(screen.queryByText("Resume cleanup")).not.toBeInTheDocument();
	});
});

describe("NavigationCommandGroup", () => {
	it("shows application and thread navigation items", () => {
		render(
			<I18nProvider i18n={i18n}>
				<Command>
					<CommandList>
						<NavigationCommandGroup />
					</CommandList>
				</Command>
			</I18nProvider>,
		);

		expect(screen.getByText("Applications")).toBeInTheDocument();
		expect(screen.getByText("New Application")).toBeInTheDocument();
		expect(screen.getByText("Threads")).toBeInTheDocument();
		expect(screen.getByText("New Thread")).toBeInTheDocument();
	});

	it("navigates to new application and new thread destinations", () => {
		render(
			<I18nProvider i18n={i18n}>
				<Command>
					<CommandList>
						<NavigationCommandGroup />
					</CommandList>
				</Command>
			</I18nProvider>,
		);

		fireEvent.click(screen.getByText("New Application"));
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/dashboard/applications", search: { create: true } });

		fireEvent.click(screen.getByText("New Thread"));
		expect(mocks.navigate).toHaveBeenCalledWith({ to: "/agent/new" });
	});
});
