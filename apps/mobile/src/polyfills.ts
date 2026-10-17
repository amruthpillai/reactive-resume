// Runs before any other module (see index.ts). Hermes with Expo 58 already has structuredClone, AbortSignal.timeout,
// TextDecoder({ fatal }), streaming fetch, URL and btoa/atob (reports/S2.md); only these two gaps remain.
import { getRandomValues } from "expo-crypto";

// `uuid` (v7 ids in @reactive-resume/utils/string) needs a CSPRNG.
if (typeof globalThis.crypto?.getRandomValues !== "function") {
	const crypto = (globalThis.crypto ?? {}) as Crypto;
	Object.defineProperty(crypto, "getRandomValues", { value: getRandomValues, configurable: true, writable: true });
	if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: crypto, configurable: true });
}

// @reactive-resume/resume/section-sort uses it.
if (!Array.prototype.toSorted) {
	Object.defineProperty(Array.prototype, "toSorted", {
		value: function toSorted<T>(this: T[], compare?: (a: T, b: T) => number) {
			return [...this].sort(compare);
		},
		configurable: true,
		writable: true,
	});
}
