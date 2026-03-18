import { describe, expect, it } from "vitest";

import {
  applyOptionSchema,
  jobDetailsResponseSchema,
  jobRequiredEducationSchema,
  jobRequiredExperienceSchema,
  jobResultSchema,
  postFilterOptionsSchema,
  rapidApiQuotaSchema,
  searchParamsSchema,
  searchResponseSchema,
} from "./jobs";

// --- Helpers ---

function makeMinimalJob(overrides?: Record<string, unknown>) {
  return {
    job_id: "abc123",
    job_title: "Software Engineer",
    employer_name: "Acme Corp",
    ...overrides,
  };
}

// --- searchParamsSchema ---

describe("searchParamsSchema", () => {
  it("accepts a valid query-only search", () => {
    const result = searchParamsSchema.parse({ query: "react developer" });
    expect(result.query).toBe("react developer");
  });

  it("accepts all optional fields", () => {
    const result = searchParamsSchema.parse({
      query: "engineer",
      page: 2,
      num_pages: 3,
      date_posted: "week",
      remote_jobs_only: true,
      employment_types: "FULLTIME",
      job_requirements: "under_3_years_experience",
      radius: 50,
      exclude_job_publishers: "Indeed",
      categories: "it-jobs",
    });
    expect(result.page).toBe(2);
    expect(result.remote_jobs_only).toBe(true);
    expect(result.date_posted).toBe("week");
  });

  it("rejects empty query", () => {
    expect(() => searchParamsSchema.parse({ query: "" })).toThrow();
  });

  it("rejects missing query", () => {
    expect(() => searchParamsSchema.parse({})).toThrow();
  });

  it("rejects invalid date_posted value", () => {
    expect(() => searchParamsSchema.parse({ query: "test", date_posted: "yesterday" })).toThrow();
  });

  it("rejects non-positive page numbers", () => {
    expect(() => searchParamsSchema.parse({ query: "test", page: 0 })).toThrow();
    expect(() => searchParamsSchema.parse({ query: "test", page: -1 })).toThrow();
  });
});

// --- jobRequiredExperienceSchema ---

describe("jobRequiredExperienceSchema", () => {
  it("parses valid experience data", () => {
    const result = jobRequiredExperienceSchema.parse({
      no_experience_required: true,
      required_experience_in_months: 24,
      experience_mentioned: true,
      experience_preferred: false,
    });
    expect(result.no_experience_required).toBe(true);
    expect(result.required_experience_in_months).toBe(24);
  });

  it("falls back to defaults for missing fields", () => {
    const result = jobRequiredExperienceSchema.parse({});
    expect(result.no_experience_required).toBe(false);
    expect(result.required_experience_in_months).toBeNull();
    expect(result.experience_mentioned).toBe(false);
    expect(result.experience_preferred).toBe(false);
  });
});

// --- jobRequiredEducationSchema ---

describe("jobRequiredEducationSchema", () => {
  it("parses valid education data", () => {
    const result = jobRequiredEducationSchema.parse({
      bachelors_degree: true,
      degree_mentioned: true,
    });
    expect(result.bachelors_degree).toBe(true);
    expect(result.degree_mentioned).toBe(true);
    expect(result.postgraduate_degree).toBe(false);
  });

  it("falls back to defaults for missing fields", () => {
    const result = jobRequiredEducationSchema.parse({});
    expect(result.bachelors_degree).toBe(false);
    expect(result.high_school).toBe(false);
  });
});

// --- applyOptionSchema ---

describe("applyOptionSchema", () => {
  it("parses valid apply option", () => {
    const result = applyOptionSchema.parse({
      publisher: "LinkedIn",
      apply_link: "https://example.com/apply",
      is_direct: true,
    });
    expect(result.publisher).toBe("LinkedIn");
    expect(result.is_direct).toBe(true);
  });

  it("falls back to defaults for missing fields", () => {
    const result = applyOptionSchema.parse({});
    expect(result.publisher).toBe("");
    expect(result.apply_link).toBe("");
    expect(result.is_direct).toBe(false);
  });
});

// --- jobResultSchema ---

