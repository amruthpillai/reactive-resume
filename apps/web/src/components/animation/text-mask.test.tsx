// @vitest-environment happy-dom

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextMaskEffect } from "./text-mask";

const renderMask = (props: React.ComponentProps<typeof TextMaskEffect>) => render(<TextMaskEffect {...props} />);

describe("TextMaskEffect", () => {
	it("renders the supplied text in all visible text layers", () => {
		const { container } = renderMask({ text: "Hello World" });
		const texts = container.querySelectorAll("text");
		expect(texts.length).toBeGreaterThanOrEqual(2);
		for (const el of texts) {
			expect(el.textContent).toBe("Hello World");
		}
	});

	it("forwards aria-hidden onto the root svg", () => {
		const { container } = renderMask({ text: "X", "aria-hidden": "true" });
		const svg = container.querySelector("svg") as SVGSVGElement;
		expect(svg.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders an aria-label on the root svg", () => {
		const { container } = renderMask({ text: "X" });
		const svg = container.querySelector("svg") as SVGSVGElement;
		expect(svg.getAttribute("aria-label")).toBe("Text mask effect");
	});

	it("does not throw on mouse-enter / mouse-move / mouse-leave interactions", () => {
		const { container } = renderMask({ text: "X" });
		const svg = container.querySelector("svg") as SVGSVGElement;

		expect(() => {
			fireEvent.mouseEnter(svg);
			fireEvent.mouseMove(svg, { clientX: 50, clientY: 25 });
			fireEvent.mouseLeave(svg);
		}).not.toThrow();
	});

	it("merges custom className into the svg", () => {
		const { container } = renderMask({ text: "X", className: "custom-class" });
		const svg = container.querySelector("svg") as SVGSVGElement;
		expect(svg.getAttribute("class") ?? "").toContain("custom-class");
	});
});
