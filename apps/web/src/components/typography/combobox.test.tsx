// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FontWeightCombobox } from "./combobox";

const comboboxMock = vi.hoisted(() => ({
	props: undefined as { onValueChange?: (value: string[] | null) => void } | undefined,
}));

vi.mock("@/components/ui/combobox", () => ({
	Combobox: (props: { onValueChange?: (value: string[] | null) => void }) => {
		comboboxMock.props = props;
		return null;
	},
}));

describe("FontWeightCombobox", () => {
	beforeEach(() => {
		comboboxMock.props = undefined;
	});

	it("emits selected font weights in ascending order", () => {
		const onValueChange = vi.fn();

		render(<FontWeightCombobox fontFamily="Source Sans 3" value={["400"]} onValueChange={onValueChange} />);

		comboboxMock.props?.onValueChange?.(["800", "600", "400"]);

		expect(onValueChange).toHaveBeenCalledWith(["400", "600", "800"]);
	});
});
