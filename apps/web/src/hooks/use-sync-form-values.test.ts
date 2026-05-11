// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSyncFormValues } from "./use-sync-form-values";

const makeForm = <T>(values: T) => {
	const reset = vi.fn((next: T) => {
		form.state.values = next;
	});
	const form = { reset, state: { values } };
	return form;
};

describe("useSyncFormValues", () => {
	it("does not call reset when values are deeply equal", () => {
		const form = makeForm({ a: 1, nested: { x: 1 } });

		renderHook(({ values }) => useSyncFormValues(form, values), {
			initialProps: { values: { a: 1, nested: { x: 1 } } },
		});

		expect(form.reset).not.toHaveBeenCalled();
	});

	it("calls reset when values differ on mount", () => {
		const form = makeForm({ a: 1 });
		const next = { a: 2 };

		renderHook(() => useSyncFormValues(form, next));

		expect(form.reset).toHaveBeenCalledWith(next);
	});

	it("calls reset when values prop changes to a different shape", () => {
		const form = makeForm<{ a: number }>({ a: 1 });

		const { rerender } = renderHook(({ values }) => useSyncFormValues(form, values), {
			initialProps: { values: { a: 1 } },
		});

		expect(form.reset).not.toHaveBeenCalled();

		rerender({ values: { a: 5 } });

		expect(form.reset).toHaveBeenCalledWith({ a: 5 });
		expect(form.reset).toHaveBeenCalledTimes(1);
	});

	it("ignores new value identity when deeply equal", () => {
		const form = makeForm<{ a: number }>({ a: 1 });

		const { rerender } = renderHook(({ values }) => useSyncFormValues(form, values), {
			initialProps: { values: { a: 1 } },
		});

		rerender({ values: { a: 1 } });

		expect(form.reset).not.toHaveBeenCalled();
	});
});
