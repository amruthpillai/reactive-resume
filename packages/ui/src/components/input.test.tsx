import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./input";

describe("Input", () => {
	it("renders an input element", () => {
		render(<Input data-testid="x" />);
		expect(screen.getByTestId("x").tagName).toBe("INPUT");
	});

	it("applies data-slot='input'", () => {
		render(<Input data-testid="x" />);
		expect(screen.getByTestId("x")).toHaveAttribute("data-slot", "input");
	});

	it("merges custom className", () => {
		render(<Input data-testid="x" className="custom-input" />);
		expect(screen.getByTestId("x")).toHaveClass("custom-input");
	});

	it("forwards type attribute", () => {
		render(<Input data-testid="x" type="email" />);
		expect(screen.getByTestId("x")).toHaveAttribute("type", "email");
	});

	it("calls onChange when typing", async () => {
		const onChange = vi.fn();
		render(<Input data-testid="x" onChange={onChange} />);
		await userEvent.type(screen.getByTestId("x"), "abc");
		expect(onChange).toHaveBeenCalled();
	});

	it("forwards placeholder", () => {
		render(<Input placeholder="Enter name" />);
		expect(screen.getByPlaceholderText("Enter name")).toBeInTheDocument();
	});

	it("respects disabled state", () => {
		render(<Input data-testid="x" disabled />);
		const input = screen.getByTestId("x");
		expect(input).toBeDisabled();
	});

	it("supports controlled value", () => {
		render(<Input data-testid="x" value="hello" onChange={() => {}} />);
		expect(screen.getByTestId("x")).toHaveValue("hello");
	});
});
