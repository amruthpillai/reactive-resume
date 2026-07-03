// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

// `Link` from tanstack/react-router requires a Router context. Stub it out with
// a plain anchor so we can render the screen in isolation.
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, ...rest }: React.PropsWithChildren<{ to: string }>) => (
		<a href={typeof to === "string" ? to : "#"} {...rest}>
			{children}
		</a>
	),
}));

const { NotFoundScreen } = await import("./not-found-screen");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const renderScreen = () =>
	render(
		<I18nProvider i18n={i18n}>
			<NotFoundScreen />
		</I18nProvider>,
	);

describe("NotFoundScreen", () => {
	it("renders a distinct not-found heading", () => {
		renderScreen();
		expect(screen.getByText("We couldn't find that page")).toBeInTheDocument();
	});

	it("does not surface the raw routeId", () => {
		renderScreen();
		expect(screen.queryByText(/\/dashboard\/missing-page/)).not.toBeInTheDocument();
	});

	it("offers an absolute dashboard escape", () => {
		renderScreen();
		const link = screen.getByRole("link", { name: /go to dashboard/i });
		expect(link.getAttribute("href")).toBe("/dashboard");
	});

	it("offers an absolute home escape", () => {
		renderScreen();
		const link = screen.getByRole("link", { name: /go home/i });
		expect(link.getAttribute("href")).toBe("/");
	});
});
