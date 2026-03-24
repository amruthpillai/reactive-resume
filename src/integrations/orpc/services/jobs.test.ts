import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { JobResult, PostFilterOptions, RapidApiQuota } from "@/schema/jobs";

// --- Mock factory ---

const mockProvider = {
  search: vi.fn(),
  testConnection: vi.fn(),
};

vi.mock("@/integrations/jobs/factory", () => ({
  createJobSearchProvider: () => mockProvider,
}));

const { jobsService } = await import("./jobs");

// --- Helpers ---

function makeJob(overrides?: Partial<JobResult>): JobResult {
  return {
    job_id: "job-1",
    job_title: "Software Engineer",
    employer_name: "Acme Corp",
    employer_logo: null,
    employer_website: null,
    employer_company_type: null,
    employer_linkedin: null,
    job_publisher: "LinkedIn",
    job_employment_type: "FULLTIME",
    job_apply_link: "https://example.com/apply",
    job_apply_is_direct: false,
    job_apply_quality_score: null,
    job_description: "Build amazing software with React and TypeScript.",
    job_is_remote: false,
    job_city: "New York",
    job_state: "NY",
    job_country: "US",
    job_latitude: null,
    job_longitude: null,
    job_posted_at_timestamp: null,
    job_posted_at_datetime_utc: "",
    job_offer_expiration_datetime_utc: null,
    job_offer_expiration_timestamp: null,
    job_min_salary: null,
    job_max_salary: null,
    job_salary_currency: null,
    job_salary_period: null,
    job_benefits: null,
    job_google_link: null,
    job_required_experience: {
      no_experience_required: false,
      required_experience_in_months: null,
      experience_mentioned: false,
      experience_preferred: false,
    },
    job_required_skills: null,
    job_required_education: {
      postgraduate_degree: false,
      professional_certification: false,
      high_school: false,
      associates_degree: false,
      bachelors_degree: false,
      degree_mentioned: false,
      degree_preferred: false,
      professional_certification_mentioned: false,
    },
    job_experience_in_place_of_education: null,
    job_highlights: null,
    job_posting_language: null,
    job_onet_soc: null,
    job_onet_job_zone: null,
    job_occupational_categories: null,
    job_naics_code: null,
    job_naics_name: null,
    apply_options: [],
    ...overrides,
  };
}

const mockQuota: RapidApiQuota = { limit: 200, remaining: 195, used: 5 };

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks();
});

// --- testConnection ---

describe("testConnection", () => {
  it("delegates to provider and returns success with quota", async () => {
    mockProvider.testConnection.mockResolvedValue({ success: true, rapidApiQuota: mockQuota });

    const result = await jobsService.testConnection("test-key");

    expect(result.success).toBe(true);
    expect(result.rapidApiQuota).toEqual(mockQuota);
    expect(mockProvider.testConnection).toHaveBeenCalledOnce();
  });

  it("returns success false when provider fails", async () => {
    mockProvider.testConnection.mockResolvedValue({ success: false });

    const result = await jobsService.testConnection("bad-key");

    expect(result.success).toBe(false);
    expect(result.rapidApiQuota).toBeUndefined();
  });
});

// --- search ---

describe("search", () => {
  it("delegates to provider and returns results with quota", async () => {
    const searchResponse = {
      status: "OK",
      request_id: "req-1",
      parameters: {},
      data: [makeJob()],
      rapidApiQuota: mockQuota,
    };
    mockProvider.search.mockResolvedValue(searchResponse);

    const result = await jobsService.search("test-key", { query: "react", num_pages: 1 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].job_title).toBe("Software Engineer");
    expect(result.rapidApiQuota).toEqual(mockQuota);
    expect(mockProvider.search).toHaveBeenCalledWith({ query: "react", num_pages: 1 });
  });

  it("returns search results without rapidApiQuota when headers missing", async () => {
    const searchResponse = {
      status: "OK",
      request_id: "req-1",
      parameters: {},
      data: [makeJob()],
    };
    mockProvider.search.mockResolvedValue(searchResponse);

    const result = await jobsService.search("test-key", { query: "react", num_pages: 1 });

    expect(result.data).toHaveLength(1);
    expect(result.rapidApiQuota).toBeUndefined();
  });
});

// --- deduplicateJobs ---

