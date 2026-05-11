// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spotlight } from "./spotlight";

describe("Spotlight", () => {
	it("renders a non-pointer-events overlay container", () => {
		const { container } = render(<Spotlight />);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("pointer-events-none");
		expect(wrapper.className).toContain("absolute");
	});

	it("renders both left and right beam groups by default", () => {
		const { container } = render(<Spotlight />);
		// Outer wrapper > two animated beam containers
		const beamGroups = container.firstChild?.childNodes;
		expect(beamGroups?.length).toBe(2);
	});

	it("applies the provided width / height / smallWidth to inline styles", () => {
		const { container } = render(<Spotlight width={500} height={800} smallWidth={120} translateY={-100} />);

		const inlineStyles = Array.from(container.querySelectorAll<HTMLDivElement>("[style]")).map(
			(el) => el.getAttribute("style") ?? "",
		);
		const allStyles = inlineStyles.join("|");

		expect(allStyles).toContain("width: 500px");
		expect(allStyles).toContain("height: 800px");
		expect(allStyles).toContain("width: 120px");
		expect(allStyles).toContain("translateY(-100px)");
	});

	it("uses the supplied gradient strings as background values", () => {
		const customFirst = "radial-gradient(red, blue)";
		const { container } = render(<Spotlight gradientFirst={customFirst} />);

		const matched = Array.from(container.querySelectorAll<HTMLDivElement>("[style]")).filter(
			(el) => el.style.background.includes("red") && el.style.background.includes("blue"),
		);
		expect(matched.length).toBeGreaterThan(0);
	});
});
