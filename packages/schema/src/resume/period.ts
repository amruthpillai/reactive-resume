export type PeriodEndpoint = { year: number; month?: number };

export type ParsedPeriod = {
	start?: PeriodEndpoint;
	end?: PeriodEndpoint;
	ongoing: boolean;
};

/**
 * How an endpoint was written. "long" and "short" are month names ("March", "Mar"); "name" is a month whose
 * long and short names are the same ("May"). "season" and "day" lose or add precision, so they aren't exact.
 */
export type EndpointStyle = "year" | "iso" | "numeric" | "long" | "short" | "name" | "season" | "day";

export type EndpointReading = { endpoint: PeriodEndpoint; style: EndpointStyle };

/** A period with how each endpoint was written, so callers can tell exact readings from approximate ones. */
export type PeriodReading = {
	start?: EndpointReading;
	end?: EndpointReading;
	ongoing: boolean;
};

type EndpointResult = EndpointReading | "ongoing";

type MonthName = { month: number; style: "long" | "short" | "name" };

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

const monthLookupCache = new Map<string, ReadonlyMap<string, MonthName>>();

const normalizeToken = (value: string) => value.trim().toLowerCase().replace(/\.$/, "");

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

function buildMonthLookup(locale: string): ReadonlyMap<string, MonthName> {
	const lookup = new Map<string, MonthName>();

	for (const tag of new Set(["en-US", locale])) {
		for (const style of ["long", "short"] as const) {
			let format: Intl.DateTimeFormat;

			try {
				format = new Intl.DateTimeFormat(tag, { month: style, timeZone: "UTC" });
			} catch {
				continue;
			}

			for (let month = 1; month <= 12; month++) {
				const name = normalizeToken(format.format(Date.UTC(2000, month - 1, 1)));
				if (!name) continue;
				const existing = lookup.get(name);
				// "May" is both the long and the short name.
				lookup.set(name, existing && existing.style !== style ? { month, style: "name" } : { month, style });
			}
		}
	}

	for (const [alias, month] of Object.entries(EXTRA_MONTH_ALIASES)) {
		if (!lookup.has(alias)) lookup.set(alias, { month, style: "short" });
	}

	return lookup;
}

