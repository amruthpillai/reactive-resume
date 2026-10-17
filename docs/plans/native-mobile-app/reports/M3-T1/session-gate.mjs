// Run: node docs/plans/native-mobile-app/reports/M3-T1/session-gate.mjs
// Exercise shipped SessionGate effects with real React; the native router/session are boundary fixtures.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { Window } from "happy-dom";

const mobile = new URL("../../../../../apps/mobile/", import.meta.url);
const requireMobile = createRequire(new URL("package.json", mobile));
const requireWeb = createRequire(new URL("../../../../../apps/web/package.json", import.meta.url));
const requireServer = createRequire(new URL("../../../../../apps/server/package.json", import.meta.url));
const { transformSync } = createRequire(requireServer.resolve("tsx"))("esbuild");
const React = requireMobile("react");
const { createRoot } = requireWeb("react-dom/client");
const window = new Window();
Object.assign(globalThis, { window, document: window.document, IS_REACT_ACT_ENVIRONMENT: true });
const calls = [];
const listeners = new Set();
let session = { status: "signed-out", server: "https://fixture.invalid" };
let segments = [];
let ready = true;
let chosen = true;
const scopedRouter = { replace: (href) => calls.push(href) };
const modules = {
	react: React,
	"react/jsx-runtime": requireMobile("react/jsx-runtime"),
	"@lingui/react/macro": { useLingui: () => ({ t: (parts, ...values) => String.raw({ raw: parts }, ...values) }) },
	"@tanstack/react-query": { useQueryClient: () => ({ cancelQueries() {}, clear() {} }) },
	"expo-router": {
		// Old root cleanup has unbound the process-global API; the current root queue still works.
		router: { replace: () => { throw new Error("The imperative router is unavailable before the first render has finished."); } },
		useRouter: () => scopedRouter,
		useRootNavigationState: () => ready ? { key: "retained-navigation-state" } : undefined,
		useSegments: () => segments,
	},
	"react-native": { View: "div" },
	"./auth-header": { hostOf: (server) => new URL(server).host },
	"./session": {
		useSession: () => session,
		getSession: () => session,
		hasChosenServer: () => chosen,
		subscribeIdentity: () => () => {},
		subscribeSession: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
	},
	"./use-sign-in": {},
	"@/routes": requireMobile("./src/routes.ts"),
	"@/ui": { showToast() {}, useTheme: () => ({ space: {} }) },
};
const module = { exports: {} };
const source = readFileSync(new URL("src/auth/session-gate.tsx", mobile), "utf8");
runInNewContext(transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
	module, exports: module.exports,
	require: (id) => { assert.ok(id in modules, `Unexpected dependency: ${id}`); return modules[id]; },
});
const { SessionGate } = module.exports;
let root;
const mount = async () => {
	if (root) await React.act(() => root.unmount());
	root = createRoot(document.createElement("div"));
	await React.act(() => root.render(React.createElement(SessionGate)));
};
const render = () => React.act(() => root.render(React.createElement(SessionGate)));

await mount();
assert.deepEqual(calls.splice(0), ["/sign-in"], "recreated signed-out root redirects without global-router crash");
chosen = false;
await mount();
assert.deepEqual(calls.splice(0), ["/sign-in"], "first launch opens sign-in with default server");
// The launch route must agree with SessionGate before any server has been chosen.
const entryModule = { exports: {} };
const entrySource = readFileSync(new URL("app/index.tsx", mobile), "utf8");
runInNewContext(transformSync(entrySource, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
 module: entryModule, exports: entryModule.exports,
 require: (id) => id === "@/auth/session" ? modules["./session"] : id === "expo-router" ? { Redirect: "Redirect" } : modules[id],
});
assert.equal(entryModule.exports.default().props.href, "/sign-in", "fresh launch skips server selection");
ready = false;
await mount();
assert.deepEqual(calls, [], "no redirect before navigation state exists");
ready = true;
await render();
assert.deepEqual(calls.splice(0), ["/sign-in"], "redirect resumes when navigation is ready");
segments = ["(auth)", "server-address"];
await mount();
assert.deepEqual(calls, [], "recreation preserves the active server form");
session = { ...session, status: "signed-in" };
await mount();
assert.deepEqual(calls.splice(0), ["/documents"], "signed-in auth route opens Documents");
segments = ["(auth)", "auth", "native-callback"];
await mount();
assert.deepEqual(calls, [], "callback owns its navigation");
segments = ["(tabs)", "settings"];
await mount();
session = { ...session, status: "signed-out" };
for (const listener of listeners) listener();
scopedRouter.replace("/server");
assert.deepEqual(calls.splice(0), ["/sign-in", "/server"], "synchronous sign-out redirect preserves caller's final destination");
await React.act(() => root.unmount());
assert.equal(listeners.size, 0, "unmounted roots release their session listeners");
await window.happyDOM.close();
console.log("SessionGate lifecycle redirects passed");
