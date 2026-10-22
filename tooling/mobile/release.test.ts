import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vite-plus/test";
import { buildNumber, validateRelease } from "./release";

const version = { MOBILE_BUILD_NUMBER_BASE: "100", GITHUB_RUN_NUMBER: "1", GITHUB_RUN_ATTEMPT: "1" };
const android = {
	...version,
	PLATFORM: "android",
	UPLOAD: "false",
	EXPO_TOKEN: "fixture",
	ANDROID_KEYSTORE_BASE64: "fixture",
	ANDROID_KEYSTORE_PASSWORD: "fixture",
	ANDROID_KEY_ALIAS: "fixture",
	ANDROID_KEY_PASSWORD: "fixture",
};

it("increments once per workflow run and reuses the number on retries", () => {
	expect(buildNumber(version)).toBe(100);
	expect(buildNumber({ ...version, GITHUB_RUN_ATTEMPT: "2" })).toBe(100);
	expect(buildNumber({ ...version, GITHUB_RUN_NUMBER: "2" })).toBe(101);
	expect(buildNumber({ ...version, GITHUB_RUN_NUMBER: "3" })).toBe(102);
	expect(buildNumber({ ...version, MOBILE_BUILD_NUMBER_BASE: "298", GITHUB_RUN_NUMBER: "4" })).toBe(301);
	expect(buildNumber({ ...version, MOBILE_BUILD_NUMBER_BASE: "2100000000" })).toBe(2_100_000_000);
	expect(validateRelease(android)).toBe(100);
});

it.each([
	{ MOBILE_BUILD_NUMBER_BASE: "" },
	{ MOBILE_BUILD_NUMBER_BASE: "0" },
	{ MOBILE_BUILD_NUMBER_BASE: "-1" },
	{ MOBILE_BUILD_NUMBER_BASE: "1e3" },
	{ MOBILE_BUILD_NUMBER_BASE: "9007199254740992" },
	{ MOBILE_BUILD_NUMBER_BASE: "2100000001" },
	{ MOBILE_BUILD_NUMBER_BASE: "2100000000", GITHUB_RUN_NUMBER: "2" },
	{ GITHUB_RUN_NUMBER: "0" },
])("rejects absent, ambiguous or overflowing version allocation: %j", (override) => {
	expect(() => buildNumber({ ...version, ...override })).toThrow();
});

it("requires signing before build, and store credentials only when uploading", () => {
	expect(() => validateRelease({ ...android, ANDROID_KEY_PASSWORD: "" })).toThrow("ANDROID_KEY_PASSWORD");
	expect(() => validateRelease({ ...android, PLATFORM: "all" })).toThrow("IOS_DISTRIBUTION_P12_BASE64");
	expect(() => validateRelease({ ...android, UPLOAD: "true" })).toThrow("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
	expect(validateRelease({ ...android, UPLOAD: "true", GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: "fixture" })).toBe(100);
	const ios = {
		...version,
		PLATFORM: "ios",
		UPLOAD: "false",
		EXPO_TOKEN: "fixture",
		IOS_DISTRIBUTION_P12_BASE64: "fixture",
		IOS_DISTRIBUTION_P12_PASSWORD: "fixture",
		IOS_PROVISION_PROFILE_BASE64: "fixture",
	};
	expect(validateRelease(ios)).toBe(100);
	expect(() => validateRelease({ ...ios, UPLOAD: "true" })).toThrow("ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY");
});

it("CLI emits only validated version output and never echoes credential values on failure", () => {
	const directory = mkdtempSync(join(tmpdir(), "mobile-release-"));
	const script = fileURLToPath(new URL("./release.ts", import.meta.url));
	const output = join(directory, "output");
	try {
		const env = { ...process.env, ...android, GITHUB_OUTPUT: output };
		const valid = spawnSync(process.execPath, [script], { env, encoding: "utf8" });
		expect(valid.status, valid.stderr).toBe(0);
		expect(readFileSync(output, "utf8")).toBe("build_number=100\n");
		const invalid = spawnSync(process.execPath, [script], {
			env: { ...env, PLATFORM: "untrusted", ANDROID_KEYSTORE_PASSWORD: "private-fixture" },
			encoding: "utf8",
		});
		expect(invalid.status).toBe(1);
		expect(invalid.stderr).toContain("Invalid release platform");
		expect(invalid.stderr).not.toContain("private-fixture");
		expect(readFileSync(output, "utf8")).toBe("build_number=100\n");
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
