import { describe, expect, it } from "vitest";
import { toSafeLink } from "./link";

describe("toSafeLink", () => {
	it("accepts https URLs", () => {
		expect(toSafeLink("https://example.com")).toBe("https://example.com/");
	});

	it("rejects javascript: protocol", () => {
		expect(toSafeLink("javascript:alert(1)")).toBeNull();
		expect(toSafeLink("data:text/html,<script>alert(1)</script>")).toBeNull();
		expect(toSafeLink("file:///etc/passwd")).toBeNull();
		expect(toSafeLink("ftp://example.com")).toBeNull();
	});

	it("accepts tel: phone links", () => {
		expect(toSafeLink("tel:+1 555 123 4567")).toBe("tel:+1 555 123 4567");
	});

	it("rejects malformed URLs", () => {
		expect(toSafeLink("not a url at all")).toBeNull();
	});
});