describe("deduplicateJobs", () => {
  it("returns all jobs when there are no duplicates", () => {
    const jobs = [
      makeJob({ job_id: "1", job_title: "Engineer", employer_name: "A", job_city: "NYC" }),
      makeJob({ job_id: "2", job_title: "Designer", employer_name: "B", job_city: "LA" }),
    ];
    const result = jobsService.deduplicateJobs(jobs);
    expect(result).toHaveLength(2);
  });

  it("removes duplicates with same title, company, and city", () => {
    const jobs = [
      makeJob({ job_id: "1", job_title: "Engineer", employer_name: "Acme", job_city: "NYC" }),
      makeJob({ job_id: "2", job_title: "Engineer", employer_name: "Acme", job_city: "NYC" }),
      makeJob({ job_id: "3", job_title: "Engineer", employer_name: "Acme", job_city: "LA" }),
    ];
    const result = jobsService.deduplicateJobs(jobs);
    expect(result).toHaveLength(2);
    expect(result[0].job_id).toBe("1");
    expect(result[1].job_id).toBe("3");
  });

  it("is case-insensitive", () => {
    const jobs = [
      makeJob({ job_id: "1", job_title: "Software Engineer", employer_name: "Acme Corp", job_city: "NYC" }),
      makeJob({ job_id: "2", job_title: "software engineer", employer_name: "acme corp", job_city: "nyc" }),
    ];
    const result = jobsService.deduplicateJobs(jobs);
    expect(result).toHaveLength(1);
    expect(result[0].job_id).toBe("1");
  });

  it("keeps the first occurrence", () => {
    const jobs = [
      makeJob({ job_id: "first", job_title: "Dev", employer_name: "Co", job_city: "X" }),
      makeJob({ job_id: "second", job_title: "Dev", employer_name: "Co", job_city: "X" }),
    ];
    const result = jobsService.deduplicateJobs(jobs);
    expect(result[0].job_id).toBe("first");
  });

  it("handles empty array", () => {
    expect(jobsService.deduplicateJobs([])).toEqual([]);
  });

  it("handles empty city (matches other empty cities)", () => {
    const jobs = [
      makeJob({ job_id: "1", job_title: "Dev", employer_name: "Co", job_city: "" }),
      makeJob({ job_id: "2", job_title: "Dev", employer_name: "Co", job_city: "" }),
    ];
    const result = jobsService.deduplicateJobs(jobs);
    expect(result).toHaveLength(1);
  });
});

// --- applyPostFilters ---

