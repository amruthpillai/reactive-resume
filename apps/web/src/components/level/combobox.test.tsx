// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";

// Capture the options the Combobox receives so we can introspect them.
const captured = vi.hoisted(() => ({
	options: undefined as Array<{ value: string; label: string }> | undefined,
}));

vi.mock("@/components/ui/combobox", () => ({
	Combobox: (props: { options: Array<{ value: string; label: string }> }) => {
		captured.options = props.options;
		return null;
	},
}));

const { LevelTypeCombobox } = await import("./combobox");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("LevelTypeCombobox", () => {
	it("renders one option per level type from levelDesignSchema", () => {
		render(<LevelTypeCombobox />);

		expect(captured.options?.length).toBe(7);
		const values = captured.options?.map((o) => o.value);
		expect(values).toEqual(
			expect.arrayContaining(["hidden", "circle", "square", "rectangle", "rectangle-full", "progress-bar", "icon"]),
		);
	});

	it("produces a human-readable label for each level type", () => {
		render(<LevelTypeCombobox />);

		for (const opt of captured.options ?? []) {
			expect(opt.label).toBeTruthy();
			expect(typeof opt.label).toBe("string");
		}
	});
});
