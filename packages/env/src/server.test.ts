import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@reactive-resume/utils/monorepo.node", () => ({ findWorkspaceRoot: () => undefined }));

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe("root resume configuration", () => {
	it.each([
		[undefined, undefined],
		["", undefined],
		["   ", undefined],
		[" root-id ", "root-id"],
	])("normalizes %s to %s", async (value, expected) => {
		vi.stubEnv("APP_URL", "https://resume.example");
		vi.stubEnv("DATABASE_URL", "postgresql://localhost/disposable");
		vi.stubEnv("AUTH_SECRET", "disposable");
		vi.stubEnv("ROOT_RESUME_ID", value);
		const { env } = await import("./server");
		expect(env.ROOT_RESUME_ID).toBe(expected);
	});
});
