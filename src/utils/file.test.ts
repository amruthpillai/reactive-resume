import { describe, expect, it } from "vitest";

import { generateFilename } from "./file";

describe("generateFilename", () => {
  it("should return name with extension", () => {
    expect(generateFilename("My Resume", "docx")).toBe("my-resume.docx");
  });

  it("should return name without extension when none provided", () => {
    expect(generateFilename("My Resume")).toBe("my-resume");
  });

  it("should preserve the exact resume name with special characters", () => {
    expect(generateFilename("John Doe - CS Base - Program Coordinator", "docx")).toBe(
      "john-doe-cs-base-program-coordinator.docx",
    );
  });

  it("should work with pdf extension", () => {
    expect(generateFilename("John Doe - CS Base - Program Coordinator", "pdf")).toBe(
      "john-doe-cs-base-program-coordinator.pdf",
    );
  });

  it("should work with json extension", () => {
    expect(generateFilename("John Doe - CS Base - Program Coordinator", "json")).toBe(
      "john-doe-cs-base-program-coordinator.json",
    );
  });
});
