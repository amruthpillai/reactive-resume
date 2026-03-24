import { describe, expect, it } from "vite-plus/test";

import { isObject, sanitizeCss, sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("should return empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("should allow safe tags", () => {
    const html = "<p>Hello <strong>World</strong></p>";
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("should strip script tags", () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe("");
  });

  it("should strip event handlers", () => {
    expect(sanitizeHtml('<img onerror="alert(1)" src="x">')).toBe("");
  });

  it("should allow links with href", () => {
    const html = '<a href="https://example.com">link</a>';
    expect(sanitizeHtml(html)).toContain('href="https://example.com"');
  });

  it("should strip javascript: hrefs", () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript:");
  });

  it("should allow list elements", () => {
    const html = "<ul><li>one</li><li>two</li></ul>";
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("should allow table elements", () => {
    const html = "<table><tr><td>cell</td></tr></table>";
    expect(sanitizeHtml(html)).toContain("<table>");
  });
});

describe("sanitizeCss", () => {
  it("should return empty string for empty input", () => {
    expect(sanitizeCss("")).toBe("");
  });

  it("should pass through normal CSS", () => {
    expect(sanitizeCss("color: red;")).toBe("color: red;");
  });

  it("should strip javascript: expressions", () => {
    expect(sanitizeCss("background: javascript:alert(1)")).not.toContain("javascript:");
  });

  it("should strip expression() calls", () => {
    expect(sanitizeCss("width: expression(alert(1))")).not.toContain("expression(");
  });

  it("should strip behavior: property", () => {
    expect(sanitizeCss("behavior: url(evil.htc)")).not.toContain("behavior:");
  });

  it("should strip -moz-binding", () => {
    expect(sanitizeCss("-moz-binding: url(evil.xml)")).not.toContain("-moz-binding:");
  });
});

describe("isObject", () => {
  it("should return true for plain objects", () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
  });

  it("should return false for arrays", () => {
    expect(isObject([])).toBe(false);
  });

  it("should return false for null", () => {
    expect(isObject(null)).toBe(false);
  });

  it("should return false for primitives", () => {
    expect(isObject("string")).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject(undefined)).toBe(false);
  });
});
