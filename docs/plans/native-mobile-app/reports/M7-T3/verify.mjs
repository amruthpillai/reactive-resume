// Run with Node 24: node docs/plans/native-mobile-app/reports/M7-T3/verify.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const mobile = new URL("../../../../../apps/mobile/", import.meta.url);
const state = { server: "https://rxresu.me", token: "fixture-token", choices: [], events: [], signIn: null, tokenRead: null };
globalThis.deepLinkScenario = state;
const stubs = {
	"expo-web-browser": "export const openBrowserAsync = async (path) => { globalThis.deepLinkScenario.events.push(['browser', path]); };",
	"@lingui/core/macro": "export const t = (parts, ...values) => parts.reduce((text, part, i) => text + part + (values[i] ?? ''), '');",
	"react-native": `export const Alert = { alert(title, message, buttons) {
		const s = globalThis.deepLinkScenario;
		s.events.push(['dialog', title, message]);
		const choice = s.choices.shift();
		if (choice === undefined) throw new Error('Unexpected dialog: ' + title);
		buttons[choice ? 1 : 0].onPress();
	} };`,
	"@/i18n": "export const initI18n = async () => {};",
	"@/auth/session": `const s = globalThis.deepLinkScenario;
		export const DEFAULT_SERVER = 'https://rxresu.me';
		export const getServer = () => s.server;
		export const getAccessToken = async () => { s.events.push(['token']); return s.tokenRead ? s.tokenRead() : s.token; };
		export const restoreSession = async () => { s.events.push(['restore']); };
		export const signIn = async (server) => {
			s.events.push(['signIn', server]);
			const success = s.signIn ? await s.signIn(server) : true;
			if (success) { s.server = server; s.token = 'new-fixture-token'; }
			return success;
		};`,
};

// Exercise the shipped entry point and routing code. Only OS dialogs, translation and session I/O are mocked.
const hooks = registerHooks({
	resolve(specifier, context, next) {
		if (specifier in stubs) return { url: `scenario:${specifier}`, shortCircuit: true };
		let url;
		if (specifier.startsWith("@/")) url = new URL(`src/${specifier.slice(2)}`, mobile);
		else if (specifier.startsWith(".") && context.parentURL?.startsWith(mobile.href))
			url = new URL(specifier, context.parentURL);
		if (url) {
			if (!existsSync(url)) url = pathToFileURL(`${fileURLToPath(url)}.ts`);
			return { url: url.href, shortCircuit: true };
		}
		return next(specifier, context);
	},
	load(url, context, next) {
		if (url.startsWith("scenario:")) return { format: "module", source: stubs[url.slice(9)], shortCircuit: true };
		if (url.startsWith(mobile.href) && /\.tsx?$/.test(url))
			return { format: "module", source: stripTypeScriptTypes(readFileSync(new URL(url), "utf8")), shortCircuit: true };
		return next(url, context);
	},
});

