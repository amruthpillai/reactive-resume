import { describe, expect, it } from "vite-plus/test";

import { parseColorString } from "./color";

describe("parseColorString", () => {
  it("should parse a 6-digit hex color", () => {
    expect(parseColorString("#ff8800")).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it("should parse a 3-digit hex color", () => {
    expect(parseColorString("#f80")).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it("should be case-insensitive for hex", () => {
    expect(parseColorString("#FF8800")).toEqual(parseColorString("#ff8800"));
  });

  it("should parse rgb()", () => {
    expect(parseColorString("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
  });

  it("should parse rgba() with alpha", () => {
    expect(parseColorString("rgba(10, 20, 30, 0.5)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
  });

  it("should handle whitespace around the value", () => {
    expect(parseColorString("  #000000  ")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it("should return null for invalid input", () => {
    expect(parseColorString("not-a-color")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseColorString("")).toBeNull();
  });

  it("should return null for incomplete hex", () => {
    expect(parseColorString("#ff")).toBeNull();
  });
});
