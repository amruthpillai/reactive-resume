// @vitest-environment happy-dom

import type { PropsWithChildren } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

type LinkProps = PropsWithChildren<{
	to: string;
}>;

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, ...rest }: LinkProps) => (
		<a href={to} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("@/components/animation/comet-card", () => ({
	CometCard: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

vi.mock("@/components/animation/spotlight", () => ({
	Spotlight: () => <div data-testid="spotlight" />,
}));

i18n.loadAndActivate({ locale: "en", messages: {} });

const { Hero } = await import("./hero");

describe("Hero", () => {
	it("shows a poster and waits for user interaction before loading the video", () => {
		const { container } = render(
			<I18nProvider i18n={i18n}>
				<Hero />
			</I18nProvider>,
		);
		const video = container.querySelector("video");

		expect(video).toHaveAttribute("poster", "/videos/timelapse-v1.webp");
		expect(video).toHaveAttribute("preload", "none");
		expect(video).toHaveAttribute("src", "/videos/timelapse-v1.mp4");
		expect(video).toHaveAttribute("controls");
		expect(video).not.toHaveAttribute("autoplay");
	});
});
