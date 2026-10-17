// Run from repository root: node docs/plans/native-mobile-app/reports/M4-T2/verify.mjs
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../../../../", import.meta.url));
const requireServer = createRequire(join(root, "apps/server/package.json"));
const { build } = createRequire(requireServer.resolve("tsx"))("esbuild");
const temporary = await mkdtemp(join(tmpdir(), "m4-t2-"));
const calls = [], toasts = [], files = new Map();
const tag = (parts, ...values) => parts.reduce((text, part, index) => text + part + (values[index] ?? ""), "");
let active;
const env = {
 tag, store: null,
 providers: { hasAIProvider: true, isLoading: false, error: null, usableProviders: [{id: "provider", label: "Fixture", model: "fixture"}], defaultProvider: {id: "provider", label: "Fixture", model: "fixture"} },
 useState(initial) { const owner = active, index = owner.cursor++; if (!(index in owner.state)) owner.state[index] = typeof initial === "function" ? initial() : initial; return [owner.state[index], (value) => { owner.state[index] = typeof value === "function" ? value(owner.state[index]) : value; }]; },
 useRef(initial) { const owner = active, index = owner.cursor++; return owner.state[index] ??= { current: initial }; },
 useEffect(effect, deps) { const owner = active, index = owner.cursor++; const old = owner.state[index]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) owner.effects.push(() => { old?.cleanup?.(); owner.state[index] = {deps, cleanup: effect()}; }); },
 network: { isConnected: true, isInternetReachable: true }, status: 200,
 response: { score: 90, document: { pageCount: 1, truncated: false }, checks: [], findings: [], fullText: "David Kowalski\nExperience" },
 router: { push: (value) => calls.push(["route", value]) },
 rest: async (path, init) => { calls.push(["rest", path, init]); if (env.pdfHolding) await env.pdfHolding; return { ok: env.status === 200, status: env.status, json: async () => env.response }; },
 File: class {
  constructor(...parts) { this.uri = parts.join("/"); }
  async write(bytes) { files.set(this.uri, {bytes}); }
  get exists() { return files.has(this.uri); }
  delete() { files.delete(this.uri); }
  get size() { return files.get(this.uri).bytes.length; }
  open() { const bytes = files.get(this.uri).bytes; let offset = 0; return { get size() { return bytes.length; }, set offset(value) { offset = value; }, readBytesSync(length) { const result = bytes.slice(offset, offset + length); offset += result.length; return result; }, close() {} }; }
 },
 FormData: class { entries = []; append(...values) { this.entries.push(values); } },
};
globalThis.__check = env;
globalThis.FormData = env.FormData;
env.client = { ai: { atsReview: async (input, options) => { calls.push(["review", input, options]); if (env.reviewHolding) await env.reviewHolding; return {summary: "Fixture review", strengths: [], suggestions: []}; } } };
const mocks = {
 "@lingui/core/macro": "export const t = globalThis.__check.tag;",
 "@/draft": "export const useResumeStore = {getState:()=>globalThis.__check.store.getState(),subscribe:(fn)=>globalThis.__check.store.subscribe(fn)};",
 "@/ui": "export const showToast=(value)=>{globalThis.__check.toasts.push(value);return globalThis.__check.toasts.length;};export const dismissToast=(id)=>globalThis.__check.calls.push(['dismiss',id]);",
 "expo-router": "export const router=globalThis.__check.router;",
 "react-native": "export const Platform={OS:'ios'};export const View='View';",
 "react": "export const useState=globalThis.__check.useState;export const useRef=globalThis.__check.useRef;export const useEffect=globalThis.__check.useEffect;export const useCallback=(fn)=>fn;export const useDebugValue=()=>{};export const useSyncExternalStore=()=>{};export default {useCallback,useDebugValue,useSyncExternalStore};",
 "react/jsx-runtime": "export const Fragment='Fragment';export const jsx=(type,props)=>({type,props});export const jsxs=jsx;",
 "@lingui/react/macro": "export const useLingui=()=>({t:globalThis.__check.tag});",
 "@/features/ai/providers": "export const useHasAIProvider=()=>globalThis.__check.providers;export const AIProviderSetupSheet='AIProviderSetupSheet';",
 "expo-haptics": "export const NotificationFeedbackType={Success:'success'};export const notificationAsync=async()=>{};",
 "expo-file-system": "export const File=globalThis.__check.File;export const Paths={cache:'cache'};",
 "expo-network": "export const getNetworkStateAsync=async()=>globalThis.__check.network;",
 "@/api/client": "export const rest=(...args)=>globalThis.__check.rest(...args);export const client=globalThis.__check.client;",
};
mocks["@/ui"] += ["Banner", "Button", "Card", "SelectSheet", "Skeleton", "Text"].map((name) => `export const ${name}='${name}';`).join("") + "export const useTheme=()=>({space:{s1:4,s2:8,s3:12,s12:48}});";
env.calls = calls; env.toasts = toasts;
const path = (relative) => JSON.stringify(join(root, relative));
let checks = 0;
try {
 const bundle = await build({
  stdin: { contents: `
   export * from ${path("apps/mobile/src/features/check/model.ts")};
   export * from ${path("apps/mobile/src/features/check/review.ts")};
   export * from ${path("apps/mobile/src/features/check/actions.ts")};
   export * from ${path("apps/mobile/src/features/check/pdf-check.ts")};
   export { Writing } from ${path("apps/mobile/src/features/check/writing.tsx")};
   export { Parser } from ${path("apps/mobile/src/features/check/parser.tsx")};
   export { buildIssues as webIssues } from ${path("apps/web/src/features/resume/editor/check/issues.ts")};
   export { sampleResumeData } from ${path("packages/schema/src/resume/sample.ts")};
   export { templateSchema } from ${path("packages/schema/src/templates.ts")};
   export { lintResumeForAts } from ${path("packages/resume/src/ats/index.ts")};
   export { createDraftStore } from ${path("apps/mobile/src/draft/store.ts")};
   export { collectPassages, applyProposal, canApply, getProposalState } from ${path("packages/resume/src/proposals.ts")};
  `, resolveDir: root, loader: "ts" },
  bundle: true, jsx: "automatic", platform: "node", format: "esm", write: false, logLevel: "silent",
  banner: { js: `import {createRequire as __makeRequire} from 'node:module'; const require=__makeRequire(${path("apps/mobile/package.json")});` },
  plugins: [{ name: "native-transports", setup(build) {
   build.onResolve({ filter: /.*/ }, ({ path: name }) => {
    if (name in mocks) return { path: name, namespace: "mock" };
    if (name === "@/routes") return { path: join(root, "apps/mobile/src/routes.ts") };
    if (name === "@/libs/resume/section") return { path: join(root, "apps/web/src/libs/resume/section.tsx") };
   });
   build.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({ contents: mocks[path], loader: "js" }));
  } }],
 });
 const modulePath = join(temporary, "check.mjs");
 await writeFile(modulePath, bundle.outputFiles[0].text);
 const code = await import(pathToFileURL(modulePath));
 const sample = () => structuredClone(code.sampleResumeData);
 const scenario = async (name, work) => { await work(); checks++; process.stdout.write(`PASS ${name}\n`); };
 await scenario("sample × 17 templates: web report, order, targets and fixes", () => {
  for (const template of code.templateSchema.options) {
   const data = sample(); data.metadata.template = template;
   const actual = code.computeCheck(data), expected = code.lintResumeForAts(data);
   assert.deepEqual(actual.report, expected);
   const web = code.webIssues(expected, data);
   assert.deepEqual(actual.issues.map((entry) => [entry.key, entry.number, entry.category, entry.target, entry.fix.kind]), web.map((entry) => [entry.key, entry.number, entry.category, entry.target, entry.fix.kind]));
   for (let index = 0; index < actual.issues.length; index++) {
    if (actual.issues[index].fix.kind !== "apply") continue;
    const mobileFixed = structuredClone(data), webFixed = structuredClone(data);
    actual.issues[index].fix.apply(mobileFixed); web[index].fix.apply(webFixed);
    assert.deepEqual(mobileFixed, webFixed);
   }
  }
 });
 await scenario("missing contact values and locale-dependent heading denominator", () => {
  const data = sample(); data.basics.name = ""; data.basics.email = "";
  const report = code.computeCheck(data).report;
  assert(report.findings.some((entry) => entry.code === "MISSING_NAME" && entry.severity === "error"));
  assert(report.findings.some((entry) => entry.code === "MISSING_EMAIL" && entry.pointer === "/basics/email"));
  assert.equal(report.totalRules, 22);
  data.metadata.page.locale = "ar-SA";
  assert.equal(code.computeCheck(data).report.totalRules, 21);
 });
 await scenario("one-tap fixes remove their finding without erasing unrelated text", () => {
  const data = sample(); data.basics.website.url = "example.test"; data.metadata.typography.body.fontSize = 6;
  const issues = code.computeCheck(data).issues;
  for (const key of ["MALFORMED_URL", "PICTURE_PRESENT", "SMALL_BODY_FONT"]) {
   const issue = issues.find((entry) => entry.finding.code === key); assert(issue); assert.equal(issue.fix.kind, "apply"); issue.fix.apply(data);
   assert(!code.computeCheck(data).report.findings.some((entry) => entry.key === issue.key));
  }
  assert.equal(data.basics.website.url, "https://example.test"); assert.equal(data.basics.name, "David Kowalski");
 });
 await scenario("ignored keys survive entry reordering; restore recovers score and findings", () => {
  const data = sample(); const entry = data.sections.experience.items[0]; entry.period = "";
  const issue = code.computeCheck(data).issues.find((entry) => entry.finding.code === "EMPTY_PERIOD"); assert(issue);
  code.checkStateOf(data).ignored.push(issue.key);
  const ignored = code.computeCheck(data).report; assert(ignored.ignored.some((entry) => entry.key === issue.key));
  data.sections.experience.items.reverse(); assert(!code.computeCheck(data).report.findings.some((entry) => entry.key === issue.key));
  data.metadata.check.ignored = []; assert(code.computeCheck(data).report.findings.some((entry) => entry.key === issue.key));
 });
 await scenario("date, sidebar, heading and custom-section cases match web", () => {
  for (const period of ["", "???", "2030 - 2020", "2999 - Present"]) {
   const data = sample(); data.sections.experience.items[0].period = period; data.sections.experience.columns = 2; data.sections.experience.title = "My Awesome Journey";
   data.metadata.layout.pages[0].main = data.metadata.layout.pages[0].main.filter((id) => id !== "experience"); data.metadata.layout.pages[0].sidebar.push("experience");
   const actual = code.computeCheck(data), expected = code.lintResumeForAts(data); assert.deepEqual(actual.report, expected);
   assert(actual.report.findings.some((entry) => entry.code === "MULTI_COLUMN_PROSE_SECTION"));
   assert(actual.report.findings.some((entry) => entry.code === "PROSE_SECTION_IN_SIDEBAR"));
  }
 });
 await scenario("page pins use entry ids and physical page; unprinted entries have no false pin", () => {
  const data = sample(); data.basics.email = ""; data.sections.experience.items[0].period = "";
  const issues = code.computeCheck(data).issues;
  const itemId = data.sections.experience.items[0].id;
  const map = { pages: [{ width: 600, height: 800 }, { width: 600, height: 800 }], nodes: [{ kind: "header", key: "header", page: 0, x: 20, y: 10, width: 500, height: 50 }, { kind: "item", sectionId: "experience", itemId, key: "entry", page: 1, x: 20, y: 130, width: 500, height: 70 }] };
  const pins = code.issuePins(issues, map);
  assert.equal(pins.find((entry) => entry.issue.finding.code === "EMPTY_PERIOD").page, 1);
  assert.equal(pins.find((entry) => entry.issue.finding.code === "MISSING_EMAIL").y, 10);
  assert(!code.issuePins(issues, { ...map, nodes: [] }).some((entry) => entry.issue.target));
 });
 await scenario("job match finds aliases, respects hidden terms, and adds only chosen skill", () => {
  const data = sample(); const posting = "We need Unity, TypeScript, Figma and C# experience.";
  const result = code.matchPosting(data, posting); assert(result.found.some((entry) => entry.term === "unity"));
  const missing = result.missing.find((entry) => entry.label.toLowerCase() === "figma"); assert(missing);
  code.checkStateOf(data).hiddenTerms.push(missing.term); assert.equal(code.matchPosting(data, posting).total, result.total - 1);
  code.addSkill(data, "Figma"); assert.equal(data.sections.skills.items.at(-1).name, "Figma");
  assert(code.termTargets(data, "figma").some((entry) => entry.kind === "item" && entry.sectionId === "skills"));
 });
 await scenario("writing maps only supplied passages; unknown rewrites stay advice", () => {
  const data = sample(); const passages = code.collectPassages(data, { summary: "Summary", sectionTitle: (id) => id, entryTitle: () => "entry", bullet: (n) => `bullet ${n}`, paragraph: (n) => `paragraph ${n}` });
  const passage = passages[0]; assert(passage);
  const review = code.mapWritingReview([{ section: null, passageId: passage.id, issue: "Be specific", rewrite: "Built a $& safe <pipeline>.", impact: "high" }, { section: "Skills", passageId: "invented", issue: "Advice", rewrite: "Unsupplied passage", impact: "low" }], passages);
  assert.equal(review.proposals.length, 1); assert.equal(review.notes.length, 1);
  const proposal = review.proposals[0]; assert(proposal.after.includes("&lt;pipeline&gt;"));
  const before = structuredClone(data); assert(code.applyProposal(data, proposal));
  assert.equal(code.getProposalState(data, { ...proposal, status: "accepted" }), "accepted");
  assert.equal(code.getProposalState(before, { ...proposal, status: "accepted" }), "pending");
  assert.equal(code.canApply(data, proposal), false); assert.equal(code.applyProposal(data, proposal), false);
 });
 const storage = new Map();
 const original = { id: "resume", isLocked: false, version: 1, data: sample() };
 const draft = code.createDraftStore({ kind: "resume", delay: 500, read: async () => structuredClone(original), data: (value) => value.data, withData: (document, data) => ({ ...document, data }), merge: (_saved, _submitted, current) => current, matches: (a, b) => JSON.stringify(a) === JSON.stringify(b), version: (value) => value.version, parse: (value) => value, save: async (value) => value, copy: async () => {}, isConflict: () => false }, { storage: { getItemSync: (key) => storage.get(key) ?? null, setItemSync: (key, value) => storage.set(key, value), removeItemSync: (key) => storage.delete(key), getAllKeysSync: () => [...storage.keys()] }, scope: async () => "fixture", online: () => false, focused: () => false });
 env.store = draft.store;
 await draft.store.getState().open("resume");
 await scenario("actual draft action: one fix one undo; stale toast cannot undo later edit", () => {
  const before = draft.store.getState().data;
  const issue = code.computeCheck(before).issues.find((entry) => entry.finding.code === "PICTURE_PRESENT"); assert(issue);
  code.fixIssue("resume", issue); assert.equal(draft.store.getState().data.picture.hidden, true);
  toasts.at(-1).action.onPress(); assert.deepEqual(draft.store.getState().data, before);
  code.fixIssue("resume", issue);
  const staleToast = toasts.at(-1); draft.store.getState().update((data) => { data.basics.name = "Later edit"; }, { newStep: true });
  staleToast.action.onPress(); assert.equal(draft.store.getState().data.basics.name, "Later edit");
 });
 await scenario("locked/mismatched documents reject mutations; reordered pointer fixes correct entry", () => {
  const before = draft.store.getState().data;
  assert.equal(code.editWithUndo("other", (data) => { data.basics.name = "Wrong"; }, "wrong"), false); assert.equal(draft.store.getState().data, before);
  draft.store.setState({ locked: true }); assert.equal(code.editWithUndo("resume", (data) => { data.basics.name = "Wrong"; }, "wrong"), false); draft.store.setState({ locked: false });
  draft.store.getState().update((data) => { data.sections.experience.items[0].website.url = "entry.test"; }, { newStep: true });
  const issue = code.computeCheck(draft.store.getState().data).issues.find((entry) => entry.finding.code === "MALFORMED_URL" && entry.target?.kind === "item"); assert(issue);
  const itemId = issue.target.itemId;
  draft.store.getState().update((data) => { data.sections.experience.items.reverse(); }, { newStep: true });
  code.fixIssue("resume", issue); assert.equal(draft.store.getState().data.sections.experience.items.find((entry) => entry.id === itemId).website.url, "https://entry.test");
 });
 await draft.store.getState().close(); draft.suspend();
 await scenario("PDF adapter: flat report response, multipart, offline/error/size/password guards", async () => {
  const signal = new AbortController().signal;
  files.set("pdf", { bytes: new TextEncoder().encode("%PDF-1.7\nfixture") });
  const result = await code.runAtsCheck("pdf", "resume.pdf", "Unity", signal);
  assert.equal(result.report.score, 90); assert.equal(result.fullText, "David Kowalski\nExperience"); assert(!("fullText" in result.report));
  const request = calls.at(-1); assert.equal(request[1], "/pdf-checks"); assert.equal(request[2].method, "POST"); assert.equal(request[2].signal, signal);
  assert.equal(request[2].body.entries[1][1], "Unity");
  for (const status of [400, 413, 429, 500]) { env.status = status; await assert.rejects(code.runAtsCheck("pdf", "resume.pdf", "", signal), code.AtsCheckError); }
  env.status = 200; env.network.isConnected = false; await assert.rejects(code.runAtsCheck("pdf", "resume.pdf", "", signal), /offline/); env.network.isConnected = true;
  files.set("large", { bytes: { length: 25_000_001 } }); await assert.rejects(code.runAtsCheck("large", "resume.pdf", "", signal), /large/);
  files.set("encrypted", { bytes: new TextEncoder().encode("%PDF-1.7\n/Encrypt") }); await assert.rejects(code.runAtsCheck("encrypted", "resume.pdf", "", signal), /password/);
  files.set("bad", { bytes: new TextEncoder().encode("not a pdf") }); await assert.rejects(code.runAtsCheck("bad", "resume.pdf", "", signal), /PDF/);
 });

 const component = (fn) => ({fn, state: [], cursor: 0, effects: []});
 const render = (owner, props) => { active = owner; owner.cursor = 0; owner.effects = []; const tree = owner.fn(props); active = null; for (const effect of owner.effects) effect(); return tree; };
 const stop = (owner) => { for (const state of owner.state) state?.cleanup?.(); };
 const find = (node, predicate) => { if (!node) return; if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return; } if (typeof node !== "object") return; if (predicate(node)) return node; return find(node.props?.children, predicate); };
 const button = (tree, label) => { const result = find(tree, (node) => node.type === "Button" && node.props.label === label); assert(result, `Missing button ${label}`); return result.props; };
 const settle = () => new Promise((resolve) => setImmediate(resolve));
 await draft.store.getState().open("resume");
 await scenario("writing UI is opt-in; double tap single-flight; cancellation ignores late result", async () => {
  const owner = component(code.Writing), props = {id: "resume", data: draft.store.getState().data, issues: code.computeCheck(draft.store.getState().data).issues, offline: false};
  const count = calls.filter((call) => call[0] === "review").length;
  let tree = render(owner, props); assert.equal(calls.filter((call) => call[0] === "review").length, count);
  let release; env.reviewHolding = new Promise((resolve) => { release = resolve; });
  const action = button(tree, "Review writing"); action.onPress(); action.onPress(); await settle();
  assert.equal(calls.filter((call) => call[0] === "review").length, count + 1);
  const input = calls.findLast((call) => call[0] === "review")[1]; assert(input.passages.length > 0); assert(input.passages.every((entry) => entry.text.length <= 1000)); assert.equal(input.aiProviderId, "provider");
  tree = render(owner, props); button(tree, "Cancel").onPress(); release(); await settle(); env.reviewHolding = null;
  tree = render(owner, props); assert(!find(tree, (node) => node.type === "Text" && node.props.children === "Fixture review"));
  env.providers.hasAIProvider = false; tree = render(owner, props); button(tree, "Connect an AI provider");
  assert.equal(calls.filter((call) => call[0] === "review").length, count + 1); env.providers.hasAIProvider = true; stop(owner);
 });
 await scenario("parser UI opt-in, cancellation, cached lens switching, temporary-file cleanup", async () => {
  env.response = { score: 90, document: { pageCount: 1, truncated: false }, checks: [], findings: [], fullText: "Fixture extracted text" }; env.status = 200;
  const owner = component(code.Parser); const pdf = new TextEncoder().encode("%PDF-1.7\nparser fixture");
  const props = {pdf, optedIn: false, visible: true, onOptIn() {}, offline: false, issues: [], onSelect() {}, refreshVersion: 0};
  let tree = render(owner, props); const count = calls.filter((call) => call[0] === "rest").length; await settle(); assert.equal(calls.filter((call) => call[0] === "rest").length, count);
  let release; env.pdfHolding = new Promise((resolve) => { release = resolve; }); props.optedIn = true;
  render(owner, props); await settle(); tree = render(owner, props); button(tree, "Cancel").onPress(); release(); await settle(); env.pdfHolding = null;
  tree = render(owner, props); assert(!find(tree, (node) => node.props?.value?.fullText === "Fixture extracted text")); find(tree, (node) => node.type === "Banner" && node.props.action?.label === "Retry").props.action.onPress();
  render(owner, props); await settle(); tree = render(owner, props); assert(find(tree, (node) => node.props?.value?.fullText === "Fixture extracted text"));
  const after = calls.filter((call) => call[0] === "rest").length;
  props.visible = false; render(owner, props); props.visible = true; render(owner, props); await settle(); assert.equal(calls.filter((call) => call[0] === "rest").length, after);
  assert(![...files.keys()].some((key) => key.startsWith("cache/check-parser-")));
  props.pdf = new TextEncoder().encode("%PDF-1.7\nnew draft"); props.offline = true; tree = render(owner, props); assert(find(tree, (node) => node.props?.value?.fullText === "Fixture extracted text" && node.props.stale));
  stop(owner);
 });
 await draft.store.getState().close(); draft.suspend();
 process.stdout.write(`${checks} scenarios passed (including 17-template sample parity).\n`);
} finally {
 delete globalThis.__check;
 await rm(temporary, { recursive: true, force: true });
}
