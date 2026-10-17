// Run: node apps/mobile/scripts/public-safety.test.mjs
// Exercise shipped storage/request boundary; SQLite and remote transport are fixtures.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const serverRequire = createRequire(new URL("../../server/package.json", import.meta.url));
const { transformSync } = createRequire(serverRequire.resolve("tsx"))("esbuild");
const source = new URL("../src/features/public/safety.ts", import.meta.url);
const stored = new Map();
const calls = [];
let server = "https://first.fixture.test";
let account = "first-account";
let storageFailure = false;
const storage = {
	getItemSync: (key) => {
		if (storageFailure) throw new Error("Storage unavailable");
		return stored.get(key) ?? null;
	},
	setItemSync: (key, value) => {
		if (storageFailure) throw new Error("Storage unavailable");
		stored.set(key, value);
	},
	removeItemSync: (key) => stored.delete(key),
};
function load() {
	const module = { exports: {} };
	const code = transformSync(readFileSync(source, "utf8"), { loader: "ts", format: "cjs" }).code;
	new Function("require", "module", "exports", code)(
		(name) => {
			if (name === "expo-sqlite/kv-store") return storage;
			if (name === "@/auth/session") return { getServer: () => server, getAccountScope: () => account };
			if (name === "@/api/client")
				return {
					client: {
						resume: {
							getBySlug: async (input, options) => {
								calls.push({ input, scope: options.context.scope });
								return { id: "fictional-resume" };
							},
						},
					},
				};
			throw new Error(`Unexpected module: ${name}`);
		},
		module,
		module.exports,
	);
	return module.exports;
}
let safety = load();
await safety.loadSharedResume("avery", "cv");
assert.equal(calls.length, 1);
assert.equal(calls[0].scope, account);
safety.setAuthorBlocked("Avery", true);
safety = load(); // New app process reads persisted preference.
assert.equal(safety.isAuthorBlocked("avery"), true);
await assert.rejects(safety.loadSharedResume("avery", "other-resume"), /blocked/);
assert.equal(calls.length, 1, "blocked authors must not reach remote transport, including other slugs");
account = "second-account";
assert.equal(safety.isAuthorBlocked("avery"), false);
account = "first-account";
server = "https://second.fixture.test";
assert.equal(safety.isAuthorBlocked("avery"), false);
server = "https://first.fixture.test";
safety.setAuthorBlocked("avery", false);
await safety.loadSharedResume("avery", "cv");
assert.equal(calls.length, 2, "unblocking restores access");
storageFailure = true;
assert.throws(() => safety.setAuthorBlocked("avery", true), /Storage unavailable/);
await assert.rejects(safety.loadSharedResume("avery", "cv"), /Storage unavailable/);
assert.equal(calls.length, 2, "storage failures must not bypass safety preferences");
storageFailure = false;
account = null;
await assert.rejects(safety.loadSharedResume("avery", "cv"), /Sign in/);
assert.equal(calls.length, 2, "a missing account must not issue a scoped request");
console.log(
	"PASS: persisted blocking, all author slugs, account/server isolation, unblock, and failed-storage denial.",
);
