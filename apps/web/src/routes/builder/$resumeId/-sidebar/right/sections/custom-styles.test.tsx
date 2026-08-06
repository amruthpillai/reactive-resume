// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/resume/stylesheet/editor", () => ({
	default: () => <div data-testid="semantic-css-editor-shell">Semantic CSS editor</div>,
}));

const { CustomStylesSectionBuilder } = await import("./custom-styles");
const { useSectionStore } = await import("../../../-store/section");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	useSectionStore.setState((state) => ({
		sections: {
			...state.sections,
			styles: { ...state.sections.styles, collapsed: false },
		},
	}));
});

it("always loads the Semantic CSS shell", async () => {
	render(
		<I18nProvider i18n={i18n}>
			<CustomStylesSectionBuilder />
		</I18nProvider>,
	);

	expect(await screen.findByTestId("semantic-css-editor-shell")).toBeInTheDocument();
});
