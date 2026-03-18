import type { PostFilterOptions, SearchParams } from "@/schema/jobs";

// --- Pagination ---

export const RESULTS_PER_PAGE = 10;
export const FETCH_NUM_PAGES = 1;

// --- Types ---

export type FilterState = {
  // API-level (SearchParams)
  datePosted: string | null;
  remoteOnly: boolean;
  employmentType: string | null;
  jobRequirements: string | null;
  countryCode: string;
  // Post-filters (PostFilterOptions)
  minSalary: string;
  maxSalary: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  excludeCompanies: string[];
  directApplyOnly: boolean;
};

export const initialFilterState: FilterState = {
  datePosted: null,
  remoteOnly: false,
  employmentType: null,
  jobRequirements: null,
  countryCode: "US",
  minSalary: "",
  maxSalary: "",
  includeKeywords: [],
  excludeKeywords: [],
  excludeCompanies: [],
  directApplyOnly: false,
};

// --- Pure helper functions ---

export function buildSearchParams(query: string, filters: FilterState, page?: number): SearchParams {
  const effectiveQuery = query.trim();
  const countryCode = filters.countryCode.trim().toUpperCase() || initialFilterState.countryCode;

  const params: SearchParams = { query: effectiveQuery, num_pages: FETCH_NUM_PAGES };
  if (page && page > 1) params.page = page;
  if (filters.datePosted) params.date_posted = filters.datePosted as SearchParams["date_posted"];
  params.country = countryCode;
  if (filters.remoteOnly) params.remote_jobs_only = true;
  if (filters.employmentType) params.employment_types = filters.employmentType;
  if (filters.jobRequirements) params.job_requirements = filters.jobRequirements;
  return params;
}

export function buildPostFilters(filters: FilterState): PostFilterOptions {
  const result: PostFilterOptions = {};
  const minSal = Number(filters.minSalary);
  const maxSal = Number(filters.maxSalary);
  if (Number.isFinite(minSal) && minSal > 0) result.minSalary = minSal;
  if (Number.isFinite(maxSal) && maxSal > 0) result.maxSalary = maxSal;
  if (filters.includeKeywords.length > 0) result.includeKeywords = filters.includeKeywords;
  if (filters.excludeKeywords.length > 0) result.excludeKeywords = filters.excludeKeywords;
  if (filters.excludeCompanies.length > 0) result.excludeCompanies = filters.excludeCompanies;
  if (filters.directApplyOnly) result.directApplyOnly = true;
  return result;
}

export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.datePosted !== null ||
    filters.remoteOnly ||
    filters.employmentType !== null ||
    filters.jobRequirements !== null ||
    filters.countryCode !== initialFilterState.countryCode ||
    filters.minSalary !== "" ||
    filters.maxSalary !== "" ||
    filters.includeKeywords.length > 0 ||
    filters.excludeKeywords.length > 0 ||
    filters.excludeCompanies.length > 0 ||
    filters.directApplyOnly
  );
}
