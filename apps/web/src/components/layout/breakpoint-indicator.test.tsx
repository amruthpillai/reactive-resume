// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreakpointIndicator } from "./breakpoint-indicator";

const getWrapper = (container: HTMLElement) => container.firstChild as HTMLElement;

describe("BreakpointIndicator", () => {
	it("defaults to bottom-right positioning when no position is supplied", () => {
		const { container } = render(<BreakpointIndicator />);
		const wrapper = getWrapper(container);
		expect(wrapper.className).toContain("bottom-0");
		// bottom-right path: top branch sets the "bottom-0", right path sets "inset-e-0"
		expect(wrapper.className).toContain("inset-e-0");
	});

	it("renders all breakpoint labels (one is visible at each viewport)", () => {
		const { container } = render(<BreakpointIndicator />);
		const text = container.textContent ?? "";
		for (const label of ["XS", "SM", "MD", "LG", "XL", "2XL", "3XL", "4XL"]) {
			expect(text).toContain(label);
		}
	});

	it("uses top-left classes for top-left position", () => {
		const { container } = render(<BreakpointIndicator position="top-left" />);
		const wrapper = getWrapper(container);
		expect(wrapper.className).toContain("top-0");
		expect(wrapper.className).toContain("inset-s-0");
	});

	it("uses top-right classes for top-right position", () => {
		const { container } = render(<BreakpointIndicator position="top-right" />);
		const wrapper = getWrapper(container);
		expect(wrapper.className).toContain("top-0");
		expect(wrapper.className).toContain("inset-e-0");
	});

	it("uses bottom-left classes for bottom-left position", () => {
		const { container } = render(<BreakpointIndicator position="bottom-left" />);
		const wrapper = getWrapper(container);
		expect(wrapper.className).toContain("bottom-0");
		expect(wrapper.className).toContain("inset-s-0");
	});

	it("hides the indicator from print stylesheets", () => {
		const { container } = render(<BreakpointIndicator />);
		expect(getWrapper(container).className).toContain("print:hidden");
	});
});
