import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execute, healthcheck } = vi.hoisted(() => ({ execute: vi.fn(), healthcheck: vi.fn() }));

vi.mock("@reactive-resume/db/client", () => ({ db: { execute } }));
vi.mock("@reactive-resume/api/features/storage", () => ({ getStorageService: () => ({ healthcheck }) }));
vi.mock("../app-version", () => ({ appVersion: "9.8.7" }));

import { handleHealth } from "./health";

describe("health version reporting", () => {
	beforeEach(() => {
		execute.mockResolvedValue([]);
		healthcheck.mockResolvedValue({ status: "healthy" });
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it("reports the built application version when launched directly by Node", async () => {
		vi.stubEnv("npm_package_version", undefined);

		const response = await handleHealth();

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ service: "reactive-resume", version: "9.8.7", status: "healthy" });
	});

	it("ignores a package manager's workspace package version", async () => {
		vi.stubEnv("npm_package_version", "0.0.0");

		expect(await (await handleHealth()).json()).toMatchObject({ version: "9.8.7" });
	});

	it("keeps the version available when a dependency is unhealthy", async () => {
		vi.stubEnv("npm_package_version", undefined);
		execute.mockRejectedValueOnce(new Error("Database unavailable"));
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const response = await handleHealth();

		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({ version: "9.8.7", status: "unhealthy" });
	});
});
