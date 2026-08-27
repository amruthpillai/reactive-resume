import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "./form";
import { InputGroup, InputGroupInput } from "./input-group";
import { Slider } from "./slider";

describe("FormItem", () => {
	it("renders with data-slot='form-item'", () => {
		render(<FormItem data-testid="i">x</FormItem>);
		expect(screen.getByTestId("i")).toHaveAttribute("data-slot", "form-item");
	});

	it("merges custom className", () => {
		render(
			<FormItem data-testid="i" className="my-class">
				x
			</FormItem>,
		);
		expect(screen.getByTestId("i")).toHaveClass("my-class");
	});

	it("provides id and hasError context to children", () => {
		render(
			<FormItem hasError>
				<FormLabel>Name</FormLabel>
				<FormControl render={(props) => <input {...props} data-testid="input" />} />
			</FormItem>,
		);

		const label = screen.getByText("Name");
		expect(label).toHaveAttribute("data-error", "true");

		const input = screen.getByTestId("input");
		expect(input).toHaveAttribute("aria-invalid", "true");
	});

	it("hasError defaults to false", () => {
		render(
			<FormItem>
				<FormLabel>Name</FormLabel>
				<FormControl render={(props) => <input {...props} data-testid="input" />} />
			</FormItem>,
		);

		const input = screen.getByTestId("input");
		expect(input).toHaveAttribute("aria-invalid", "false");
	});
});

describe("FormLabel", () => {
	it("renders with data-slot='form-label' and connects htmlFor to control via context id", () => {
		render(
			<FormItem>
				<FormLabel>Email</FormLabel>
				<FormControl render={(props) => <input {...props} type="email" />} />
			</FormItem>,
		);

		const label = screen.getByText("Email");
		expect(label).toHaveAttribute("data-slot", "form-label");
		const htmlFor = label.getAttribute("for");
		expect(htmlFor).toMatch(/-form-item$/);
	});
});

describe("FormControl", () => {
	it("forwards the generated id to the real control inside an InputGroup wrapper", () => {
		render(
			<FormItem>
				<FormLabel>Slug</FormLabel>
				<FormControl
					render={
						<InputGroup data-testid="group">
							<InputGroupInput data-testid="input" />
						</InputGroup>
					}
				/>
			</FormItem>,
		);

		const label = screen.getByText("Slug");
		const group = screen.getByTestId("group");
		const input = screen.getByTestId("input") as HTMLInputElement;

		expect(input).toHaveAttribute("id");
		expect(input.getAttribute("id")).toMatch(/-form-item$/);
		expect(label).toHaveAttribute("for", input.id);
		expect(group).not.toHaveAttribute("id", input.id);
	});

	it("forwards the generated id to the Base UI Slider control", () => {
		render(
			<FormItem>
				<FormLabel>Sidebar Width</FormLabel>
				<FormControl render={<Slider defaultValue={[30]} />} />
			</FormItem>,
		);

		const label = screen.getByText("Sidebar Width");
		const labelId = label.id;
		const htmlFor = label.getAttribute("for");
		const sliderInput = document.querySelector('input[type="range"]') as HTMLInputElement;

		expect(sliderInput).toBeInTheDocument();
		expect(sliderInput.id).toBe(htmlFor);
		expect(sliderInput.getAttribute("aria-labelledby")).toBe(labelId);
	});

	it("warns when the generated id lands on a non-labelable wrapper", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(
			<FormItem>
				<FormLabel>Name</FormLabel>
				<FormControl render={<div data-testid="wrapper" />} />
			</FormItem>,
		);

		expect(warn).toHaveBeenCalled();
		const call = warn.mock.calls.find(
			([message]) => typeof message === "string" && message.includes("not a labelable element"),
		);
		expect(call).toBeTruthy();

		warn.mockRestore();
	});

	it("sets aria-describedby pointing only to description when no error", () => {
		render(
			<FormItem>
				<FormControl render={(props) => <input {...props} data-testid="input" />} />
				<FormDescription>Help text</FormDescription>
			</FormItem>,
		);

		const input = screen.getByTestId("input");
		const describedBy = input.getAttribute("aria-describedby");
		expect(describedBy).toMatch(/-form-item-description$/);
		expect(describedBy).not.toContain("message");
	});

	it("includes message in aria-describedby when hasError=true", () => {
		render(
			<FormItem hasError>
				<FormControl render={(props) => <input {...props} data-testid="input" />} />
			</FormItem>,
		);

		const input = screen.getByTestId("input");
		const describedBy = input.getAttribute("aria-describedby");
		expect(describedBy).toContain("description");
		expect(describedBy).toContain("message");
	});
});

describe("FormDescription", () => {
	it("uses data-slot='form-description'", () => {
		render(
			<FormItem>
				<FormDescription>Help</FormDescription>
			</FormItem>,
		);
		expect(screen.getByText("Help")).toHaveAttribute("data-slot", "form-description");
	});

	it("id ends with '-form-item-description'", () => {
		render(
			<FormItem>
				<FormDescription>Help</FormDescription>
			</FormItem>,
		);
		expect(screen.getByText("Help").getAttribute("id")).toMatch(/-form-item-description$/);
	});
});

describe("FormMessage", () => {
	it("returns null when no errors", () => {
		const { container } = render(
			<FormItem>
				<FormMessage />
			</FormItem>,
		);
		expect(container.querySelector("[data-slot=form-message]")).not.toBeInTheDocument();
	});

	it("returns null when errors is empty", () => {
		const { container } = render(
			<FormItem>
				<FormMessage errors={[]} />
			</FormItem>,
		);
		expect(container.querySelector("[data-slot=form-message]")).not.toBeInTheDocument();
	});

	it("renders string error message", () => {
		render(
			<FormItem hasError>
				<FormMessage errors={["String error"]} />
			</FormItem>,
		);
		expect(screen.getByText("String error")).toBeInTheDocument();
	});

	it("renders error with .message property", () => {
		render(
			<FormItem hasError>
				<FormMessage errors={[{ message: "Object error" }]} />
			</FormItem>,
		);
		expect(screen.getByText("Object error")).toBeInTheDocument();
	});

	it("skips falsy and unrecognized errors and shows the first valid one", () => {
		render(
			<FormItem hasError>
				<FormMessage errors={[null, undefined, { wrong: "field" }, "Valid"]} />
			</FormItem>,
		);
		expect(screen.getByText("Valid")).toBeInTheDocument();
	});

	it("returns null when no extractable error message in array", () => {
		const { container } = render(
			<FormItem>
				<FormMessage errors={[null, undefined, { wrong: "field" }]} />
			</FormItem>,
		);
		expect(container.querySelector("[data-slot=form-message]")).not.toBeInTheDocument();
	});

	it("uses destructive class when hasError=true", () => {
		render(
			<FormItem hasError>
				<FormMessage errors={["Bad"]} />
			</FormItem>,
		);
		expect(screen.getByText("Bad")).toHaveClass("text-destructive");
	});

	it("uses muted class when hasError=false but errors are passed", () => {
		render(
			<FormItem>
				<FormMessage errors={["Hint"]} />
			</FormItem>,
		);
		expect(screen.getByText("Hint")).toHaveClass("text-muted-foreground");
	});
});
