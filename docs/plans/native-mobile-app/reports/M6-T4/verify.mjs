// Run from repository root: node docs/plans/native-mobile-app/reports/M6-T4/verify.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

// Exercise shipped UI handlers without loading React Native or starting Metro/native builds.
const mobile = new URL("../../../../../apps/mobile/", import.meta.url);
const requireMobile = createRequire(new URL("package.json", mobile));
const requireServer = createRequire(new URL("../../../../../apps/server/package.json", import.meta.url));
const requireTsx = createRequire(requireServer.resolve("tsx"));
const { transformSync } = requireTsx("esbuild");
const tag = (parts, ...values) => parts.reduce((text, part, index) => text + part + (values[index] ?? ""), "");
const key = (name) => [name];
const queryOptions = (name) => ({ queryKey: key(name) });
let session = { status: "signed-in", server: "https://test.invalid" };
let providers = [];
let queryError = null;
let queryPending = false;
let status = { builtInReader: true, configured: false, provider: null, managed: false, canSave: true };
let catalog = {};
let fetchResponse = null;
let active;
let calls = [];
let tested = { testStatus: "failure", testError: "Synthetic provider rejection", enabled: false };
let createHold = null;
let invalidations = 0;
const saved = (patch = {}) => ({
	id: "connection-1", provider: "openai", label: "OpenAI", model: "gpt-4.1",
	baseURL: null, enabled: true, isDefault: true, testStatus: "success", testError: null,
	managed: false, apiKeyPreview: "sk-a...1234", ...patch,
});

const env = {
	t: tag,
	getSession: () => session,
	useState(initial) {
		const owner = active, index = owner.cursor++;
		if (!(index in owner.hooks)) owner.hooks[index] = typeof initial === "function" ? initial() : initial;
		return [owner.hooks[index], (value) => { owner.hooks[index] = typeof value === "function" ? value(owner.hooks[index]) : value; }];
	},
	useRef(initial) {
		const owner = active, index = owner.cursor++;
		return owner.hooks[index] ??= { current: initial };
	},
	useEffect(effect) {
		const owner = active, index = owner.cursor++;
		if (!(index in owner.hooks)) { owner.hooks[index] = true; owner.cleanups.push(effect()); }
	},
	useQuery(options) {
		if (options.queryKey[0] === "models.dev") return { data: catalog, isPending: false, isError: false };
		return {
			data: options.queryKey[0] === "providers" ? providers : status,
			isSuccess: !queryError && !queryPending, isPending: queryPending,
			isError: !!queryError, error: queryError, refetch: async () => {},
		};
	},
	queryClient: { invalidateQueries: async () => { invalidations++; } },
	orpc: {
		aiProviders: { list: { key: () => key("providers"), queryOptions: () => queryOptions("providers") } },
		webAccess: { status: { key: () => key("web"), queryOptions: () => queryOptions("web") } },
	},
	client: {
		aiProviders: {
			create: async (input) => { calls.push(["create", input]); if (createHold) await createHold; return saved({ enabled: false, testStatus: "untested" }); },
			update: async (input) => { calls.push(["update", input]); return saved(input); },
			test: async (input) => { calls.push(["test", input]); return saved(tested); },
			delete: async (input) => { calls.push(["delete", input]); },
			setDefault: async (input) => { calls.push(["default", input]); return saved(); },
		},
		webAccess: {
			save: async (input) => { calls.push(["web-save", input]); },
			delete: async () => { calls.push(["web-delete"]); },
			test: async () => { calls.push(["web-test"]); return { search: { success: true }, read: { success: false, error: "quota" } }; },
		},
	},
	fetch: async () => ({ ok: true, json: async () => fetchResponse }),
};
globalThis.__m6t4 = env;
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const mockSources = {
	react: "exports.useState=globalThis.__m6t4.useState;exports.useRef=globalThis.__m6t4.useRef;exports.useEffect=globalThis.__m6t4.useEffect;",
	"@lingui/react/macro": "exports.useLingui=()=>({t:globalThis.__m6t4.t});",
	"@lingui/core/macro": "exports.t=globalThis.__m6t4.t;",
	"react-native": 'exports.View="View";',
	"expo/fetch": "exports.fetch=globalThis.__m6t4.fetch;",
	"@tanstack/react-query": "exports.useQuery=globalThis.__m6t4.useQuery;exports.useQueryClient=()=>globalThis.__m6t4.queryClient;",
	"@/api/client": "exports.client=globalThis.__m6t4.client;exports.orpc=globalThis.__m6t4.orpc;",
	"@/auth/session": "exports.useSession=globalThis.__m6t4.getSession;exports.getServer=()=>globalThis.__m6t4.getSession().server;",
	"@/ui": ["Button", "IconButton", "ConfirmDialog", "Text", "TextField", "View", "Sheet", "Switch", "SelectSheet", "ListRow", "Card", "Banner", "EmptyState", "Skeleton"].map((name) => `exports.${name}="${name}";`).join("") + 'exports.useTheme=()=>({space:{s1:4,s2:8,s3:12,s4:16,s12:48}});',
};
const featurePath = fileURLToPath(new URL("src/features/ai/", mobile));
const hooks = registerHooks({
	resolve(specifier, context, next) {
		if (specifier.startsWith("./") && context.parentURL?.includes("/src/features/ai/")) {
			for (const extension of [".ts", ".tsx"]) {
				const url = new URL(specifier + extension, context.parentURL);
				if (existsSync(url)) return { shortCircuit: true, url: url.href };
			}
		}
		if (specifier in mockSources && (context.parentURL?.includes("/src/features/ai/") || context.parentURL?.startsWith("data:")))
			return { shortCircuit: true, url: moduleUrl(mockSources[specifier]) };
		return next(specifier, context);
	},
	load(url, context, next) {
		if (url.startsWith("data:text/javascript,")) return { format: "commonjs", source: decodeURIComponent(url.split(",").slice(1).join(",")), shortCircuit: true };
		if (url.startsWith("file:") && fileURLToPath(url).startsWith(featurePath))
			return { format: "commonjs", source: transformSync(readFileSync(fileURLToPath(url), "utf8"), { loader: url.endsWith(".tsx") ? "tsx" : "ts", format: "cjs", jsx: "automatic" }).code, shortCircuit: true };
		return next(url, context);
	},
});
const { AIProviderSetupSheet, useHasAIProvider } = requireMobile("./src/features/ai/providers.ts");
const { ProviderEditorSheet } = requireMobile("./src/features/ai/provider-editor.tsx");
const { ProviderList } = requireMobile("./src/features/ai/provider-list.tsx");
const { WebAccessSettings } = requireMobile("./src/features/ai/web-access.tsx");
const { loadModelSuggestions } = requireMobile("./src/features/ai/catalog.ts");

