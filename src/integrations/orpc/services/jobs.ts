import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/integrations/drizzle/client";
import { jobSearchQuota } from "@/integrations/drizzle/schema";
import { createJobSearchProvider } from "@/integrations/jobs/factory";
import type {
	JobResult,
	PostFilterOptions,
	QuotaStatus,
	RapidApiQuota,
	SearchParams,
	SearchResponse,
} from "@/schema/jobs";
import { env } from "@/utils/env";
import { generateId } from "@/utils/string";

// --- Rate Limiting (calendar-month boundaries) ---

function isCurrentMonth(windowStart: Date): boolean {
	const now = new Date();
	return now.getUTCFullYear() === windowStart.getUTCFullYear() && now.getUTCMonth() === windowStart.getUTCMonth();
}

function startOfCurrentMonth(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextMonth(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

async function getQuota(userId: string): Promise<QuotaStatus> {
	const monthlyLimit = env.JOB_SEARCH_MONTHLY_LIMIT;

	const [row] = await db.select().from(jobSearchQuota).where(eq(jobSearchQuota.userId, userId)).limit(1);

	if (!row || !isCurrentMonth(row.windowStart)) {
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
	const monthStart = startOfCurrentMonth();

	// Reset quota if windowStart is from a previous month
	await db
		.update(jobSearchQuota)
		.set({ requestCount: 0, windowStart: monthStart })
		.where(and(eq(jobSearchQuota.userId, userId), lt(jobSearchQuota.windowStart, monthStart)));

	// Atomic increment that only succeeds if requestCount < monthlyLimit
	const result = await db
		.update(jobSearchQuota)
		.set({ requestCount: sql`${jobSearchQuota.requestCount} + 1` })
		.where(and(eq(jobSearchQuota.userId, userId), lt(jobSearchQuota.requestCount, monthlyLimit)))
		.returning({ requestCount: jobSearchQuota.requestCount });

	if (result.length > 0) return;

	// No rows updated — either the user has no quota row yet, or the limit was reached
	const [existing] = await db.select().from(jobSearchQuota).where(eq(jobSearchQuota.userId, userId)).limit(1);

	if (!existing) {
		await db.insert(jobSearchQuota).values({
			id: generateId(),
			userId,
			requestCount: 1,
			windowStart: monthStart,
		});
		return;
	}

	// Row exists but update failed — limit reached
	const resetsAt = startOfNextMonth().toISOString();
	throw new Error(`Monthly rate limit reached (${monthlyLimit}/${monthlyLimit} used). Resets at ${resetsAt}.`);
}

// --- Provider-Delegated Operations ---

async function search(
	apiKey: string,
	userId: string,
	params: SearchParams,
): Promise<SearchResponse & { rapidApiQuota?: RapidApiQuota }> {
	await checkAndIncrementQuota(userId);
	const provider = createJobSearchProvider(apiKey);
	return provider.search(params);
}

async function getJobDetails(apiKey: string, jobId: string) {
	const provider = createJobSearchProvider(apiKey);
	return provider.getJobDetails(jobId);
}

async function testConnection(apiKey: string): Promise<{ success: boolean; rapidApiQuota?: RapidApiQuota }> {
	const provider = createJobSearchProvider(apiKey);
	return provider.testConnection();
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
