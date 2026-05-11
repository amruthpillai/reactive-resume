import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COOKIE_ATTRIBUTES, useCookie } from "./use-cookie";

type CookieAttributes = {
	expires?: Date | number;
	path?: string;
	sameSite?: string;
	secure?: boolean;
};

const cookieMock = vi.hoisted(() => {
	const values = new Map<string, string>();

	return {
		get: vi.fn((name: string) => values.get(name)),
		remove: vi.fn((name: string) => {
			values.delete(name);
		}),
		reset: () => values.clear(),
		set: vi.fn((name: string, value: string, _attributes?: CookieAttributes) => {
			values.set(name, value);
		}),
		values,
	};
});

vi.mock("js-cookie", () => ({
	default: {
		get: cookieMock.get,
		remove: cookieMock.remove,
		set: cookieMock.set,
	},
}));

describe("useCookie", () => {
	beforeEach(() => {
		cookieMock.reset();
		cookieMock.get.mockClear();
		cookieMock.set.mockClear();
		cookieMock.remove.mockClear();
	});

	it("reads an existing cookie value", () => {
		cookieMock.values.set("theme", "dark");

		const { result } = renderHook(() => useCookie("theme", "light"));

		expect(result.current[0]).toBe("dark");
		expect(cookieMock.set).not.toHaveBeenCalled();
	});

	it("sets the default value with secure defaults when the cookie is missing", () => {
		const { result } = renderHook(() => useCookie("theme", "dark"));

		expect(result.current[0]).toBe("dark");
		expect(cookieMock.set).toHaveBeenCalledWith("theme", "dark", DEFAULT_COOKIE_ATTRIBUTES);
	});

	it("does not write a cookie when no default value is provided", () => {
		const { result } = renderHook(() => useCookie("theme"));

		expect(result.current[0]).toBeNull();
		expect(cookieMock.set).not.toHaveBeenCalled();
	});

	it("updates the cookie value and state with secure defaults", () => {
		const { result } = renderHook(() => useCookie("theme"));

		act(() => {
			result.current[1]("dark");
		});

		expect(result.current[0]).toBe("dark");
		expect(cookieMock.set).toHaveBeenCalledWith("theme", "dark", DEFAULT_COOKIE_ATTRIBUTES);
	});

	it("passes through native expires cookie attributes", () => {
		const { result } = renderHook(() => useCookie("session"));
		const expires = new Date("2026-05-11T12:01:00.000Z");

		act(() => {
			result.current[1]("active", { expires });
		});

		const attributes = cookieMock.set.mock.calls.at(-1)?.[2] as CookieAttributes;
		expect(attributes).toMatchObject({ path: "/", sameSite: "lax", secure: true });
		expect(attributes.expires).toBe(expires);
	});

	it("does not expose a custom expiresMs option", () => {
		const { result } = renderHook(() => useCookie("session"));

		act(() => {
			// @ts-expect-error use the native js-cookie expires attribute instead
			result.current[1]("active", { expiresMs: 60_000 });
		});

		const attributes = cookieMock.set.mock.calls.at(-1)?.[2] as CookieAttributes & { expiresMs?: number };
		expect(attributes).not.toHaveProperty("expiresMs");
	});

	it("allows explicit cookie attributes to override defaults", () => {
		const { result } = renderHook(() => useCookie("theme"));

		act(() => {
			result.current[1]("dark", { sameSite: "strict", secure: false });
		});

		expect(cookieMock.set).toHaveBeenCalledWith("theme", "dark", {
			...DEFAULT_COOKIE_ATTRIBUTES,
			sameSite: "strict",
			secure: false,
		});
	});

	it("removes the cookie with secure defaults and clears state", () => {
		cookieMock.values.set("theme", "dark");
		const { result } = renderHook(() => useCookie("theme"));

		act(() => {
			result.current[2]();
		});

		expect(result.current[0]).toBeNull();
		expect(cookieMock.remove).toHaveBeenCalledWith("theme", DEFAULT_COOKIE_ATTRIBUTES);
	});
});
