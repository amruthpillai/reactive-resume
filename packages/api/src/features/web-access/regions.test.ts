import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { resolveRegions, searchScope } from "./regions";

const fixtures = vi.hoisted(() => ({
	profile: vi.fn(),
	select: vi.fn(),
	owner: [] as { timezone: string }[],
}));
vi.mock("@reactive-resume/db/client", () => ({
	db: {
		select: (...args: unknown[]) => {
			fixtures.select(...args);
			return { from: () => ({ where: async () => fixtures.owner }) };
		},
	},
}));
vi.mock("../career/service", () => ({ careerService: { profile: fixtures.profile } }));

describe("resolveRegions", () => {
	it("uses the account time zone's country when regions are automatic", () => {
		expect(resolveRegions(undefined, "Asia/Singapore")).toEqual(["SG"]);
	});

	it("resolves no region when automatic and the time zone has no country", () => {
		expect(resolveRegions(null, "UTC")).toEqual([]);
	});

	it("keeps a chosen list in order", () => {
		expect(resolveRegions(["DE", "FR"], "Asia/Singapore")).toEqual(["DE", "FR"]);
	});

	it("keeps anywhere as no region", () => {
		expect(resolveRegions([], "Asia/Singapore")).toEqual([]);
	});
});

describe("searchScope", () => {
	beforeEach(() => {
		fixtures.profile.mockReset();
		fixtures.select.mockReset();
	});

	it("reads the profile and the account time zone once each", async () => {
		fixtures.profile.mockResolvedValue({ locations: ["Berlin"], searchRegions: undefined });
		fixtures.owner = [{ timezone: "Europe/Berlin" }];

		await expect(searchScope("user-1")).resolves.toEqual({ regions: ["DE"], locations: ["Berlin"] });
		expect(fixtures.profile).toHaveBeenCalledTimes(1);
		expect(fixtures.profile).toHaveBeenCalledWith("user-1");
		expect(fixtures.select).toHaveBeenCalledTimes(1);
	});

	it("prefers chosen regions over the account time zone", async () => {
		fixtures.profile.mockResolvedValue({ locations: [], searchRegions: ["JP"] });
		fixtures.owner = [{ timezone: "Europe/Berlin" }];

		await expect(searchScope("user-1")).resolves.toEqual({ regions: ["JP"], locations: [] });
	});

	it("treats a missing account as UTC", async () => {
		fixtures.profile.mockResolvedValue({ locations: [], searchRegions: null });
		fixtures.owner = [];

		await expect(searchScope("user-1")).resolves.toEqual({ regions: [], locations: [] });
	});
});
