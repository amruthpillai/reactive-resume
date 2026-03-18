import type { JobSearchProvider } from "./provider";

import { JSearchProvider } from "./providers/jsearch";

/**
 * Creates a job search provider instance
 *
 * Currently supports only JSearch. This factory provides an extension point
 * for adding additional providers in the future (LinkedIn, Indeed, etc.).
 *
 * **Future Extension Example:**
 * ```typescript
 * type ProviderType = "JSEARCH" | "LINKEDIN" | "INDEED";
 *
 * export function createJobSearchProvider(
 *   type: ProviderType,
 *   apiKey: string
 * ): JobSearchProvider {
 *   switch (type) {
 *     case "JSEARCH":
 *       return new JSearchProvider(apiKey);
 *     case "LINKEDIN":
 *       return new LinkedInProvider(apiKey);
 *     case "INDEED":
 *       return new IndeedProvider(apiKey);
 *   }
 * }
 * ```
 *
 * @param apiKey - API key for the job search provider
 * @returns Job search provider instance (currently JSearch)
 */
export function createJobSearchProvider(apiKey: string): JobSearchProvider {
  // Currently only JSearch is supported
  // Future: Add provider type parameter to support multiple providers
  return new JSearchProvider(apiKey);
}
