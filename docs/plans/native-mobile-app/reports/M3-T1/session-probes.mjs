// In-memory probes for apps/mobile/src/auth/session.ts (review 9fae76e4, items 1–4). Runs the shipped session.ts and
// oauth.ts with Expo modules and the network replaced. Run from the repository root:
//   node --import ./apps/server/node_modules/tsx/dist/loader.mjs docs/plans/native-mobile-app/reports/M3-T1/session-probes.mjs
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const origin = "https://resume.test";
const issuer = `${origin}/api/auth`;
const jwt = (sub, n) => `h.${Buffer.from(JSON.stringify({ sub, n })).toString("base64url")}.s`;
const later = () => Math.floor(Date.now() / 1000) + 3600;

const probe = {
	store: new Map(),
	log: [],
	metadata: null,
	redirect: null, // (state) => redirect URL
	exchange: null, // () => token response
	refresh: null, // () => Promise<token response>
	network: { isConnected: true, isInternetReachable: true },
};
globalThis.__probe = probe;

class TokenError extends Error {
	constructor(code) {
		super(code);
		this.code = code;
	}
}
const tokenResponse = (accessToken, refreshToken) => ({ accessToken, refreshToken, expiresIn: 3600, issuedAt: Math.floor(Date.now() / 1000) });
globalThis.__probeModules = {
	"expo-secure-store": {
		getItemAsync: async (key) => probe.store.get(key) ?? null,
		setItemAsync: async (key, value) => void probe.store.set(key, value),
		deleteItemAsync: async (key) => void probe.store.delete(key),
	},
	"expo-network": { getNetworkStateAsync: async () => probe.network },
	"expo-web-browser": { dismissAuthSession: () => {} },
	react: { useSyncExternalStore: () => null },
	"react-native": { Platform: { OS: "ios" } },
	"@/draft/runtime": { clearDraftsFor: (scope) => probe.log.push(`clear-drafts ${scope}`) },
	"expo-auth-session": {
		TokenError,
		TokenTypeHint: { RefreshToken: "refresh_token" },
		AuthRequest: class {
			constructor(config) {
				Object.assign(this, config);
				this.state = "state-1";
				this.codeVerifier = "verifier-1";
			}
			async makeAuthUrlAsync() {}
			async promptAsync() {
				const url = probe.redirect(this.state);
				return { type: "success", url, params: Object.fromEntries(new URL(url).searchParams) };
			}
		},
		exchangeCodeAsync: async (config) => {
			probe.log.push(`exchange ${config.code} ${config.extraParams.code_verifier}`);
			return probe.exchange();
		},
		refreshAsync: async (config) => {
			probe.log.push(`refresh ${config.refreshToken}`);
			return probe.refresh();
		},
		revokeAsync: async (config) => void probe.log.push(`revoke ${config.token}`),
	},
};
globalThis.fetch = async (url, init) => {
	if (url.endsWith("/.well-known/oauth-authorization-server")) return Response.json(probe.metadata);
	if (url.endsWith("/register") && init?.method === "POST") return Response.json({ client_id: "client-1" });
	return new Response("{}", { status: 404 });
};

registerHooks({
	resolve(specifier, context, next) {
		if (specifier in globalThis.__probeModules) return { url: `probe:${specifier}`, shortCircuit: true };
		return next(specifier, context);
	},
	load(url, context, next) {
		if (!url.startsWith("probe:")) return next(url, context);
		const name = url.slice("probe:".length);
		const source = Object.keys(globalThis.__probeModules[name])
			.map((key) => `exports[${JSON.stringify(key)}]=globalThis.__probeModules[${JSON.stringify(name)}][${JSON.stringify(key)}];`)
			.join("");
		return { format: "commonjs", source, shortCircuit: true };
	},
});
globalThis.__DEV__ = false;

