// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

vi.mock("@uiw/react-color-colorful", () => ({
	default: () => null,
}));

const { ColorPicker } = await import("./color-picker");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const renderPicker = (props: React.ComponentProps<typeof ColorPicker> = {}) =>
	render(
		<I18nProvider i18n={i18n}>
			<ColorPicker {...props} />
		</I18nProvider>,
	);

describe("ColorPicker", () => {
	it("renders a trigger swatch reflecting the current value", () => {
		const { container } = renderPicker({ defaultValue: "rgba(231, 0, 11, 1)" });
		const trigger = container.querySelector("[style*='background-color']") as HTMLElement | null;
		expect(trigger).not.toBeNull();
		// happy-dom serializes both the input rgba string and the rgb representation,
		// depending on alpha; just confirm the color values surface.
		const bg = trigger?.getAttribute("style") ?? "";
		expect(bg).toContain("231");
		expect(bg).toContain("11");
	});

	it("calls onChange when a preset color is clicked", () => {
		const onChange = vi.fn();
		renderPicker({ defaultValue: "rgba(0, 0, 0, 1)", onChange });

		// Open the popover by clicking the trigger swatch.
		const triggerSwatch = document.querySelector("[style*='background-color']") as HTMLElement;
		fireEvent.click(triggerSwatch);

		// Locate any preset button (they have aria-label='Use color rgba(...)').
		const presetBtn = screen.getAllByRole("button", { name: /Use color rgba\(/ })[0];
		fireEvent.click(presetBtn);

		expect(onChange).toHaveBeenCalled();
		expect(onChange.mock.calls[0]?.[0]).toMatch(/^rgba\(/);
	});

	it("renders a custom trigger when provided", () => {
		renderPicker({
			defaultValue: "rgba(0, 0, 0, 1)",
			trigger: <button type="button">custom trigger</button>,
		});

		expect(screen.getByText("custom trigger")).toBeInTheDocument();
	});
});
