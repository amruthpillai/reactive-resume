import { describe, expect, it } from "vitest";

import {
  buildPostFilters,
  buildSearchParams,
  FETCH_NUM_PAGES,
  type FilterState,
  hasActiveFilters,
  initialFilterState,
  RESULTS_PER_PAGE,
} from "./filter-helpers";

// --- buildSearchParams ---

describe("buildSearchParams", () => {
  it("returns query and num_pages when all filters are default", () => {
    const result = buildSearchParams("react developer", initialFilterState);
    expect(result).toEqual({ query: "react developer", num_pages: FETCH_NUM_PAGES });
  });

  it("trims the query string", () => {
    const result = buildSearchParams("  react developer  ", initialFilterState);
    expect(result.query).toBe("react developer");
  });

  it("includes date_posted when datePosted is set", () => {
    const filters: FilterState = { ...initialFilterState, datePosted: "week" };
    const result = buildSearchParams("engineer", filters);
    expect(result.date_posted).toBe("week");
  });

  it("includes remote_jobs_only when remoteOnly is true", () => {
    const filters: FilterState = { ...initialFilterState, remoteOnly: true };
    const result = buildSearchParams("engineer", filters);
    expect(result.remote_jobs_only).toBe(true);
  });

  it("omits remote_jobs_only when remoteOnly is false", () => {
    const result = buildSearchParams("engineer", initialFilterState);
    expect(result.remote_jobs_only).toBeUndefined();
  });

  it("includes employment_types when employmentType is set", () => {
    const filters: FilterState = { ...initialFilterState, employmentType: "FULLTIME" };
    const result = buildSearchParams("engineer", filters);
    expect(result.employment_types).toBe("FULLTIME");
  });

  it("includes job_requirements when jobRequirements is set", () => {
    const filters: FilterState = { ...initialFilterState, jobRequirements: "under_3_years_experience" };
    const result = buildSearchParams("engineer", filters);
    expect(result.job_requirements).toBe("under_3_years_experience");
  });

  it("appends city to query when only city is set", () => {
    const filters: FilterState = { ...initialFilterState, city: "New York" };
    const result = buildSearchParams("engineer", filters);
    expect(result.query).toBe("engineer in New York");
  });

  it("appends state to query when only state is set", () => {
    const filters: FilterState = { ...initialFilterState, state: "NY" };
    const result = buildSearchParams("engineer", filters);
    expect(result.query).toBe("engineer in NY");
  });

  it("appends country to query when only country is set", () => {
    const filters: FilterState = { ...initialFilterState, country: "USA" };
    const result = buildSearchParams("engineer", filters);
    expect(result.query).toBe("engineer in USA");
  });

  it("appends city and state when both are set", () => {
    const filters: FilterState = { ...initialFilterState, city: "New York", state: "NY" };
    const result = buildSearchParams("engineer", filters);
    expect(result.query).toBe("engineer in New York, NY");
  });

  it("appends city, state, and country when all are set", () => {
    const filters: FilterState = { ...initialFilterState, city: "New York", state: "NY", country: "USA" };
    const result = buildSearchParams("engineer", filters);
    expect(result.query).toBe("engineer in New York, NY, USA");
  });

  it("does not append location when all location fields are empty", () => {
    const result = buildSearchParams("engineer", initialFilterState);
    expect(result.query).toBe("engineer");
  });

  it("does not append location when all location fields are only whitespace", () => {
    const filters: FilterState = { ...initialFilterState, city: "   ", state: "  ", country: "   " };
    const result = buildSearchParams("engineer", filters);
    expect(result.query).toBe("engineer");
  });

  it("trims location fields before appending", () => {
    const filters: FilterState = { ...initialFilterState, city: "  NYC  ", state: "  NY  " };
    const result = buildSearchParams("engineer", filters);
    expect(result.query).toBe("engineer in NYC, NY");
  });

  it("skips empty fields when building location string", () => {
    const filters: FilterState = { ...initialFilterState, city: "Seattle", country: "USA" };
    const result = buildSearchParams("engineer", filters);
    expect(result.query).toBe("engineer in Seattle, USA");
  });

  it("includes all filter params when all are set", () => {
    const filters: FilterState = {
      ...initialFilterState,
      datePosted: "today",
      remoteOnly: true,
      employmentType: "CONTRACTOR",
      jobRequirements: "no_experience",
      city: "Seattle",
      state: "WA",
      country: "US",
    };
    const result = buildSearchParams("designer", filters);
    expect(result).toEqual({
      query: "designer in Seattle, WA, US",
      num_pages: FETCH_NUM_PAGES,
      date_posted: "today",
      remote_jobs_only: true,
      employment_types: "CONTRACTOR",
      job_requirements: "no_experience",
    });
  });
  it("always includes num_pages", () => {
    const result = buildSearchParams("test", initialFilterState);
    expect(result.num_pages).toBe(FETCH_NUM_PAGES);
  });

  it("omits page param when page is undefined", () => {
    const result = buildSearchParams("test", initialFilterState);
    expect(result.page).toBeUndefined();
  });

  it("omits page param when page is 1", () => {
    const result = buildSearchParams("test", initialFilterState, 1);
    expect(result.page).toBeUndefined();
  });

  it("includes page param when page > 1", () => {
    const result = buildSearchParams("test", initialFilterState, 2);
    expect(result.page).toBe(2);
  });

  it("includes page param for higher page numbers", () => {
    const result = buildSearchParams("test", initialFilterState, 5);
    expect(result.page).toBe(5);
  });
});

