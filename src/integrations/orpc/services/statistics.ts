import fs from "node:fs/promises";
import { dirname, join } from "node:path";
import { count } from "drizzle-orm";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours
const GITHUB_API_URL = "https://api.github.com/repos/amruthpillai/reactive-resume";
const GITHUB_REQUEST_TIMEOUT_MS = 5_000;
const GITHUB_REQUEST_MAX_ATTEMPTS = 2;

const LAST_KNOWN = {
	users: 978_528,
	resumes: 1_336_307,
	stars: 34_073,
} as const;

const getCachePath = (key: string) => join(process.cwd(), "data", "statistics", `${key}.txt`);

const readCache = async (key: string): Promise<number | null> => {
	try {
		const filePath = getCachePath(key);
		const [stats, contents] = await Promise.all([fs.stat(filePath), fs.readFile(filePath, "utf-8")]);

		if (stats.mtimeMs < Date.now() - CACHE_DURATION_MS) return null;

		const value = Number.parseInt(contents, 10);
		return Number.isFinite(value) && value > 0 ? value : null;
	} catch {
		return null;
	}
};

const writeCache = async (key: string, value: number) => {
	try {
		const filePath = getCachePath(key);
		await fs.mkdir(dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, String(value), "utf-8");
	} catch {
		// Ignore errors, cache is not critical
	}
};

const getCachedCount = async (
	key: string,
	lastKnown: number,
	fetcher: () => Promise<number | null>,
): Promise<number> => {
	const cached = await readCache(key);
	if (cached !== null) return cached;

	try {
		const value = await fetcher();
		if (value !== null) {
			await writeCache(key, value);
			return value;
		}
	} catch {
		// Ignore errors, use last known value
	}

	return lastKnown;
};

const getCountFromDatabase = async (table: typeof schema.user | typeof schema.resume): Promise<number | null> => {
	const [result] = await db.select({ count: count() }).from(table);
	return result.count;
};

const fetchGitHubStarsOnce = async (): Promise<number | null> => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(GITHUB_API_URL, {
			signal: controller.signal,
			headers: {
				Accept: "application/vnd.github+json",
			},
		});
		if (!response.ok) return null;

		const data = (await response.json()) as { stargazers_count?: unknown };
		const stars = Number(data.stargazers_count);
		return Number.isFinite(stars) && stars > 0 ? stars : null;
	} catch {
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
};

const getGitHubStars = async (): Promise<number | null> => {
	for (let attempt = 0; attempt < GITHUB_REQUEST_MAX_ATTEMPTS; attempt++) {
		const stars = await fetchGitHubStarsOnce();
		if (stars !== null) return stars;
	}

	return null;
};

export const statisticsService = {
	user: {
		getCount: () => {
			return getCachedCount("users", LAST_KNOWN.users, () => getCountFromDatabase(schema.user));
		},
	},
	resume: {
		getCount: () => {
			return getCachedCount("resumes", LAST_KNOWN.resumes, () => getCountFromDatabase(schema.resume));
		},
	},
	github: {
		getStarCount: () => {
			return getCachedCount("stars", LAST_KNOWN.stars, getGitHubStars);
		},
	},
};
