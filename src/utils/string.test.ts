import { describe, expect, it } from "vite-plus/test";

import { getInitials, slugify, stripHtml, toUsername } from "./string";

describe("slugify", () => {
  it("should lowercase and hyphenate spaces", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should strip special characters", () => {
    expect(slugify("Résumé & CV!")).toBe("resume-and-cv");
  });

  it("should not decamelize camelCase strings", () => {
    expect(slugify("camelCase")).toBe("camelcase");
  });

  it("should return empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });
});

describe("getInitials", () => {
  it("should return up to two uppercase initials", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("should return one initial for a single name", () => {
    expect(getInitials("Alice")).toBe("A");
  });

  it("should take only the first two words", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });
});

describe("toUsername", () => {
  it("should lowercase and strip disallowed characters", () => {
    expect(toUsername("John Doe!")).toBe("johndoe");
  });

  it("should keep dots, hyphens, and underscores", () => {
    expect(toUsername("john.doe-name_ok")).toBe("john.doe-name_ok");
  });

  it("should trim whitespace", () => {
    expect(toUsername("  alice  ")).toBe("alice");
  });

  it("should truncate to 64 characters", () => {
    const long = "a".repeat(100);
    expect(toUsername(long)).toHaveLength(64);
  });
});

describe("stripHtml", () => {
  it("should remove HTML tags and trim", () => {
    expect(stripHtml("<p>Hello <b>World</b></p>")).toBe("Hello World");
  });

  it("should return empty string for undefined", () => {
    expect(stripHtml(undefined)).toBe("");
  });

  it("should return empty string for empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("should handle nested tags", () => {
    expect(stripHtml("<div><ul><li>item</li></ul></div>")).toBe("item");
  });
});
