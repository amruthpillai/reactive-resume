import type { PdfFontRequest } from "../hooks/use-register-fonts";
import type { FormeFont } from "@formepdf/react";
import { prepareFontBytes } from "./font-bytes";

// One download per font file for the life of the page or server process.
const cache = new Map<string, Promise<Uint8Array>>();
// A stalled download fails the render instead of holding the preview on its loader. CJK faces are 10–15 MB.
const DOWNLOAD_TIMEOUT_MS = 120_000;

// Google serves the same files from fonts.gstatic.cn, which loads where fonts.gstatic.com is blocked or slow
// (mainland China). Each download starts on the host that last answered; when that host fails, or sends nothing
// within FALLBACK_AFTER_MS, the other host starts too and the first to answer wins.
const GSTATIC_HOSTS = ["fonts.gstatic.com", "fonts.gstatic.cn"];
const FALLBACK_AFTER_MS = 3000;
let preferredHost = GSTATIC_HOSTS[0] ?? "";

function fetchFont(src: string, signal: AbortSignal): Promise<Response> {
	const url = new URL(src);
	const check = (response: Response) => {
		if (!response.ok) throw new Error(`Font ${src}: HTTP ${response.status}`);
		return response;
	};
	if (!GSTATIC_HOSTS.includes(url.hostname)) return fetch(src, { signal }).then(check);

	const hosts = [preferredHost, ...GSTATIC_HOSTS.filter((host) => host !== preferredHost)];
	const attempts = hosts.map(() => new AbortController());
	signal.addEventListener("abort", () => attempts.forEach((attempt) => attempt.abort(signal.reason)), { once: true });

	return new Promise((resolve, reject) => {
		let started = 0;
		let failed = 0;
		let settled = false;
		const start = (index: number) => {
			const host = hosts[index];
			const attempt = attempts[index];
			if (settled || index < started || !host || !attempt) return;
			started = index + 1;
			const fallback = setTimeout(() => start(index + 1), FALLBACK_AFTER_MS);
			const target = new URL(url);
			target.hostname = host;
			fetch(target, { signal: attempt.signal })
				.then(check)
				.then((response) => {
					clearTimeout(fallback);
					if (settled) return;
					settled = true;
					preferredHost = host;
					attempts.forEach((other) => other !== attempt && other.abort());
					resolve(response);
				})
				.catch((error: unknown) => {
					clearTimeout(fallback);
					failed += 1;
					if (settled) return;
					if (failed === hosts.length) {
						settled = true;
						reject(error);
					} else start(index + 1);
				});
		};
		start(0);
	});
}

const load = (src: string) => {
	let bytes = cache.get(src);
	if (!bytes) {
		bytes = fetchFont(src, AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS))
			.then((response) => response.arrayBuffer())
			.then((buffer) => prepareFontBytes(new Uint8Array(buffer)));
		// A failed download may succeed next time.
		bytes.catch(() => cache.delete(src));
		cache.set(src, bytes);
	}
	return bytes;
};

/**
 * The font faces a document needs, as bytes Forme can embed. A face that fails to load is left out and listed in
 * `missing`; Forme falls back to its built-in fonts for that text.
 */
export async function loadFonts(
	requests: readonly PdfFontRequest[],
): Promise<{ fonts: FormeFont[]; warnings: string[]; missing: string[] }> {
	const warnings: string[] = [];
	const missing: string[] = [];
	const loaded = await Promise.all(
		requests.map(async (request): Promise<FormeFont | null> => {
			try {
				return { family: request.family, weight: request.weight, italic: request.italic, src: await load(request.src) };
			} catch (error) {
				warnings.push(error instanceof Error ? error.message : `Font ${request.src} could not be loaded.`);
				missing.push(request.family);
				return null;
			}
		}),
	);
	return { fonts: loaded.filter((font): font is FormeFont => font !== null), warnings, missing };
}
