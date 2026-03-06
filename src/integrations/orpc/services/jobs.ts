import { eq } from "drizzle-orm";
import type z from "zod";
import { db } from "@/integrations/drizzle/client";
import { jobSearchQuota } from "@/integrations/drizzle/schema";
import {
	type JobResult,
	jobDetailsResponseSchema,
	type PostFilterOptions,
	type QuotaStatus,
	type SearchParams,
	type SearchResponse,
	searchResponseSchema,
} from "@/schema/jobs";
import { env } from "@/utils/env";
import { generateId } from "@/utils/string";

const JSEARCH_BASE_URL = "https://jsearch.p.rapidapi.com";
const JSEARCH_HOST = "jsearch.p.rapidapi.com";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MONTHLY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// --- Rate Limiting ---

async function getQuota(userId: string): Promise<QuotaStatus> {
	const monthlyLimit = env.JOB_SEARCH_MONTHLY_LIMIT;

	const [row] = await db.select().from(jobSearchQuota).where(eq(jobSearchQuota.userId, userId)).limit(1);

	if (!row) {
		return {
			monthlyUsed: 0,
			monthlyLimit,
			monthlyRemaining: monthlyLimit,
			windowStart: null,
		};
	}

	const windowStart = row.windowStart.getTime();
	const now = Date.now();

	// Reset if window has expired
	if (now - windowStart > MONTHLY_WINDOW_MS) {
		return {
			monthlyUsed: 0,
			monthlyLimit,
			monthlyRemaining: monthlyLimit,
			windowStart: null,
		};
	}

	return {
		monthlyUsed: row.requestCount,
		monthlyLimit,
		monthlyRemaining: Math.max(0, monthlyLimit - row.requestCount),
		windowStart: row.windowStart.toISOString(),
	};
}

async function checkAndIncrementQuota(userId: string): Promise<void> {
	const monthlyLimit = env.JOB_SEARCH_MONTHLY_LIMIT;
	const now = new Date();

	const [row] = await db.select().from(jobSearchQuota).where(eq(jobSearchQuota.userId, userId)).limit(1);

	if (!row) {
		await db.insert(jobSearchQuota).values({
			id: generateId(),
			userId,
			requestCount: 1,
			windowStart: now,
		});
		return;
	}

	const windowStart = row.windowStart.getTime();
	const elapsed = now.getTime() - windowStart;

	// Reset window if expired
	if (elapsed > MONTHLY_WINDOW_MS) {
		await db.update(jobSearchQuota).set({ requestCount: 1, windowStart: now }).where(eq(jobSearchQuota.userId, userId));
		return;
	}

	if (row.requestCount >= monthlyLimit) {
		throw new Error(
			`Monthly rate limit reached (${monthlyLimit}/${monthlyLimit} used). Resets at ${new Date(windowStart + MONTHLY_WINDOW_MS).toISOString()}.`,
		);
	}

	await db
		.update(jobSearchQuota)
		.set({ requestCount: row.requestCount + 1 })
		.where(eq(jobSearchQuota.userId, userId));
}

// --- JSearch API Proxy ---

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jsearchRequest<T>(apiKey: string, path: string, schema: z.ZodType<T>): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const response = await fetch(`${JSEARCH_BASE_URL}${path}`, {
				headers: {
					"X-RapidAPI-Key": apiKey,
					"X-RapidAPI-Host": JSEARCH_HOST,
				},
			});

			if (response.status === 429) {
				const backoff = INITIAL_BACKOFF_MS * 2 ** attempt;
				await sleep(backoff);
				continue;
			}

			if (!response.ok) {
				throw new Error(`JSearch API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			return schema.parse(data);
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			if (attempt < MAX_RETRIES - 1) {
				const backoff = INITIAL_BACKOFF_MS * 2 ** attempt;
				await sleep(backoff);
			}
		}
	}

	throw lastError ?? new Error("Request failed after retries");
}

async function search(apiKey: string, userId: string, params: SearchParams): Promise<SearchResponse> {
	await checkAndIncrementQuota(userId);

	const query = new URLSearchParams();
	query.set("query", params.query);
	if (params.page) query.set("page", String(params.page));
	if (params.num_pages) query.set("num_pages", String(params.num_pages));
	if (params.date_posted) query.set("date_posted", params.date_posted);
	if (params.remote_jobs_only) query.set("remote_jobs_only", String(params.remote_jobs_only));
	if (params.employment_types) query.set("employment_types", params.employment_types);
	if (params.job_requirements) query.set("job_requirements", params.job_requirements);
	if (params.radius) query.set("radius", String(params.radius));
	if (params.exclude_job_publishers) query.set("exclude_job_publishers", params.exclude_job_publishers);
	if (params.categories) query.set("categories", params.categories);

	return jsearchRequest(apiKey, `/search?${query.toString()}`, searchResponseSchema);
}

async function getJobDetails(apiKey: string, jobId: string) {
	const query = new URLSearchParams({ job_id: jobId });
	const result = await jsearchRequest(apiKey, `/job-details?${query.toString()}`, jobDetailsResponseSchema);
	return result.data[0] ?? null;
}

async function testConnection(apiKey: string): Promise<boolean> {
	try {
		const query = new URLSearchParams({ query: "test", num_pages: "1" });
		await jsearchRequest(apiKey, `/search?${query.toString()}`, searchResponseSchema);
		return true;
	} catch {
		return false;
	}
}

// --- Post-Search Filtering ---

function applyPostFilters(jobs: JobResult[], options: PostFilterOptions): JobResult[] {
	let filtered = jobs;

	if (options.minSalary != null || options.maxSalary != null) {
		filtered = filtered.filter((job) => {
			if (job.job_min_salary == null && job.job_max_salary == null) return true;
			const jobMin = job.job_min_salary ?? 0;
			const jobMax = job.job_max_salary ?? Number.POSITIVE_INFINITY;
			if (options.minSalary != null && jobMax < options.minSalary) return false;
			if (options.maxSalary != null && jobMin > options.maxSalary) return false;
			return true;
		});
	}

	if (options.includeKeywords?.length) {
		const lower = options.includeKeywords.map((k) => k.toLowerCase());
		filtered = filtered.filter((job) => {
			const text = `${job.job_title} ${job.job_description}`.toLowerCase();
			return lower.some((kw) => text.includes(kw));
		});
	}

	if (options.excludeKeywords?.length) {
		const lower = options.excludeKeywords.map((k) => k.toLowerCase());
		filtered = filtered.filter((job) => {
			const text = `${job.job_title} ${job.job_description}`.toLowerCase();
			return !lower.some((kw) => text.includes(kw));
		});
	}

	if (options.excludeCompanies?.length) {
		const lower = options.excludeCompanies.map((c) => c.toLowerCase());
		filtered = filtered.filter((job) => !lower.includes(job.employer_name.toLowerCase()));
	}

	if (options.directApplyOnly) {
		filtered = filtered.filter((job) => job.job_apply_is_direct);
	}

	return filtered;
}

function deduplicateJobs(jobs: JobResult[]): JobResult[] {
	const seen = new Set<string>();
	return jobs.filter((job) => {
		const key = `${job.job_title.toLowerCase()}|${job.employer_name.toLowerCase()}|${job.job_city?.toLowerCase() ?? ""}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export const jobsService = {
	search,
	getJobDetails,
	testConnection,
	getQuota,
	applyPostFilters,
	deduplicateJobs,
};
