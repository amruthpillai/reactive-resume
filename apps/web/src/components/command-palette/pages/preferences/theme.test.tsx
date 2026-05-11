// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Command } from "@reactive-resume/ui/components/command";
import { useCommandPaletteStore } from "../../store";

vi.mock("@/components/theme/provider", () => ({
	useTheme: () => ({ setTheme: vi.fn(), theme: "light", toggleTheme: vi.fn() }),
}));

const { ThemeCommandPage } = await import("./theme");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	useCommandPaletteStore.setState({ open: false, search: "", pages: [] });
});

const renderPage = () =>
	render(
		<I18nProvider i18n={i18n}>
			<Command>
				<ThemeCommandPage />
			</Command>
		</I18nProvider>,
	);

describe("ThemeCommandPage", () => {
	it("is hidden when 'theme' is not on top of the page stack", () => {
		renderPage();
		expect(screen.queryByText("Light theme")).toBeNull();
	});

	it("renders Light + Dark options when active", () => {
		useCommandPaletteStore.setState({ pages: ["theme"] });
		renderPage();
		expect(screen.getByText("Light theme")).toBeInTheDocument();
		expect(screen.getByText("Dark theme")).toBeInTheDocument();
	});
});
