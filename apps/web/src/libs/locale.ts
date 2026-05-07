import type { MessageDescriptor, Messages } from "@lingui/core";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import Cookies from "js-cookie";
import z from "zod";

const localeSchema = z.union([
	z.literal("af-ZA"),
	z.literal("am-ET"),
	z.literal("ar-SA"),
	z.literal("az-AZ"),
	z.literal("bg-BG"),
	z.literal("bn-BD"),
	z.literal("ca-ES"),
	z.literal("cs-CZ"),
	z.literal("da-DK"),
	z.literal("de-DE"),
	z.literal("el-GR"),
	z.literal("en-US"),
	z.literal("en-GB"),
	z.literal("es-ES"),
	z.literal("fa-IR"),
	z.literal("fi-FI"),
	z.literal("fr-FR"),
	z.literal("he-IL"),
	z.literal("hi-IN"),
	z.literal("hu-HU"),
	z.literal("id-ID"),
	z.literal("it-IT"),
	z.literal("ja-JP"),
	z.literal("km-KH"),
	z.literal("kn-IN"),
	z.literal("ko-KR"),
	z.literal("lt-LT"),
	z.literal("lv-LV"),
	z.literal("ml-IN"),
	z.literal("mr-IN"),
	z.literal("ms-MY"),
	z.literal("ne-NP"),
	z.literal("nl-NL"),
	z.literal("no-NO"),
	z.literal("or-IN"),
	z.literal("pl-PL"),
	z.literal("pt-BR"),
	z.literal("pt-PT"),
	z.literal("ro-RO"),
	z.literal("ru-RU"),
	z.literal("sk-SK"),
	z.literal("sl-SI"),
	z.literal("sq-AL"),
	z.literal("sr-SP"),
	z.literal("sv-SE"),
	z.literal("ta-IN"),
	z.literal("te-IN"),
	z.literal("th-TH"),
	z.literal("tr-TR"),
	z.literal("uk-UA"),
	z.literal("uz-UZ"),
	z.literal("vi-VN"),
	z.literal("zh-CN"),
	z.literal("zh-TW"),
	z.literal("zu-ZA"),
]);

export type Locale = z.infer<typeof localeSchema>;

const storageKey = "locale";
const defaultLocale: Locale = "en-US";
const messageLoaders = import.meta.glob<{ messages: Messages }>("../../locales/*.po");

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

const RTL_LANGUAGES = new Set([
	"ar", // Arabic
	"ckb", // Kurdish (Sorani)
	"dv", // Dhivehi
	"fa", // Persian
	"he", // Hebrew
	"ps", // Pashto
	"sd", // Sindhi
	"ug", // Uyghur
	"ur", // Urdu
	"yi", // Yiddish
]);

export function isRTL(locale: string): boolean {
	const language = locale.split("-")[0].toLowerCase();
	return RTL_LANGUAGES.has(language);
}

export const getLocale = createIsomorphicFn()
	.client(() => {
		const locale = Cookies.get(storageKey);
		if (!locale || !isLocale(locale)) return defaultLocale;
		return locale;
	})
	.server(async () => {
		const cookieLocale = getCookie(storageKey);
		if (!cookieLocale || !isLocale(cookieLocale)) return defaultLocale;
		return cookieLocale;
	});

export const setLocaleServerFn = createServerFn({ method: "POST" })
	.inputValidator(localeSchema)
	.handler(async ({ data }) => {
		setCookie(storageKey, data);
	});

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