// --- Pagination constants ---

describe("pagination constants", () => {
  it("RESULTS_PER_PAGE is 10", () => {
    expect(RESULTS_PER_PAGE).toBe(10);
  });

  it("FETCH_NUM_PAGES is 1", () => {
    expect(FETCH_NUM_PAGES).toBe(1);
  });

  it("FETCH_NUM_PAGES matches RESULTS_PER_PAGE worth of results", () => {
    // Each API page returns ~10 results, so FETCH_NUM_PAGES * 10 should equal RESULTS_PER_PAGE
    expect(FETCH_NUM_PAGES * 10).toBe(RESULTS_PER_PAGE);
  });
});

// --- buildPostFilters ---

describe("buildPostFilters", () => {
  it("returns empty object when all filters are default", () => {
    const result = buildPostFilters(initialFilterState);
    expect(result).toEqual({});
  });

  it("includes minSalary when valid positive number", () => {
    const filters: FilterState = { ...initialFilterState, minSalary: "50000" };
    const result = buildPostFilters(filters);
    expect(result.minSalary).toBe(50000);
  });

  it("includes maxSalary when valid positive number", () => {
    const filters: FilterState = { ...initialFilterState, maxSalary: "150000" };
    const result = buildPostFilters(filters);
    expect(result.maxSalary).toBe(150000);
  });

  it("omits minSalary for empty string", () => {
    const result = buildPostFilters(initialFilterState);
    expect(result.minSalary).toBeUndefined();
  });

  it("omits minSalary for non-numeric string", () => {
    const filters: FilterState = { ...initialFilterState, minSalary: "abc" };
    const result = buildPostFilters(filters);
    expect(result.minSalary).toBeUndefined();
  });

  it("omits minSalary for zero", () => {
    const filters: FilterState = { ...initialFilterState, minSalary: "0" };
    const result = buildPostFilters(filters);
    expect(result.minSalary).toBeUndefined();
  });

  it("includes includeKeywords when non-empty", () => {
    const filters: FilterState = { ...initialFilterState, includeKeywords: ["react", "typescript"] };
    const result = buildPostFilters(filters);
    expect(result.includeKeywords).toEqual(["react", "typescript"]);
  });

  it("omits includeKeywords when empty array", () => {
    const result = buildPostFilters(initialFilterState);
    expect(result.includeKeywords).toBeUndefined();
  });

  it("includes excludeKeywords when non-empty", () => {
    const filters: FilterState = { ...initialFilterState, excludeKeywords: ["senior"] };
    const result = buildPostFilters(filters);
    expect(result.excludeKeywords).toEqual(["senior"]);
  });

  it("includes excludeCompanies when non-empty", () => {
    const filters: FilterState = { ...initialFilterState, excludeCompanies: ["Spam Inc"] };
    const result = buildPostFilters(filters);
    expect(result.excludeCompanies).toEqual(["Spam Inc"]);
  });

  it("includes directApplyOnly when true", () => {
    const filters: FilterState = { ...initialFilterState, directApplyOnly: true };
    const result = buildPostFilters(filters);
    expect(result.directApplyOnly).toBe(true);
  });

  it("omits directApplyOnly when false", () => {
    const result = buildPostFilters(initialFilterState);
    expect(result.directApplyOnly).toBeUndefined();
  });

  it("includes all post-filters when all are set", () => {
    const filters: FilterState = {
      ...initialFilterState,
      minSalary: "80000",
      maxSalary: "200000",
      includeKeywords: ["react"],
      excludeKeywords: ["java"],
      excludeCompanies: ["Acme"],
      directApplyOnly: true,
    };
    const result = buildPostFilters(filters);
    expect(result).toEqual({
      minSalary: 80000,
      maxSalary: 200000,
      includeKeywords: ["react"],
      excludeKeywords: ["java"],
      excludeCompanies: ["Acme"],
      directApplyOnly: true,
    });
  });
});

