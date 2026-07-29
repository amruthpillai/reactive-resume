import { describe, expect, it, vi } from "vitest";
import { enterStylesheetFocusMode } from "./focus-mode";

describe("stylesheet focus mode", () => {
	it("resizes and restores the desktop right panel", () => {
		const currentLayout = { left: 22, artboard: 56, right: 22 };
		const resize = vi.fn();
		const setLayout = vi.fn();
		const rightPanel = { current: { resize } };

		const restore = enterStylesheetFocusMode({ rightPanel, currentLayout, setLayout });

		expect(resize).toHaveBeenCalledWith("45%");
		restore();
		expect(resize).toHaveBeenLastCalledWith("22%");
		expect(setLayout).toHaveBeenCalledWith(currentLayout);
	});
});
