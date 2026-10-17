// Run from repository root: node docs/plans/native-mobile-app/reports/M3-T2/verify.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../../../../../", import.meta.url);
const mobile = createRequire(new URL("apps/mobile/package.json", root));
const server = createRequire(new URL("apps/server/package.json", root));
const { transformSync } = createRequire(server.resolve("tsx"))("esbuild");
const { ORPCError } = mobile("@orpc/client");
const tag = (parts, ...values) => parts.reduce((text, part, index) => text + part + (values[index] ?? ""), "");
let owner, calls = [], toasts = [], fail = null, hold = null, offline = false, pending = false;
let session = { status: "signed-in", server: "https://test.invalid" };
let files = new Map(), documents = [], picker = null, summaryFailure = false, badges = [];
let restReply = () => new Response(JSON.stringify("uploaded-id"));
const date = (day) => new Date(`2026-10-${String(day).padStart(2, "0")}T00:00:00Z`);
const doc = (id, extra = {}) => ({ id, type: "resume", name: id, tags: [], isLocked: false, isPublic: false, slug: id, trashedAt: null, createdAt: date(1), updatedAt: date(2), application: null, ...extra });
const api = (path = []) => new Proxy(() => {}, {
	get: (_, name) => api([...path, name]),
	apply: async (_, __, [input]) => {
		const name = path.join("."); calls.push([name, input]);
		if (hold) await hold;
		if (fail?.(name, input)) throw new ORPCError("BAD_REQUEST");
		if (name === "resume.getById") { if (summaryFailure) throw Error("summary unavailable"); return { data: { sections: {}, customSections: [] } }; }
		if (name.startsWith("ai.")) return { parsed: true };
		if (name.startsWith("coverLetters.")) return { id: "letter-id" };
		return "created-id";
	},
});
const queries = (path = []) => new Proxy(() => {}, {
	get: (_, name) => name === "key" ? () => path : name === "queryOptions" ? (options) => ({ queryKey: path, ...options }) : queries([...path, name]),
});
class NativeFile extends Blob {
	constructor(uri) { super([files.get(uri) ?? "{}"], { type: "application/octet-stream" }); this.uri = uri; }
	async base64() { return Buffer.from(await this.arrayBuffer()).toString("base64"); }
	delete() { calls.push(["cache.delete", this.uri]); }
}
const env = {
	t: tag, ORPCError, File: NativeFile, client: api(), orpc: queries(), session: () => session,
	getNetworkStateAsync: async () => ({ isConnected: !offline, isInternetReachable: !offline }),
	rest: async (path, init) => { calls.push(["rest", path, init]); return restReply(); },
	useState(initial) { const current = owner, index = current.cursor++; if (!(index in current.hooks)) current.hooks[index] = typeof initial === "function" ? initial() : initial; return [current.hooks[index], (value) => { current.hooks[index] = typeof value === "function" ? value(current.hooks[index]) : value; }]; },
	useRef(initial) { return owner.hooks[owner.cursor++] ??= { current: initial }; },
	useEffect(effect) { const index = owner.cursor++; if (!(index in owner.hooks)) { owner.hooks[index] = true; owner.cleanups.push(effect()); } },
	useQuery(options) { return { data: options.queryKey[0] === "documents" ? documents : [], isPending: pending, isSuccess: !pending, isError: false, refetch: async () => {} }; },
	useQueryClient: () => ({ invalidateQueries: async () => {} }),
	showToast: (toast) => toasts.push(toast),
	params: {},
	getDocumentAsync: async () => picker ?? { canceled: true },
	newDocuments: { markNew: (document) => badges.push(document), markOpened: () => {} },
};
globalThis.__m3t2 = env;
const expose = (names) => names.map((name) => `exports.${name}=globalThis.__m3t2.${name};`).join("");
const uiNames = ["Banner", "Button", "Card", "ChipInput", "ListRow", "Screen", "SelectSheet", "Sheet", "Skeleton", "Switch", "Text", "TextField"];
const mocks = {
	react: expose(["useState", "useRef", "useEffect"]),
	"@lingui/core/macro": expose(["t"]),
	"@lingui/react/macro": "exports.useLingui=()=>({t:globalThis.__m3t2.t});",
	"@orpc/client": expose(["ORPCError"]),
	"@tanstack/react-query": expose(["useQuery", "useQueryClient"]),
	"expo-network": expose(["getNetworkStateAsync"]),
	"expo-document-picker": expose(["getDocumentAsync"]),
	"expo-file-system": expose(["File"]),
	"@/api/client": expose(["client", "orpc", "rest"]),
	"@/auth/session": "exports.useSession=globalThis.__m3t2.session;exports.getServer=()=>globalThis.__m3t2.session().server;",
	"@/features/ai/providers": "exports.useHasAIProvider=()=>({hasAIProvider:false,isLoading:false});exports.AIProviderSetupSheet='AIProviderSetupSheet';",
	"@/ui": uiNames.map((name) => `exports.${name}='${name}';`).join("") + expose(["showToast"]) + "exports.useTheme=()=>({space:{s1:4,s2:8,s3:12,s4:16},colors:{accent:'green'}});",
	"react-native": "exports.View='View';exports.ActivityIndicator='ActivityIndicator';",
	"expo-router": "exports.router={replace:(href)=>globalThis.__m3t2.client.navigate(href),back:()=>{}};exports.Stack={Screen:'Stack.Screen'};exports.useLocalSearchParams=()=>globalThis.__m3t2.params;",
};
const feature = fileURLToPath(new URL("apps/mobile/src/features/documents/", root));
const packages = fileURLToPath(new URL("packages/schema/", root));
const isSource = (url) => url?.startsWith("file:") && (fileURLToPath(url).startsWith(feature) || fileURLToPath(url).startsWith(packages));
const hooks = registerHooks({
	resolve(specifier, context, next) {
		if (isSource(context.parentURL)) {
			if (specifier in mocks) return { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}` };
			if (specifier === "./new-documents") return { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent("exports.useNewDocuments={getState:()=>globalThis.__m3t2.newDocuments};")}` };
			if (specifier === "@/routes") return { shortCircuit: true, url: new URL("apps/mobile/src/routes.ts", root).href };
			if (specifier.startsWith(".")) for (const extension of [".ts", ".tsx"]) {
				const url = new URL(specifier + extension, context.parentURL);
				if (existsSync(url)) return { shortCircuit: true, url: url.href };
			}
		}
		return next(specifier, context);
	},
	load(url, context, next) {
		if (url.startsWith("data:text/javascript,")) return { format: "commonjs", source: decodeURIComponent(url.split(",").slice(1).join(",")), shortCircuit: true };
		if (isSource(url) && /\.tsx?$/.test(url)) return { format: "commonjs", source: transformSync(readFileSync(fileURLToPath(url), "utf8"), { loader: url.endsWith(".tsx") ? "tsx" : "ts", format: "cjs", jsx: "automatic" }).code, shortCircuit: true };
		return next(url, context);
	},
});
const { filterDocuments, collectTags, documentKey, changedTags, sharedTags, daysLeftInTrash } = mobile("./src/features/documents/filter.ts");
const { importDocument } = mobile("./src/features/documents/import-file.ts");
const { useDocumentOperations } = mobile("./src/features/documents/queries.ts");
const { NewDocument } = mobile("./src/features/documents/new-document.tsx");
const { DocumentSheets } = mobile("./src/features/documents/document-sheets.tsx");
const { defaultResumeData } = mobile("@reactive-resume/schema/resume/default");
function mount(component) {
	const current = { cursor: 0, hooks: [], cleanups: [] };
	current.render = () => { owner = current; current.cursor = 0; return current.tree = component(); };
	current.render(); return current;
}
const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
const elements = (tree) => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(elements) : [tree, ...elements(tree.props?.children)];
const button = (mounted, label) => { const result = elements(mounted.tree).find((element) => element.type === "Button" && element.props.label === label); assert.ok(result, `Missing button ${label}`); return result.props; };
let passed = 0;
async function check(name, run) { calls = []; toasts = []; fail = null; hold = null; offline = false; summaryFailure = false; await run(); passed++; console.log(`PASS ${name}`); }
const asset = (name, content) => { const uri = `file://cache/${name}`; files.set(uri, content); return { name, uri, size: Buffer.byteLength(content) }; };
const signal = () => new AbortController().signal;

