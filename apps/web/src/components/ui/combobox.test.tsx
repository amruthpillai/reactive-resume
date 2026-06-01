// @vitest-environment happy-dom

import type { ComboboxOption } from "./combobox";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Combobox } from "./combobox";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const options: ComboboxOption<"alpha" | "beta" | "gamma">[] = [
	{ value: "alpha", label: "Alpha" },
	{ value: "beta", label: "Beta" },
	{ value: "gamma", label: "Gamma" },
];

const wrap = (ui: React.ReactNode) => render(<I18nProvider i18n={i18n}>{ui}</I18nProvider>);

describe("Combobox", () => {
	it("renders the default placeholder when nothing is selected", () => {
		wrap(<Combobox options={[...options]} placeholder="Pick something" />);
		expect(screen.getByText("Pick something")).toBeInTheDocument();
	});

	it("renders the selected option label when a value is provided", () => {
		wrap(<Combobox options={[...options]} value="beta" />);
		// The label appears inside the trigger; both label and trigger may render it,
		// so use queryAllByText for resilience.
		expect(screen.getAllByText("Beta").length).toBeGreaterThan(0);
	});

	it("places the clear action inside the trigger footprint", () => {
		const { container } = wrap(<Combobox options={[...options]} value="beta" showClear />);

		expect(screen.getByRole("button", { name: "Clear selection" })).toHaveClass("absolute", "end-7");
		expect(screen.getByRole("combobox")).not.toHaveClass("pe-14");
		expect(container.querySelector("[data-slot='combobox-trigger'] > span")).toHaveClass("pe-7");
	});

	it("renders all option labels for the multi-select default values", () => {
		wrap(<Combobox multiple options={[...options]} defaultValue={["alpha", "gamma"]} />);
		expect(screen.getAllByText(/Alpha/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/Gamma/).length).toBeGreaterThan(0);
	});

	it("renders grouped options with group labels", async () => {
		const user = userEvent.setup();
		const groupedOptions: ComboboxOption[] = [
			{ value: "alpha", label: "Alpha", group: "Primary" },
			{ value: "beta", label: "Beta", group: { value: "secondary", label: "Secondary" } },
			{ value: "gamma", label: "Gamma", group: { value: "secondary", label: "Secondary" } },
		];

		wrap(<Combobox options={groupedOptions} placeholder="Pick something" />);

		await user.click(screen.getByRole("combobox"));

		expect(screen.getByText("Primary")).toBeInTheDocument();
		expect(screen.getByText("Secondary")).toBeInTheDocument();
		expect(screen.getByText("Alpha")).toBeInTheDocument();
		expect(screen.getByText("Beta")).toBeInTheDocument();
		expect(screen.getByText("Gamma")).toBeInTheDocument();
		expect(document.querySelectorAll("[data-slot=combobox-group]")).toHaveLength(2);
	});

	it("renders nothing extra when given an empty options array (no crash)", () => {
		expect(() => wrap(<Combobox options={[]} placeholder="Empty" />)).not.toThrow();
		expect(screen.getByText("Empty")).toBeInTheDocument();
	});
});
