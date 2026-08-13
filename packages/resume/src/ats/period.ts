export type PeriodEndpoint = { year: number; month?: number };

export type ParsedPeriod = {
	start?: PeriodEndpoint;
	end?: PeriodEndpoint;
	ongoing: boolean;
};

type EndpointResult = PeriodEndpoint | "ongoing";

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

export const ONGOING_TOKENS_BY_LANGUAGE: Readonly<Record<string, readonly string[]>> = {
	af: ["hede", "tans", "huidig"],
	ar: ["الآن", "حتى الآن", "الحاضر"],
	bg: ["настояще", "сега", "днес"],
	bn: ["বর্তমান"],
	ca: ["present", "actual", "actualitat"],
	cs: ["současnost", "současný", "dosud", "nyní"],
	da: ["nuværende", "i dag"],
	de: ["heute", "aktuell", "laufend", "gegenwärtig", "jetzt"],
	el: ["παρόν", "σήμερα", "τώρα"],
	en: ["present", "current", "currently", "now", "ongoing", "today", "date", "to date"],
	es: ["presente", "actual", "actualidad", "actualmente", "hoy", "hasta la fecha"],
	fa: ["اکنون", "تاکنون", "حال حاضر"],
	fi: ["nykyinen", "nykyään", "tähän asti"],
	fr: ["présent", "actuel", "actuellement", "aujourd'hui", "en cours", "à ce jour"],
	he: ["כיום", "הווה", "היום"],
	hi: ["वर्तमान", "अब तक"],
	hu: ["jelen", "jelenleg", "napjainkig"],
	id: ["sekarang", "saat ini", "kini"],
	it: ["presente", "attuale", "attualmente", "oggi", "in corso"],
	ja: ["現在", "現在に至る"],
	kn: ["ಪ್ರಸ್ತುತ"],
	ko: ["현재", "지금", "재직중"],
	lt: ["dabar", "iki dabar", "šiuo metu"],
	lv: ["pašlaik", "tagad", "līdz šim"],
	ml: ["നിലവിൽ"],
	mr: ["सध्या", "वर्तमान"],
	ms: ["sekarang", "kini"],
	ne: ["हाल", "वर्तमान"],
	nl: ["heden", "huidig", "nu"],
	no: ["nåværende", "i dag"],
	pl: ["obecnie", "obecny", "teraz", "nadal"],
	pt: ["presente", "atual", "atualmente", "hoje", "até o momento"],
	ro: ["prezent", "în prezent", "azi"],
	ru: ["настоящее", "настоящее время", "по настоящее время", "сейчас"],
	sk: ["súčasnosť", "súčasný", "doteraz", "teraz"],
	sl: ["sedanjost", "trenutno", "danes"],
	sq: ["aktual", "aktualisht", "tani"],
	sr: ["sadašnjost", "trenutno", "danas"],
	sv: ["nuvarande", "pågående", "idag"],
	ta: ["தற்போது"],
	te: ["ప్రస్తుతం"],
	th: ["ปัจจุบัน"],
	tr: ["halen", "hâlen", "günümüz", "şu an", "devam ediyor"],
	uk: ["теперішній час", "зараз", "дотепер", "нині"],
	vi: ["hiện tại", "đến nay"],
	zh: ["至今", "现在", "現在", "迄今"],
	zu: ["manje", "okwamanje"],
};

const PRESENT_TOKENS = new Set(Object.values(ONGOING_TOKENS_BY_LANGUAGE).flat());

const SEASON_MONTHS: Readonly<Record<string, number>> = {
	spring: 3,
	summer: 6,
	fall: 9,
	autumn: 9,
	winter: 12,
};

const EXTRA_MONTH_ALIASES: Readonly<Record<string, number>> = { sept: 9 };

const DASH_CHARS = new Set(["-", "–", "—", "~"]);

const SPACED_SEPARATOR = /\s(?:[-–—~]+|to|through|until)\s/;

const monthLookupCache = new Map<string, ReadonlyMap<string, number>>();

const normalizeToken = (value: string) => value.trim().toLowerCase().replace(/\.$/, "");

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

function buildMonthLookup(locale: string): ReadonlyMap<string, number> {
	const lookup = new Map<string, number>();

	for (const tag of new Set(["en-US", locale])) {
		for (const month of ["long", "short"] as const) {
			let format: Intl.DateTimeFormat;

			try {
				format = new Intl.DateTimeFormat(tag, { month, timeZone: "UTC" });
			} catch {
				continue;
			}

			for (let index = 1; index <= 12; index++) {
				const name = normalizeToken(format.format(Date.UTC(2000, index - 1, 1)));
				if (name) lookup.set(name, index);
			}
		}
	}

	for (const [alias, month] of Object.entries(EXTRA_MONTH_ALIASES)) {
		if (!lookup.has(alias)) lookup.set(alias, month);
	}

	return lookup;
}