const sessionUrl = new URL(process.env.SESSION_FILE ?? "../../../../../apps/mobile/src/auth/session.ts", import.meta.url);
const load = (instance) => import(`${sessionUrl.href}?instance=${instance}`);
const goodMetadata = () => ({
	issuer,
	authorization_endpoint: `${issuer}/oauth2/authorize`,
	token_endpoint: `${issuer}/oauth2/token`,
	registration_endpoint: `${issuer}/oauth2/register`,
	revocation_endpoint: `${issuer}/oauth2/revoke`,
	scopes_supported: ["openid", "offline_access"],
	authorization_response_iss_parameter_supported: true,
});
const reset = () => {
	probe.store.clear();
	probe.log.length = 0;
	probe.metadata = goodMetadata();
	probe.redirect = (state) => `me.rxresu:/cb?code=code-1&state=${state}&iss=${encodeURIComponent(issuer)}`;
};
const signInAs = async (session, sub, n) => {
	probe.exchange = () => tokenResponse(jwt(sub, n), `refresh-${sub}-${n}`);
	assert.equal(await session.signIn(origin), true);
};
const deferred = () => {
	let resolve, reject;
	const promise = new Promise((a, b) => ((resolve = a), (reject = b)));
	return { promise, resolve, reject };
};
let passed = 0;
const only = process.env.ONLY?.split(",");
const check = async (name, fn) => {
	if (only && !only.includes(name[0])) return;
	reset();
	await fn();
	passed++;
	console.log(`PASS ${name}`);
};

let instance = 0;
await check("1. mix-up: foreign issuer or endpoint is refused; redirect state and iss are checked", async () => {
	const { parseRedirectParams, discover, ServerError } = await import(
		new URL("../../../../../apps/mobile/src/auth/oauth.ts", import.meta.url).href
	);
	assert.deepEqual(parseRedirectParams("me.rxresu:/cb?code=a%2Bb&state=s+1&iss=https%3A%2F%2Fx#extra=1"), {
		code: "a+b",
		state: "s 1",
		iss: "https://x",
		extra: "1",
	});
	probe.metadata = { ...goodMetadata(), issuer: "https://evil.test/api/auth" };
	await assert.rejects(discover("https://other.test"), (error) => error instanceof ServerError && error.reason === "mismatch");
	probe.metadata = { ...goodMetadata(), token_endpoint: "https://evil.test/token" };
	await assert.rejects(discover("https://third.test"), (error) => error.reason === "mismatch");

	const session = await load(++instance);
	await session.restoreSession();
	probe.metadata = goodMetadata();
	probe.redirect = (state) => `me.rxresu:/cb?code=code-1&state=${state}&iss=${encodeURIComponent("https://evil.test/api/auth")}`;
	await assert.rejects(session.signIn(origin), (error) => error.code === "issuer_mismatch");
	probe.redirect = () => `me.rxresu:/cb?code=code-1&state=other&iss=${encodeURIComponent(issuer)}`;
	await assert.rejects(session.signIn(origin), (error) => error.code === "state_mismatch");
	probe.redirect = (state) => `me.rxresu:/cb?code=code-1&state=${state}`;
	await assert.rejects(session.signIn(origin), (error) => error.code === "issuer_mismatch");
	assert.equal(probe.log.filter((line) => line.startsWith("exchange")).length, 0, "no code was exchanged");
	probe.redirect = (state) => `me.rxresu:/cb?code=code-1&state=${state}&iss=${encodeURIComponent(issuer)}`;
	await signInAs(session, "user-a", 1);
	assert.deepEqual(probe.log, ["exchange code-1 verifier-1"]);
	assert.equal(session.getSession().status, "signed-in");
});

await check("2. a 401 retry for account A after a same-server switch to B fails instead of using B's token", async () => {
	const session = await load(++instance);
	await session.restoreSession();
	await signInAs(session, "user-a", 1);
	const usedByA = await session.getCredentials();
	assert.equal(usedByA.scope, JSON.stringify([origin, "user-a"]));
	await signInAs(session, "user-b", 1);
	probe.refresh = async () => tokenResponse(jwt("user-b", 2), "refresh-user-b-2");
	assert.equal(await session.recoverFromUnauthorized(usedByA), null);
	assert.equal(probe.log.filter((line) => line.startsWith("refresh")).length, 0, "B's refresh token was not used");

	// Delayed: A's refresh is in flight when B signs in. A's retry gets nothing; B's tokens are untouched.
	await signInAs(session, "user-a", 3);
	const usedByA2 = await session.getCredentials();
	const gate = deferred();
	probe.refresh = () => gate.promise;
	const retry = session.recoverFromUnauthorized(usedByA2);
	await new Promise((resolve) => setTimeout(resolve, 10));
	const switching = signInAs(session, "user-b", 4);
	gate.resolve(tokenResponse(jwt("user-a", 5), "refresh-user-a-5"));
	await switching;
	const retried = await retry;
	assert.ok(retried === null || retried.scope === usedByA2.scope, "never B's token under A's scope");
	const now = await session.getCredentials();
	assert.equal(now.scope, JSON.stringify([origin, "user-b"]));
	assert.ok(retried === null || retried.accessToken !== now.accessToken);
});

