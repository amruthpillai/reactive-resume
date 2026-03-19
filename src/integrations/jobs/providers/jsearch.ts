import type z from "zod";

import { type RapidApiQuota, type SearchParams, type SearchResponse, searchResponseSchema } from "@/schema/jobs";

import type { JobSearchProvider } from "../provider";

const JSEARCH_BASE_URL = "https://jsearch.p.rapidapi.com";
const JSEARCH_HOST = "jsearch.p.rapidapi.com";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * JSearch API Provider Implementation
 *
 * JSearch is a Google for Jobs aggregator that provides access to job listings from multiple sources.
 *
 * **Important Implementation Details:**
 * - **Country Filtering**: Country can be passed explicitly as ISO 3166-1 alpha-2
 *   - Use the `country` search parameter (e.g., "US", "DE")
 *   - Keep `query` focused on role/keywords and optional free-form location text
 * - **Data Source**: Aggregates jobs from multiple platforms via Google for Jobs
 * - **Retry Logic**: Implements exponential backoff for 429 (rate limit) responses
 *
 * @example
 * ```typescript
 * const provider = new JSearchProvider("your-api-key");
 * const results = await provider.search({
 *   query: "software engineer in San Francisco, CA, United States",
 *   num_pages: 1
 * });
 * ```
 */
export class JSearchProvider implements JobSearchProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private extractRapidApiQuota(headers: Headers): RapidApiQuota | undefined {
    const limitStr = headers.get("x-ratelimit-requests-limit");
    const remainingStr = headers.get("x-ratelimit-requests-remaining");

    if (!limitStr || !remainingStr) return undefined;

    const limit = Number.parseInt(limitStr, 10);
    const remaining = Number.parseInt(remainingStr, 10);

    if (Number.isNaN(limit) || Number.isNaN(remaining)) return undefined;

    return { limit, remaining, used: limit - remaining };
  }

  /**
   * Make a request to the JSearch API with retry logic
   *
   * Implements exponential backoff for transient failures and rate limiting.
   *
   * @param path - API endpoint path (e.g., "/search?query=...")
   * @param schema - Zod schema for response validation
   * @returns Parsed data and optional RapidAPI quota from response headers
   * @throws Error if all retries are exhausted or non-retryable error occurs
   */
  private async jsearchRequest<T>(
    path: string,
    schema: z.ZodType<T>,
  ): Promise<{ data: T; rapidApiQuota?: RapidApiQuota }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let response: Response | null = null;

      try {
        response = await fetch(`${JSEARCH_BASE_URL}${path}`, {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": JSEARCH_HOST,
          },
        });

        // Retry on rate limit with exponential backoff
        if (response.status === 429) {
          await response.text();
          const backoff = INITIAL_BACKOFF_MS * 2 ** attempt;
          await this.sleep(backoff);
          continue;
        }

        if (!response.ok) {
          throw new Error(`JSearch API error: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        const data = schema.parse(json);
        const rapidApiQuota = this.extractRapidApiQuota(response.headers);

        return { data, rapidApiQuota };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isRetryableNetworkError = error instanceof TypeError;
        const shouldRetry = response === null && isRetryableNetworkError && attempt < MAX_RETRIES - 1;
        if (!shouldRetry) throw lastError;

        const backoff = INITIAL_BACKOFF_MS * 2 ** attempt;
        await this.sleep(backoff);
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async search(params: SearchParams): Promise<SearchResponse & { rapidApiQuota?: RapidApiQuota }> {
    const query = new URLSearchParams();
    query.set("query", params.query);
    if (params.page) query.set("page", String(params.page));
    if (params.num_pages) query.set("num_pages", String(params.num_pages));
    if (params.date_posted) query.set("date_posted", params.date_posted);
    if (params.country) query.set("country", params.country);
    if (params.remote_jobs_only) query.set("remote_jobs_only", String(params.remote_jobs_only));
    if (params.employment_types) query.set("employment_types", params.employment_types);
    if (params.job_requirements) query.set("job_requirements", params.job_requirements);
    if (params.radius) query.set("radius", String(params.radius));
    if (params.exclude_job_publishers) query.set("exclude_job_publishers", params.exclude_job_publishers);
    if (params.categories) query.set("categories", params.categories);

    const result = await this.jsearchRequest(`/search?${query.toString()}`, searchResponseSchema);
    return { ...result.data, rapidApiQuota: result.rapidApiQuota };
  }

  async testConnection(): Promise<{ success: boolean; rapidApiQuota?: RapidApiQuota }> {
    try {
      const query = new URLSearchParams({ query: "test", num_pages: "1" });
      const result = await this.jsearchRequest(`/search?${query.toString()}`, searchResponseSchema);
      return { success: true, rapidApiQuota: result.rapidApiQuota };
    } catch {
      return { success: false };
    }
  }
}
