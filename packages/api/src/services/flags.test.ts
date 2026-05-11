import { describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
	FLAG_DISABLE_SIGNUPS: false,
	FLAG_DISABLE_EMAIL_AUTH: false,
}));

vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));

const { flagsService } = await import("./flags");

describe("flagsService.getFlags", () => {
	it("reads disableSignups + disableEmailAuth from env", () => {
		envMock.FLAG_DISABLE_SIGNUPS = false;
		envMock.FLAG_DISABLE_EMAIL_AUTH = false;
		expect(flagsService.getFlags()).toEqual({
			disableSignups: false,
			disableEmailAuth: false,
		});
	});

	it("returns disableSignups=true when env flag is set", () => {
		envMock.FLAG_DISABLE_SIGNUPS = true;
		envMock.FLAG_DISABLE_EMAIL_AUTH = false;
		expect(flagsService.getFlags()).toEqual({
			disableSignups: true,
			disableEmailAuth: false,
		});
	});

	it("returns disableEmailAuth=true when env flag is set", () => {
		envMock.FLAG_DISABLE_SIGNUPS = false;
		envMock.FLAG_DISABLE_EMAIL_AUTH = true;
		expect(flagsService.getFlags()).toEqual({
			disableSignups: false,
			disableEmailAuth: true,
		});
	});

	it("reads the latest env values on every call (no stale cache)", () => {
		envMock.FLAG_DISABLE_SIGNUPS = false;
		const before = flagsService.getFlags();
		envMock.FLAG_DISABLE_SIGNUPS = true;
		const after = flagsService.getFlags();

		expect(before.disableSignups).toBe(false);
		expect(after.disableSignups).toBe(true);
	});
});
