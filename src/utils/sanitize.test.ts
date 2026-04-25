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

  it("should strip @import rules", () => {
    const css = "@import url('https://evil.example/css'); .safe { color: red; }";
    const result = sanitizeCss(css);
    expect(result).not.toContain("@import");
    expect(result).toContain(".safe");
  });

  it("should strip network url() calls and keep regular declarations", () => {
    const css = ".card { background: url('https://evil.example/bg.png'); color: #111; }";
    const result = sanitizeCss(css);
    expect(result).not.toContain("url(");
    expect(result).toMatch(/color\s*:\s*#111/);
  });

  it("should strip @font-face blocks", () => {
    const css =
      "@font-face { font-family: test; src: url('https://evil.example/font.woff2'); } .x { font-family: test; }";
    const result = sanitizeCss(css);
    expect(result).not.toContain("@font-face");
    expect(result).toContain(".x");
  });

  it("should strip css comments before scanning dangerous values", () => {
    const css = ".x { background: java/**/script:alert(1); color: blue; }";
    const result = sanitizeCss(css);
    expect(result).not.toContain("javascript:");
    expect(result).toContain("color");
  });

  it("should decode escaped javascript protocol and strip it", () => {
    const css = ".x { background: \\6a\\61\\76\\61\\73\\63\\72\\69\\70\\74:alert(1); color: green; }";
    const result = sanitizeCss(css);
    expect(result).not.toContain("javascript:");
    expect(result).toContain("color");
  });

  it("should decode escaped expression() and strip it", () => {
    const css = ".x { width: \\65\\78\\70\\72\\65\\73\\73\\69\\6f\\6e(alert(1)); height: 10px; }";
    const result = sanitizeCss(css);
    expect(result).not.toContain("expression(");
    expect(result).toContain("height");
  });

  it("should decode non-hex escapes without dropping characters", () => {
    const css = ".x { content: \\(ok\\); color: teal; }";
    const result = sanitizeCss(css);
    expect(result).toContain("content: (ok)");
    expect(result).toContain("color: teal");
  });

  it("should strip data url payloads in url() functions", () => {
    const css = ".x { background-image: url(data:text/html;base64,PHNjcmlwdD4=); color: black; }";
    const result = sanitizeCss(css);
    expect(result).not.toContain("url(");
    expect(result).toContain("color");
  });

  it("should strip image-set and cross-fade function network payloads", () => {
    const css =
      ".x { background-image: image-set(url('https://evil.example/a.png') 1x); mask-image: cross-fade(url('https://evil.example/a.png'), url('https://evil.example/b.png')); color: purple; }";
    const result = sanitizeCss(css);
    expect(result).not.toContain("image-set(");
    expect(result).not.toContain("cross-fade(");
    expect(result).toContain("color");
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