function getMonthLookup(locale: string): ReadonlyMap<string, number> {
	const cached = monthLookupCache.get(locale);
	if (cached) return cached;

	const lookup = buildMonthLookup(locale);
	monthLookupCache.set(locale, lookup);
	return lookup;
}

function toEndpoint(year: number, month?: number): PeriodEndpoint | null {
	if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return null;
	if (month === undefined) return { year };
	if (!Number.isInteger(month) || month < 1 || month > 12) return null;
	return { year, month };
}

function parseEndpoint(raw: string, months: ReadonlyMap<string, number>): EndpointResult | null {
	const value = normalizeWhitespace(raw);
	if (!value) return null;
	if (PRESENT_TOKENS.has(value.replace(/[.,;:!?]+$/u, ""))) return "ongoing";

	const yearOnly = /^(\d{4})$/.exec(value);
	if (yearOnly?.[1]) return toEndpoint(Number(yearOnly[1]));

	const iso = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(value);
	if (iso?.[1] && iso[2]) return toEndpoint(Number(iso[1]), Number(iso[2]));

	const monthYear = /^(\d{1,2})[/.](\d{4})$/.exec(value);
	if (monthYear?.[1] && monthYear[2]) return toEndpoint(Number(monthYear[2]), Number(monthYear[1]));

	const dayMonthYear = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(value);
	if (dayMonthYear?.[1] && dayMonthYear[2] && dayMonthYear[3]) {
		const year = Number(dayMonthYear[3]);
		const first = Number(dayMonthYear[1]);
		const second = Number(dayMonthYear[2]);
		return toEndpoint(year, first) ?? toEndpoint(year, second);
	}

	const named = /^(\p{L}+\.?)\s+(?:\d{1,2},?\s+)?(\d{4})$/u.exec(value);
	if (named?.[1] && named[2]) {
		const token = normalizeToken(named[1]);
		const month = months.get(token) ?? SEASON_MONTHS[token];
		return month === undefined ? null : toEndpoint(Number(named[2]), month);
	}

	return null;
}

function toPeriod(start: EndpointResult | undefined, end: EndpointResult | undefined): ParsedPeriod {
	return {
		...(start && start !== "ongoing" ? { start } : {}),
		...(end && end !== "ongoing" ? { end } : {}),
		ongoing: start === "ongoing" || end === "ongoing",
	};
}

function splitOnce(value: string, separator: RegExp): [string, string] | null {
	const match = separator.exec(value);
	if (!match) return null;

	const left = value.slice(0, match.index);
	const right = value.slice(match.index + match[0].length);
	if (!left.trim() || !right.trim()) return null;

	return [left, right];
}

function* dashSplits(value: string): Generator<[string, string]> {
	for (let index = 0; index < value.length; index++) {
		const char = value[index];
		if (!char || !DASH_CHARS.has(char)) continue;

		const left = value.slice(0, index);
		const right = value.slice(index + 1);
		if (left.trim() && right.trim()) yield [left, right];
	}
}

function parseSplit(parts: [string, string], months: ReadonlyMap<string, number>): ParsedPeriod | null {
	const start = parseEndpoint(parts[0], months);
	if (!start || start === "ongoing") return null;

	const end = parseEndpoint(parts[1], months);
	return end ? toPeriod(start, end) : null;
}

export function parsePeriod(value: string, locale = "en-US"): ParsedPeriod | null {
	const normalized = normalizeWhitespace(value);
	if (!normalized) return null;

	const months = getMonthLookup(locale);

	const single = parseEndpoint(normalized, months);
	if (single) return single === "ongoing" ? null : toPeriod(single, undefined);

	const spaced = splitOnce(normalized, SPACED_SEPARATOR);
	if (spaced) {
		const period = parseSplit(spaced, months);
		if (period) return period;
	}

	for (const candidate of dashSplits(normalized)) {
		const period = parseSplit(candidate, months);
		if (period) return period;
	}

	return null;
}

export function parseSingleDate(value: string, locale = "en-US"): PeriodEndpoint | null {
	const normalized = normalizeWhitespace(value);
	if (!normalized) return null;

	const result = parseEndpoint(normalized, getMonthLookup(locale));
	return result && result !== "ongoing" ? result : null;
}

export function isReversedPeriod(start: PeriodEndpoint, end: PeriodEndpoint): boolean {
	return start.year * 12 + (start.month ?? 1) > end.year * 12 + (end.month ?? 12);
}

export function isFutureEndpoint(endpoint: PeriodEndpoint, now: Date): boolean {
	return endpoint.year * 12 + (endpoint.month ?? 1) > now.getUTCFullYear() * 12 + (now.getUTCMonth() + 1);
}
