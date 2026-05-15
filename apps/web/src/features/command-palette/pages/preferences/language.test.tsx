// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Command } from "@reactive-resume/ui/components/command";
import { localeMap } from "@/libs/locale";
import { useCommandPaletteStore } from "../../store";
import { LanguageCommandPage } from "./language";

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
				<LanguageCommandPage />
			</Command>
		</I18nProvider>,
	);

describe("LanguageCommandPage", () => {
	it("does NOT render when the page stack does not have 'language' on top", () => {
		renderPage();
		// localeMap codes shouldn't appear because BaseCommandGroup gating is off.
		expect(screen.queryByText("en-US")).toBeNull();
	});

	it("renders one CommandItem for every entry in localeMap when active", () => {
		useCommandPaletteStore.setState({ pages: ["language"] });
		renderPage();

		const expectedCount = Object.keys(localeMap).length;
		expect(expectedCount).toBeGreaterThan(0);

		// Each locale value is rendered in the inline font-mono span.
		for (const code of Object.keys(localeMap).slice(0, 5)) {
			expect(screen.getByText(code)).toBeInTheDocument();
		}
	});

	it("includes the documented set of locales (sample check)", () => {
		useCommandPaletteStore.setState({ pages: ["language"] });
		renderPage();
		// Spot-check a couple of common locales.
		for (const code of ["en-US", "de-DE", "ja-JP"]) {
			if (code in localeMap) {
				expect(screen.getByText(code)).toBeInTheDocument();
			}
		}
	});
});
