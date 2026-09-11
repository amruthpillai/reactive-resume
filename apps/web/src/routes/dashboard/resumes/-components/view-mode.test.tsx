// @vitest-environment happy-dom

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResumeView } from "./view-mode";

beforeEach(() => {
	sessionStorage.clear();
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("resume view preference", () => {
	it("restores the selected view after leaving and returning during the session", async () => {
		const first = renderHook(() => useResumeView("compact", "owner"));
		await waitFor(() => expect(sessionStorage.getItem("resume-view:owner")).toBe('"compact"'));
		first.unmount();
		const second = renderHook(() => useResumeView(undefined, "owner"));
		await waitFor(() => expect(second.result.current).toBe("compact"));
	});
	it("honors explicit grid in the URL over a saved compact preference", async () => {
		sessionStorage.setItem("resume-view:owner", '"compact"');
		const { result } = renderHook(() => useResumeView("grid", "owner"));
		expect(result.current).toBe("grid");
		await waitFor(() => expect(sessionStorage.getItem("resume-view:owner")).toBe('"grid"'));
	});
	it("keeps the preference scoped to its account", async () => {
		sessionStorage.setItem("resume-view:first", '"list"');
		const { result, rerender } = renderHook(({ user }) => useResumeView(undefined, user), {
			initialProps: { user: "first" },
		});
		await waitFor(() => expect(result.current).toBe("list"));
		rerender({ user: "second" });
		await waitFor(() => expect(result.current).toBe("grid"));
	});
	it("ignores unknown stored views", () => {
		sessionStorage.setItem("resume-view:owner", '"unknown"');
		const { result } = renderHook(() => useResumeView(undefined, "owner"));
		expect(result.current).toBe("grid");
	});
	it("renders the default when session storage is unavailable", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new DOMException("Blocked", "SecurityError");
		});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const { result } = renderHook(() => useResumeView(undefined, "owner"));
		expect(result.current).toBe("grid");
	});
});
