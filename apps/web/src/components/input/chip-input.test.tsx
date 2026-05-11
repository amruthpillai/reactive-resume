// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { ChipInput } from "./chip-input";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const renderInput = (props: Partial<React.ComponentProps<typeof ChipInput>> = {}) =>
	render(
		<I18nProvider i18n={i18n}>
			<ChipInput defaultValue={[]} onChange={vi.fn()} {...props} />
		</I18nProvider>,
	);

describe("ChipInput", () => {
	it("renders the supplied chips as Badges", () => {
		renderInput({ defaultValue: ["alpha", "beta", "gamma"] });
		expect(screen.getByText("alpha")).toBeInTheDocument();
		expect(screen.getByText("beta")).toBeInTheDocument();
		expect(screen.getByText("gamma")).toBeInTheDocument();
	});

	it("adds a chip on Enter, calling onChange with the new list", () => {
		const onChange = vi.fn();
		renderInput({ defaultValue: ["a"], onChange });

		const input = document.querySelector("input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "b" } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(onChange).toHaveBeenCalledWith(["a", "b"]);
	});

	it("adds a chip on comma keypress", () => {
		const onChange = vi.fn();
		renderInput({ defaultValue: [], onChange });

		const input = document.querySelector("input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "new-tag" } });
		fireEvent.keyDown(input, { key: "," });

		expect(onChange).toHaveBeenCalledWith(["new-tag"]);
	});

	it("does not add a duplicate chip", () => {
		const onChange = vi.fn();
		renderInput({ defaultValue: ["a"], onChange });

		const input = document.querySelector("input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "a" } });
		fireEvent.keyDown(input, { key: "Enter" });

		// chips set should remain ["a"]; onChange not invoked with the same array.
		const callsAddingA = onChange.mock.calls.filter((args) => Array.isArray(args[0]) && args[0].length > 1);
		expect(callsAddingA.length).toBe(0);
	});

	it("does not add an empty / whitespace-only chip", () => {
		const onChange = vi.fn();
		renderInput({ defaultValue: ["a"], onChange });

		const input = document.querySelector("input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "   " } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(onChange).not.toHaveBeenCalled();
	});

	it("hides the description copy when hideDescription is true", () => {
		const { container } = renderInput({ defaultValue: ["a"], hideDescription: true });
		// We don't know the exact translated text, just confirm no <Kbd> hint banner is rendered.
		expect(container.querySelector("kbd")).toBeNull();
	});

	it("shows the description copy by default", () => {
		const { container } = renderInput({ defaultValue: ["a"] });
		expect(container.querySelector("kbd")).not.toBeNull();
	});
});
