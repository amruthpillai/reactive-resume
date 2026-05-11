// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountUp } from "./count-up";

describe("CountUp", () => {
	it("renders an aria-live=polite span by default (announced to screen readers)", () => {
		const { container } = render(<CountUp to={1000} />);
		const span = container.querySelector("span") as HTMLSpanElement;
		expect(span.getAttribute("aria-live")).toBe("polite");
		expect(span.getAttribute("aria-atomic")).toBe("true");
	});

	it("seeds textContent to the 'from' value when counting up", () => {
		const { container } = render(<CountUp from={0} to={100} />);
		const span = container.querySelector("span") as HTMLSpanElement;
		expect(span.textContent).toBe("0");
	});

	it("seeds textContent to the 'to' value when direction is down", () => {
		const { container } = render(<CountUp from={0} to={100} direction="down" />);
		const span = container.querySelector("span") as HTMLSpanElement;
		expect(span.textContent).toBe("100");
	});

	it("formats with the separator when one is supplied", () => {
		const { container } = render(<CountUp from={1234} to={2345} separator="," />);
		const span = container.querySelector("span") as HTMLSpanElement;
		expect(span.textContent).toBe("1,234");
	});

	it("preserves decimal places when from / to are fractional", () => {
		const { container } = render(<CountUp from={1.25} to={3.75} />);
		const span = container.querySelector("span") as HTMLSpanElement;
		expect(span.textContent).toBe("1.25");
	});

	it("strips aria-live and aria-atomic when aria-hidden is set", () => {
		const { container } = render(<CountUp to={100} aria-hidden="true" />);
		const span = container.querySelector("span") as HTMLSpanElement;
		expect(span.getAttribute("aria-hidden")).toBe("true");
		expect(span.getAttribute("aria-live")).toBeNull();
		expect(span.getAttribute("aria-atomic")).toBeNull();
	});

	it("accepts a custom className", () => {
		const { container } = render(<CountUp to={100} className="custom-class" />);
		const span = container.querySelector("span") as HTMLSpanElement;
		expect(span.className).toContain("custom-class");
	});
});
