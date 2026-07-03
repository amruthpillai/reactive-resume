// @vitest-environment happy-dom

import type { ErrorComponentProps } from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
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

const { ErrorScreen } = await import("./error-screen");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const renderError = (overrides: { error?: Error; reset?: () => void } = {}) => {
	const props: ErrorComponentProps = {
		error: overrides.error ?? new Error("boom"),
		reset: overrides.reset ?? vi.fn(),
	};

	return render(
		<I18nProvider i18n={i18n}>
			<ErrorScreen {...props} />
		</I18nProvider>,
	);
};

describe("ErrorScreen", () => {
	it("shows a distinct, non-blaming error heading", () => {
		renderError();
		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
	});

	it("does not surface the raw error message to the user", () => {
		renderError({ error: new Error("Network is down") });
		expect(screen.queryByText("Network is down")).not.toBeInTheDocument();
	});

	it("calls reset when the Try again button is clicked", () => {
		const reset = vi.fn();
		renderError({ reset });

		fireEvent.click(screen.getByRole("button", { name: /try again/i }));
		expect(reset).toHaveBeenCalledTimes(1);
	});

	it("offers an absolute dashboard escape", () => {
		renderError();
		const link = screen.getByRole("link", { name: /go to dashboard/i });
		expect(link.getAttribute("href")).toBe("/dashboard");
	});
});
