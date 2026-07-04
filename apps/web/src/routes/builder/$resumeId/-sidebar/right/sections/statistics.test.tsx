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

const dailyResult = vi.hoisted(() => ({
	data: undefined as undefined | { date: string; views: number; downloads: number }[],
}));

type SectionBaseProps = {
	children: React.ReactNode;
};

vi.mock("@tanstack/react-query", () => ({
	useQuery: (options: { __key?: string }) => (options.__key === "daily" ? dailyResult : queryResult),
}));
vi.mock("@tanstack/react-router", () => ({
	useParams: () => ({ resumeId: "r1" }),
}));
vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		resume: {
			statistics: {
				getById: { queryOptions: () => ({ __key: "getById" }) },
				getDailyById: { queryOptions: () => ({ __key: "daily" }) },
			},
		},
	},
}));
vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: SectionBaseProps) => <div>{children}</div>,
}));

const { StatisticsSectionBuilder } = await import("./statistics");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	queryResult.data = undefined;
	dailyResult.data = undefined;
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

	it("renders a prior-period delta from the daily series", () => {
		queryResult.data = {
			isPublic: true,
			views: 30,
			downloads: 0,
			lastViewedAt: null,
			lastDownloadedAt: null,
		};
		// 60 days: prior 30 sum to 10, recent 30 sum to 20 -> +100%.
		dailyResult.data = Array.from({ length: 60 }, (_, i) => ({
			date: `2024-01-${String(i + 1).padStart(2, "0")}`,
			views: i < 30 ? (i < 10 ? 1 : 0) : i < 50 ? 1 : 0,
			downloads: 0,
		}));
		renderStats();
		expect(screen.getByText(/\+100%/)).toBeInTheDocument();
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