describe("jobResultSchema", () => {
  it("parses a minimal job result (required + catch defaults)", () => {
    const result = jobResultSchema.parse(makeMinimalJob());
    expect(result.job_id).toBe("abc123");
    expect(result.job_title).toBe("Software Engineer");
    expect(result.employer_name).toBe("Acme Corp");
    expect(result.employer_logo).toBeNull();
    expect(result.job_is_remote).toBe(false);
    expect(result.apply_options).toEqual([]);
    expect(result.job_required_experience.no_experience_required).toBe(false);
  });

  it("parses a full job result", () => {
    const result = jobResultSchema.parse(
      makeMinimalJob({
        employer_logo: "https://logo.com/img.png",
        job_is_remote: true,
        job_city: "New York",
        job_state: "NY",
        job_country: "US",
        job_min_salary: 80000,
        job_max_salary: 120000,
        job_salary_currency: "USD",
        job_salary_period: "YEAR",
        job_benefits: ["Health Insurance", "401k"],
        job_required_skills: ["React", "TypeScript"],
        job_highlights: {
          Qualifications: ["3+ years experience", "BS in CS"],
          Responsibilities: ["Build UI", "Review code"],
        },
        apply_options: [{ publisher: "LinkedIn", apply_link: "https://linkedin.com/apply", is_direct: true }],
      }),
    );
    expect(result.employer_logo).toBe("https://logo.com/img.png");
    expect(result.job_is_remote).toBe(true);
    expect(result.job_min_salary).toBe(80000);
    expect(result.job_benefits).toEqual(["Health Insurance", "401k"]);
    expect(result.job_highlights?.Qualifications).toHaveLength(2);
    expect(result.apply_options).toHaveLength(1);
  });

  it("rejects missing required fields", () => {
    expect(() => jobResultSchema.parse({})).toThrow();
    expect(() => jobResultSchema.parse({ job_id: "abc" })).toThrow();
  });

  it("catches invalid optional fields gracefully", () => {
    const result = jobResultSchema.parse(
      makeMinimalJob({
        employer_logo: 12345, // wrong type → catch(null)
        job_is_remote: "yes", // wrong type → catch(false)
        job_benefits: "not-an-array", // wrong type → catch(null)
      }),
    );
    expect(result.employer_logo).toBeNull();
    expect(result.job_is_remote).toBe(false);
    expect(result.job_benefits).toBeNull();
  });
});

// --- searchResponseSchema ---

describe("searchResponseSchema", () => {
  it("parses a valid search response", () => {
    const result = searchResponseSchema.parse({
      status: "OK",
      request_id: "req-123",
      parameters: { query: "react" },
      data: [makeMinimalJob()],
    });
    expect(result.status).toBe("OK");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].job_id).toBe("abc123");
  });

  it("falls back to empty array for invalid data", () => {
    const result = searchResponseSchema.parse({
      status: "OK",
      request_id: "req-123",
      data: "invalid",
    });
    expect(result.data).toEqual([]);
  });

  it("falls back to empty object for invalid parameters", () => {
    const result = searchResponseSchema.parse({
      status: "OK",
      request_id: "req-123",
      parameters: 42,
    });
    expect(result.parameters).toEqual({});
  });
});

// --- jobDetailsResponseSchema ---

describe("jobDetailsResponseSchema", () => {
  it("parses a valid job details response", () => {
    const result = jobDetailsResponseSchema.parse({
      status: "OK",
      request_id: "req-456",
      data: [makeMinimalJob()],
    });
    expect(result.data).toHaveLength(1);
  });

  it("handles empty data array", () => {
    const result = jobDetailsResponseSchema.parse({
      status: "OK",
      request_id: "req-456",
      data: [],
    });
    expect(result.data).toEqual([]);
  });
});

// --- postFilterOptionsSchema ---

describe("postFilterOptionsSchema", () => {
  it("parses all filter options", () => {
    const result = postFilterOptionsSchema.parse({
      minSalary: 50000,
      maxSalary: 150000,
      includeKeywords: ["react", "typescript"],
      excludeKeywords: ["senior"],
      excludeCompanies: ["Spam Inc"],
      directApplyOnly: true,
    });
    expect(result.minSalary).toBe(50000);
    expect(result.includeKeywords).toHaveLength(2);
    expect(result.directApplyOnly).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = postFilterOptionsSchema.parse({});
    expect(result.minSalary).toBeUndefined();
    expect(result.directApplyOnly).toBeUndefined();
  });
});

// --- rapidApiQuotaSchema ---

describe("rapidApiQuotaSchema", () => {
  it("parses valid RapidAPI quota", () => {
    const result = rapidApiQuotaSchema.parse({ limit: 200, remaining: 195, used: 5 });
    expect(result.limit).toBe(200);
    expect(result.remaining).toBe(195);
    expect(result.used).toBe(5);
  });

  it("rejects missing fields", () => {
    expect(() => rapidApiQuotaSchema.parse({ limit: 200 })).toThrow();
    expect(() => rapidApiQuotaSchema.parse({})).toThrow();
  });
});
