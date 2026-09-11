import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	ComboboxRoot,
	ComboboxSeparator,
	ComboboxTrigger,
	ComboboxValue,
	useFilter,
} from "./combobox";

const items = ["Apple", "Banana", "Cherry"];

const renderCombobox = (overrides: Partial<Parameters<typeof ComboboxRoot>[0]> = {}) =>
	render(
		<ComboboxRoot items={items} {...overrides}>
			<ComboboxInput placeholder="Search" />
			<ComboboxContent>
				<ComboboxList>
					{items.map((item) => (
						<ComboboxItem key={item} value={item}>
							{item}
						</ComboboxItem>
					))}
				</ComboboxList>
			</ComboboxContent>
		</ComboboxRoot>,
	);

describe("ComboboxRoot/Input", () => {
	it("renders ComboboxInput with data-slot='combobox-input' (input is from primitive)", () => {
		const { container } = renderCombobox();
		// The InputGroupInput wraps with data-slot 'input-group-control' which is from input-group
		expect(container.querySelector("[data-slot=input-group-control]")).toBeInTheDocument();
	});

	it("does not render content when closed", () => {
		renderCombobox();
		expect(screen.queryByText("Apple")).not.toBeInTheDocument();
	});

	it("renders content when open=true", () => {
		renderCombobox({ open: true });
		expect(screen.getByText("Apple")).toBeInTheDocument();
		expect(screen.getByText("Banana")).toBeInTheDocument();
	});
});

describe("ComboboxValue", () => {
	it("renders inside primitive without throwing", () => {
		expect(() =>
			render(
				<ComboboxRoot items={items} value="Apple">
					<ComboboxValue />
				</ComboboxRoot>,
			),
		).not.toThrow();
	});
});

describe("ComboboxItem", () => {
	it("renders with data-slot='combobox-item'", () => {
		renderCombobox({ open: true });
		expect(document.querySelectorAll("[data-slot=combobox-item]").length).toBeGreaterThan(0);
	});
});

describe("ComboboxList / ComboboxGroup / ComboboxLabel", () => {
	it("ComboboxList renders with data-slot='combobox-list'", () => {
		renderCombobox({ open: true });
		expect(document.querySelector("[data-slot=combobox-list]")).toBeInTheDocument();
	});

	it("ComboboxGroup and ComboboxLabel render with their slots", () => {
		render(
			<ComboboxRoot items={items} open>
				<ComboboxInput />
				<ComboboxContent>
					<ComboboxList>
						<ComboboxGroup items={items}>
							<ComboboxLabel>Fruits</ComboboxLabel>
							<ComboboxItem value="Apple">Apple</ComboboxItem>
						</ComboboxGroup>
					</ComboboxList>
				</ComboboxContent>
			</ComboboxRoot>,
		);
		expect(document.querySelector("[data-slot=combobox-group]")).toBeInTheDocument();
		expect(document.querySelector("[data-slot=combobox-label]")).toBeInTheDocument();
	});
});

describe("ComboboxSeparator and ComboboxEmpty", () => {
	it("ComboboxSeparator renders with data-slot='combobox-separator'", () => {
		render(
			<ComboboxRoot items={items} open>
				<ComboboxInput />
				<ComboboxContent>
					<ComboboxList>
						<ComboboxItem value="Apple">Apple</ComboboxItem>
						<ComboboxSeparator />
						<ComboboxItem value="Banana">Banana</ComboboxItem>
					</ComboboxList>
				</ComboboxContent>
			</ComboboxRoot>,
		);
		expect(document.querySelector("[data-slot=combobox-separator]")).toBeInTheDocument();
	});

	it("ComboboxEmpty renders with data-slot='combobox-empty'", () => {
		render(
			<ComboboxRoot items={[]} open>
				<ComboboxInput />
				<ComboboxContent>
					<ComboboxEmpty>No results</ComboboxEmpty>
				</ComboboxContent>
			</ComboboxRoot>,
		);
		expect(document.querySelector("[data-slot=combobox-empty]")).toBeInTheDocument();
	});
});

describe("ComboboxCollection", () => {
	it("renders without throwing", () => {
		expect(() =>
			render(
				<ComboboxRoot items={items} open>
					<ComboboxInput />
					<ComboboxContent>
						<ComboboxList>
							<ComboboxCollection>
								{(item) => (
									<ComboboxItem key={item} value={item}>
										{item}
									</ComboboxItem>
								)}
							</ComboboxCollection>
						</ComboboxList>
					</ComboboxContent>
				</ComboboxRoot>,
			),
		).not.toThrow();
	});
});

describe("ComboboxClear", () => {
	it("renders inside ComboboxInput when showClear=true", () => {
		const { container } = render(
			<ComboboxRoot items={items} value="Apple">
				<ComboboxInput showClear />
			</ComboboxRoot>,
		);
		expect(container.querySelector("[data-slot=combobox-clear]")).toBeInTheDocument();
	});
});

describe("ComboboxTrigger", () => {
	it("renders an input-group-button addon when showTrigger=true (default)", () => {
		const { container } = renderCombobox();
		// ComboboxTrigger is rendered inside InputGroupButton which sets its own data-slot.
		expect(container.querySelector("[data-slot=input-group-button]")).toBeInTheDocument();
	});

	it("hides input-group-button addon when showTrigger=false and showClear=false", () => {
		const { container } = render(
			<ComboboxRoot items={items}>
				<ComboboxInput showTrigger={false} />
			</ComboboxRoot>,
		);
		expect(container.querySelector("[data-slot=input-group-button]")).not.toBeInTheDocument();
	});

	it("ComboboxTrigger renders standalone with data-slot='combobox-trigger'", () => {
		const { container } = render(
			<ComboboxRoot items={items}>
				<ComboboxTrigger>Open</ComboboxTrigger>
			</ComboboxRoot>,
		);
		expect(container.querySelector("[data-slot=combobox-trigger]")).toBeInTheDocument();
	});
});

describe("ComboboxChips and friends", () => {
	it("renders ComboboxChips with data-slot='combobox-chips'", () => {
		const { container } = render(
			<ComboboxRoot items={items} multiple value={["Apple"]}>
				<ComboboxChips>
					<ComboboxChipsInput />
				</ComboboxChips>
			</ComboboxRoot>,
		);
		expect(container.querySelector("[data-slot=combobox-chips]")).toBeInTheDocument();
	});

	it("renders ComboboxChipsInput with data-slot='combobox-chip-input'", () => {
		const { container } = render(
			<ComboboxRoot items={items} multiple value={["Apple"]}>
				<ComboboxChips>
					<ComboboxChipsInput />
				</ComboboxChips>
			</ComboboxRoot>,
		);
		expect(container.querySelector("[data-slot=combobox-chip-input]")).toBeInTheDocument();
	});
});

describe("useFilter", () => {
	it("is exported as a function", () => {
		expect(typeof useFilter).toBe("function");
	});
});
