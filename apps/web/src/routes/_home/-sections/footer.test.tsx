// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

vi.stubGlobal("__APP_VERSION__", "9.9.9");

// The footer module evaluates `socialLinks = [{ label: t`...`, ... }]` at module
// scope. That `t` call needs an activated locale BEFORE the import, so do that
// here instead of in beforeAll.
i18n.loadAndActivate({ locale: "en", messages: {} });

const { Footer } = await import("./footer");

const renderFooter = () =>
	render(
		<I18nProvider i18n={i18n}>
			<Footer />
		</I18nProvider>,
	);

describe("Footer", () => {
	it("renders Resources and Community link group headings", () => {
		renderFooter();
		expect(screen.getByText("Resources")).toBeInTheDocument();
		expect(screen.getByText("Community")).toBeInTheDocument();
	});

	it("renders the documented resource links", () => {
		const { container } = renderFooter();
		const text = container.textContent ?? "";
		for (const label of ["Documentation", "Sponsorships", "Source Code", "Changelog"]) {
			expect(text, label).toContain(label);
		}
	});

	it("renders the documented community links", () => {
		const { container } = renderFooter();
		const text = container.textContent ?? "";
		for (const label of ["Report an issue", "Translations", "Subreddit", "Discord"]) {
			expect(text, label).toContain(label);
		}
	});

	it("renders social media icon links to GitHub, LinkedIn, and X", () => {
		const { container } = renderFooter();
		const hrefs = Array.from(container.querySelectorAll<HTMLAnchorElement>("a")).map((a) => a.href);
		expect(hrefs.some((h) => h.includes("github.com/amruthpillai/reactive-resume"))).toBe(true);
		expect(hrefs.some((h) => h.includes("linkedin.com/in/amruthpillai"))).toBe(true);
		expect(hrefs.some((h) => h.includes("x.com/KingOKings"))).toBe(true);
	});

	it("includes Reactive Resume version copy via Copyright", () => {
		renderFooter();
		expect(screen.getByText(/v9\.9\.9/)).toBeInTheDocument();
	});
});
