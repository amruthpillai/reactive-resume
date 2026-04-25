import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { useControlledState } from "./use-controlled-state";

describe("useControlledState", () => {
  describe("uncontrolled mode (no value prop)", () => {
    it("uses defaultValue as initial state", () => {
      const { result } = renderHook(() => useControlledState({ defaultValue: "hello" }));
      expect(result.current[0]).toBe("hello");
    });

    it("updates internal state when setter is called", () => {
      const { result } = renderHook(() => useControlledState({ defaultValue: 0 }));

      act(() => {
        result.current[1](42);
      });

      expect(result.current[0]).toBe(42);
    });

    it("calls onChange when setter is called", () => {
      const onChange = vi.fn<(value: string) => void>();
      const { result } = renderHook(() => useControlledState({ defaultValue: "a", onChange }));

      act(() => {
        result.current[1]("b");
      });

      expect(onChange).toHaveBeenCalledWith("b");
    });

    it("passes extra args to onChange", () => {
      const onChange = vi.fn<(value: string, arg: number) => void>();
      const { result } = renderHook(() => useControlledState<string, [number]>({ defaultValue: "a", onChange }));

      act(() => {
        result.current[1]("b", 99);
      });

      expect(onChange).toHaveBeenCalledWith("b", 99);
    });
  });

  describe("controlled mode (value prop provided)", () => {
    it("uses value prop as initial state", () => {
      const { result } = renderHook(() => useControlledState({ value: "controlled" }));
      expect(result.current[0]).toBe("controlled");
    });

    it("syncs internal state when value prop changes", () => {
      let value = "first";
      const { result, rerender } = renderHook(() => useControlledState({ value }));

      expect(result.current[0]).toBe("first");

      value = "second";
      rerender();

      expect(result.current[0]).toBe("second");
    });

    it("still calls onChange when setter is called in controlled mode", () => {
      const onChange = vi.fn<(value: string) => void>();
      const { result } = renderHook(() => useControlledState({ value: "x", onChange }));

      act(() => {
        result.current[1]("y");
      });

      expect(onChange).toHaveBeenCalledWith("y");
    });
  });

  describe("edge cases", () => {
    it("handles undefined defaultValue", () => {
      const { result } = renderHook(() => useControlledState({}));
      expect(result.current[0]).toBeUndefined();
    });

    it("handles boolean values", () => {
      const { result } = renderHook(() => useControlledState({ defaultValue: false }));
      expect(result.current[0]).toBe(false);

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
    });

    it("handles object values", () => {
      const obj = { key: "value" };
      const { result } = renderHook(() => useControlledState({ defaultValue: obj }));
      expect(result.current[0]).toBe(obj);
    });

    it("works without onChange callback", () => {
      const { result } = renderHook(() => useControlledState({ defaultValue: 5 }));

      act(() => {
        result.current[1](10);
      });

      expect(result.current[0]).toBe(10);
    });
  });
});
