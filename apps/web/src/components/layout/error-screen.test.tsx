// @vitest-environment happy-dom

import type { ErrorComponentProps } from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { ErrorScreen } from "./error-screen";

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
	it("shows the error message provided", () => {
		renderError({ error: new Error("Network is down") });
		expect(screen.getByText("Network is down")).toBeInTheDocument();
	});

	it("shows the user-facing error heading", () => {
		renderError();
		expect(screen.getByText("An error occurred while loading the page.")).toBeInTheDocument();
	});

	it("calls reset when the Refresh button is clicked", () => {
		const reset = vi.fn();
		renderError({ reset });

		fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
		expect(reset).toHaveBeenCalledTimes(1);
	});
});
