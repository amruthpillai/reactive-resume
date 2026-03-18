import { createJobSearchProvider } from "@/integrations/jobs/factory";
import type { JobResult, PostFilterOptions, RapidApiQuota, SearchParams, SearchResponse } from "@/schema/jobs";

// --- Provider-Delegated Operations ---

async function search(
	apiKey: string,
	params: SearchParams,
): Promise<SearchResponse & { rapidApiQuota?: RapidApiQuota }> {
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
	applyPostFilters,
	deduplicateJobs,
};
