// @vitest-environment happy-dom

import type { ComboboxOption } from "./combobox";
import { render, screen } from "@testing-library/react";
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

	it("renders all option labels for the multi-select default values", () => {
		wrap(<Combobox multiple options={[...options]} defaultValue={["alpha", "gamma"]} />);
		expect(screen.getAllByText(/Alpha/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/Gamma/).length).toBeGreaterThan(0);
	});

	it("renders nothing extra when given an empty options array (no crash)", () => {
		expect(() => wrap(<Combobox options={[]} placeholder="Empty" />)).not.toThrow();
		expect(screen.getByText("Empty")).toBeInTheDocument();
	});
});
