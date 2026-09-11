// @vitest-environment happy-dom
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommunityStats } from "./community-stats";

const getTotals = vi.hoisted(() => vi.fn());
const cachedAt = Date.UTC(2026, 8, 7, 12);

vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		statistics: {
			getTotals: {
				queryOptions: (options: object) => ({ queryKey: ["totals"], queryFn: getTotals, ...options }),
			},
		},
	},
}));

vi.mock("motion/react", async (importOriginal) => ({
	...(await importOriginal<typeof import("motion/react")>()),
	useInView: () => true,
	useReducedMotion: () => true,
}));

beforeEach(() => {
	getTotals.mockReset().mockResolvedValue({ users: 0, resumes: 999, cachedAt });
	i18n.loadAndActivate({ locale: "en-US", messages: {} });
});

function renderStats() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return {
		client,
		...render(
			<QueryClientProvider client={client}>
				<I18nProvider i18n={i18n}>
					<CommunityStats />
				</I18nProvider>
			</QueryClientProvider>,
		),
	};
}

it("uses the server cache time and keeps the last counts and timestamp when a refresh fails", async () => {
	const { client, getByText, container } = renderStats();
	await waitFor(() => expect(getByText("999", { selector: ".sr-only" })).toBeInTheDocument());
	expect(getByText("0", { selector: ".sr-only" })).toBeInTheDocument();
	expect(container.querySelector("time")).toHaveAttribute("datetime", new Date(cachedAt).toISOString());
	const refreshedAt = cachedAt + 6 * 60 * 60 * 1000;
	getTotals.mockResolvedValue({ users: 0, resumes: 1_000, cachedAt: refreshedAt });
	await act(() => client.invalidateQueries({ queryKey: ["totals"] }));
	expect(getTotals).toHaveBeenCalledTimes(2);
	await waitFor(() => expect(getByText("1,000", { selector: ".sr-only" })).toBeInTheDocument());
	expect(container.querySelector("time")).toHaveAttribute("datetime", new Date(refreshedAt).toISOString());
	getTotals.mockRejectedValue(new Error("Offline"));
	await act(() => client.invalidateQueries({ queryKey: ["totals"] }));
	expect(getByText("1,000", { selector: ".sr-only" })).toBeInTheDocument();
	expect(container.querySelector("time")).toHaveAttribute("datetime", new Date(refreshedAt).toISOString());
	client.clear();
});

it("does not substitute an invented total when the first request fails", async () => {
	getTotals.mockRejectedValue(new Error("Offline"));
	const { client, getAllByText, getByText, queryByText, container } = renderStats();
	await waitFor(() => expect(getAllByText("Total unavailable")).toHaveLength(2));
	expect(getByText("Some totals are unavailable right now.")).toBeVisible();
	expect(queryByText("0", { selector: ".sr-only" })).toBeNull();
	expect(container.querySelector("time")).toBeNull();
	client.clear();
});
