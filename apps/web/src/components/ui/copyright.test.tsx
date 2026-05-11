// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

vi.stubGlobal("__APP_VERSION__", "9.9.9");

const { Copyright } = await import("./copyright");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const renderCopyright = (props?: React.ComponentProps<typeof Copyright>) =>
	render(
		<I18nProvider i18n={i18n}>
			<Copyright {...props} />
		</I18nProvider>,
	);

describe("Copyright", () => {
	it("renders the MIT license link", () => {
		renderCopyright();
		const link = screen.getByRole("link", { name: "MIT" });
		expect(link.getAttribute("href")).toBe("https://github.com/AmruthPillai/Reactive-Resume/blob/main/LICENSE");
		expect(link.getAttribute("rel")).toBe("noopener");
	});

	it("renders the Amruth Pillai attribution link", () => {
		renderCopyright();
		const link = screen.getByRole("link", { name: "Amruth Pillai" });
		expect(link.getAttribute("href")).toBe("https://amruthpillai.com");
	});

	it("includes the app version string", () => {
		renderCopyright();
		expect(screen.getByText(/v9\.9\.9/)).toBeInTheDocument();
	});

	it("merges custom className into the wrapper", () => {
		const { container } = renderCopyright({ className: "extra-class" });
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("extra-class");
		expect(wrapper.className).toContain("text-muted-foreground");
	});

	it("opens external links in a new tab", () => {
		renderCopyright();
		for (const link of screen.getAllByRole("link")) {
			expect(link.getAttribute("target")).toBe("_blank");
		}
	});
});