function getMonthLookup(locale: string): ReadonlyMap<string, MonthName> {
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

function read(endpoint: PeriodEndpoint | null, style: EndpointStyle): EndpointReading | null {
	return endpoint ? { endpoint, style } : null;
}

type Tokens = { months: ReadonlyMap<string, MonthName>; present: ReadonlySet<string> };

function parseEndpoint(raw: string, { months, present }: Tokens): EndpointResult | null {
	const value = normalizeWhitespace(raw);
	if (!value) return null;
	// The lookbehind starts only at a punctuation run's first character, so inner runs are scanned once.
	if (present.has(value.replace(/(?<!\p{P})\p{P}+$/u, ""))) return "ongoing";

	const yearOnly = /^(\d{4})$/.exec(value);
	if (yearOnly?.[1]) return read(toEndpoint(Number(yearOnly[1])), "year");

	const iso = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(value);
	if (iso?.[1] && iso[2]) return read(toEndpoint(Number(iso[1]), Number(iso[2])), iso[3] ? "day" : "iso");

	const monthYear = /^(\d{1,2})[/.](\d{4})$/.exec(value);
	if (monthYear?.[1] && monthYear[2]) return read(toEndpoint(Number(monthYear[2]), Number(monthYear[1])), "numeric");

	const dayMonthYear = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(value);
	if (dayMonthYear?.[1] && dayMonthYear[2] && dayMonthYear[3]) {
		const year = Number(dayMonthYear[3]);
		const first = Number(dayMonthYear[1]);
		const second = Number(dayMonthYear[2]);
		return read(toEndpoint(year, first) ?? toEndpoint(year, second), "day");
	}

	const named = /^(\p{L}+\.?)\s+(\d{1,2},?\s+)?(\d{4})$/u.exec(value);
	if (named?.[1] && named[3]) {
		const token = normalizeToken(named[1]);
		const year = Number(named[3]);
		const month = months.get(token);
		if (month) return read(toEndpoint(year, month.month), named[2] ? "day" : month.style);
		const season = SEASON_MONTHS[token];
		return season === undefined ? null : read(toEndpoint(year, season), "season");
	}

	return null;
}

function toReading(start: EndpointResult | undefined, end: EndpointResult | undefined): PeriodReading {
	return {
		...(start && start !== "ongoing" ? { start } : {}),
		...(end && end !== "ongoing" ? { end } : {}),
		ongoing: start === "ongoing" || end === "ongoing",
	};
}

const toPeriod = (reading: PeriodReading): ParsedPeriod => ({
	...(reading.start ? { start: reading.start.endpoint } : {}),
	...(reading.end ? { end: reading.end.endpoint } : {}),
	ongoing: reading.ongoing,
});

function getTokens(locale: string, presentWords: readonly string[] = []): Tokens {
	const months = getMonthLookup(locale);
	if (presentWords.length === 0) return { months, present: PRESENT_TOKENS };
	return { months, present: new Set([...PRESENT_TOKENS, ...presentWords.map(normalizeWhitespace)]) };
}

function splitOnce(value: string, separator: RegExp): [string, string] | null {
	const match = separator.exec(value);
	if (!match) return null;

	const left = value.slice(0, match.index);
	const right = value.slice(match.index + match[0].length);
	if (!left.trim() || !right.trim()) return null;

	return [left, right];
}

/**
 * A start endpoint is at most a month name, a day and a year (no locale's month name passes 25 characters),
 * so a dash further in can't end one. Stopping there keeps long dashed text linear.
 */
const MAX_START_CHARS = 64;

function* dashSplits(value: string): Generator<[string, string]> {
	for (let index = 0; index < Math.min(value.length, MAX_START_CHARS); index++) {
		const char = value[index];
		if (!char || !DASH_CHARS.has(char)) continue;

		const left = value.slice(0, index);
		const right = value.slice(index + 1);
		if (left.trim() && right.trim()) yield [left, right];
	}
}

function parseSplit(parts: [string, string], tokens: Tokens): PeriodReading | null {
	const start = parseEndpoint(parts[0], tokens);
	if (!start || start === "ongoing") return null;

	const end = parseEndpoint(parts[1], tokens);
	return end ? toReading(start, end) : null;
}

/**
 * Reads a period such as "Mar 2020 – Present" and reports how each endpoint was written. `presentWords` adds
 * words for "Present" beyond the built-in list, such as the label a resume's own locale prints.
 */
export function readPeriod(value: string, locale = "en-US", presentWords?: readonly string[]): PeriodReading | null {
	const normalized = normalizeWhitespace(value);
	if (!normalized) return null;

	const tokens = getTokens(locale, presentWords);

	const single = parseEndpoint(normalized, tokens);
	if (single) return single === "ongoing" ? null : toReading(single, undefined);

	const spaced = splitOnce(normalized, SPACED_SEPARATOR);
	if (spaced) {
		const period = parseSplit(spaced, tokens);
		if (period) return period;
	}

	for (const candidate of dashSplits(normalized)) {
		const period = parseSplit(candidate, tokens);
		if (period) return period;
	}

	return null;
}

/** Reads a single date such as "Mar 2020" and reports how it was written. */
export function readSingleDate(value: string, locale = "en-US"): EndpointReading | null {
	const normalized = normalizeWhitespace(value);
	if (!normalized) return null;

	const result = parseEndpoint(normalized, getTokens(locale));
	return result && result !== "ongoing" ? result : null;
}

export function parsePeriod(value: string, locale = "en-US"): ParsedPeriod | null {
	const reading = readPeriod(value, locale);
	return reading ? toPeriod(reading) : null;
}

export function parseSingleDate(value: string, locale = "en-US"): PeriodEndpoint | null {
	return readSingleDate(value, locale)?.endpoint ?? null;
}

export function isReversedPeriod(start: PeriodEndpoint, end: PeriodEndpoint): boolean {
	return start.year * 12 + (start.month ?? 1) > end.year * 12 + (end.month ?? 12);
}

export function isFutureEndpoint(endpoint: PeriodEndpoint, now: Date): boolean {
	return endpoint.year * 12 + (endpoint.month ?? 1) > now.getUTCFullYear() * 12 + (now.getUTCMonth() + 1);
}
