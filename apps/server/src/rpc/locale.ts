import type { Locale } from "@reactive-resume/utils/locale";
import { defaultLocale, isLocale } from "@reactive-resume/utils/locale";
import { getCookie } from "../http/headers";

export function getRequestLocale(request: Request): Locale {
	const locale = getCookie(request, "locale");
	return isLocale(locale) ? locale : defaultLocale;
}
