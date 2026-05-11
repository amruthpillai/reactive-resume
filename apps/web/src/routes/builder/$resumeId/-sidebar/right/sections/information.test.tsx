// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { InformationSectionBuilder } = await import("./information");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const renderInfo = () =>
	render(
		<I18nProvider i18n={i18n}>
			<InformationSectionBuilder />
		</I18nProvider>,
	);

describe("InformationSectionBuilder", () => {
	it("renders the donation prompt and CTA", () => {
		renderInfo();
		expect(screen.getByText("Support the app by doing what you can!")).toBeInTheDocument();
		expect(screen.getByText("Donate to Reactive Resume")).toBeInTheDocument();
	});

	it("links to the OpenCollective donation page", () => {
		renderInfo();
		const donateLink = screen.getByText("Donate to Reactive Resume").closest("a");
		expect(donateLink?.getAttribute("href")).toBe("http://opencollective.com/reactive-resume");
	});

	it("includes external resource links (docs, source, bugs, translations, sponsors)", () => {
		renderInfo();
		const labels = ["Documentation", "Source Code", "Report a Bug", "Translations", "Sponsors"];
		for (const label of labels) {
			expect(screen.getByText(label).closest("a"), label).not.toBeNull();
		}
	});

	it("opens external links in a new tab", () => {
		renderInfo();
		const docs = screen.getByText("Documentation").closest("a") as HTMLAnchorElement;
		expect(docs.getAttribute("target")).toBe("_blank");
		expect(docs.getAttribute("rel")).toBe("noopener");
	});
});