await check("3. sign-out queues behind a refresh and revokes, clears drafts, deletes tokens for that account only", async () => {
	const session = await load(++instance);
	await session.restoreSession();
	await signInAs(session, "user-a", 1);
	const gate = deferred();
	probe.refresh = () => gate.promise;
	const used = await session.getCredentials();
	const refreshing = session.recoverFromUnauthorized(used);
	await new Promise((resolve) => setTimeout(resolve, 10));
	const leaving = session.signOut();
	await new Promise((resolve) => setTimeout(resolve, 10));
	assert.deepEqual(
		probe.log.filter((line) => !line.startsWith("exchange")),
		["refresh refresh-user-a-1"],
		"sign-out waits for the refresh",
	);
	gate.resolve(tokenResponse(jwt("user-a", 2), "refresh-user-a-2"));
	await Promise.all([refreshing, leaving]);
	assert.deepEqual(probe.log.filter((line) => !line.startsWith("exchange")), [
		"refresh refresh-user-a-1",
		"revoke refresh-user-a-2",
		`clear-drafts ${JSON.stringify([origin, "user-a"])}`,
	]);
	assert.equal(session.getSession().status, "signed-out");
	assert.equal([...probe.store.keys()].filter((key) => key.startsWith("tokens.")).length, 0, "no tokens left");
	assert.equal(await session.getAccessToken(), null);
});

await check("4. a refresh with no answer is never replayed: in process and after a restart the session is expired", async () => {
	let session = await load(++instance);
	await session.restoreSession();
	await signInAs(session, "user-a", 1);
	const key = [...probe.store.keys()].find((name) => name.startsWith("tokens."));
	probe.store.set(key, JSON.stringify({ ...JSON.parse(probe.store.get(key)), expiresAt: 0 }));

	// Process killed while the refresh is out: restart with the same store.
	probe.refresh = () => new Promise(() => {});
	session = await load(++instance);
	await session.restoreSession();
	void session.getAccessToken();
	await new Promise((resolve) => setTimeout(resolve, 10));
	assert.equal(probe.log.filter((line) => line.startsWith("refresh")).length, 1);
	session = await load(++instance);
	await session.restoreSession();
	assert.equal(session.getSession().status, "expired");
	assert.equal(await session.getAccessToken(), null);
	assert.equal(probe.log.filter((line) => line.startsWith("refresh")).length, 1, "the sent token was not replayed");

	// In process: the request fails with no answer (network error).
	await signInAs(session, "user-a", 2);
	probe.store.set(key, JSON.stringify({ ...JSON.parse(probe.store.get(key)), expiresAt: 0 }));
	session = await load(++instance);
	await session.restoreSession();
	probe.refresh = async () => {
		throw new TypeError("Network request failed");
	};
	assert.equal(await session.getAccessToken(), null);
	assert.equal(session.getSession().status, "expired");
	assert.equal(await session.getAccessToken(), null);
	assert.equal(probe.log.filter((line) => line.startsWith("refresh")).length, 2, "one attempt, no replay");

	// A server error answer (not rotated) keeps the session and clears the marker; offline sends nothing.
	await signInAs(session, "user-a", 3);
	probe.store.set(key, JSON.stringify({ ...JSON.parse(probe.store.get(key)), expiresAt: 0 }));
	session = await load(++instance);
	await session.restoreSession();
	probe.refresh = async () => {
		throw new TokenError("server_error");
	};
	assert.equal(await session.getAccessToken(), jwt("user-a", 3));
	assert.equal(session.getSession().status, "signed-in");
	assert.equal([...probe.store.keys()].some((name) => name.startsWith("refreshing.")), false);
	probe.network = { isConnected: false, isInternetReachable: false };
	const before = probe.log.length;
	assert.equal(await session.getAccessToken(), jwt("user-a", 3));
	assert.equal(probe.log.length, before, "offline: nothing sent");
	probe.network = { isConnected: true, isInternetReachable: true };
});

console.log(`${passed} session probes passed`);
process.exit(0);
