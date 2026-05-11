// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

const queryResult = vi.hoisted(() => ({ data: undefined as number | undefined }));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => queryResult,
}));
vi.mock("@/libs/orpc/client", () => ({
	orpc: { statistics: { github: { getStarCount: { queryOptions: () => ({}) } } } },
}));
vi.mock("../animation/count-up", () => ({
	CountUp: ({ to }: { to: number }) => <span data-testid="count-up">{to.toLocaleString()}</span>,
}));

const { GithubStarsButton } = await import("./github-stars-button");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	queryResult.data = undefined;
});

const renderButton = () =>
	render(
		<I18nProvider i18n={i18n}>
			<GithubStarsButton />
		</I18nProvider>,
	);

describe("GithubStarsButton", () => {
	it("renders an anchor pointing at the project repo with rel=noopener and target=_blank", () => {
		renderButton();
		const link = screen.getByRole("button") as HTMLAnchorElement;
		expect(link.href).toBe("https://github.com/amruthpillai/reactive-resume");
		expect(link.target).toBe("_blank");
		expect(link.rel).toBe("noopener");
	});

	it("uses the no-count aria-label when star count hasn't loaded yet", () => {
		renderButton();
		const link = screen.getByRole("button") as HTMLAnchorElement;
		expect(link.getAttribute("aria-label")).toBe("Star us on GitHub (opens in new tab)");
	});

	it("does not render a CountUp when star count is undefined", () => {
		renderButton();
		expect(screen.queryByTestId("count-up")).toBeNull();
	});

	it("renders a CountUp + announces the star count when available", () => {
		queryResult.data = 12345;
		renderButton();

		expect(screen.getByTestId("count-up").textContent).toBe("12,345");

		const link = screen.getByRole("button") as HTMLAnchorElement;
		expect(link.getAttribute("aria-label")).toContain("12,345 stars");
	});
});
