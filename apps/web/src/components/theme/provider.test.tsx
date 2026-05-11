// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// ThemeProvider depends on TanStack Start helpers + server fn — stub them.
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock("@/libs/theme", () => ({
	setThemeServerFn: vi.fn().mockResolvedValue(undefined),
}));

const { ThemeProvider, useTheme } = await import("./provider");

describe("useTheme", () => {
	it("throws when used outside ThemeProvider", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => renderHook(() => useTheme())).toThrow(/useTheme must be used within a ThemeProvider/);
		consoleError.mockRestore();
	});

	it("returns the theme and helpers when wrapped in ThemeProvider", () => {
		const { result } = renderHook(() => useTheme(), {
			wrapper: ({ children }) => <ThemeProvider theme="dark">{children}</ThemeProvider>,
		});

		expect(result.current.theme).toBe("dark");
		expect(typeof result.current.setTheme).toBe("function");
		expect(typeof result.current.toggleTheme).toBe("function");
	});
});
