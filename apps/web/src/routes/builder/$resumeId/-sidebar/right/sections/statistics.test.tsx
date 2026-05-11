// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

const queryResult = vi.hoisted(() => ({
	data: undefined as
		| undefined
		| {
				isPublic: boolean;
				views: number;
				downloads: number;
				lastViewedAt: Date | null;
				lastDownloadedAt: Date | null;
		  },
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => queryResult,
}));
vi.mock("@tanstack/react-router", () => ({
	useParams: () => ({ resumeId: "r1" }),
}));
vi.mock("@/libs/orpc/client", () => ({
	orpc: { resume: { statistics: { getById: { queryOptions: () => ({}) } } } },
}));
vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { StatisticsSectionBuilder } = await import("./statistics");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	queryResult.data = undefined;
});

const renderStats = () =>
	render(
		<I18nProvider i18n={i18n}>
			<StatisticsSectionBuilder />
		</I18nProvider>,
	);

describe("StatisticsSectionBuilder", () => {
	it("renders nothing while the query result is undefined", () => {
		const { container } = renderStats();
		expect(container.textContent).toBe("");
	});

	it("renders the private hint when isPublic=false", () => {
		queryResult.data = {
			isPublic: false,
			views: 0,
			downloads: 0,
			lastViewedAt: null,
			lastDownloadedAt: null,
		};
		renderStats();
		expect(screen.getByText("Track your resume's views and downloads")).toBeInTheDocument();
	});

	it("renders the views/downloads counters when isPublic=true", () => {
		queryResult.data = {
			isPublic: true,
			views: 42,
			downloads: 7,
			lastViewedAt: null,
			lastDownloadedAt: null,
		};
		renderStats();
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(screen.getByText("7")).toBeInTheDocument();
		expect(screen.getByText("Views")).toBeInTheDocument();
		expect(screen.getByText("Downloads")).toBeInTheDocument();
	});

	it("renders 'last viewed/downloaded' timestamps when present", () => {
		queryResult.data = {
			isPublic: true,
			views: 1,
			downloads: 0,
			lastViewedAt: new Date("2024-01-15T00:00:00Z"),
			lastDownloadedAt: null,
		};
		renderStats();
		// Just verify some 'Last viewed' copy appears — the date formatting depends on the runner's locale.
		expect(screen.getByText(/Last viewed/i)).toBeInTheDocument();
	});
});
