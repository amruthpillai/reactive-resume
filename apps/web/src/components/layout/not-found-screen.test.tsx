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

const renderScreen = (routeId = "/missing") =>
	render(
		<I18nProvider i18n={i18n}>
			<NotFoundScreen isNotFound routeId={routeId as never} />
		</I18nProvider>,
	);

describe("NotFoundScreen", () => {
	it("renders the documented error heading", () => {
		renderScreen();
		expect(screen.getByText("An error occurred while loading the page.")).toBeInTheDocument();
	});

	it("displays the routeId that triggered the not-found", () => {
		renderScreen("/dashboard/missing-page");
		expect(screen.getByText("/dashboard/missing-page")).toBeInTheDocument();
	});

	it("renders a Go Back link", () => {
		renderScreen();
		const link = screen.getByRole("link", { name: /go back/i });
		expect(link.getAttribute("href")).toBe("..");
	});
});
