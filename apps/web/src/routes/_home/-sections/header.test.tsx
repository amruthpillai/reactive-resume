// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, ...rest }: React.PropsWithChildren<{ to: string }>) => (
		<a href={typeof to === "string" ? to : "#"} {...rest}>
			{children}
		</a>
	),
}));
vi.mock("@/components/input/github-stars-button", () => ({
	GithubStarsButton: () => <div data-testid="github-stars-button" />,
}));
vi.mock("@/components/locale/combobox", () => ({
	LocaleCombobox: ({ render: renderProp }: { render: React.ReactElement }) => renderProp,
}));
vi.mock("@/components/theme/toggle-button", () => ({
	ThemeToggleButton: () => <button type="button" data-testid="theme-toggle" />,
}));

i18n.loadAndActivate({ locale: "en", messages: {} });

const { Header } = await import("./header");

const renderHeader = () =>
	render(
		<I18nProvider i18n={i18n}>
			<Header />
		</I18nProvider>,
	);

describe("Header", () => {
	it("renders a homepage link with the brand icon", () => {
		const { container } = renderHeader();
		const home = Array.from(container.querySelectorAll("a")).find((a) => a.getAttribute("href") === "/");
		expect(home).toBeDefined();
		expect(home?.getAttribute("aria-label")).toBe("Reactive Resume - Go to homepage");
	});

	it("renders a dashboard link with the documented aria-label", () => {
		const { container } = renderHeader();
		const dashboard = Array.from(container.querySelectorAll("a")).find((a) => a.getAttribute("href") === "/dashboard");
		expect(dashboard).toBeDefined();
	});

	it("includes ThemeToggleButton and GithubStarsButton in the navigation", () => {
		const { getByTestId } = renderHeader();
		expect(getByTestId("theme-toggle")).toBeInTheDocument();
		expect(getByTestId("github-stars-button")).toBeInTheDocument();
	});

	it("labels the navigation landmark", () => {
		const { container } = renderHeader();
		const nav = container.querySelector("nav") as HTMLElement;
		expect(nav.getAttribute("aria-label")).toBe("Main navigation");
	});
});
