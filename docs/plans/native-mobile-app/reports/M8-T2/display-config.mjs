// Run: node docs/plans/native-mobile-app/reports/M8-T2/display-config.mjs
// Introspection executes Expo's real manifest mods without writing native projects.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const mobile = new URL("../../../../../apps/mobile/", import.meta.url);
const requireMobile = createRequire(new URL("package.json", mobile));
const { AndroidConfig } = requireMobile("expo/config-plugins");
const config = JSON.parse(execFileSync(process.execPath, [requireMobile.resolve("expo/bin/cli"), "config", "--type", "introspect", "--json"], {
	cwd: fileURLToPath(mobile), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
}));
const manifest = config._internal.modResults.android.manifest;
const activity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
const flags = new Set(activity.$["android:configChanges"].split("|"));
for (const flag of ["fontScale", "density", "orientation", "screenSize", "uiMode"])
	assert.ok(flags.has(flag), `MainActivity must handle ${flag} without replacing the active React root`);
assert.equal(activity.$["android:exported"], "true");
console.log("Expo manifest preserves existing configuration handling and handles font/display scaling in place");
