// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { URLInput } from "./url-input";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const renderInput = (value: { url: string; label: string }, onChange = vi.fn(), hideLabelButton = false) =>
	render(
		<I18nProvider i18n={i18n}>
			<URLInput value={value} onChange={onChange} hideLabelButton={hideLabelButton} />
		</I18nProvider>,
	);

describe("URLInput", () => {
	it("strips the https:// prefix in the visible input value", () => {
		renderInput({ url: "https://example.com/path", label: "" });
		const input = screen.getByRole("textbox") as HTMLInputElement;
		expect(input.value).toBe("example.com/path");
	});

	it("renders the raw value when no prefix is present", () => {
		renderInput({ url: "no-prefix.example", label: "" });
		const input = screen.getByRole("textbox") as HTMLInputElement;
		expect(input.value).toBe("no-prefix.example");
	});

	it("adds https:// prefix on edit when not already present", () => {
		const onChange = vi.fn();
		renderInput({ url: "https://example.com", label: "" }, onChange);

		const input = screen.getByRole("textbox") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "new.example" } });

		expect(onChange).toHaveBeenCalledWith({
			url: "https://new.example",
			label: "",
		});
	});

	it("keeps already-prefixed URLs intact on edit", () => {
		const onChange = vi.fn();
		renderInput({ url: "https://example.com", label: "" }, onChange);

		const input = screen.getByRole("textbox") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "https://other.example" } });

		expect(onChange).toHaveBeenCalledWith({
			url: "https://other.example",
			label: "",
		});
	});

	it("emits an empty url string when cleared", () => {
		const onChange = vi.fn();
		renderInput({ url: "https://example.com", label: "" }, onChange);

		const input = screen.getByRole("textbox") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "" } });

		expect(onChange).toHaveBeenCalledWith({
			url: "",
			label: "",
		});
	});

	it("hides the label button when hideLabelButton=true", () => {
		const { container } = renderInput({ url: "https://example.com", label: "" }, vi.fn(), true);

		// PopoverTrigger is rendered as a button; its absence means hideLabelButton worked.
		const buttons = container.querySelectorAll("button");
		expect(buttons.length).toBe(0);
	});

	it("renders the label button by default", () => {
		const { container } = renderInput({ url: "https://example.com", label: "" });
		const buttons = container.querySelectorAll("button");
		expect(buttons.length).toBeGreaterThan(0);
	});
});
