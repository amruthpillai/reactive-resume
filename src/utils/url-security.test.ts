import { describe, expect, it } from "vite-plus/test";

import {
  isAllowedExternalUrl,
  isPrivateOrLoopbackHost,
  parseAllowedHostList,
  parseUrl,
  sanitizeResumePictureUrl,
} from "./url-security";

describe("isPrivateOrLoopbackHost", () => {
  it("returns true for localhost and private hosts", () => {
    expect(isPrivateOrLoopbackHost("localhost")).toBe(true);
    expect(isPrivateOrLoopbackHost("127.0.0.1")).toBe(true);
    expect(isPrivateOrLoopbackHost("10.0.0.7")).toBe(true);
    expect(isPrivateOrLoopbackHost("192.168.0.2")).toBe(true);
  });

  it("returns false for public hosts", () => {
    expect(isPrivateOrLoopbackHost("example.com")).toBe(false);
    expect(isPrivateOrLoopbackHost("8.8.8.8")).toBe(false);
  });

  it("returns true for private and link-local ipv6 addresses", () => {
    expect(isPrivateOrLoopbackHost("::1")).toBe(true);
    expect(isPrivateOrLoopbackHost("[::1]")).toBe(true);
    expect(isPrivateOrLoopbackHost("fd00::1234")).toBe(true);
    expect(isPrivateOrLoopbackHost("[fe80::1]")).toBe(true);
  });
});

describe("isAllowedExternalUrl", () => {
  const allowedHosts = new Set(["api.openai.com", "https://gateway.ai.vercel.com"]);

  it("allows https URLs on allowed hosts", () => {
    expect(isAllowedExternalUrl("https://api.openai.com/v1", allowedHosts)).toBe(true);
    expect(isAllowedExternalUrl("https://gateway.ai.vercel.com/v1", allowedHosts)).toBe(true);
  });

  it("blocks local and non-https URLs", () => {
    expect(isAllowedExternalUrl("http://api.openai.com/v1", allowedHosts)).toBe(false);
    expect(isAllowedExternalUrl("https://localhost:11434/v1", allowedHosts)).toBe(false);
    expect(isAllowedExternalUrl("https://10.0.0.1/v1", allowedHosts)).toBe(false);
  });

  it("blocks malformed URLs and credentialed URLs", () => {
    expect(isAllowedExternalUrl("not-a-url", allowedHosts)).toBe(false);
    expect(isAllowedExternalUrl("https://user:pass@api.openai.com/v1", allowedHosts)).toBe(false);
  });

  it("supports origin-only entries in the allow list", () => {
    const originOnlyAllowedHosts = new Set(["https://example.org"]);
    expect(isAllowedExternalUrl("https://example.org/v1/hello", originOnlyAllowedHosts)).toBe(true);
    expect(isAllowedExternalUrl("https://sub.example.org/v1/hello", originOnlyAllowedHosts)).toBe(false);
  });
});

describe("sanitizeResumePictureUrl", () => {
  const appUrl = "https://rxresu.me";

  it("keeps local uploads paths", () => {
    expect(sanitizeResumePictureUrl("/uploads/user/pictures/a.webp", appUrl)).toBe("/uploads/user/pictures/a.webp");
  });

  it("converts same-origin upload URLs to path-only values", () => {
    expect(sanitizeResumePictureUrl("https://rxresu.me/uploads/u/p.jpg", appUrl)).toBe("/uploads/u/p.jpg");
  });

  it("keeps query and hash for same-origin upload URLs", () => {
    expect(sanitizeResumePictureUrl("https://rxresu.me/uploads/u/p.jpg?size=2#thumb", appUrl)).toBe(
      "/uploads/u/p.jpg?size=2#thumb",
    );
  });

  it("rejects non-upload and cross-origin URLs", () => {
    expect(sanitizeResumePictureUrl("https://example.com/pic.jpg", appUrl)).toBe("");
    expect(sanitizeResumePictureUrl("https://rxresu.me/other/pic.jpg", appUrl)).toBe("");
  });

  it("rejects invalid URLs, invalid app URLs, and credentialed URLs", () => {
    expect(sanitizeResumePictureUrl("not-a-url", appUrl)).toBe("");
    expect(sanitizeResumePictureUrl("ftp://rxresu.me/uploads/p.jpg", appUrl)).toBe("");
    expect(sanitizeResumePictureUrl("https://user:pass@rxresu.me/uploads/p.jpg", appUrl)).toBe("");
    expect(sanitizeResumePictureUrl("https://rxresu.me/uploads/p.jpg", "not-a-url")).toBe("");
  });
});

describe("parse helpers", () => {
  it("parseUrl returns URL object for valid URLs and null for invalid input", () => {
    expect(parseUrl("https://example.com/path")?.hostname).toBe("example.com");
    expect(parseUrl("invalid url")).toBeNull();
  });

  it("parseAllowedHostList normalizes host entries and handles empty input", () => {
    const set = parseAllowedHostList(" API.OpenAI.com , https://gateway.ai.vercel.com ,,api.openai.com ");
    expect(set.has("api.openai.com")).toBe(true);
    expect(set.has("https://gateway.ai.vercel.com")).toBe(true);
    expect(set.size).toBe(2);

    expect(parseAllowedHostList(undefined).size).toBe(0);
    expect(parseAllowedHostList("").size).toBe(0);
  });
});
