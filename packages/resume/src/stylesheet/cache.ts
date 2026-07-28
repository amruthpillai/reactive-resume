import type { CompileStylesheetResult } from "./types";

const MAX_ENTRIES = 128;
const MAX_SERIALIZED_BYTES = 16 * 1024 * 1024;

type CacheEntry = {
	value: CompileStylesheetResult;
	size: number;
};

function serializedSize(value: CompileStylesheetResult): number {
	return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export class StylesheetCompilationCache {
	readonly #entries = new Map<string, CacheEntry>();
	#size = 0;

	get(key: string): CompileStylesheetResult | undefined {
		const entry = this.#entries.get(key);
		if (!entry) return;
		this.#entries.delete(key);
		this.#entries.set(key, entry);
		return entry.value;
	}

	set(key: string, value: CompileStylesheetResult): void {
		const previous = this.#entries.get(key);
		if (previous) {
			this.#size -= previous.size;
			this.#entries.delete(key);
		}

		const entry = { value, size: serializedSize(value) };
		if (entry.size > MAX_SERIALIZED_BYTES) return;
		this.#entries.set(key, entry);
		this.#size += entry.size;

		while (this.#entries.size > MAX_ENTRIES || this.#size > MAX_SERIALIZED_BYTES) {
			const oldestKey = this.#entries.keys().next().value;
			if (typeof oldestKey !== "string") break;
			const oldest = this.#entries.get(oldestKey);
			this.#entries.delete(oldestKey);
			this.#size -= oldest?.size ?? 0;
		}
	}
}

export const stylesheetCompilationCache = new StylesheetCompilationCache();

export const RRSS_COMPILER_BUILD_ID = "rrss-v1-values-2";

export function stylesheetCacheKey(languageVersion: number, source: string, registry: string): string {
	return JSON.stringify([languageVersion, source, RRSS_COMPILER_BUILD_ID, registry]);
}
