// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

const routeContext = vi.hoisted(() => ({ value: {} as { session?: unknown } }));

// `Link` and `useRouteContext` need a Router context. Stub both so the page renders in isolation.
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, ...rest }: React.PropsWithChildren<{ to: string }>) => (
		<a href={typeof to === "string" ? to : "#"} {...rest}>
			{children}
		</a>
	),
	useRouteContext: () => routeContext.value,
}));

const { AuthErrorPage } = await import("./error");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	routeContext.value = {};
});

const renderPage = (code?: string, description?: string) =>
	render(
		<I18nProvider i18n={i18n}>
			<AuthErrorPage code={code} description={description} />
		</I18nProvider>,
	);

describe("AuthErrorPage", () => {
	it("explains a cancelled sign-in without blaming the user", () => {
		renderPage("access_denied");
		expect(screen.getByText("You cancelled the sign-in before it finished.")).toBeInTheDocument();
	});

	it("falls back to a generic message for unknown and missing codes", () => {
		const generic = "Something went wrong while signing you in. Please try again.";

		renderPage("not_a_real_code");
		expect(screen.getByText(generic)).toBeInTheDocument();

		renderPage(undefined);
		expect(screen.getAllByText(generic)).toHaveLength(2);
	});

	it("renders the provider's error description", () => {
		renderPage("invalid_code", "Client authentication failed for realm 'staging'");
		expect(screen.getByText("Client authentication failed for realm 'staging'")).toBeInTheDocument();
	});

	it("omits the provider details block when no description is present", () => {
		renderPage("access_denied");
		expect(screen.queryByText(/Details from the provider/)).not.toBeInTheDocument();
	});

	it("sends a signed-out visitor back to the login page", () => {
		renderPage("access_denied");
		expect(screen.getByRole("link", { name: /back to sign in/i }).getAttribute("href")).toBe("/auth/login");
	});

	it("sends a signed-in user back to authentication settings", () => {
		routeContext.value = { session: { user: { id: "user-1" } } };
		renderPage("access_denied");

		const link = screen.getByRole("link", { name: /back to authentication settings/i });
		expect(link.getAttribute("href")).toBe("/dashboard/settings/authentication");
	});
});
