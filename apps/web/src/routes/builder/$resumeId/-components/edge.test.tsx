// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BuilderSidebarEdge } from "./edge";

describe("BuilderSidebarEdge", () => {
	it("renders its children inside the edge container", () => {
		const { getByText } = render(
			<BuilderSidebarEdge side="left">
				<span>child</span>
			</BuilderSidebarEdge>,
		);
		expect(getByText("child")).toBeInTheDocument();
	});

	it("uses left-side classes (inset-s-0 + border-r) when side='left'", () => {
		const { container } = render(
			<BuilderSidebarEdge side="left">
				<span>x</span>
			</BuilderSidebarEdge>,
		);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("inset-s-0");
		expect(wrapper.className).toContain("border-r");
	});

	it("uses right-side classes (inset-e-0 + border-l) when side='right'", () => {
		const { container } = render(
			<BuilderSidebarEdge side="right">
				<span>x</span>
			</BuilderSidebarEdge>,
		);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("inset-e-0");
		expect(wrapper.className).toContain("border-l");
	});

	it("is hidden on mobile (hidden + sm:flex)", () => {
		const { container } = render(
			<BuilderSidebarEdge side="left">
				<span>x</span>
			</BuilderSidebarEdge>,
		);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("hidden");
		expect(wrapper.className).toContain("sm:flex");
	});
});
