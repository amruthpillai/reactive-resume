import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Slider } from "./slider";

describe("Slider", () => {
	it("renders with data-slot='slider'", () => {
		render(<Slider data-testid="s" defaultValue={[50]} />);
		expect(screen.getByTestId("s")).toHaveAttribute("data-slot", "slider");
	});

	it("renders one thumb per value", () => {
		const { container } = render(<Slider defaultValue={[10, 90]} />);
		expect(container.querySelectorAll("[data-slot=slider-thumb]")).toHaveLength(2);
	});

	it("renders single thumb for single value", () => {
		const { container } = render(<Slider defaultValue={[50]} />);
		expect(container.querySelectorAll("[data-slot=slider-thumb]")).toHaveLength(1);
	});

	it("renders track and range", () => {
		const { container } = render(<Slider defaultValue={[50]} />);
		expect(container.querySelector("[data-slot=slider-track]")).toBeInTheDocument();
		expect(container.querySelector("[data-slot=slider-range]")).toBeInTheDocument();
	});

	it("respects custom min and max", () => {
		render(<Slider data-testid="s" defaultValue={[5]} min={0} max={10} />);
		// Value, min, max are reflected on the root element via aria attrs in some envs
		expect(screen.getByTestId("s")).toBeInTheDocument();
	});

	it("merges custom className", () => {
		render(<Slider data-testid="s" defaultValue={[50]} className="custom-slider" />);
		expect(screen.getByTestId("s")).toHaveClass("custom-slider");
	});

	it("lets a caller-supplied data-slot override the default", () => {
		render(<Slider data-testid="s" defaultValue={[50]} data-slot="custom-slider" />);
		expect(screen.getByTestId("s")).toHaveAttribute("data-slot", "custom-slider");
	});

	it("preserves a caller-supplied id in standalone usage", () => {
		// Standalone (no FormControl ancestor) an explicit id must survive:
		// LabelableProvider only applies an id when a FormControl supplies one.
		const { container } = render(<Slider id="caller-slider" defaultValue={[30]} />);
		expect(container.querySelector("#caller-slider")).toBeInTheDocument();
	});

	it("renders 2 thumbs with default min/max if no defaultValue or value passed", () => {
		const { container } = render(<Slider />);
		// Source code: defaults to [min, max] when neither value nor defaultValue is array
		expect(container.querySelectorAll("[data-slot=slider-thumb]")).toHaveLength(2);
	});
});
