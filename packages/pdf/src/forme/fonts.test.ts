import { afterEach, expect, it, vi } from "vitest";
import { loadFonts } from "./fonts";

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

const font = (path: string) => ({
	family: "Test",
	weight: 400,
	italic: false,
	src: `https://fonts.gstatic.com${path}`,
});

it("falls back to fonts.gstatic.cn when fonts.gstatic.com doesn't answer, then starts there", async () => {
	vi.useFakeTimers();
	const requested: string[] = [];
	vi.stubGlobal("fetch", (input: URL, init: RequestInit) => {
		requested.push(input.hostname);
		if (input.hostname === "fonts.gstatic.cn") return Promise.resolve(new Response(new Uint8Array([1, 2, 3])));
		// Blocked: the request hangs until it's abandoned.
		return new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
	});

	const first = loadFonts([font("/s/test/a.ttf")]);
	await vi.advanceTimersByTimeAsync(3000);
	expect((await first).missing).toEqual([]);
	expect(requested).toEqual(["fonts.gstatic.com", "fonts.gstatic.cn"]);

	expect((await loadFonts([font("/s/test/b.ttf")])).missing).toEqual([]);
	expect(requested.at(-1)).toBe("fonts.gstatic.cn");
	expect(requested).toHaveLength(3);
});
