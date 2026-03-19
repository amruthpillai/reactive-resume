import type { JobResult, PostFilterOptions, RapidApiQuota, SearchParams, SearchResponse } from "@/schema/jobs";

import { createJobSearchProvider } from "@/integrations/jobs/factory";

// --- Provider-Delegated Operations ---

async function search(
  apiKey: string,
  params: SearchParams,
): Promise<SearchResponse & { rapidApiQuota?: RapidApiQuota }> {
  const provider = createJobSearchProvider(apiKey);
  return provider.search(params);
}

async function testConnection(apiKey: string): Promise<{ success: boolean; rapidApiQuota?: RapidApiQuota }> {
  const provider = createJobSearchProvider(apiKey);
  return provider.testConnection();
}

// --- Post-Search Filtering ---

function applyPostFilters(jobs: JobResult[], options: PostFilterOptions): JobResult[] {
  let filtered = jobs;

  const normalizeKeywords = (values: string[]) => values.map((value) => value.trim().toLowerCase()).filter(Boolean);

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
    const keywords = normalizeKeywords(options.includeKeywords);

    if (keywords.length > 0) {
      filtered = filtered.filter((job) => {
        const text = `${job.job_title} ${job.job_description}`.toLowerCase();
        return keywords.some((keyword) => text.includes(keyword));
      });
    }
  }

  if (options.excludeKeywords?.length) {
    const keywords = normalizeKeywords(options.excludeKeywords);

    if (keywords.length > 0) {
      filtered = filtered.filter((job) => {
        const text = `${job.job_title} ${job.job_description}`.toLowerCase();
        return !keywords.some((keyword) => text.includes(keyword));
      });
    }
  }

  if (options.excludeCompanies?.length) {
    const companies = normalizeKeywords(options.excludeCompanies);

    if (companies.length > 0) {
      filtered = filtered.filter((job) => !companies.includes(job.employer_name.toLowerCase()));
    }
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
  testConnection,
  applyPostFilters,
  deduplicateJobs,
};
