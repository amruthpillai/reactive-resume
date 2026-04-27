import { describe, expect, it } from "vite-plus/test";

import { type ResumeData, defaultResumeData, resumeDataSchema } from "@/schema/resume/data";

import { ResumePatchError, applyResumePatches, jsonPatchOperationSchema } from "./patch";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a deep clone of defaultResumeData to avoid cross-test mutation. */
function freshResume(): ResumeData {
  return structuredClone(defaultResumeData);
}

// ---------------------------------------------------------------------------
// jsonPatchOperationSchema
// ---------------------------------------------------------------------------

describe("jsonPatchOperationSchema", () => {
  it("accepts a valid 'add' operation", () => {
    const op = { op: "add", path: "/basics/name", value: "Jane" };
    expect(jsonPatchOperationSchema.parse(op)).toEqual(op);
  });

  it("accepts a valid 'remove' operation", () => {
    const op = { op: "remove", path: "/basics/name" };
    expect(jsonPatchOperationSchema.parse(op)).toEqual(op);
  });

  it("accepts a valid 'replace' operation", () => {
    const op = { op: "replace", path: "/basics/name", value: "Jane" };
    expect(jsonPatchOperationSchema.parse(op)).toEqual(op);
  });

  it("accepts a valid 'move' operation", () => {
    const op = { op: "move", path: "/basics/name", from: "/basics/headline" };
    expect(jsonPatchOperationSchema.parse(op)).toEqual(op);
  });

  it("accepts a valid 'copy' operation", () => {
    const op = { op: "copy", path: "/basics/headline", from: "/basics/name" };
    expect(jsonPatchOperationSchema.parse(op)).toEqual(op);
  });

  it("accepts a valid 'test' operation", () => {
    const op = { op: "test", path: "/basics/name", value: "" };
    expect(jsonPatchOperationSchema.parse(op)).toEqual(op);
  });

  it("rejects an unknown op type", () => {
    expect(() => jsonPatchOperationSchema.parse({ op: "patch", path: "/foo" })).toThrow();
  });

  it("rejects 'move' without from", () => {
    expect(() => jsonPatchOperationSchema.parse({ op: "move", path: "/foo" })).toThrow();
  });

  it("rejects 'copy' without from", () => {
    expect(() => jsonPatchOperationSchema.parse({ op: "copy", path: "/foo" })).toThrow();
  });

  it("accepts 'add' with undefined value (z.any() allows it)", () => {
    // z.any() accepts undefined — this is valid at the schema level
    const result = jsonPatchOperationSchema.parse({ op: "add", path: "/foo" });
    expect(result.op).toBe("add");
  });

  it("accepts 'replace' with explicit value of null", () => {
    const result = jsonPatchOperationSchema.parse({ op: "replace", path: "/foo", value: null });
    expect(result.op).toBe("replace");
  });

  it("accepts 'test' with value of 0", () => {
    const result = jsonPatchOperationSchema.parse({ op: "test", path: "/foo", value: 0 });
    expect(result.op).toBe("test");
  });

  it("rejects operations without a path", () => {
    expect(() => jsonPatchOperationSchema.parse({ op: "remove" })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ResumePatchError
// ---------------------------------------------------------------------------

describe("ResumePatchError", () => {
  it("stores code, message, index, and operation", () => {
    const op = { op: "replace" as const, path: "/basics/name", value: "Jane" };
    const err = new ResumePatchError("TEST_OPERATION_FAILED", "test failed", 2, op);

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ResumePatchError");
    expect(err.code).toBe("TEST_OPERATION_FAILED");
    expect(err.message).toBe("test failed");
    expect(err.index).toBe(2);
    expect(err.operation).toEqual(op);
  });

  it("has a proper prototype chain", () => {
    const err = new ResumePatchError("CODE", "msg", 0, { op: "remove", path: "/x" });
    expect(err instanceof ResumePatchError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyResumePatches — success cases
// ---------------------------------------------------------------------------

describe("applyResumePatches", () => {
  describe("basic operations", () => {
    it("replaces a top-level string field", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [{ op: "replace", path: "/basics/name", value: "Alice" }]);

      expect(result.basics.name).toBe("Alice");
    });

    it("replaces a nested field", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [
        { op: "replace", path: "/basics/website/url", value: "https://example.com" },
      ]);

      expect(result.basics.website.url).toBe("https://example.com");
    });

    it("adds an item to a section's items array", () => {
      const data = freshResume();
      const newSkill = {
        id: "skill-1",
        hidden: false,
        icon: "",
        name: "TypeScript",
        proficiency: "Advanced",
        level: 4,
        keywords: ["frontend"],
      };
      const result = applyResumePatches(data, [{ op: "add", path: "/sections/skills/items/-", value: newSkill }]);

      expect(result.sections.skills.items).toHaveLength(1);
      expect(result.sections.skills.items[0].name).toBe("TypeScript");
    });

    it("removes an item from a section's items array", () => {
      const data = freshResume();
      data.sections.skills.items = [
        { id: "s1", hidden: false, icon: "", iconColor: "", name: "JS", proficiency: "", level: 0, keywords: [] },
        { id: "s2", hidden: false, icon: "", iconColor: "", name: "TS", proficiency: "", level: 0, keywords: [] },
      ];

      const result = applyResumePatches(data, [{ op: "remove", path: "/sections/skills/items/0" }]);
      expect(result.sections.skills.items).toHaveLength(1);
      expect(result.sections.skills.items[0].name).toBe("TS");
    });

    it("applies multiple operations in sequence", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [
        { op: "replace", path: "/basics/name", value: "Bob" },
        { op: "replace", path: "/basics/email", value: "bob@test.com" },
        { op: "replace", path: "/basics/headline", value: "Developer" },
      ]);

      expect(result.basics.name).toBe("Bob");
      expect(result.basics.email).toBe("bob@test.com");
      expect(result.basics.headline).toBe("Developer");
    });

    it("does not mutate the original data", () => {
      const data = freshResume();
      const originalName = data.basics.name;
      applyResumePatches(data, [{ op: "replace", path: "/basics/name", value: "Mutated?" }]);

      expect(data.basics.name).toBe(originalName);
    });
  });

  describe("test operation", () => {
    it("succeeds when test value matches", () => {
      const data = freshResume();
      data.basics.name = "Alice";

      const result = applyResumePatches(data, [
        { op: "test", path: "/basics/name", value: "Alice" },
        { op: "replace", path: "/basics/name", value: "Bob" },
      ]);

      expect(result.basics.name).toBe("Bob");
    });

    it("throws ResumePatchError when test value does not match", () => {
      const data = freshResume();
      data.basics.name = "Alice";

      expect(() => applyResumePatches(data, [{ op: "test", path: "/basics/name", value: "Wrong" }])).toThrow(
        ResumePatchError,
      );
    });
  });

  describe("copy and move operations", () => {
    it("copies a value from one path to another", () => {
      const data = freshResume();
      data.basics.name = "Alice";

      const result = applyResumePatches(data, [{ op: "copy", path: "/basics/headline", from: "/basics/name" }]);

      expect(result.basics.headline).toBe("Alice");
      expect(result.basics.name).toBe("Alice");
    });

    it("moves a value between compatible paths", () => {
      const data = freshResume();
      data.basics.name = "Alice";

      // Move name to headline — both are strings, but move deletes the source.
      // Since the schema requires name to be a string, we replace it back after moving.
      const result = applyResumePatches(data, [
        { op: "move", path: "/basics/headline", from: "/basics/name" },
        { op: "add", path: "/basics/name", value: "" },
      ]);

      expect(result.basics.headline).toBe("Alice");
      expect(result.basics.name).toBe("");
    });
  });

  describe("metadata operations", () => {
    it("replaces the template", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [{ op: "replace", path: "/metadata/template", value: "pikachu" }]);
      expect(result.metadata.template).toBe("pikachu");
    });

    it("replaces design colors", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [
        { op: "replace", path: "/metadata/design/colors/primary", value: "rgba(0, 0, 255, 1)" },
      ]);
      expect(result.metadata.design.colors.primary).toBe("rgba(0, 0, 255, 1)");
    });

    it("toggles section visibility", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [{ op: "replace", path: "/sections/skills/hidden", value: true }]);
      expect(result.sections.skills.hidden).toBe(true);
    });

    it("replaces page margins", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [{ op: "replace", path: "/metadata/page/marginX", value: 20 }]);
      expect(result.metadata.page.marginX).toBe(20);
    });
  });

  describe("custom sections", () => {
    it("adds a custom section", () => {
      const data = freshResume();
      const customSection = {
        id: "custom-1",
        type: "experience",
        title: "Freelance",
        columns: 1,
        hidden: false,
        items: [],
      };

      const result = applyResumePatches(data, [{ op: "add", path: "/customSections/-", value: customSection }]);

      expect(result.customSections).toHaveLength(1);
      expect(result.customSections[0].title).toBe("Freelance");
    });

    it("removes a custom section by index", () => {
      const data = freshResume();
      data.customSections = [
        { id: "c1", type: "experience", title: "Freelance", columns: 1, hidden: false, items: [] },
        { id: "c2", type: "projects", title: "Side Projects", columns: 1, hidden: false, items: [] },
      ];

      const result = applyResumePatches(data, [{ op: "remove", path: "/customSections/0" }]);
      expect(result.customSections).toHaveLength(1);
      expect(result.customSections[0].id).toBe("c2");
    });
  });

  describe("picture operations", () => {
    it("replaces picture URL", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [
        { op: "replace", path: "/picture/url", value: "https://example.com/photo.jpg" },
      ]);
      expect(result.picture.url).toBe("https://example.com/photo.jpg");
    });

    it("toggles picture visibility", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [{ op: "replace", path: "/picture/hidden", value: true }]);
      expect(result.picture.hidden).toBe(true);
    });

    it("updates picture size within valid range", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [{ op: "replace", path: "/picture/size", value: 120 }]);
      expect(result.picture.size).toBe(120);
    });
  });

  // ---------------------------------------------------------------------------
  // applyResumePatches — error / edge cases
  // ---------------------------------------------------------------------------

  describe("error handling", () => {
    it("throws ResumePatchError for invalid path", () => {
      const data = freshResume();

      expect(() => applyResumePatches(data, [{ op: "replace", path: "/nonexistent/path", value: "x" }])).toThrow(
        ResumePatchError,
      );
    });

    it("throws ResumePatchError for unresolvable 'from' in move", () => {
      const data = freshResume();

      expect(() =>
        applyResumePatches(data, [{ op: "move", path: "/basics/name", from: "/nonexistent/field" }]),
      ).toThrow(ResumePatchError);
    });

    it("throws ResumePatchError for out-of-bounds array index", () => {
      const data = freshResume();

      expect(() => applyResumePatches(data, [{ op: "remove", path: "/sections/skills/items/999" }])).toThrow(
        ResumePatchError,
      );
    });

    it("throws when patch produces invalid resume data (e.g. wrong type)", () => {
      const data = freshResume();

      // Setting a boolean field to a string should fail schema validation
      expect(() =>
        applyResumePatches(data, [{ op: "replace", path: "/picture/hidden", value: "not-a-boolean" }]),
      ).toThrow();
    });

    it("throws when patch produces invalid resume data (picture size out of range)", () => {
      const data = freshResume();

      // picture.size must be 32-512
      expect(() => applyResumePatches(data, [{ op: "replace", path: "/picture/size", value: 9999 }])).toThrow();
    });

    it("handles empty operations array without error", () => {
      const data = freshResume();
      const result = applyResumePatches(data, []);

      // Should return equivalent data
      expect(result.basics.name).toBe(data.basics.name);
    });

    it("returns a valid ResumeData after patching", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [{ op: "replace", path: "/basics/name", value: "Valid" }]);

      expect(resumeDataSchema.safeParse(result).success).toBe(true);
    });
  });

  describe("layout operations", () => {
    it("replaces sidebar width", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [{ op: "replace", path: "/metadata/layout/sidebarWidth", value: 40 }]);
      expect(result.metadata.layout.sidebarWidth).toBe(40);
    });

    it("adds a section to a page layout", () => {
      const data = freshResume();
      const result = applyResumePatches(data, [
        { op: "add", path: "/metadata/layout/pages/0/sidebar/-", value: "custom-section-id" },
      ]);
      expect(result.metadata.layout.pages[0].sidebar).toContain("custom-section-id");
    });

    it("adds a new page to layout", () => {
      const data = freshResume();
      const newPage = { fullWidth: false, main: [], sidebar: [] };
      const result = applyResumePatches(data, [{ op: "add", path: "/metadata/layout/pages/-", value: newPage }]);
      expect(result.metadata.layout.pages).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Additional branch/edge case coverage
  // ---------------------------------------------------------------------------

  describe("test operation failures (applyPatch catch block)", () => {
    it("throws ResumePatchError when test op value mismatches (triggers catch)", () => {
      const data = freshResume();
      data.basics.name = "Real Name";

      try {
        applyResumePatches(data, [{ op: "test", path: "/basics/name", value: "Wrong Name" }]);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ResumePatchError);
        const patchErr = error as ResumePatchError;
        expect(patchErr.code).toBeTruthy();
        expect(patchErr.index).toBeDefined();
        expect(patchErr.operation).toBeDefined();
      }
    });

    it("ResumePatchError has correct operation in error", () => {
      const data = freshResume();
      data.basics.name = "Alice";

      const testOp = { op: "test" as const, path: "/basics/name", value: "Bob" };
      try {
        applyResumePatches(data, [testOp]);
        expect.unreachable("Should have thrown");
      } catch (error) {
        const patchErr = error as ResumePatchError;
        expect(patchErr.operation.path).toBe("/basics/name");
      }
    });
  });

  describe("schema validation after patch", () => {
    it("throws on negative picture size (below min)", () => {
      const data = freshResume();
      expect(() => applyResumePatches(data, [{ op: "replace", path: "/picture/size", value: -1 }])).toThrow();
    });

    it("falls back to default for invalid page format (schema uses .catch)", () => {
      const data = freshResume();
      // format has .catch("a4"), so invalid values fall back rather than throwing
      const result = applyResumePatches(data, [{ op: "replace", path: "/metadata/page/format", value: "tabloid" }]);
      expect(result.metadata.page.format).toBe("a4");
    });

    it("allows setting customSections to empty array", () => {
      const data = freshResume();
      data.customSections = [{ id: "c1", type: "experience", title: "X", columns: 1, hidden: false, items: [] }];

      const result = applyResumePatches(data, [{ op: "replace", path: "/customSections", value: [] }]);
      expect(result.customSections).toHaveLength(0);
    });
  });

  describe("replace at array index", () => {
    it("replaces a specific item in an array", () => {
      const data = freshResume();
      data.sections.skills.items = [
        { id: "s1", hidden: false, icon: "", iconColor: "", name: "JS", proficiency: "", level: 0, keywords: [] },
        { id: "s2", hidden: false, icon: "", iconColor: "", name: "TS", proficiency: "", level: 0, keywords: [] },
      ];

      const result = applyResumePatches(data, [
        { op: "replace", path: "/sections/skills/items/0/name", value: "JavaScript" },
      ]);
      expect(result.sections.skills.items[0].name).toBe("JavaScript");
      expect(result.sections.skills.items[1].name).toBe("TS");
    });
  });
});
