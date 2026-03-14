import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JSearchProvider } from "./jsearch";

// --- Mock fetch globally ---

const mockFetch = vi.fn();
global.fetch = mockFetch as never;

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

const mockJobDetailsResponse = {
	status: "OK",
	request_id: "test-request-id",
	parameters: {},
	data: [mockSearchResponse.data[0]],
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
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockSearchResponse,
			});

			await provider.search({
				query: "engineer in San Francisco, CA, United States",
				num_pages: 2,
				date_posted: "week",
				remote_jobs_only: true,
				employment_types: "FULLTIME",
			});

			expect(mockFetch).toHaveBeenCalledOnce();
			const callUrl = mockFetch.mock.calls[0][0];
			expect(callUrl).toContain("query=engineer+in+San+Francisco%2C+CA%2C+United+States");
			expect(callUrl).toContain("num_pages=2");
			expect(callUrl).toContain("date_posted=week");
			expect(callUrl).toContain("remote_jobs_only=true");
			expect(callUrl).toContain("employment_types=FULLTIME");
		});

		it("should include correct headers", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockSearchResponse,
			});

			await provider.search({ query: "test", num_pages: 1 });

			expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
				headers: {
					"X-RapidAPI-Key": "test-api-key",
					"X-RapidAPI-Host": "jsearch.p.rapidapi.com",
				},
			});
		});

		it("should return parsed search response", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockSearchResponse,
			});

			const result = await provider.search({ query: "engineer", num_pages: 1 });

			expect(result.status).toBe("OK");
			expect(result.data).toHaveLength(1);
			expect(result.data[0].job_title).toBe("Software Engineer");
		});

		it("should retry on 429 status with exponential backoff", async () => {
			mockFetch
				.mockResolvedValueOnce({ ok: false, status: 429, statusText: "Too Many Requests" })
				.mockResolvedValueOnce({ ok: false, status: 429, statusText: "Too Many Requests" })
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => mockSearchResponse,
				});

			const startTime = Date.now();
			await provider.search({ query: "test", num_pages: 1 });
			const endTime = Date.now();

			// Should retry 3 times (1 initial + 2 retries)
			expect(mockFetch).toHaveBeenCalledTimes(3);
			// Should have waited (1000ms + 2000ms = 3000ms total)
			expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
		});

		it("should throw error on non-200 response after retries", async () => {
			mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" });

			await expect(provider.search({ query: "test", num_pages: 1 })).rejects.toThrow("JSearch API error: 500");
		});
	});

	// --- getJobDetails() ---

	describe("getJobDetails", () => {
		it("should fetch job details by ID", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockJobDetailsResponse,
			});

			const result = await provider.getJobDetails("job-1");

			expect(mockFetch).toHaveBeenCalledOnce();
			const callUrl = mockFetch.mock.calls[0][0];
			expect(callUrl).toContain("/job-details");
			expect(callUrl).toContain("job_id=job-1");
			expect(result?.job_id).toBe("job-1");
		});

		it("should return null if no job found", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ status: "OK", request_id: "test-req", parameters: {}, data: [] }),
			});

			const result = await provider.getJobDetails("nonexistent-job");

			expect(result).toBeNull();
		});

		it("should return first job if multiple returned", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					status: "OK",
					request_id: "test-req",
					parameters: {},
					data: [
						{ ...mockSearchResponse.data[0], job_id: "first" },
						{ ...mockSearchResponse.data[0], job_id: "second" },
					],
				}),
			});

			const result = await provider.getJobDetails("job-1");

			expect(result?.job_id).toBe("first");
		});
	});

	// --- testConnection() ---

	describe("testConnection", () => {
		it("should return true on successful connection", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockSearchResponse,
			});

			const result = await provider.testConnection();

			expect(result).toBe(true);
			expect(mockFetch).toHaveBeenCalledOnce();
			const callUrl = mockFetch.mock.calls[0][0];
			expect(callUrl).toContain("query=test");
			expect(callUrl).toContain("num_pages=1");
		});

		it("should return false on connection failure", async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: "Unauthorized" });

			const result = await provider.testConnection();

			expect(result).toBe(false);
		});

		it("should return false on network error", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			const result = await provider.testConnection();

			expect(result).toBe(false);
		});
	});
});
