import type { RapidApiQuota, SearchParams, SearchResponse } from "@/schema/jobs";

/**
 * Abstract interface for job search providers
 *
 * This interface enables multiple job search provider implementations (JSearch, LinkedIn, Indeed, etc.)
 * while maintaining a consistent API surface. All providers must implement these three core methods.
 *
 * @example
 * ```typescript
 * class LinkedInProvider implements JobSearchProvider {
 *   async search(params: SearchParams): Promise<SearchResponse> {
 *     // LinkedIn-specific implementation
 *   }
 * }
 * ```
 */
export interface JobSearchProvider {
  /**
   * Search for job listings matching the given parameters
   *
   * @param params - Search parameters (query, location, filters, etc.)
   * @returns Search response with job listings, metadata, and optional API quota info
   * @throws Error if API request fails or rate limit is exceeded
   */
  search(params: SearchParams): Promise<SearchResponse & { rapidApiQuota?: RapidApiQuota }>;

  /**
   * Test the provider connection with a minimal API request
   *
   * Used to validate API credentials without consuming significant quota.
   *
   * @returns Connection result with success status and optional API quota info
   */
  testConnection(): Promise<{ success: boolean; rapidApiQuota?: RapidApiQuota }>;
}
