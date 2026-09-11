import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, test } from "vitest";
import { createPortal } from "react-dom";
import { FormControl, FormItem, FormLabel } from "./form";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from "./input-group";

function PortaledInput() {
	return createPortal(<input aria-label="Portaled input" />, document.body);
}

describe("InputGroup", () => {
	it("renders a fieldset with data-slot='input-group'", () => {
		render(<InputGroup data-testid="g" />);
		const g = screen.getByTestId("g");
		expect(g.tagName).toBe("FIELDSET");
		expect(g).toHaveAttribute("data-slot", "input-group");
	});

	it("merges custom className", () => {
		render(<InputGroup data-testid="g" className="my-class" />);
		expect(screen.getByTestId("g")).toHaveClass("my-class");
	});

	it("preserves explicit fieldset identity and description in standalone usage", () => {
		// Standalone (no FormControl ancestor) the native fieldset props must
		// survive: the generated-prop strip only applies to FormControl
		// compositions, where the inner control carries them via context.
		render(
			<InputGroup id="caller-group" aria-describedby="hint" data-testid="g">
				<InputGroupInput data-testid="i" />
			</InputGroup>,
		);

		const g = screen.getByTestId("g");
		expect(g).toHaveAttribute("id", "caller-group");
		expect(g).toHaveAttribute("aria-describedby", "hint");
	});

	it("keeps the generated control id off the fieldset inside a FormControl", () => {
		render(
			<FormItem>
				<FormLabel>Slug</FormLabel>
				<FormControl
					render={
						<InputGroup data-testid="g">
							<InputGroupInput data-testid="i" />
						</InputGroup>
					}
				/>
			</FormItem>,
		);

		const g = screen.getByTestId("g");
		const input = screen.getByTestId("i");

		expect(input).toHaveAttribute("id");
		expect(input.getAttribute("id")).toMatch(/-form-item$/);
		expect(g).not.toHaveAttribute("id");
	});
});

describe("InputGroupAddon", () => {
	it("defaults align to 'inline-start'", () => {
		render(<InputGroupAddon data-testid="addon" />);
		expect(screen.getByTestId("addon")).toHaveAttribute("data-align", "inline-start");
	});

	it.each(["inline-start", "inline-end", "block-start", "block-end"] as const)("supports align=%s", (align) => {
		render(<InputGroupAddon data-testid="addon" align={align} />);
		expect(screen.getByTestId("addon")).toHaveAttribute("data-align", align);
	});

	it("uses data-slot='input-group-addon'", () => {
		render(<InputGroupAddon data-testid="addon" />);
		expect(screen.getByTestId("addon")).toHaveAttribute("data-slot", "input-group-addon");
	});

	it("focuses sibling input on click outside of buttons", () => {
		render(
			<InputGroup>
				<InputGroupAddon data-testid="addon">addon</InputGroupAddon>
				<InputGroupInput data-testid="i" />
			</InputGroup>,
		);

		const addon = screen.getByTestId("addon");
		fireEvent.click(addon);
		expect(document.activeElement).toBe(screen.getByTestId("i"));
	});

	it("focuses sibling input on Enter key", () => {
		render(
			<InputGroup>
				<InputGroupAddon data-testid="addon">addon</InputGroupAddon>
				<InputGroupInput data-testid="i" />
			</InputGroup>,
		);

		const addon = screen.getByTestId("addon");
		fireEvent.keyDown(addon, { key: "Enter" });
		expect(document.activeElement).toBe(screen.getByTestId("i"));
	});

	it("focuses sibling input on Space key", () => {
		render(
			<InputGroup>
				<InputGroupAddon data-testid="addon">addon</InputGroupAddon>
				<InputGroupInput data-testid="i" />
			</InputGroup>,
		);

		const addon = screen.getByTestId("addon");
		fireEvent.keyDown(addon, { key: " " });
		expect(document.activeElement).toBe(screen.getByTestId("i"));
	});

	it("ignores unrelated keys", () => {
		render(
			<InputGroup>
				<InputGroupAddon data-testid="addon">addon</InputGroupAddon>
				<InputGroupInput data-testid="i" />
			</InputGroup>,
		);

		const addon = screen.getByTestId("addon");
		fireEvent.keyDown(addon, { key: "a" });
		expect(document.activeElement).not.toBe(screen.getByTestId("i"));
	});

	test("does not redirect focus from controls rendered through a portal", async () => {
		const user = userEvent.setup();

		render(
			<InputGroup>
				<InputGroupAddon align="inline-end">
					<span>Addon</span>
					<PortaledInput />
				</InputGroupAddon>

				<InputGroupInput aria-label="Outer input" />
			</InputGroup>,
		);

		const portaledInput = screen.getByLabelText("Portaled input");
		const outerInput = screen.getByLabelText("Outer input");

		await user.click(portaledInput);

		expect(document.activeElement).toBe(portaledInput);
		expect(document.activeElement).not.toBe(outerInput);
	});
});

describe("InputGroupButton", () => {
	it("defaults to type='button' and variant='ghost'", () => {
		render(<InputGroupButton data-testid="b">x</InputGroupButton>);
		const button = screen.getByTestId("b");
		expect(button).toHaveAttribute("type", "button");
	});

	it("respects type override", () => {
		render(
			<InputGroupButton data-testid="b" type="submit">
				x
			</InputGroupButton>,
		);
		expect(screen.getByTestId("b")).toHaveAttribute("type", "submit");
	});

	it("applies data-size for size variants", () => {
		render(
			<InputGroupButton data-testid="b" size="sm">
				x
			</InputGroupButton>,
		);
		expect(screen.getByTestId("b")).toHaveAttribute("data-size", "sm");
	});
});

describe("InputGroupText", () => {
	it("renders as a span", () => {
		render(<InputGroupText>label</InputGroupText>);
		expect(screen.getByText("label").tagName).toBe("SPAN");
	});

	it("merges custom className", () => {
		render(<InputGroupText className="my-class">x</InputGroupText>);
		expect(screen.getByText("x")).toHaveClass("my-class");
	});
});

describe("InputGroupInput", () => {
	it("uses data-slot='input-group-control'", () => {
		render(<InputGroupInput data-testid="i" />);
		expect(screen.getByTestId("i")).toHaveAttribute("data-slot", "input-group-control");
	});
});

describe("InputGroupTextarea", () => {
	it("uses data-slot='input-group-control' and renders textarea", () => {
		render(<InputGroupTextarea data-testid="t" />);
		const t = screen.getByTestId("t");
		expect(t.tagName).toBe("TEXTAREA");
		expect(t).toHaveAttribute("data-slot", "input-group-control");
	});
});
