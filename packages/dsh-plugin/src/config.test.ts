import { expect, it } from "vitest";
import { Config } from "./config";

it("applies defaults for every optional field", () => {
	const parsed = Config({ apiKey: "test-key" });

	expect(parsed).toEqual({
		apiKey: "test-key",
		url: "https://rxresu.me",
		serverName: "resume",
		toolCallTimeoutMs: 60_000,
	});
});

it("keeps explicit values", () => {
	const parsed = Config({
		apiKey: "test-key",
		url: "http://localhost:3000",
		serverName: "rr",
		toolCallTimeoutMs: 5_000,
	});

	expect(parsed.url).toBe("http://localhost:3000");
	expect(parsed.serverName).toBe("rr");
	expect(parsed.toolCallTimeoutMs).toBe(5_000);
});

it("rejects a missing apiKey", () => {
	expect(() => Config({})).toThrow();
});
