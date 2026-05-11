// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Prefooter } from "./prefooter";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const renderPrefooter = () =>
	render(
		<I18nProvider i18n={i18n}>
			<Prefooter />
		</I18nProvider>,
	);

describe("Prefooter", () => {
	it("renders the community tagline as a heading", () => {
		renderPrefooter();
		expect(screen.getByText("By the community, for the community.")).toBeInTheDocument();
	});

	it("renders the community-thanks paragraph", () => {
		renderPrefooter();
		expect(screen.getByText(/vibrant community/)).toBeInTheDocument();
	});

	it("renders the decorative TextMaskEffect (svg)", () => {
		const { container } = renderPrefooter();
		expect(container.querySelector("svg")).not.toBeNull();
	});
});