try {
	const { parseDeepLink } = await import(new URL("src/linking/parse.ts", mobile));
	const parse = (url, current = state.server) => parseDeepLink(url, current);
	const { redirectSystemPath } = await import(new URL("app/+native-intent.tsx", mobile));
	const target = (href, server = "https://rxresu.me") => ({ kind: "target", server, href });
	const mappings = [
		["https://rxresu.me/alex/cv", target("/r/alex/cv")],
		["https://RXRESU.ME:443/alex/cv/?utm_source=mail#top", target("/r/alex/cv")],
		["https://resume.example/alex/cv", target("/r/alex/cv", "https://resume.example"), "https://resume.example"],
		["https://resume.example:8443/alex/cv", target("/r/alex/cv", "https://resume.example:8443"), "https://resume.example:8443"],
		["https://rxresu.me/documents/cv", target("/r/documents/cv")],
		["https://rxresu.me/alex/caf%C3%A9", target("/r/alex/caf%C3%A9")],
		["https://rxresu.me/builder/resume_1", target("/builder/resume_1/write")],
		["https://rxresu.me/builder/resume_1?mode=design&ask=never-send", target("/builder/resume_1/design")],
		["https://rxresu.me/builder/resume_1?mode=unknown", target("/builder/resume_1/write")],
		["https://rxresu.me/builder/resume_1#?mode=design", target("/builder/resume_1/write")],
		["https://rxresu.me/builder/resume_1/page", target("/builder/resume_1/page")],
		["https://rxresu.me/builder/resume_1/check", target("/builder/resume_1/check")],
		["https://rxresu.me/builder/resume_1/share", target("/builder/resume_1/share")],
		["https://rxresu.me/builder/resume_1/history", target("/builder/resume_1/history")],
		["https://rxresu.me/builder/resume_1/assistant?ask=never-send", target("/builder/resume_1/assistant")],
		["https://rxresu.me/builder/resume_1/entry/experience/item-1", target("/builder/resume_1/entry/experience/item-1")],
		["https://rxresu.me/builder/letter/letter-1?mode=design", target("/letter/letter-1/design")],
		["me.rxresu://builder/resume-1", target("/builder/resume-1/write", null)],
		["me.rxresu:///r/alex/cv", target("/r/alex/cv", null)],
		["me.rxresu:/alex/cv", target("/r/alex/cv", null)],
		["/builder/resume-1", target("/builder/resume-1/write", null)],
		["/r/alex/cv", target("/r/alex/cv", null)],
	];
	for (const [url, expected, current] of mappings) assert.deepEqual(parse(url, current), expected, url);
	const hostileHosts = [
		"https://evil.com/alex/cv", "https://rxresu.me.evil.com/alex/cv", "https://rxresu.me%2eevil.com/alex/cv",
		"https://rxresu.me:8443/alex/cv", "https://resume.example:8443/alex/cv",
		"https://resume.example/auth/native-callback?code=fixture&state=fixture",
		"https://rxresu.me.evil.com/auth/native-callback?code=fixture&state=fixture",
	];
	for (const url of hostileHosts) assert.equal(parse(url), null, url);
	assert.equal(parse("https://resume.example/auth/native-callback", "https://resume.example"), null);
	const invalid = [
		"", "not a URL", "//evil.test/alex/cv", "javascript:alert(1)", "https://", "http://rxresu.me/alex/cv",
		"https://rxresu.me@evil.test/alex/cv", "https://user:pass@rxresu.me/alex/cv", "other://builder/resume-1",
		"https://rxresu.me/builder/%2e%2e/alex/cv", "https://rxresu.me/builder/../alex/cv",
		"https://rxresu.me/%2E/cv", "https://rxresu.me/alex/%252e%252e", "https://rxresu.me/alex/%2fprivate",
		"https://rxresu.me/alex/%5cprivate", "https://rxresu.me/alex/%00", "https://rxresu.me/alex/%1f",
		"https://rxresu.me/alex/%7f", "https://rxresu.me/alex/%", "https://rxresu.me/alex/%FF",
		"https://rxresu.me/alex//cv", "https://rxresu.me/alex/cv/extra", "https://rxresu.me/alex/cv\\x",
		"https://rxresu.me/api/rpc", "https://rxresu.me/%61uth/login", "https://rxresu.me/dashboard/resumes",
		"https://rxresu.me/.well-known/assetlinks.json", "https://rxresu.me/templates/sample",
		"https://rxresu.me/builder/resume-1/unknown", "https://rxresu.me/builder/resume-1/entry/section",
		"https://rxresu.me/alex/" + "x".repeat(8192),
	];
	for (const url of invalid) assert.equal(parse(url), null, url);
	for (const path of ["me.rxresu:///", "/"]) {
		assert.deepEqual(parse(path), { kind: "root" });
		assert.equal(redirectSystemPath({ path, initial: true }), "/");
	}
	const callbacks = [
		"https://rxresu.me/auth/native-callback?code=fixture%2Bcode&state=fixture#untouched",
		"me.rxresu:/auth/native-callback?code=fixture&state=fixture",
		"me.rxresu://auth/native-callback?code=fixture&state=fixture",
		"/auth/native-callback?code=fixture&state=fixture",
	];
	for (const path of callbacks) {
		assert.deepEqual(parse(path), { kind: "callback" });
		assert.equal(redirectSystemPath({ path, initial: true }), path);
		assert.equal(redirectSystemPath({ path, initial: false }), path);
	}
	assert.deepEqual(state.events, []);

	const reset = (options = {}) => Object.assign(state, { server: "https://rxresu.me", token: "fixture-token", choices: [], events: [], signIn: null, tokenRead: null }, options);
	// Warm links also await the shared launch restore (single-flight in session.ts, a no-op once launch finished);
	// drop that call so warm assertions keep checking only what the link itself did.
	const open = (path, initial = false) => {
		const result = redirectSystemPath({ path, initial });
		if (initial || typeof result === "string" || result === null) return result;
		return result.then((value) => {
			state.events = state.events.filter(([kind]) => kind !== "restore");
			return value;
		});
	};
	reset();
	assert.equal(await open("https://rxresu.me/alex/cv", true), "/r/alex/cv");
	assert.deepEqual(state.events, [["restore"], ["token"]]);
	reset({ token: null, choices: [true] });
	assert.equal(await open("https://rxresu.me/builder/resume-1"), "/builder/resume-1/write");
	assert.deepEqual(state.events.filter(([kind]) => kind === "signIn"), [["signIn", "https://rxresu.me"]]);
	reset({ server: "https://selfhost.example" });
	assert.equal(await open("me.rxresu:///r/alex/cv"), "/r/alex/cv");
	assert.deepEqual(state.events, [["token"]]);
	reset({ server: "https://selfhost.example", choices: [false] });
	assert.equal(await open("https://rxresu.me/alex/cv"), null);
	assert.equal(state.server, "https://selfhost.example");
	reset({ choices: [false] });
	assert.equal(await open("https://other.example/alex/cv"), null);
	assert.equal(state.server, "https://rxresu.me");
	assert.deepEqual(state.events, [["browser", "https://other.example/alex/cv"]]);
	reset({ server: "https://selfhost.example", choices: [true] });
	assert.equal(await open("https://rxresu.me/alex/cv"), "/r/alex/cv");
	assert.equal(state.server, "https://rxresu.me");
	assert.deepEqual(state.events.at(-1), ["signIn", "https://rxresu.me"]);
	reset({ token: null, choices: [true], signIn: async () => false });
	assert.equal(await open("https://rxresu.me/alex/cv"), null);
	assert.equal(state.token, null);
	let attempts = 0;
	reset({ server: "https://selfhost.example", choices: [true, true], signIn: async () => { if (!attempts++) throw new Error("fixture failure"); return true; } });
	assert.equal(await open("https://rxresu.me/builder/resume-1"), "/builder/resume-1/write");
	assert.equal(attempts, 2);
	reset({ server: "https://selfhost.example", choices: [true, false], signIn: async () => { throw new Error("fixture failure"); } });
	assert.equal(await open("https://rxresu.me/alex/cv"), null);
	assert.equal(state.server, "https://selfhost.example");
	assert.equal(state.token, "fixture-token");
	reset({ choices: [false] });
	assert.equal(await open("https://other.example/alex/cv", true), "/");
	assert.deepEqual(state.events, [["restore"], ["browser", "https://other.example/alex/cv"]]);
	for (const path of [...hostileHosts, ...invalid.filter((url) => url.startsWith("https://"))]) {
		reset();
		assert.equal(await open(path), null);
		assert.deepEqual(state.events, [["browser", path]], "Rejected HTTPS must open browser, never sign in");
	}
	reset({ server: "https://selfhost.example" });
	assert.equal(await open("https://selfhost.example/alex/cv", true), "/r/alex/cv");
	assert.deepEqual(state.events, [["restore"], ["token"]]);
	reset({ tokenRead: async () => { state.server = "https://changed.example"; return "fixture-token"; } });
	assert.equal(await open("https://rxresu.me/builder/resume-1"), null);
	assert.deepEqual(state.events, [["token"], ["browser", "https://rxresu.me/builder/resume-1"]]);
	reset();
	assert.equal(await open("javascript:alert(1)"), null);
	assert.equal(await open("javascript:alert(1)", true), "/");
	assert.deepEqual(state.events, [["restore"]]);

	let finishSignIn;
	let started;
	const signInStarted = new Promise((resolve) => { started = resolve; });
	reset({ token: null, choices: [true], signIn: () => new Promise((resolve) => { finishSignIn = resolve; started(); }) });
	const pending = open("https://rxresu.me/builder/resume-1");
	await signInStarted;
	for (const path of callbacks) assert.equal(open(path), path, "Callback must bypass queued sign-in synchronously");
	const second = open("https://rxresu.me/alex/cv");
	finishSignIn(true);
	assert.equal(await pending, "/builder/resume-1/write");
	assert.equal(await second, "/r/alex/cv");
	assert.equal(state.events.filter(([kind]) => kind === "signIn").length, 1);
	assert.deepEqual(state.choices, []);
	console.log(`PASS: ${mappings.length} mappings, ${invalid.length + hostileHosts.length} hostile/unsupported inputs, ${callbacks.length} callback forms; exact-origin allowlist, browser fallback, cold launch, sign-in, consent, retry, session race and queued callback bypass.`);
} finally {
	hooks.deregister();
	delete globalThis.deepLinkScenario;
}
