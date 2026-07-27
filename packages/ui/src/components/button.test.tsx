import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
	it("renders children", () => {
		render(<Button>Click me</Button>);
		expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
	});

	it("defaults to type='button' to prevent accidental form submits", () => {
		render(<Button>Submit</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("type", "button");
	});

	it("respects an explicit type override", () => {
		render(<Button type="submit">Submit</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	it("applies the data-slot attribute for shadcn/base-ui slotting", () => {
		render(<Button>x</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("data-slot", "button");
	});

	it("merges custom className with variant classes", () => {
		render(<Button className="my-custom-class">x</Button>);
		expect(screen.getByRole("button")).toHaveClass("my-custom-class");
	});

	it("calls onClick when clicked", async () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>Click</Button>);
		await userEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("does not fire onClick when disabled", async () => {
		const onClick = vi.fn();
		render(
			<Button disabled onClick={onClick}>
				Click
			</Button>,
		);
		await userEvent.click(screen.getByRole("button"));
		expect(onClick).not.toHaveBeenCalled();
	});

	it("renders disabled state", () => {
		render(<Button disabled>x</Button>);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it.each([["default"], ["outline"], ["secondary"], ["ghost"], ["destructive"], ["link"]] as const)(
		"renders variant=%s without throwing",
		(variant) => {
			render(<Button variant={variant}>x</Button>);
			expect(screen.getByRole("button")).toBeInTheDocument();
		},
	);

	it.each([["default"], ["xs"], ["sm"], ["lg"], ["icon"], ["icon-xs"], ["icon-sm"], ["icon-lg"]] as const)(
		"renders size=%s without throwing",
		(size) => {
			render(<Button size={size}>x</Button>);
			expect(screen.getByRole("button")).toBeInTheDocument();
		},
	);

	it("forwards aria-label", () => {
		render(<Button aria-label="Close">×</Button>);
		expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
	});
});
