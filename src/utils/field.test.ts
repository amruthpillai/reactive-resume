import { describe, expect, it } from "vite-plus/test";

import { filterFieldValues } from "./field";

describe("filterFieldValues", () => {
  it("returns only fields with non-empty trimmed values", () => {
    const result = filterFieldValues(
      { name: " Amruth ", title: "   ", email: null, company: "Reactive Resume" },
      { key: "name", label: "Name" },
      { key: "title", label: "Title" },
      { key: "email", label: "Email" },
      { key: "company", label: "Company" },
    );

    expect(result.size).toBe(2);
    expect(result.has("name")).toBe(true);
    expect(result.has("company")).toBe(true);
    expect(result.has("title")).toBe(false);
    expect(result.has("email")).toBe(false);
  });
});
