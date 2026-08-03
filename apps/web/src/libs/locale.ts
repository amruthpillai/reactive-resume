import type { MessageDescriptor, Messages } from "@lingui/core";
import type { Locale } from "@reactive-resume/utils/locale";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import Cookies from "js-cookie";
import { isRTL, localeSchema } from "@reactive-resume/utils/locale";

export { isRTL };

const storageKey = "locale";
const defaultLocale: Locale = "en-US";
const messageLoaders = import.meta.glob<{ messages: Messages }>("../../locales/*.po");
const relativeTimeDivisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
	{ amount: 31_536_000_000, unit: "year" },
	{ amount: 2_592_000_000, unit: "month" },
	{ amount: 604_800_000, unit: "week" },
	{ amount: 86_400_000, unit: "day" },
	{ amount: 3_600_000, unit: "hour" },
	{ amount: 60_000, unit: "minute" },
];

export const localeMap = {
	"af-ZA": msg`Afrikaans`,
	"am-ET": msg`Amharic`,
	"ar-SA": msg`Arabic`,
	"az-AZ": msg`Azerbaijani`,
	"bg-BG": msg`Bulgarian`,
	"bn-BD": msg`Bengali`,
	"ca-ES": msg`Catalan`,
	"cs-CZ": msg`Czech`,
	"da-DK": msg`Danish`,
	"de-DE": msg`German`,
	"el-GR": msg`Greek`,
	"en-US": msg`English`,
	"en-GB": msg`English (United Kingdom)`,
	"es-ES": msg`Spanish`,
	"fa-IR": msg`Persian`,
	"fi-FI": msg`Finnish`,
	"fr-FR": msg`French`,
	"he-IL": msg`Hebrew`,
	"hi-IN": msg`Hindi`,
	"hu-HU": msg`Hungarian`,
	"id-ID": msg`Indonesian`,
	"it-IT": msg`Italian`,
	"ja-JP": msg`Japanese`,
	"km-KH": msg`Khmer`,
	"kn-IN": msg`Kannada`,
	"ko-KR": msg`Korean`,
	"lt-LT": msg`Lithuanian`,
	"lv-LV": msg`Latvian`,
	"ml-IN": msg`Malayalam`,
	"mr-IN": msg`Marathi`,
	"ms-MY": msg`Malay`,
	"ne-NP": msg`Nepali`,
	"nl-NL": msg`Dutch`,
	"no-NO": msg`Norwegian`,
	"or-IN": msg`Odia`,
	"pl-PL": msg`Polish`,
	"pt-BR": msg`Portuguese (Brazil)`,
	"pt-PT": msg`Portuguese (Portugal)`,
	"ro-RO": msg`Romanian`,
	"ru-RU": msg`Russian`,
	"sk-SK": msg`Slovak`,
	"sl-SI": msg`Slovenian`,
	"sq-AL": msg`Albanian`,
	"sr-SP": msg`Serbian`,
	"sv-SE": msg`Swedish`,
	"ta-IN": msg`Tamil`,
	"te-IN": msg`Telugu`,
	"th-TH": msg`Thai`,
	"tr-TR": msg`Turkish`,
	"uk-UA": msg`Ukrainian`,
	"uz-UZ": msg`Uzbek`,
	"vi-VN": msg`Vietnamese`,
	"zh-CN": msg`Chinese (Simplified)`,
	"zh-TW": msg`Chinese (Traditional)`,
	"zu-ZA": msg`Zulu`,
} satisfies Record<Locale, MessageDescriptor>;

export function isLocale(locale: string): locale is Locale {
	return localeSchema.safeParse(locale).success;
}

export const resolveLocale = (locale: string): Locale => {
	return isLocale(locale) ? locale : defaultLocale;
};

const regionalDefaultLocale: Partial<Record<string, Locale>> = {
	en: "en-US",
	pt: "pt-BR",
	zh: "zh-CN",
};

const localeBySubtag = new Map<string, Locale>();

// First declaration wins so a bare subtag resolves to the first-listed regional
// variant ("en" → "en-US", "pt" → "pt-BR", "zh" → "zh-CN"), consistent with
// regionalDefaultLocale; a later duplicate never silently overrides it.
for (const locale of localeSchema.options) {
	const subtag = locale.split("-")[0];
	if (subtag && !localeBySubtag.has(subtag.toLowerCase())) localeBySubtag.set(subtag.toLowerCase(), locale);
}

// Resolves the first supported locale from a browser language list, falling back
// to the default when nothing matches. Exact tags win; bare subtags map to their
// canonical regional variant (e.g. "de" → "de-DE", "zh" → "zh-CN").
export const getBrowserLocale = (languages: readonly string[]): Locale => {
	for (const language of languages) {
		const normalized = language.trim().replaceAll("_", "-");
		if (!normalized) continue;

		const exactMatch = localeSchema.options.find((candidate) => candidate.toLowerCase() === normalized.toLowerCase());
		if (exactMatch) return exactMatch;

		const subtag = normalized.split("-")[0]?.toLowerCase();
		if (!subtag) continue;

		const regionalDefault = regionalDefaultLocale[subtag];
		if (regionalDefault) return regionalDefault;

		const subtagMatch = localeBySubtag.get(subtag);
		if (subtagMatch) return subtagMatch;
	}

	return defaultLocale;
};

export function formatRelativeTime(value: Date | string, formatter: Intl.RelativeTimeFormat, invalidFallback?: string) {
	const date = value instanceof Date ? value : new Date(value);
	const diffMs = date.getTime() - Date.now();
	if (Number.isNaN(diffMs)) return invalidFallback ?? formatter.format(0, "second");

	const division = relativeTimeDivisions.find((candidate) => Math.abs(diffMs) >= candidate.amount);

	return division
		? formatter.format(Math.round(diffMs / division.amount), division.unit)
		: formatter.format(0, "second");
}

export const getLocale = () => {
	const locale = Cookies.get(storageKey);
	if (!locale || !isLocale(locale)) return defaultLocale;
	return locale;
};

const loadMessages = async (locale: Locale) => {
	const load = messageLoaders[`../../locales/${locale}.po`];

	if (!load) throw new Error(`Unknown locale: ${locale}`);

	const { messages } = await load();
	return messages;
};

export const getLocaleMessages = async (locale: string) => {
	const resolvedLocale = resolveLocale(locale);
	let messages: Messages;

	try {
		messages = await loadMessages(resolvedLocale);
		return { locale: resolvedLocale, messages };
	} catch {
		messages = await loadMessages(defaultLocale);
		return { locale: defaultLocale, messages };
	}
};

export const loadLocale = async (locale: string) => {
	const { locale: resolvedLocale, messages } = await getLocaleMessages(locale);
	i18n.loadAndActivate({ locale: resolvedLocale, messages });
};

export const changeLocale = (value: string | null) => {
	if (!value || !isLocale(value)) return;
	Cookies.set(storageKey, value);
	window.location.reload();
};

// Applies the browser-detected language once when no preference is stored, so
// returning visitors keep their manual choice. Mirrors changeLocale by persisting
// the cookie and reloading; skipped when detection yields the English default.
export const applyAutoDetectedLocale = () => {
	if (typeof navigator === "undefined") return;
	if (Cookies.get(storageKey)) return;

	const languages = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
	const detectedLocale = getBrowserLocale(languages);

	if (detectedLocale !== defaultLocale) changeLocale(detectedLocale);
};
