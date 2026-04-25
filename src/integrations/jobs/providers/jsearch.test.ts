import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { JSearchProvider } from "./jsearch";

// --- Mock fetch globally ---

const mockFetch = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>();
global.fetch = mockFetch as never;

// --- Mock helpers ---

function mockHeaders(limit?: number, remaining?: number) {
  const headers: Record<string, string> = {};
  if (limit !== undefined) headers["x-ratelimit-requests-limit"] = String(limit);
  if (remaining !== undefined) headers["x-ratelimit-requests-remaining"] = String(remaining);
  return { get: (key: string) => headers[key.toLowerCase()] ?? null };
}

function mockOkResponse(data: unknown, limit?: number, remaining?: number) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    headers: mockHeaders(limit, remaining),
  };
}

function mockErrorResponse(status: number, statusText: string) {
  return {
    ok: false,
    status,
    statusText,
    text: async () => "",
    headers: mockHeaders(),
  };
}

// --- Mock response data ---

const mockSearchResponse = {
  status: "OK",
  request_id: "test-request-id",
  parameters: {},
  data: [
    {
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
      job_description: "Build software",
      job_is_remote: false,
      job_city: "San Francisco",
      job_state: "CA",
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
    },
  ],
};

// --- Tests ---

describe("JSearchProvider", () => {
  let provider: JSearchProvider;

  beforeEach(() => {
    provider = new JSearchProvider("test-api-key");
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --- search() ---

  describe("search", () => {
    it("should construct correct query parameters", async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse(mockSearchResponse));

      await provider.search({
        query: "engineer",
        num_pages: 2,
        date_posted: "week",
        country: "DE",
        remote_jobs_only: true,
        employment_types: "FULLTIME",
      });

      expect(mockFetch).toHaveBeenCalledOnce();
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("query=engineer");
      expect(callUrl).toContain("num_pages=2");
      expect(callUrl).toContain("date_posted=week");
      expect(callUrl).toContain("country=DE");
      expect(callUrl).toContain("remote_jobs_only=true");
      expect(callUrl).toContain("employment_types=FULLTIME");
    });

    it("should include correct headers", async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse(mockSearchResponse));

      await provider.search({ query: "test", num_pages: 1 });

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        headers: {
          "X-RapidAPI-Key": "test-api-key",
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });
    });

    it("should return parsed search response", async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse(mockSearchResponse));

      const result = await provider.search({ query: "engineer", num_pages: 1 });

      expect(result.status).toBe("OK");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].job_title).toBe("Software Engineer");
    });

    it("should extract RapidAPI quota from response headers", async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse(mockSearchResponse, 200, 195));

      const result = await provider.search({ query: "test", num_pages: 1 });

      expect(result.rapidApiQuota).toEqual({ limit: 200, remaining: 195, used: 5 });
    });

    it("should return undefined quota when headers are missing", async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse(mockSearchResponse));

      const result = await provider.search({ query: "test", num_pages: 1 });

      expect(result.rapidApiQuota).toBeUndefined();
    });

    it("should retry on 429 status with exponential backoff", async () => {
      vi.useFakeTimers();
      try {
        mockFetch
          .mockResolvedValueOnce(mockErrorResponse(429, "Too Many Requests"))
          .mockResolvedValueOnce(mockErrorResponse(429, "Too Many Requests"))
          .mockResolvedValueOnce(mockOkResponse(mockSearchResponse));

        const promise = provider.search({ query: "test", num_pages: 1 });
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(2000);
        await promise;

        expect(mockFetch).toHaveBeenCalledTimes(3);
      } finally {
        vi.useRealTimers();
      }
    });

    it("should throw error on non-200 response without retrying", async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(500, "Internal Server Error"));

      await expect(provider.search({ query: "test", num_pages: 1 })).rejects.toThrow("JSearch API error: 500");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("retries network failures and succeeds", async () => {
      vi.useFakeTimers();
      try {
        mockFetch
          .mockRejectedValueOnce(new TypeError("Network down"))
          .mockRejectedValueOnce(new TypeError("Network still down"))
          .mockResolvedValueOnce(mockOkResponse(mockSearchResponse));

        const pending = provider.search({ query: "test", num_pages: 1 });
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(2000);
        await pending;

        expect(mockFetch).toHaveBeenCalledTimes(3);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // --- testConnection() ---

  describe("testConnection", () => {
    it("should return success true on successful connection", async () => {
      mockFetch.mockResolvedValueOnce(mockOkResponse(mockSearchResponse, 200, 198));

      const result = await provider.testConnection();

      expect(result.success).toBe(true);
      expect(result.rapidApiQuota).toEqual({ limit: 200, remaining: 198, used: 2 });
      expect(mockFetch).toHaveBeenCalledOnce();
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("query=test");
      expect(callUrl).toContain("num_pages=1");
    });

    it("should return success false on connection failure", async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(401, "Unauthorized"));

      const result = await provider.testConnection();
      expect(result.success).toBe(false);
      expect(result.rapidApiQuota).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should return success false on network error", async () => {
      vi.useFakeTimers();
      try {
        mockFetch.mockRejectedValue(new TypeError("Network error"));
        const promise = provider.testConnection();
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(2000);
        const result = await promise;

        expect(result.success).toBe(false);
        expect(result.rapidApiQuota).toBeUndefined();
        expect(mockFetch).toHaveBeenCalledTimes(3);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
