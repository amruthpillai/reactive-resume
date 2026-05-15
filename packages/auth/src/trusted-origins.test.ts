import { describe, expect, it } from "vitest";
import { getTrustedOrigins } from "./trusted-origins";

describe("getTrustedOrigins", () => {
	it("trusts the localhost alias for a 127.0.0.1 app URL on the same port", () => {
		expect(getTrustedOrigins("http://127.0.0.1:3100")).toEqual(
			expect.arrayContaining(["http://127.0.0.1:3100", "http://localhost:3100"]),
		);
	});

	it("trusts the 127.0.0.1 alias for a localhost app URL on the same port", () => {
		expect(getTrustedOrigins("http://localhost:3100")).toEqual(
			expect.arrayContaining(["http://localhost:3100", "http://127.0.0.1:3100"]),
		);
	});

	it("does not add a loopback alias for non-localhost app URLs", () => {
		expect(getTrustedOrigins("https://example.com")).not.toContain("https://localhost");
	});
});
