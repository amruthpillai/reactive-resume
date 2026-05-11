// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { LoadingScreen } from "./loading-screen";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("LoadingScreen", () => {
	it("renders a spinner and the loading text", () => {
		render(
			<I18nProvider i18n={i18n}>
				<LoadingScreen />
			</I18nProvider>,
		);

		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("fills the viewport (fixed inset-0)", () => {
		const { container } = render(
			<I18nProvider i18n={i18n}>
				<LoadingScreen />
			</I18nProvider>,
		);

		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("fixed");
		expect(wrapper.className).toContain("inset-0");
	});
});