describe("applyPostFilters", () => {
  const baseJobs = [
    makeJob({
      job_id: "1",
      job_title: "React Developer",
      employer_name: "TechCo",
      job_description: "Build React apps with TypeScript.",
      job_min_salary: 80000,
      job_max_salary: 120000,
      job_apply_is_direct: true,
    }),
    makeJob({
      job_id: "2",
      job_title: "Senior Java Engineer",
      employer_name: "BigCorp",
      job_description: "Enterprise Java development.",
      job_min_salary: 100000,
      job_max_salary: 160000,
      job_apply_is_direct: false,
    }),
    makeJob({
      job_id: "3",
      job_title: "Junior Frontend Dev",
      employer_name: "StartupXYZ",
      job_description: "Build web interfaces using React and CSS.",
      job_min_salary: null,
      job_max_salary: null,
      job_apply_is_direct: true,
    }),
  ];

  it("returns all jobs with no filters", () => {
    const result = jobsService.applyPostFilters(baseJobs, {});
    expect(result).toHaveLength(3);
  });

  // -- Salary filters --

  it("filters by minSalary", () => {
    const result = jobsService.applyPostFilters(baseJobs, { minSalary: 90000 });
    // Job 1 (max 120k >= 90k) ✓, Job 2 (max 160k >= 90k) ✓, Job 3 (no salary → included) ✓
    expect(result).toHaveLength(3);
  });

  it("filters by minSalary excluding low-salary jobs", () => {
    const result = jobsService.applyPostFilters(baseJobs, { minSalary: 130000 });
    // Job 1 (max 120k < 130k) ✗, Job 2 (max 160k >= 130k) ✓, Job 3 (no salary) ✓
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.job_id)).toEqual(["2", "3"]);
  });

  it("filters by maxSalary", () => {
    const result = jobsService.applyPostFilters(baseJobs, { maxSalary: 90000 });
    // Job 1 (min 80k <= 90k) ✓, Job 2 (min 100k > 90k) ✗, Job 3 (no salary) ✓
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.job_id)).toEqual(["1", "3"]);
  });

  it("filters by salary range", () => {
    const result = jobsService.applyPostFilters(baseJobs, { minSalary: 90000, maxSalary: 130000 });
    // Job 1 (80k-120k, overlaps 90k-130k) ✓, Job 2 (100k-160k, min 100k <= 130k) ✓, Job 3 (no salary) ✓
    expect(result).toHaveLength(3);
  });

  it("includes jobs with no salary data when salary filters are set", () => {
    const result = jobsService.applyPostFilters(baseJobs, { minSalary: 200000 });
    // Job 3 has no salary → always included
    expect(result.map((j) => j.job_id)).toContain("3");
  });

  // -- Keyword filters --

  it("filters by includeKeywords", () => {
    const result = jobsService.applyPostFilters(baseJobs, { includeKeywords: ["React"] });
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.job_id)).toEqual(["1", "3"]);
  });

  it("includeKeywords is case-insensitive", () => {
    const result = jobsService.applyPostFilters(baseJobs, { includeKeywords: ["react"] });
    expect(result).toHaveLength(2);
  });

  it("ignores empty includeKeywords values", () => {
    const result = jobsService.applyPostFilters(baseJobs, { includeKeywords: ["", "react", "  "] });
    expect(result.map((job) => job.job_id)).toEqual(["1", "3"]);
  });

  it("filters by excludeKeywords", () => {
    const result = jobsService.applyPostFilters(baseJobs, { excludeKeywords: ["java"] });
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.job_id)).toEqual(["1", "3"]);
  });

  it("excludeKeywords is case-insensitive", () => {
    const result = jobsService.applyPostFilters(baseJobs, { excludeKeywords: ["JAVA"] });
    expect(result).toHaveLength(2);
  });

  it("ignores empty excludeKeywords values", () => {
    const result = jobsService.applyPostFilters(baseJobs, { excludeKeywords: ["", "java", "  "] });
    expect(result.map((job) => job.job_id)).toEqual(["1", "3"]);
  });

  it("combines include and exclude keywords", () => {
    const result = jobsService.applyPostFilters(baseJobs, {
      includeKeywords: ["React"],
      excludeKeywords: ["Junior"],
    });

    // Include: jobs 1, 3. Exclude "Junior": removes job 3
    expect(result).toHaveLength(1);
    expect(result[0].job_id).toBe("1");
  });

  // -- Company filters --

  it("filters by excludeCompanies", () => {
    const result = jobsService.applyPostFilters(baseJobs, { excludeCompanies: ["BigCorp"] });
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.job_id)).toEqual(["1", "3"]);
  });

  it("excludeCompanies is case-insensitive", () => {
    const result = jobsService.applyPostFilters(baseJobs, { excludeCompanies: ["bigcorp"] });
    expect(result).toHaveLength(2);
  });

  it("ignores empty excludeCompanies values", () => {
    const result = jobsService.applyPostFilters(baseJobs, { excludeCompanies: ["", "BigCorp", "   "] });
    expect(result.map((job) => job.job_id)).toEqual(["1", "3"]);
  });

  // -- Direct apply filter --

  it("filters for directApplyOnly", () => {
    const result = jobsService.applyPostFilters(baseJobs, { directApplyOnly: true });
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.job_id)).toEqual(["1", "3"]);
  });

  // -- Combined filters --

  it("applies all filters together", () => {
    const filters: PostFilterOptions = {
      includeKeywords: ["React"],
      excludeCompanies: ["StartupXYZ"],
      directApplyOnly: true,
    };
    const result = jobsService.applyPostFilters(baseJobs, filters);
    // Include "React": jobs 1, 3. Exclude "StartupXYZ": removes 3. DirectOnly: job 1 is direct ✓
    expect(result).toHaveLength(1);
    expect(result[0].job_id).toBe("1");
  });

  it("handles empty jobs array", () => {
    const result = jobsService.applyPostFilters([], { includeKeywords: ["react"] });
    expect(result).toEqual([]);
  });
});