// --- hasActiveFilters ---

describe("hasActiveFilters", () => {
  it("returns false for initial/default filter state", () => {
    expect(hasActiveFilters(initialFilterState)).toBe(false);
  });

  it("returns true when datePosted is set", () => {
    expect(hasActiveFilters({ ...initialFilterState, datePosted: "week" })).toBe(true);
  });

  it("returns true when remoteOnly is true", () => {
    expect(hasActiveFilters({ ...initialFilterState, remoteOnly: true })).toBe(true);
  });

  it("returns true when employmentType is set", () => {
    expect(hasActiveFilters({ ...initialFilterState, employmentType: "FULLTIME" })).toBe(true);
  });

  it("returns true when jobRequirements is set", () => {
    expect(hasActiveFilters({ ...initialFilterState, jobRequirements: "no_experience" })).toBe(true);
  });

  it("returns true when city is set", () => {
    expect(hasActiveFilters({ ...initialFilterState, city: "NYC" })).toBe(true);
  });

  it("returns true when state is set", () => {
    expect(hasActiveFilters({ ...initialFilterState, state: "NY" })).toBe(true);
  });

  it("returns true when country is set", () => {
    expect(hasActiveFilters({ ...initialFilterState, country: "USA" })).toBe(true);
  });

  it("returns true when minSalary is set", () => {
    expect(hasActiveFilters({ ...initialFilterState, minSalary: "50000" })).toBe(true);
  });

  it("returns true when maxSalary is set", () => {
    expect(hasActiveFilters({ ...initialFilterState, maxSalary: "150000" })).toBe(true);
  });

  it("returns true when includeKeywords has items", () => {
    expect(hasActiveFilters({ ...initialFilterState, includeKeywords: ["react"] })).toBe(true);
  });

  it("returns true when excludeKeywords has items", () => {
    expect(hasActiveFilters({ ...initialFilterState, excludeKeywords: ["java"] })).toBe(true);
  });

  it("returns true when excludeCompanies has items", () => {
    expect(hasActiveFilters({ ...initialFilterState, excludeCompanies: ["Acme"] })).toBe(true);
  });

  it("returns true when directApplyOnly is true", () => {
    expect(hasActiveFilters({ ...initialFilterState, directApplyOnly: true })).toBe(true);
  });

  it("returns true when multiple filters are active", () => {
    expect(
      hasActiveFilters({
        ...initialFilterState,
        remoteOnly: true,
        employmentType: "FULLTIME",
        minSalary: "60000",
      }),
    ).toBe(true);
  });
});
