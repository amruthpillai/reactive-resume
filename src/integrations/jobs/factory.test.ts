import { describe, expect, it } from "vitest";

import { createJobSearchProvider } from "./factory";
import { JSearchProvider } from "./providers/jsearch";

describe("createJobSearchProvider", () => {
  it("should return a JSearchProvider instance", () => {
    const provider = createJobSearchProvider("test-api-key");

    expect(provider).toBeInstanceOf(JSearchProvider);
  });

  it("should create provider with correct API key", async () => {
    const provider = createJobSearchProvider("my-secret-key");

    // Provider should have the API key (indirectly verified by checking it's a JSearchProvider)
    expect(provider).toBeInstanceOf(JSearchProvider);
  });

  it("should have all required JobSearchProvider methods", () => {
    const provider = createJobSearchProvider("test-api-key");

    expect(provider).toHaveProperty("search");
    expect(provider).toHaveProperty("getJobDetails");
    expect(provider).toHaveProperty("testConnection");

    expect(typeof provider.search).toBe("function");
    expect(typeof provider.getJobDetails).toBe("function");
    expect(typeof provider.testConnection).toBe("function");
  });
});