function mount(component, props = {}) {
	const owner = { hooks: [], cleanups: [], cursor: 0, tree: null };
	owner.render = () => { active = owner; owner.cursor = 0; owner.tree = component(props); return owner.tree; };
	owner.unmount = () => { for (const cleanup of owner.cleanups) cleanup?.(); };
	owner.render();
	return owner;
}
function elements(tree) {
	if (!tree || typeof tree !== "object") return [];
	if (Array.isArray(tree)) return tree.flatMap(elements);
	return [tree, ...elements(tree.props?.children)];
}
const control = (owner, type, label) => {
	const result = elements(owner.tree).find((element) => element.type === type && (!label || element.props.label === label));
	assert.ok(result, `Missing ${type} ${label ?? ""}`);
	return result.props;
};
function formFrom(sheet) {
	const form = elements(sheet.tree).find((element) => typeof element.type === "function");
	assert.ok(form, "Setup exposes editable form");
	return mount(form.type, form.props);
}
const drain = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
let passed = 0;
async function check(name, run) {
	calls = []; invalidations = 0;
	await run();
	console.log(`PASS ${name}`); passed++;
}

await check("readiness distinguishes enabled/tested, stale errors, pending and signed-out", () => {
	providers = [saved({ enabled: false }), saved({ id: "untested", testStatus: "untested" })];
	assert.equal(useHasAIProvider().hasAIProvider, false);
	providers.push(saved({ id: "ready" }));
	assert.equal(useHasAIProvider().defaultProvider.id, "ready");
	queryError = new Error("offline");
	assert.equal(useHasAIProvider().hasAIProvider, false);
	assert.equal(useHasAIProvider().isUnavailable, true);
	queryError = null; queryPending = true;
	assert.equal(useHasAIProvider().hasAIProvider, false);
	queryPending = false; session = { ...session, status: "signed-out" };
	assert.equal(useHasAIProvider().hasAIProvider, false);
	session = { ...session, status: "signed-in" }; providers = [];
});
await check("failed create/test retains fields and retries same saved ID; callback waits for success", async () => {
	let closed = 0, ready = 0;
	const sheet = mount(AIProviderSetupSheet, { open: true, onClose: () => closed++, onReady: () => ready++ });
	const form = formFrom(sheet);
	control(form, "TextField", "API key").onChangeText("synthetic-key"); form.render();
	control(form, "Button", "Save and test").onPress();
	control(form, "Button", "Save and test").onPress(); // duplicate tap before render
	await drain(); form.render();
	assert.deepEqual(calls.map(([name]) => name), ["create", "test"]);
	assert.equal(closed, 0); assert.equal(ready, 0);
	assert.equal(control(form, "TextField", "API key").value, "synthetic-key");
	tested = { testStatus: "success", enabled: true, testError: null };
	control(form, "Button", "Save and test").onPress(); await drain(); form.render();
	assert.deepEqual(calls.map(([name]) => name), ["create", "test", "update", "test"]);
	assert.equal(calls[2][1].id, "connection-1");
	assert.equal(ready, 1); assert.equal(closed, 1);
	assert.equal(control(form, "TextField", "API key").value, "");
	assert.ok(invalidations);
});
await check("edit leaves stored key untouched; disabling and deleting require explicit actions", async () => {
	const sheet = mount(ProviderEditorSheet, { open: true, provider: saved(), onClose() {} });
	const form = formFrom(sheet);
	control(form, "TextField", "Model").onChangeText("different-model"); form.render();
	control(form, "Button", "Save and test").onPress(); await drain(); form.render();
	assert.equal(calls[0][0], "update"); assert.equal(calls[0][1].model, "different-model");
	assert.equal("apiKey" in calls[0][1], false);
	control(form, "Switch", "Use this provider").onValueChange(false); await drain(); form.render();
	assert.deepEqual(calls.at(-1), ["update", { id: "connection-1", enabled: false }]);
	control(form, "Button", "Delete provider").onPress(); form.render();
	assert.equal(calls.some(([name]) => name === "delete"), false);
	control(form, "ConfirmDialog").onConfirm(); await drain();
	assert.deepEqual(calls.at(-1), ["delete", { id: "connection-1" }]);
});
await check("dismissing setup during create prevents late tests/callbacks", async () => {
	let release, closed = false;
	createHold = new Promise((resolve) => { release = resolve; });
	const form = formFrom(mount(AIProviderSetupSheet, { open: true, onClose() { closed = true; } }));
	control(form, "TextField", "API key").onChangeText("synthetic-key"); form.render();
	control(form, "Button", "Save and test").onPress(); await drain(); form.unmount();
	release(); await drain(); createHold = null;
	assert.deepEqual(calls.map(([name]) => name), ["create"]); assert.equal(closed, false);
});
await check("managed provider exposes no edits/tests/default mutations", () => {
	providers = [saved({ managed: true })];
	const list = mount(ProviderList);
	assert.equal(elements(list.tree).some((element) => element.type === "Button" && element.props.label === "Add AI provider"), false);
	const row = elements(list.tree).find((element) => typeof element.type === "function" && element.props.provider);
	const rendered = mount(row.type, row.props);
	assert.equal(elements(rendered.tree).some((element) => element.type === "Button"), false);
	providers = [];
});
await check("only runnable non-default row offers Make default and calls explicit default endpoint", async () => {
	providers = [saved(), saved({ id: "connection-2", isDefault: false })];
	const list = mount(ProviderList);
	const rows = elements(list.tree).filter((element) => typeof element.type === "function" && element.props.provider);
	const first = mount(rows[0].type, rows[0].props);
	assert.equal(elements(first.tree).some((element) => element.type === "Button" && element.props.label === "Make default"), false);
	const second = mount(rows[1].type, rows[1].props);
	control(second, "Button", "Make default").onPress(); await drain();
	assert.deepEqual(calls, [["default", { id: "connection-2" }]]);
	assert.ok(invalidations);
	providers = [];
});
await check("web saving sends selected key but never auto-tests; test reports independent capabilities", async () => {
	const web = mount(WebAccessSettings);
	control(web, "Button", "Connect a service").onPress(); web.render();
	control(web, "SelectSheet", "Provider").onChange("exa"); web.render();
	control(web, "TextField", "API key").onChangeText("synthetic-web-key"); web.render();
	control(web, "Button", "Save connection").onPress(); await drain(); web.render();
	assert.deepEqual(calls, [["web-save", { provider: "exa", apiKey: "synthetic-web-key" }]]);
	assert.equal(control(web, "Sheet").open, false);
	status = { ...status, provider: "exa", configured: true }; web.render();
	control(web, "Button", "Test connection").onPress(); await drain(); web.render();
	assert.equal(calls.at(-1)[0], "web-test");
	const capabilities = elements(web.tree).filter((element) => typeof element.type === "function" && element.props.result);
	assert.equal(capabilities.length, 2);
	assert.equal(capabilities[0].props.result.success, true); assert.equal(capabilities[1].props.result.success, false);
	control(web, "Button", "Remove connection").onPress(); web.render();
	control(web, "ConfirmDialog").onConfirm(); await drain();
	assert.equal(calls.at(-1)[0], "web-delete");
});
await check("managed web connection permits test but no save/delete", () => {
	status = { ...status, managed: true, canSave: false };
	const web = mount(WebAccessSettings);
	control(web, "Button", "Test connection");
	assert.equal(elements(web.tree).some((element) => element.type === "Button" && ["Change connection", "Remove connection", "Connect a service"].includes(element.props.label)), false);
});
await check("public suggestions reject malformed/deprecated/non-text rows and preserve gateway model IDs", async () => {
	const model = { id: "vendor/model", name: "Model", modalities: { input: ["text"], output: ["text"] } };
	fetchResponse = { vercel: { models: { good: model, invalid: null, old: { ...model, id: "old", status: "deprecated" }, image: { ...model, id: "image", modalities: { input: ["image"], output: ["image"] } } } } };
	const catalog = await loadModelSuggestions(new AbortController().signal);
	assert.deepEqual(catalog.vercel.map((item) => item.id), ["vendor/model"]);
	fetchResponse = [];
	await assert.rejects(loadModelSuggestions(new AbortController().signal), /Invalid model catalog/);
});
hooks.deregister();
delete globalThis.__m6t4;
console.log(`${passed} scenarios passed; native presentation and network transports simulated.`);
