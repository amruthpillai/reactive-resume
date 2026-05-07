// Minimal locale type — the full lingui wiring lives in apps/web (Phase 13).
export type Locale = string;

export const defaultLocale: Locale = "en-US";

export function isLocale(value: unknown): value is Locale {
	return typeof value === "string" && value.length > 0;
}
