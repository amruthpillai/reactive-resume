import { afterEach, describe, expect, it, vi } from "vitest";

const events = vi.hoisted(() => [] as string[]);
vi.mock("./startup/checks", () => ({
	runStartupChecks: async () => {
		await Promise.resolve();
		events.push("migrations complete");
	},
}));
vi.mock("./http/app", () => {
	events.push("auth imported");
	return {
		createApp: () => {
			events.push("app created");
			return { fetch: vi.fn() };
		},
	};
});
vi.mock("@hono/node-server", () => ({
	serve: () => {
		events.push("server listening");
	},
}));
vi.mock("@reactive-resume/env/server", () => ({ env: { SERVER_PORT: 3001 } }));
afterEach(() => vi.restoreAllMocks());

describe("server startup", () => {
	it("finishes migrations before importing auth and seeding OAuth resources", async () => {
		vi.spyOn(process, "on").mockReturnValue(process);
		const entry = await import("./index");
		expect(events).toEqual([]);
		await entry.main();
		expect(events).toEqual(["migrations complete", "auth imported", "app created", "server listening"]);
	});
});
