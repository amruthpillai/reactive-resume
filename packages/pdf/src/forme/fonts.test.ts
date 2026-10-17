import { afterEach, expect, it, vi } from "vitest";
import { loadFonts } from "./fonts";

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

const font = (path: string) => ({
	family: "Test",
	weight: 400,
	italic: false,
	src: `https://fonts.gstatic.com${path}`,
});

const computerModernBase = "https://cdn.jsdelivr.net/gh/bitmaks/cm-web-fonts@latest";
const mirrorBase = "https://fonts.example.com/cm";

it.each([
	[undefined, computerModernBase],
	["", computerModernBase],
	[mirrorBase, mirrorBase],
	[`${mirrorBase}/`, mirrorBase],
	[`${mirrorBase}///`, mirrorBase],
	[` ${mirrorBase}/ `, mirrorBase],
])("uses explicit mirror %s without reading the server environment", async (baseUrl, expectedBase) => {
	vi.stubEnv("WEB_FONT_BASE_URL", "https://unused-env.example/cm");
	vi.resetModules();
	const { loadFonts: loadMirroredFonts } = await import("./fonts");
	const requested: string[] = [];
	vi.stubGlobal("fetch", (source: URL | string) => {
		requested.push(String(source));
		return Promise.resolve(new Response(new Uint8Array([1, 2, 3])));
	});
	const requests = [
		{ ...font(""), src: `${computerModernBase}/font/Bright/cmunbmr.woff` },
		{ ...font(""), weight: 700, italic: true, src: `${computerModernBase}/font/Bright/cmunbxo.woff` },
		font("/s/mirror-test/font.ttf"),
	];
	expect((await loadMirroredFonts(requests, baseUrl)).missing).toEqual([]);
	expect(requested).toEqual([
		`${expectedBase}/font/Bright/cmunbmr.woff`,
		`${expectedBase}/font/Bright/cmunbxo.woff`,
		"https://fonts.gstatic.com/s/mirror-test/font.ttf",
	]);
	await loadMirroredFonts(requests, baseUrl);
	expect(requested).toHaveLength(3);
	expect(requests[0]?.src).toBe(`${computerModernBase}/font/Bright/cmunbmr.woff`);
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

it("finishes a slow download that keeps sending, and fails one that stops (#3627)", async () => {
	vi.useFakeTimers();
	// Sends a byte every 20 s, ten times, then ends; a path with "stops" never ends. Aborting errors it, as with fetch.
	vi.stubGlobal("fetch", (input: URL, init: RequestInit) => {
		const body = new ReadableStream<Uint8Array>({
			async start(stream) {
				init.signal?.addEventListener("abort", () => stream.error(init.signal?.reason));
				for (let index = 0; index < 10; index++) {
					await new Promise((resolve) => setTimeout(resolve, 20_000));
					stream.enqueue(new Uint8Array([index]));
				}
				if (!input.pathname.includes("stops")) stream.close();
			},
		});
		return Promise.resolve(new Response(body));
	});

	const slow = loadFonts([font("/s/test/slow.ttf")]);
	const stops = loadFonts([font("/s/test/stops.ttf")]);
	await vi.advanceTimersByTimeAsync(300_000);
	expect((await slow).missing).toEqual([]);
	expect((await stops).missing).toEqual(["Test"]);
});
