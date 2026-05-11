// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useControlledState } from "./use-controlled-state";

describe("useControlledState", () => {
	it("returns the defaultValue when uncontrolled", () => {
		const { result } = renderHook(() => useControlledState({ defaultValue: 0 }));
		expect(result.current[0]).toBe(0);
	});

	it("returns the value when controlled", () => {
		const { result } = renderHook(() => useControlledState({ value: 42, defaultValue: 0 }));
		expect(result.current[0]).toBe(42);
	});

	it("updates internal state when value prop changes (controlled)", () => {
		const { result, rerender } = renderHook(({ value }: { value: number }) => useControlledState({ value }), {
			initialProps: { value: 1 },
		});

		expect(result.current[0]).toBe(1);
		rerender({ value: 2 });
		expect(result.current[0]).toBe(2);
	});

	it("updates state via setter when uncontrolled", () => {
		const { result } = renderHook(() => useControlledState<number>({ defaultValue: 0 }));
		act(() => {
			result.current[1](10);
		});
		expect(result.current[0]).toBe(10);
	});

	it("calls onChange when state is updated", () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => useControlledState<string>({ defaultValue: "a", onChange }));

		act(() => {
			result.current[1]("b");
		});

		expect(onChange).toHaveBeenCalledWith("b");
	});

	it("forwards extra args to onChange", () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => useControlledState<string, [number, boolean]>({ defaultValue: "a", onChange }));

		act(() => {
			result.current[1]("b", 42, true);
		});

		expect(onChange).toHaveBeenCalledWith("b", 42, true);
	});

	it("does not call onChange when value prop changes from outside", () => {
		const onChange = vi.fn();
		const { rerender } = renderHook(({ value }: { value: number }) => useControlledState<number>({ value, onChange }), {
			initialProps: { value: 1 },
		});

		rerender({ value: 2 });
		expect(onChange).not.toHaveBeenCalled();
	});

	it("returns a stable setter reference when onChange is stable", () => {
		const onChange = vi.fn();
		const { result, rerender } = renderHook(
			({ value }: { value: number }) => useControlledState<number>({ value, onChange }),
			{ initialProps: { value: 1 } },
		);

		const initialSetter = result.current[1];
		rerender({ value: 2 });
		expect(result.current[1]).toBe(initialSetter);
	});
});
