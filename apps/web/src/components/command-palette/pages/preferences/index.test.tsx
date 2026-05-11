// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Command } from "@reactive-resume/ui/components/command";
import { useCommandPaletteStore } from "../../store";

vi.mock("@/components/theme/provider", () => ({
	useTheme: () => ({ setTheme: vi.fn(), theme: "light", toggleTheme: vi.fn() }),
}));

const { PreferencesCommandGroup } = await import("./index");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	useCommandPaletteStore.setState({ open: false, search: "", pages: [] });
});

const renderGroup = () =>
	render(
		<I18nProvider i18n={i18n}>
			<Command>
				<PreferencesCommandGroup />
			</Command>
		</I18nProvider>,
	);

describe("PreferencesCommandGroup", () => {
	it("renders 'Change theme to...' and 'Change language to...' at the root", () => {
		renderGroup();
		expect(screen.getByText("Change theme to...")).toBeInTheDocument();
		expect(screen.getByText("Change language to...")).toBeInTheDocument();
	});

	it("pushes 'theme' onto the page stack when the theme item is selected", () => {
		renderGroup();
		const item = screen.getByText("Change theme to...");
		fireEvent.click(item);
		expect(useCommandPaletteStore.getState().pages).toContain("theme");
	});

	it("pushes 'language' onto the page stack when the language item is selected", () => {
		renderGroup();
		fireEvent.click(screen.getByText("Change language to..."));
		expect(useCommandPaletteStore.getState().pages).toContain("language");
	});
});
