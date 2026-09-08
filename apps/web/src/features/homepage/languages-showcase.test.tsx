// @vitest-environment happy-dom

import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { I18nProvider } from "@lingui/react";
import Cookies from "js-cookie";
import { getLocaleMessages, localeMap } from "@/libs/locale";
import LanguagesShowcase from "./languages-showcase";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	Cookies.remove("locale");
	i18n.loadAndActivate({ locale: "en-US", messages: {} });
});

it("reflects the app locale and persists changes from both language pickers", async () => {
	const reload = vi.spyOn(window.location, "reload").mockImplementation(() => undefined);
	i18n.loadAndActivate(await getLocaleMessages("ar-SA"));
	const { getByRole, getByText, container } = render(
		<I18nProvider i18n={i18n}>
			<LanguagesShowcase />
		</I18nProvider>,
	);
	const featuredPicker = within(getByRole("group", { name: i18n._(msg`Choose app language`) }));
	expect(featuredPicker.getByRole("button", { name: "العربية" }).getAttribute("aria-pressed")).toBe("true");
	expect(container.querySelector(".language-paper")?.getAttribute("lang")).toBe("ar-SA");
	expect(container.querySelector(".language-paper")?.getAttribute("dir")).toBe("rtl");
	expect(container.querySelector(".language-paper")?.textContent).toContain("الخبرة");
	fireEvent.click(featuredPicker.getByRole("button", { name: "Deutsch" }));
	expect(Cookies.get("locale")).toBe("de-DE");
	expect(reload).toHaveBeenCalledOnce();

	fireEvent.click(getByText(i18n._(msg`Show all languages`)));
	const allLanguages = within(getByRole("group", { name: i18n._(msg`All app languages`) }));
	fireEvent.click(allLanguages.getByRole("button", { name: i18n._(localeMap["fr-FR"]) }));
	expect(Cookies.get("locale")).toBe("fr-FR");
	expect(reload).toHaveBeenCalledTimes(2);
});
