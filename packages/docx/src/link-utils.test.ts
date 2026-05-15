import { describe, expect, it } from "vitest";
import { toSafeDocxLink } from "./link-utils";

describe("toSafeDocxLink", () => {
	it("returns null for empty string", () => {
		expect(toSafeDocxLink("")).toBeNull();
	});

	it("returns null for whitespace-only string", () => {
		expect(toSafeDocxLink("   ")).toBeNull();
	});

	it("trims surrounding whitespace", () => {
		expect(toSafeDocxLink("  https://example.com  ")).toBe("https://example.com/");
	});

	it("accepts https URLs", () => {
		expect(toSafeDocxLink("https://example.com")).toBe("https://example.com/");
	});

	it("accepts http URLs", () => {
		expect(toSafeDocxLink("http://example.com")).toBe("http://example.com/");
	});

	it("preserves path and query", () => {
		expect(toSafeDocxLink("https://example.com/p?a=1")).toBe("https://example.com/p?a=1");
	});

	it("returns mailto: for valid email", () => {
		expect(toSafeDocxLink("mailto:user@example.com")).toBe("mailto:user@example.com");
	});

	it("returns null for empty mailto:", () => {
		expect(toSafeDocxLink("mailto:")).toBeNull();
		expect(toSafeDocxLink("mailto:   ")).toBeNull();
	});

	it("trims email body within mailto:", () => {
		expect(toSafeDocxLink("mailto:  user@example.com  ")).toBe("mailto:user@example.com");
	});

	it("rejects javascript: protocol", () => {
		expect(toSafeDocxLink("javascript:alert(1)")).toBeNull();
	});

	it("rejects data: protocol", () => {
		expect(toSafeDocxLink("data:text/html,<script>alert(1)</script>")).toBeNull();
	});

	it("rejects file: protocol", () => {
		expect(toSafeDocxLink("file:///etc/passwd")).toBeNull();
	});

	it("rejects malformed URLs", () => {
		expect(toSafeDocxLink("not a url at all")).toBeNull();
	});

	it("rejects ftp: protocol", () => {
		expect(toSafeDocxLink("ftp://example.com")).toBeNull();
	});
});