await check("library search, intersection filters, immutable ordering, numeric names and typed selection", () => {
	const list = [doc("Resume 10", { tags: ["tech", "senior"], application: { company: "Northwind", role: "Engineer" } }), doc("Resume 2", { tags: ["tech"], isPublic: true, updatedAt: date(4) }), doc("Resume 10", { type: "letter", tags: ["tech"], createdAt: date(5) })];
	const filters = { type: "all", q: "", tags: [], sort: "name" };
	assert.equal(filterDocuments(list, filters)[0].id, "Resume 2");
	assert.equal(filterDocuments(list, { ...filters, q: " NORTHWIND " }).length, 1);
	assert.equal(filterDocuments(list, { ...filters, q: "engineer", tags: ["tech", "senior"] }).length, 1);
	assert.equal(filterDocuments(list, { ...filters, type: "letter", public: true }).length, 0);
	assert.equal(filterDocuments(list, { ...filters, sort: "edited" })[0].id, "Resume 2");
	assert.equal(filterDocuments(list, { ...filters, sort: "created" })[0].type, "letter");
	assert.equal(list[0].id, "Resume 10"); assert.notEqual(documentKey(list[0]), documentKey(list[2]));
	assert.deepEqual(collectTags(list), ["senior", "tech"]);
});
await check("bulk tag edits retain unique tags, Trash expiry rounds and clamps", () => {
	const list = [doc("a", { tags: ["shared", "only-a"] }), doc("b", { tags: ["shared", "only-b"] })];
	assert.deepEqual(changedTags(list[0], sharedTags(list), ["new"]), ["only-a", "new"]);
	assert.equal(daysLeftInTrash(date(1), date(31).getTime()), 0);
	assert.equal(daysLeftInTrash(date(1), date(30).getTime() + 1), 1);
});
await check("multipart import routes RR, v4, JSON Resume, LinkedIn and PDF without AI", async () => {
	for (const [name, content, format] of [["resume.json", '{"sections":{},"metadata":{"page":{}}}', "REACTIVE_RESUME"], ["v4.json", '{"metadata":{"layout":[]}}', "REACTIVE_RESUME_V4"], ["json.json", '{"basics":{}}', "JSON_RESUME"], ["data.zip", "PK synthetic", "LINKEDIN"], ["resume.pdf", "%PDF synthetic", "PDF"]]) {
		await importDocument(asset(name, content), false, false, signal());
		const request = calls.at(-1); assert.equal(request[0], "rest"); assert.equal(request[1], "/resumes/file-imports"); assert.equal(request[2].body.get("format"), format); assert.equal(request[2].headers, undefined);
	}
	assert.equal(calls.filter(([name]) => name.startsWith("ai.")).length, 0);
});
await check("account JSON unwrap, invalid letter validation, file limits and legacy Word", async () => {
	await importDocument(asset("wrapped.json", '{"data":{"basics":{}}}'), false, false, signal());
	assert.deepEqual(JSON.parse(await calls.at(-1)[2].body.get("file").text()), { basics: {} });
	await assert.rejects(importDocument(asset("letter.json", '{"format":"reactive-resume-cover-letter"}'), false, false, signal()), /cover letter file isn't valid/);
	await assert.rejects(importDocument(asset("old.doc", "old"), false, false, signal()), /save it as .docx/);
	await assert.rejects(importDocument(asset("big.pdf", "x".repeat(10 * 1024 * 1024 + 1)), true, false, signal()), /too large/);
});
await check("AI import requires readiness and imports parsed PDF and DOCX data", async () => {
	await assert.rejects(importDocument(asset("resume.docx", "PK"), false, false, signal()), /tested AI provider/);
	for (const name of ["resume.docx", "resume.pdf"]) await importDocument(asset(name, "synthetic"), true, true, signal());
	assert.deepEqual(calls.filter(([name]) => name.startsWith("ai.")).map(([name]) => name), ["ai.parseDocx", "ai.parsePdf"]);
	assert.equal(calls.filter(([name]) => name === "resume.import").length, 2);
});
await check("valid exported letter reaches coverLetters.import with validated contents", async () => {
	const letter = { format: "reactive-resume-cover-letter", version: 1, name: "Synthetic letter", content: "<p>Synthetic body</p>", recipient: "", style: { basics: defaultResumeData.basics, picture: defaultResumeData.picture, metadata: defaultResumeData.metadata, sectionId: "letter-section", itemId: "letter-item" } };
	const result = await importDocument(asset("letter.json", JSON.stringify(letter)), false, false, signal());
	assert.equal(result.type, "letter"); assert.equal(calls[0][0], "coverLetters.import"); assert.equal(calls[0][1].document.content, "<p>Synthetic body</p>");
});
await check("server switch during AI parsing cannot import content into the next server", async () => {
	let release; hold = new Promise((resolve) => { release = resolve; });
	const reading = importDocument(asset("switch.pdf", "%PDF synthetic"), true, true, signal());
	await flush(); assert.equal(calls[0][0], "ai.parsePdf");
	session = { ...session, server: "https://next.invalid" }; release();
	await assert.rejects(reading, /Server changed/); assert.equal(calls.length, 1);
	session = { ...session, server: "https://test.invalid" };
});
await check("cancelled imports and REST failures never create an extra resume", async () => {
	const controller = new AbortController(); controller.abort();
	await assert.rejects(importDocument(asset("cancel.pdf", "%PDF"), false, false, controller.signal), /cancelled/);
	assert.equal(calls.length, 0);
	restReply = () => new Response("", { status: 401 });
	await assert.rejects(importDocument(asset("auth.pdf", "%PDF"), false, false, signal()), /session expired/);
	restReply = () => new Response(JSON.stringify({ id: "bad-shape" }));
	await assert.rejects(importDocument(asset("result.pdf", "%PDF"), false, false, signal()), /invalid import result/);
	restReply = () => new Response(JSON.stringify("uploaded-id"));
});
await check("partial Trash skips locked and failed documents; Undo restores successful IDs only", async () => {
	const operations = mount(useDocumentOperations);
	fail = (name, input) => name === "documents.trash" && input.id === "failed";
	assert.equal(await operations.tree.trash([doc("ok"), doc("locked", { isLocked: true }), doc("failed")]), false);
	assert.deepEqual(calls.filter(([name]) => name === "documents.trash").map(([, input]) => input.id), ["ok", "failed"]);
	const undo = toasts.find((toast) => toast.action); assert.ok(undo); undo.action.onPress(); await flush();
	assert.deepEqual(calls.filter(([name]) => name === "documents.restore").map(([, input]) => input.id), ["ok"]);
});
await check("offline and duplicate taps cannot dispatch duplicate actions", async () => {
	const operations = mount(useDocumentOperations); offline = true;
	assert.equal(await operations.tree.trash([doc("offline")]), false); assert.equal(calls.length, 0);
	offline = false; let release; hold = new Promise((resolve) => { release = resolve; });
	const first = operations.tree.trash([doc("once")]); await flush();
	assert.equal(await operations.tree.trash([doc("twice")]), false); release(); await first;
	assert.equal(calls.filter(([name]) => name === "documents.trash").length, 1);
});
await check("Undo waits for a running action instead of losing the restore", async () => {
	const operations = mount(useDocumentOperations);
	await operations.tree.trash([doc("undo-me")]);
	const undo = toasts.find((toast) => toast.action);
	let release; hold = new Promise((resolve) => { release = resolve; });
	const next = operations.tree.trash([doc("other")]); await flush();
	undo.action.onPress(); await flush();
	assert.equal(calls.filter(([name]) => name === "documents.restore").length, 0);
	release(); hold = null; await next; await flush();
	assert.deepEqual(calls.filter(([name]) => name === "documents.restore").map(([, input]) => input.id), ["undo-me"]);
});
await check("actual bulk visibility handler skips letters and locked resumes", async () => {
	let closed = false;
	const screen = mount(() => DocumentSheets({ value: { kind: "sharing", documents: [doc("public"), doc("locked", { isLocked: true }), doc("letter", { type: "letter" })] }, onClose: () => { closed = true; }, onChange: () => {}, onSelect: () => {} }));
	button(screen, "Public link on").onPress(); await flush();
	assert.deepEqual(calls.filter(([name]) => name === "resume.update").map(([, input]) => input), [{ id: "public", isPublic: true }]);
	assert.equal(closed, false, "Partial success remains reviewable");
});
await check("New blank handler blocks rapid double tap", async () => {
	const screen = mount(NewDocument); let release; hold = new Promise((resolve) => { release = resolve; });
	const start = elements(screen.tree).find((element) => element.type === "ListRow" && element.props.title === "Start blank");
	start.props.onPress(); start.props.onPress(); await flush();
	assert.equal(calls.filter(([name]) => name === "resume.create").length, 1);
	release(); hold = null; await flush();
	assert.equal(calls.filter(([name]) => name === "navigate").length, 1);
});
await check("successful import with failed summary stays ready, never offers duplicate import", async () => {
	const screen = mount(NewDocument);
	elements(screen.tree).find((element) => element.type === "ListRow" && element.props.title === "Import a resume").props.onPress(); screen.render();
	const picked = asset("summary.pdf", "%PDF synthetic"); picker = { canceled: false, assets: [picked] };
	button(screen, "Choose a file").onPress(); await flush(); screen.render();
	summaryFailure = true; button(screen, "Import file").onPress(); await flush(); screen.render();
	assert.ok(button(screen, "Open in editor"));
	assert.equal(elements(screen.tree).some((element) => element.props?.label === "Import file"), false);
	assert.equal(calls.filter(([name]) => name === "rest").length, 1); assert.equal(badges.at(-1).id, "uploaded-id");
	for (const cleanup of screen.cleanups) cleanup?.();
});
hooks.deregister(); delete globalThis.__m3t2;
console.log(`${passed} scenarios passed`);
