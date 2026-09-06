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

const retiredLinksResult = vi.hoisted(() => ({
	data: undefined as undefined | { path: string; attemptCount: number; lastAttemptAt: Date | null }[],
	error: null as Error | null,
}));

type SectionBaseProps = {
	children: React.ReactNode;
};

vi.mock("@tanstack/react-query", () => ({
	useQuery: (options: { __key?: string }) => {
		if (options.__key === "daily") return dailyResult;
		if (options.__key === "retiredLinks") return retiredLinksResult;
		return queryResult;
	},
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
				getRetiredLinks: { queryOptions: () => ({ __key: "retiredLinks" }) },
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
	retiredLinksResult.data = undefined;
	retiredLinksResult.error = null;
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

	it("omits old-link UI when no retained records exist", () => {
		queryResult.data = {
			isPublic: true,
			views: 0,
			downloads: 0,
			lastViewedAt: null,
			lastDownloadedAt: null,
		};
		retiredLinksResult.data = [];

		renderStats();

		expect(screen.queryByText("Old link attempts")).not.toBeInTheDocument();
	});

	it("shows aggregate old-link attempts and explicit prospective limits", () => {
		queryResult.data = {
			isPublic: true,
			views: 0,
			downloads: 0,
			lastViewedAt: null,
			lastDownloadedAt: null,
		};
		retiredLinksResult.data = [
			{
				path: "/owner/first",
				attemptCount: 3,
				lastAttemptAt: new Date("2026-09-06T12:00:00.000Z"),
			},
			{ path: "/owner/only", attemptCount: 1, lastAttemptAt: null },
		];

		renderStats();

		expect(screen.getByText("Old link attempts")).toBeInTheDocument();
		expect(screen.getByText("/owner/first")).toBeInTheDocument();
		expect(screen.getByText("3 attempts")).toBeInTheDocument();
		expect(screen.getByText("1 attempt")).toBeInTheDocument();
		expect(screen.getByText(/Last attempt/i)).toBeInTheDocument();
		expect(screen.getByText(/slug changes made after this feature/i)).toBeInTheDocument();
		expect(screen.getByText(/current username/i)).toBeInTheDocument();
		expect(screen.getByText(/50 paths/i)).toBeInTheDocument();
		expect(screen.getByText(/90 days/i)).toBeInTheDocument();
	});

	it("omits old-link UI when the retained list query fails", () => {
		queryResult.data = {
			isPublic: false,
			views: 0,
			downloads: 0,
			lastViewedAt: null,
			lastDownloadedAt: null,
		};
		retiredLinksResult.error = new Error("unavailable");

		renderStats();

		expect(screen.queryByText("Old link attempts")).not.toBeInTheDocument();
	});
});
