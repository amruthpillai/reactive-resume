import { createIsomorphicFn } from "@tanstack/react-start";

export type Locale = "en-US";

const defaultLocale: Locale = "en-US";

export function isLocale(locale: string): locale is Locale {
	return locale === "en-US";
}

export function isRTL(_locale: string): boolean {
	return false;
}

export const getLocale = createIsomorphicFn()
	.client(() => {
		return defaultLocale;
	})
	.server(async () => {
		return defaultLocale;
	});
