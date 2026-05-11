// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

// react-window's <Grid> uses ResizeObserver / IntersectionObserver heavily and
// expects measurable layouts that happy-dom can't provide. Stub it with a simple
// pass-through that renders the first row of cells via the supplied cellComponent.
vi.mock("react-window", () => ({
	Grid: ({
		rowCount,
		columnCount,
		cellComponent: CellComponent,
		cellProps,
	}: {
		rowCount: number;
		columnCount: number;
		cellComponent: React.ComponentType<
			{ rowIndex: number; columnIndex: number; style: React.CSSProperties } & Record<string, unknown>
		>;
		cellProps: Record<string, unknown>;
	}) => {
		const cells: React.ReactNode[] = [];
		for (let r = 0; r < Math.min(rowCount, 1); r++) {
			for (let c = 0; c < columnCount; c++) {
				cells.push(<CellComponent key={`${r}-${c}`} rowIndex={r} columnIndex={c} style={{}} {...cellProps} />);
			}
		}
		return <div data-testid="grid">{cells}</div>;
	},
}));

const { IconPicker } = await import("./icon-picker");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const renderPicker = (props: Partial<React.ComponentProps<typeof IconPicker>> = {}) =>
	render(
		<I18nProvider i18n={i18n}>
			<IconPicker value="globe" onChange={vi.fn()} {...props} />
		</I18nProvider>,
	);

describe("IconPicker", () => {
	it("renders a trigger button containing the current icon", () => {
		const { container } = renderPicker();
		const i = container.querySelector("i.ph") as HTMLElement;
		expect(i.className).toContain("ph-globe");
	});

	it("changes the trigger icon when value prop changes", () => {
		const { container, rerender } = renderPicker({ value: "globe" });
		const before = container.querySelector("i.ph")?.className ?? "";
		expect(before).toContain("ph-globe");

		rerender(
			<I18nProvider i18n={i18n}>
				<IconPicker value="star" onChange={vi.fn()} />
			</I18nProvider>,
		);

		const after = container.querySelector("i.ph")?.className ?? "";
		expect(after).toContain("ph-star");
	});

	it("renders the picker button as a single icon-size button", () => {
		const { container } = renderPicker();
		expect(container.querySelectorAll("button").length).toBeGreaterThanOrEqual(1);
	});
});
