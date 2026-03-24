import { describe, expect, it } from "vite-plus/test";

import { generateFilename } from "./file";

describe("generateFilename", () => {
  it("should slugify the prefix and append the extension", () => {
    expect(generateFilename("My Resume", "docx")).toBe("my-resume.docx");
  });

  it("should return slugified name without extension when none provided", () => {
    expect(generateFilename("My Resume")).toBe("my-resume");
  });

  it("should handle special characters in the prefix", () => {
    expect(generateFilename("John Doe - CS Base - Program Coordinator", "pdf")).toBe(
      "john-doe-cs-base-program-coordinator.pdf",
    );
  });

  it("should handle empty prefix", () => {
    expect(generateFilename("", "pdf")).toBe(".pdf");
  });
});
