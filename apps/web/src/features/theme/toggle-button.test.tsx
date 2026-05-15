// @vitest-environment happy-dom

import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";

const toggleTheme = vi.hoisted(() => vi.fn());

vi.mock("./provider", () => ({
	useTheme: () => ({ theme: "light", setTheme: vi.fn(), toggleTheme }),
}));

const { ThemeToggleButton } = await import("./toggle-button");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	toggleTheme.mockReset();
	// Reset prefers-reduced-motion + startViewTransition stub between tests.
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {},
		})),
	});
	// biome-ignore lint/suspicious/noExplicitAny: removing a non-standard API stub
	(document as any).startViewTransition = undefined;
});

describe("ThemeToggleButton", () => {
	it("renders a button with an aria-label that flips with the theme", () => {
		const { container } = render(<ThemeToggleButton />);
		const button = container.querySelector("button");
		expect(button?.getAttribute("aria-label")).toBe("Switch to dark theme");
	});

	it("calls toggleTheme directly when the view-transition API is unavailable", () => {
		const { container } = render(<ThemeToggleButton />);
		const button = container.querySelector("button") as HTMLButtonElement;

		fireEvent.click(button);

		expect(toggleTheme).toHaveBeenCalledTimes(1);
	});

	it("calls toggleTheme directly when prefers-reduced-motion is set", () => {
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			configurable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: query.includes("prefers-reduced-motion"),
				media: query,
				addEventListener: () => {},
				removeEventListener: () => {},
			})),
		});

		const startVT = vi.fn();
		Object.defineProperty(document, "startViewTransition", {
			writable: true,
			configurable: true,
			value: startVT,
		});

		const { container } = render(<ThemeToggleButton />);
		fireEvent.click(container.querySelector("button") as HTMLButtonElement);

		expect(toggleTheme).toHaveBeenCalledTimes(1);
		expect(startVT).not.toHaveBeenCalled();
	});
});
