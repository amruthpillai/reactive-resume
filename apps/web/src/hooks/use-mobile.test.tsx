// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "./use-mobile";

type Listener = (event: { matches: boolean }) => void;

type FakeMediaQueryList = {
	matches: boolean;
	addEventListener: (type: string, fn: Listener) => void;
	removeEventListener: (type: string, fn: Listener) => void;
	__listeners: Set<Listener>;
	__set: (matches: boolean) => void;
};

const createMatchMedia = (initialMatches: boolean) => {
	const mqlByQuery = new Map<string, FakeMediaQueryList>();

	const matchMedia = vi.fn((query: string): FakeMediaQueryList => {
		let mql = mqlByQuery.get(query);
		if (mql) return mql;

		const listeners = new Set<Listener>();
		mql = {
			matches: initialMatches,
			addEventListener: (_type, fn) => listeners.add(fn),
			removeEventListener: (_type, fn) => listeners.delete(fn),
			__listeners: listeners,
			__set: (matches: boolean) => {
				// biome-ignore lint/style/noNonNullAssertion: This closure only runs after the media query list has been initialized.
				mql!.matches = matches;
				for (const fn of listeners) fn({ matches });
			},
		};
		mqlByQuery.set(query, mql);
		return mql;
	});

	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: matchMedia,
	});

	return { matchMedia, getMql: (q: string) => mqlByQuery.get(q) };
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useIsMobile", () => {
	it("returns true when the viewport matches the mobile media query", () => {
		createMatchMedia(true);
		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(true);
	});

	it("returns false when the viewport does not match the mobile media query", () => {
		createMatchMedia(false);
		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);
	});

	it("uses the (max-width: 767px) query", () => {
		const { matchMedia } = createMatchMedia(false);
		renderHook(() => useIsMobile());
		expect(matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
	});

	it("updates when the media query change event fires", () => {
		const { getMql } = createMatchMedia(false);
		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);

		act(() => {
			getMql("(max-width: 767px)")?.__set(true);
		});

		expect(result.current).toBe(true);
	});

	it("removes the listener on unmount", () => {
		const { getMql } = createMatchMedia(false);
		const { unmount } = renderHook(() => useIsMobile());

		const mql = getMql("(max-width: 767px)");
		expect(mql?.__listeners.size).toBe(1);

		unmount();
		expect(mql?.__listeners.size).toBe(0);
	});
});
