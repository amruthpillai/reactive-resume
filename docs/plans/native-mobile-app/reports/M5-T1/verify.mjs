// Run from repository root: node docs/plans/native-mobile-app/reports/M5-T1/verify.mjs
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
const mobile = new URL("../../../../../apps/mobile/", import.meta.url);
const requireMobile = createRequire(new URL("package.json", mobile));
const requireServer = createRequire(new URL("../../../../../apps/server/package.json", import.meta.url));
const { transformSync } = createRequire(requireServer.resolve("tsx"))("esbuild");
const tag = (parts, ...values) => parts.reduce((text, part, index) => text + part + (values[index] ?? ""), "");
let active, calls = [], holding = null, failed = false, csvText = "";
let session = { server: "https://test.invalid", status: "signed-in" };
let provider = { hasAIProvider: false, isLoading: false, isUnavailable: false, error: null };
let documents = [], applications = [], webSearch = true;
const parsed = { company: "Page company", role: "Page role", location: "Remote", salary: "", sourceUrl: "https://example.invalid/job", jobDescription: "Posting", requirements: ["TypeScript"], postingSource: { method: "builtin", format: "text", truncated: false, completeness: "unknown" }, filledBy: "page", enrichmentWarning: null };
const files = new Map();
const cache = new Map();
const { ORPCError } = requireMobile("@orpc/client");
const operation = (name) => ({ key: () => ["applications", name], queryOptions: () => ({ queryKey: ["applications", name] }), mutationOptions: () => ({ operation: name }) });
const env = {
 tag,
 useState(initial) { const owner = active, index = owner.cursor++; if (!(index in owner.state)) owner.state[index] = typeof initial === "function" ? initial() : initial;
  return [owner.state[index], (value) => { owner.state[index] = typeof value === "function" ? value(owner.state[index]) : value; }]; },
 useRef(initial) { const owner = active, index = owner.cursor++; return owner.state[index] ??= { current: initial }; },
 useEffect(effect) { const owner = active, index = owner.cursor++; if (!(index in owner.state)) { owner.state[index] = true; owner.cleanups.push(effect()); } },
 session: () => session, providers: () => provider,
 orpc: { applications: Object.fromEntries([...["list", "getById", "create", "update", "delete", "bulkUpdate", "bulkDelete", "import"].map((name) => [name, operation(name)]), ["key", () => ["applications"]]]),
  documents: { list: { key: () => ["documents"], queryOptions: () => ({ queryKey: ["documents"] }) } },
  webAccess: { status: { queryOptions: () => ({ queryKey: ["web"] }) } },
 },
 query(options) { return { data: options.queryKey[0] === "documents" ? documents : options.queryKey[0] === "web" ? { search: webSearch } : applications, isSuccess: true, isPending: false, isError: false, refetch: async () => {} }; },
 mutation(options) { return { mutateAsync: async (input) => { let context; try {
  context = await options.onMutate?.(input); calls.push([options.operation, input]);
  if (holding) await holding; if (failed) throw new Error("Synthetic transport failure");
  if (options.operation === "create") return "new-id";
  if (options.operation === "import") return { imported: input.items.length };
  return { updated: input.ids?.length, deleted: input.ids?.length };
 } catch (error) { options.onError?.(error, input, context); throw error; } finally { options.onSettled?.(); } } }; },
 queryClient: {
  invalidateQueries: async () => {}, cancelQueries: async () => {},
  getQueryData: (key) => cache.get(JSON.stringify(key)),
  setQueryData(key, update) { const index = JSON.stringify(key); const previous = cache.get(index); cache.set(index, typeof update === "function" ? update(previous) : update); },
 },
 client: { applications: { ai: {
  parsePosting: async (input) => { calls.push(["parse", input]); if (holding) await holding; if (failed) throw failed instanceof Error ? failed : new Error("Unreadable"); return parsed; },
  autofill: async (input) => { calls.push(["fill", input]); return { company: "AI company", role: "AI role", location: "Remote", salary: "" }; },
  searchPostings: async (input) => { calls.push(["search", input]); return [{ title: "Role", description: "Description", url: "https://example.invalid/job" }]; },
 } } },
 router: { push: (href) => calls.push(["navigate", href]) },
 File: class {
  constructor(...parts) { this.uri = parts.join("/"); }
  get name() { return this.uri.split("/").at(-1); }
  get size() { return (files.get(this.uri) ?? "").length; }
  get exists() { return files.has(this.uri); }
  async write(value) { files.set(this.uri, value); }
  async text() { return files.get(this.uri); }
  delete() { files.delete(this.uri); }
 },
 async pick() { files.set("picked", csvText); return { canceled: false, assets: [{ uri: "picked" }] }; },
 async share(uri) { calls.push(["share", files.get(uri)]); },
};
env.cacheFiles = () => [...files.keys()].filter((uri) => uri.startsWith("cache/")).map((uri) => new env.File(uri));
globalThis.__m5 = env;
const ui = ["Banner", "Button", "ChipInput", "ListRow", "Segmented", "SelectSheet", "Sheet", "EditorSheet", "ConfirmDialog", "Text", "TextArea", "TextField", "Screen", "Skeleton", "Icon", "IconButton", "Switch", "EmptyState"];
const mockSources = {
 "@/features/applications-board/views": "exports.ApplicationsViewFrame='ApplicationsViewFrame';",
 react: "exports.useState=globalThis.__m5.useState;exports.useRef=globalThis.__m5.useRef;exports.useEffect=globalThis.__m5.useEffect;",
 "@lingui/react/macro": "exports.useLingui=()=>({t:globalThis.__m5.tag,i18n:{locale:'en'}});",
 "@lingui/core/macro": "exports.t=globalThis.__m5.tag;exports.plural=(n,o)=>o.other.replace('#',n);",
 "react-native": "exports.View='View';exports.Pressable='Pressable';exports.SectionList='SectionList';",
 "@tanstack/react-query": "exports.useQuery=globalThis.__m5.query;exports.useMutation=globalThis.__m5.mutation;exports.useQueryClient=()=>globalThis.__m5.queryClient;",
 "@/api/client": "exports.client=globalThis.__m5.client;exports.orpc=globalThis.__m5.orpc;",
 "@/auth/session": "exports.useSession=globalThis.__m5.session;exports.getServer=()=>globalThis.__m5.session().server;",
 "@/features/ai/providers": "exports.useHasAIProvider=globalThis.__m5.providers;exports.AIProviderSetupSheet='AIProviderSetupSheet';",
 "expo-router": "exports.useRouter=()=>globalThis.__m5.router;",
 "@/routes": "exports.routes={application:(id)=>'/applications/'+id,applicationDetails:(id)=>'/applications/'+id+'/details',signIn:()=>'/sign-in'};",
 "expo-document-picker": "exports.getDocumentAsync=globalThis.__m5.pick;",
 "expo-file-system": "exports.File=globalThis.__m5.File;exports.Paths={cache:{toString:()=> 'cache',list:()=>globalThis.__m5.cacheFiles()}};",
 "expo-sharing": "exports.isAvailableAsync=async()=>true;exports.shareAsync=globalThis.__m5.share;",
 "@/features/reminders": "exports.syncReminders=async()=>{};",
 "@/features/application-detail/date-field": "exports.WallClockField='WallClockField';",
 "@/features/application-detail/hooks": "exports.useUserTime=()=>({timeZone:'UTC'});",
 "@/ui": ui.map((name) => `exports.${name}=${JSON.stringify(name)};`).join("") + "exports.useTheme=()=>({colors:{},space:{s2:8,s3:12,s4:16,s12:48},radius:{rPill:999},size:{hit:44,icon:{meta:16}}});",
};
const feature = fileURLToPath(new URL("src/features/applications/", mobile));
const hooks = registerHooks({
 resolve(specifier, context, next) {
  if (context.parentURL?.includes("/src/features/applications/")) {
   if (specifier in mockSources) return { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent(mockSources[specifier])}` };
   if (specifier.startsWith("./")) for (const extension of [".ts", ".tsx"]) {
    const url = new URL(specifier + extension, context.parentURL);
    if (existsSync(url)) return { shortCircuit: true, url: url.href };
   }
  }
  return next(specifier, context);
 },
 load(url, context, next) {
  if (url.startsWith("data:text/javascript,")) return { format: "commonjs", source: decodeURIComponent(url.split(",").slice(1).join(",")), shortCircuit: true };
  if (url.startsWith("file:") && fileURLToPath(url).startsWith(feature)) return { format: "commonjs", source: transformSync(readFileSync(fileURLToPath(url), "utf8"), { loader: url.endsWith(".tsx") ? "tsx" : "ts", format: "cjs", jsx: "automatic" }).code, shortCircuit: true };
  return next(url, context);
 },
});
const csv = requireMobile("./src/features/applications/csv.ts");
const list = requireMobile("./src/features/applications/list.ts");
const { AddApplicationSheet } = requireMobile("./src/features/applications/add-sheet.tsx");
const { ApplicationsCsvSheet } = requireMobile("./src/features/applications/csv-sheet.tsx");
const { applicationError } = requireMobile("./src/features/applications/error.ts");
const queries = requireMobile("./src/features/applications/queries.ts");
const { ApplicationsListScreen } = requireMobile("./src/features/applications/list-screen.tsx");
const app = (id, status = "saved", patch = {}) => ({ id, status, role: "Engineer", company: "Fictional", contacts: [], tags: [], activity: [], appliedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), ...patch });
const mount = (component, props = {}) => {
 const owner = { state: [], cleanups: [], cursor: 0, tree: null };
 owner.render = () => { active = owner; owner.cursor = 0; owner.tree = component(props); return owner.tree; };
 owner.unmount = () => owner.cleanups.forEach((cleanup) => cleanup?.());
 owner.render(); return owner;
};
const elements = (tree) => Array.isArray(tree) ? tree.flatMap(elements) : tree && typeof tree === "object" ? [tree, ...elements(tree.props?.children), ...elements(tree.props?.footer)] : [];
const control = (owner, type, label) => { const node = elements(owner.tree).find((node) => node.type === type && (!label || node.props.label === label)); assert.ok(node, `Missing ${type}: ${label}`); return node.props; };
const edit = (owner, type, label, value) => { control(owner, type, label).onChangeText(value); owner.render(); };
const press = (owner, label) => { const button = control(owner, "Button", label); assert.ok(!button.disabled, `Disabled ${label}`); button.onPress(); owner.render(); };
const tick = async () => { for (let i = 0; i < 8; i++) await new Promise((resolve) => setImmediate(resolve)); };
let checks = 0;
const check = async (name, work) => { if (process.env.M5_SCENARIO && !name.includes(process.env.M5_SCENARIO)) return; await work(); checks++; console.log(`PASS ${name}`); };
const form = () => mount(AddApplicationSheet, { onClose() {} });
const fillManual = (owner) => { press(owner, "Fill details manually"); edit(owner, "TextField", "Company", "Fictional"); edit(owner, "TextField", "Role / title", "Engineer"); };
await check("CSV BOM, multiline quoting and explicit column mapping", () => {
 const table = csv.parseCsv('\uFEFFEmployer,Title,Stage,Tags\r\n"Example, Inc.","Line 1\nLine 2",Interview,"C++;remote"\r\n');
 assert.equal(table[1][1], "Line 1\nLine 2");
 const mapped = csv.mapCsvToApplications(table);
 assert.deepEqual(mapped.rows[0].tags, ["C++", "remote"]); assert.equal(mapped.rows[0].status, "interview");
 assert.equal(csv.mapCsvToApplications(table, ["company", "role", null, "notes"]).rows[0].notes, "C++;remote");
});
await check("invalid values, missing companies and invalid contacts are explicit", () => {
 const mapped = csv.mapCsvToApplications(csv.parseCsv("Company,Role,Stage,Stage Date,Contact Name,Contact Email\nGood,Eng,applied,2026-02-28,Sam,bad\nBad,Eng,maybe,2026-02-30,,\n,Eng,saved,,,"));
 assert.equal(mapped.rows.length, 1); assert.equal(mapped.contactsSkipped, 1); assert.equal(mapped.skipped, 1);
 assert.deepEqual(mapped.invalidValues.map((value) => value.field), ["status", "stageEnteredAt"]);
 assert.throws(() => csv.parseCsv('Company,Role\n"Unclosed,Eng'));
});
await check("legacy rejected and archived records import as closed", () => {
 assert.deepEqual(csv.mapCsvToApplications(csv.parseCsv("Company,Role,Status,Archived\nOne,Eng,rejected,false\nTwo,Eng,applied,true")).rows.map((row) => row.status), ["closed", "closed"]);
});
await check("CSV guards formulas and roundtrips tags and metadata", () => {
 const original = app("a", "interview", { company: "=1+1", notes: "\t=unsafe", tags: ["a,b", "pipe|tag"], postingSource: { method: "paste", format: "text", truncated: false, completeness: "unknown" } });
 const text = csv.exportApplicationsCsv([original]); assert.ok(text.includes("'=1+1"));
 const mapped = csv.mapCsvToApplications(csv.parseCsv(text));
 assert.equal(mapped.rows[0].company, "=1+1"); assert.deepEqual(mapped.rows[0].tags, original.tags); assert.deepEqual(mapped.rows[0].postingSource, original.postingSource);
});
await check("group priority, stable ties, role sorting and contact/tag filtering", () => {
 const apps = [app("saved"), app("closed", "closed"), app("offer", "offer"), app("interview", "interview"), app("applied", "applied", { contacts: [{ name: "Sam", email: "sam@example.invalid" }], tags: ["remote"] })];
 assert.deepEqual(list.groupApplications(apps, "updated", "desc").map((group) => group.status), ["interview", "offer", "applied", "saved", "closed"]);
 assert.deepEqual(list.filterApplications(apps, { search: "SAM@", tag: "remote", showClosed: false }).map((app) => app.id), ["applied"]);
 assert.deepEqual(list.groupApplications([app("b"), app("a")], "next", "asc")[0].data.map((app) => app.id), ["a", "b"]);
 assert.deepEqual(list.groupApplications([app("z", "saved", { role: "Zebra" }), app("a", "saved", { role: "Alpha" })], "role", "asc")[0].data.map((app) => app.id), ["a", "z"]);
});
await check("next interview precedence and exclusion of hidden bulk selections", () => {
 const apps = [app("one", "interview", { activity: [{ type: "interview", at: new Date("2030-01-01"), durationMinutes: 30 }], followUpAt: new Date("2026-01-01") }), app("two", "interview", { followUpAt: new Date("2029-01-01") }), app("saved")];
 const groups = list.groupApplications(apps, "next", "asc", new Date("2026-01-01"));
 assert.deepEqual(groups[0].data.map((app) => app.id), ["two", "one"]);
 assert.deepEqual(list.visibleSelection(groups, new Set(["interview"]), new Set(["one", "saved", "hidden"])), ["saved"]);
});
await check("export date scope and server-isolated list/detail keys with optimistic rollback", async () => {
 const apps = [app("old"), app("new", "closed", { appliedAt: new Date("2026-10-01") })];
 assert.deepEqual(csv.selectApplicationsForExport(apps, [apps[0]], { scope: "all", from: "2026-09-01" }).map((app) => app.id), ["new"]);
 assert.notDeepEqual(queries.applicationsListQueryKey("https://one.invalid"), queries.applicationsListQueryKey("https://two.invalid"));
 assert.notDeepEqual(queries.applicationDetailQueryKey("id", "https://one.invalid"), queries.applicationDetailQueryKey("id", "https://two.invalid"));
 const key = queries.applicationsListQueryKey(); const original = [app("optimistic"), app("untouched")]; cache.set(JSON.stringify(key), original);
 const owner = mount(queries.useApplicationMutations); let resolve; holding = new Promise((done) => { resolve = done; });
 const pending = owner.tree.update.mutateAsync({ id: "optimistic", status: "closed", closedReason: "withdrew" }); await tick();
 assert.equal(env.queryClient.getQueryData(key)[0].status, "closed"); assert.equal(env.queryClient.getQueryData(key)[0].closedReason, "withdrew"); assert.equal(env.queryClient.getQueryData(key)[1], original[1]);
 failed = true; resolve(); holding = null; await assert.rejects(pending); failed = false; assert.deepEqual(env.queryClient.getQueryData(key), original);
 await owner.tree.update.mutateAsync({ id: "optimistic", status: "applied" }); assert.equal(env.queryClient.getQueryData(key)[0].status, "applied"); owner.unmount();

});
await check("link parsing works without AI and enters editable review", async () => {
 calls = []; const owner = form(); edit(owner, "TextField", "Job posting link", parsed.sourceUrl); press(owner, "Read posting"); await tick(); owner.render();
 assert.equal(control(owner, "TextField", "Company").value, "Page company"); assert.equal(calls[0][0], "parse"); owner.unmount();
 const unreadable = form(); edit(unreadable, "TextField", "Job posting link", parsed.sourceUrl); failed = new ORPCError("POSTING_UNREADABLE", { status: 422 }); press(unreadable, "Read posting"); await tick(); unreadable.render(); failed = false;
 assert.equal(control(unreadable, "Segmented").value, "text"); assert.equal(control(unreadable, "TextArea", "Pasted description").value, ""); assert.equal(control(unreadable, "Banner").message, "That link couldn't be read. Paste the posting text instead.");
 fillManual(unreadable); press(unreadable, "Save job"); await tick(); assert.equal(calls.findLast(([name]) => name === "create")[1].sourceUrl, parsed.sourceUrl); unreadable.unmount();
 assert.equal(applicationError(new ORPCError("SEARCH_FAILED", { status: 502 })), "Job search couldn't be reached. Try again or paste a posting link.");
 assert.equal(applicationError(new ORPCError("SEARCH_UNAVAILABLE", { status: 503 })), "Job search isn't configured on this server.");

});
await check("manual save blocks double tap and sends application date/letter", async () => {
 calls = []; documents = [{ id: "letter", type: "letter", name: "Fictional letter" }];
 const owner = form(); fillManual(owner); control(owner, "SelectSheet", "Stage").onChange("applied"); owner.render();
 control(owner, "WallClockField", "Application date").onChange("2026-10-17"); owner.render(); press(owner, "More details"); control(owner, "SelectSheet", "Cover letter submitted (optional)").onChange("letter"); owner.render();
 let resolve; holding = new Promise((done) => { resolve = done; });
 const save = control(owner, "Button", "Save job").onPress; save(); save(); await tick(); assert.equal(calls.filter(([name]) => name === "create").length, 1);
 resolve(); holding = null; await tick();
 const payload = calls.find(([name]) => name === "create")[1];
 assert.equal(payload.stageEnteredAt, "2026-10-17"); assert.equal(payload.coverLetterId, "letter"); assert.ok(calls.some(([name]) => name === "navigate")); owner.unmount();
});
await check("failed save retains manual fields and warns about duplicate retry", async () => {
 failed = true; const owner = form(); fillManual(owner); press(owner, "Save job"); await tick(); owner.render();
 assert.equal(control(owner, "TextField", "Company").value, "Fictional"); assert.ok(control(owner, "Banner").message.includes("avoid a duplicate")); failed = false; owner.unmount();
});
await check("dismissed read cannot enter review", async () => {
 const owner = form(); edit(owner, "TextField", "Job posting link", parsed.sourceUrl);
 let resolve; holding = new Promise((done) => { resolve = done; }); press(owner, "Read posting"); owner.unmount(); resolve(); holding = null; await tick(); owner.render();
 assert.ok(elements(owner.tree).some((element) => element.props?.label === "Read posting"));
});
await check("pasted text requires provider with inline setup", () => {
 const owner = form(); control(owner, "Segmented").onChange("text"); owner.render(); edit(owner, "TextArea", "Pasted description", "A fictional job posting");
 assert.equal(control(owner, "Button", "Read posting").disabled, true); press(owner, "Connect AI provider"); assert.equal(control(owner, "AIProviderSetupSheet").open, true); owner.unmount();
});
await check("search waits for selection and autofill preserves edited values", async () => {
 provider = { ...provider, hasAIProvider: true }; calls = [];
 const owner = form(); edit(owner, "TextField", "Role, company or location", "Engineer"); press(owner, "Search"); await tick(); owner.render(); assert.equal(calls.filter(([name]) => name === "parse").length, 0);
 control(owner, "ListRow").onPress(); owner.render(); assert.equal(control(owner, "TextField", "Job posting link").value, parsed.sourceUrl);
 fillManual(owner); press(owner, "More details"); edit(owner, "TextArea", "Saved description", "Fictional description"); press(owner, "Fill empty fields with AI"); await tick(); owner.render();
 assert.equal(control(owner, "TextField", "Company").value, "Fictional"); assert.equal(control(owner, "TextField", "Location").value, "Remote"); owner.unmount();
});
await check("CSV picker requires mapping and imports first 500 with overflow report", async () => {
 csvText = "Company,Role\nFictional,Engineer"; calls = [];
 const owner = mount(ApplicationsCsvSheet, { applications: [], filtered: [], onClose() {} }); press(owner, "Upload .csv"); await tick(); owner.render(); assert.equal(files.has("picked"), false); assert.equal(calls.filter(([name]) => name === "import").length, 0);
 control(owner, "SelectSheet", "Column 2: Role").onChange("company"); owner.render(); assert.equal(control(owner, "Button", "Import applications").disabled, true);
 control(owner, "SelectSheet", "Column 2: Role").onChange("role"); owner.render(); press(owner, "Import applications"); await tick(); owner.render(); assert.equal(calls.filter(([name]) => name === "import").length, 1); owner.unmount();
 const large = mount(ApplicationsCsvSheet, { applications: [], filtered: [], onClose() {} }); edit(large, "TextArea", "CSV data", "Company,Role\n" + Array.from({ length: 501 }, (_, i) => `Fictional ${i},Engineer`).join("\n")); press(large, "Review columns"); assert.equal(control(large, "Button", "Import applications").disabled, false);
 assert.ok(elements(large.tree).some((node) => node.type === "Banner" && node.props.message.includes("leaving out 1")));
 press(large, "Import applications"); await tick(); large.render(); assert.equal(calls.findLast(([name]) => name === "import")[1].items.length, 500);
 assert.ok(elements(large.tree).some((node) => node.type === "Text" && String(node.props.children).includes("1 rows left out"))); large.unmount();
});
await check("CSV share retains readable file and sweeps stale exports next time", async () => {
 const apps = [app("one"), app("two")]; calls = []; files.clear();
 const owner = mount(ApplicationsCsvSheet, { applications: apps, filtered: [apps[0]], onClose() {} }); control(owner, "Segmented").onChange("export"); owner.render(); press(owner, "Share CSV"); await tick();
 assert.equal(csv.parseCsv(calls.find(([name]) => name === "share")[1]).length, 2); assert.equal(files.size, 1);
 const previous = [...files.keys()][0]; files.set("cache/unrelated.txt", "keep"); await new Promise((resolve) => setTimeout(resolve, 2)); owner.render(); press(owner, "Share CSV"); await tick(); assert.equal(files.has(previous), false); assert.equal(files.has("cache/unrelated.txt"), true); assert.equal(files.size, 2); files.clear(); owner.unmount();
});
await check("bulk close sends explicit reason; delete waits for confirmation", async () => {
 applications = [app("one"), app("two")]; calls = [];
 const outer = mount(ApplicationsListScreen); const owner = mount(outer.tree.type); const section = elements(owner.tree).find((element) => element.type === "SectionList");
 const select = elements(section.props.renderItem({ item: applications[0] })).find((element) => element.type === "ListRow"); select.props.onLongPress(); owner.render();
 const headerOwner = { get tree() { return elements(owner.tree).find((element) => element.type === "SectionList").props.ListHeaderComponent; }, render() { owner.render(); } };
 press(headerOwner, "Close…"); owner.render(); control(owner, "SelectSheet", "Reason").onChange("withdrew"); owner.render(); press(owner, "Close applications"); await tick(); owner.render();
 assert.deepEqual(calls.find(([name]) => name === "bulkUpdate")[1], { ids: ["one"], status: "closed", closedReason: "withdrew" });
 select.props.onLongPress(); owner.render(); press(headerOwner, "Delete…"); owner.render(); assert.equal(calls.filter(([name]) => name === "bulkDelete").length, 0); press(owner, "Delete"); await tick(); assert.equal(calls.filter(([name]) => name === "bulkDelete").length, 1); owner.unmount(); outer.unmount();
});
await check("clipped reviewed posting records incomplete provenance", async () => {
 calls = []; const owner = form(); edit(owner, "TextField", "Job posting link", parsed.sourceUrl); press(owner, "Read posting"); await tick(); owner.render();
 press(owner, "More details"); edit(owner, "TextArea", "Saved description", "x".repeat(20_001)); press(owner, "Hide details");
 assert.ok(elements(owner.tree).some((node) => node.type === "Banner" && node.props.tone === "warn" && node.props.message.includes("clipped")), "Clipping warning must remain visible with details collapsed");
 press(owner, "Save job"); await tick();
 const payload = calls.find(([name]) => name === "create")[1]; assert.equal(payload.jobDescription.length, 20_000); assert.equal(payload.postingSource.truncated, true); assert.equal(payload.postingSource.completeness, "incomplete"); owner.unmount();
});
await check("quick capture keeps optional details collapsed and saves without opening them", async () => {
 calls = []; const owner = form(); fillManual(owner);
 assert.equal(elements(owner.tree).some((node) => node.props?.label === "Location"), false);
 const guarded = control(owner, "EditorSheet");
 assert.ok(elements(guarded.footer).some((node) => node.props?.label === "Save job"), "Save must live outside scrolling form");
 press(owner, "Save job"); await tick();
 const payload = calls.find(([name]) => name === "create")[1]; assert.equal(payload.company, "Fictional"); assert.equal(payload.role, "Engineer"); owner.unmount();
});
await check("collapsed posting details retain parsed and manually edited optional values", async () => {
 calls = []; const owner = form(); edit(owner, "TextField", "Job posting link", parsed.sourceUrl); press(owner, "Read posting"); await tick(); owner.render();
 assert.equal(control(owner, "EditorSheet").dirty, true);
 press(owner, "More details"); edit(owner, "TextArea", "Notes", "Bring portfolio");
 control(owner, "WallClockField", "Follow-up date").onChange("2026-10-27"); owner.render();
 press(owner, "Hide details"); press(owner, "Save job"); await tick();
 const payload = calls.find(([name]) => name === "create")[1];
 assert.equal(payload.location, "Remote"); assert.equal(payload.jobDescription, "Posting"); assert.deepEqual(payload.requirements, ["TypeScript"]); assert.equal(payload.notes, "Bring portfolio");
 assert.equal(payload.followUpAt.getDate(), 27); owner.unmount();
});
await check("pending job save preserves form and rejects duplicate submission", async () => {
 calls = []; let dismissed = 0; const owner = mount(AddApplicationSheet, { onClose() { dismissed++; } }); fillManual(owner);
 let resolve; holding = new Promise((done) => { resolve = done; }); press(owner, "Save job");
 assert.equal(control(owner, "EditorSheet").pending, true);
 assert.equal(control(owner, "TextField", "Company").value, "Fictional");
 control(owner, "Button", "Save job").onPress(); await tick(); assert.equal(calls.filter(([name]) => name === "create").length, 1); assert.equal(dismissed, 0);
 resolve(); holding = null; await tick(); assert.equal(dismissed, 1); assert.equal(calls.filter(([name]) => name === "navigate").length, 1); owner.unmount();
});
await check("web search setup asks before discarding job input and query, and blocks pending exits", async () => {
 webSearch = false;
 try {
  for (const label of ["Job posting link", "Role, company or location"]) {
   calls = []; let dismissed = 0; const owner = mount(AddApplicationSheet, { onClose() { dismissed++; } });
   edit(owner, "TextField", label, "Keep this job input"); press(owner, "Set up web search");
   assert.equal(dismissed, 0, "Settings must not discard a dirty form before approval"); assert.equal(calls.filter(([name]) => name === "navigate").length, 0);
   assert.equal(control(owner, "ConfirmDialog").open, true);
   control(owner, "ConfirmDialog").onCancel(); owner.render(); assert.equal(control(owner, "TextField", label).value, "Keep this job input");
   press(owner, "Set up web search"); control(owner, "ConfirmDialog").onConfirm(); owner.render();
   assert.equal(dismissed, 1); assert.deepEqual(calls.find(([name]) => name === "navigate"), ["navigate", "/settings/ai-web-access"]); owner.unmount();
  }
  calls = []; let dismissed = 0; const owner = mount(AddApplicationSheet, { onClose() { dismissed++; } });
  const staleSetup = control(owner, "Button", "Set up web search").onPress; fillManual(owner);
  let release; holding = new Promise((done) => { release = done; }); press(owner, "Save job"); staleSetup(); owner.render();
  assert.equal(dismissed, 0); assert.equal(calls.filter(([name]) => name === "navigate").length, 0); assert.equal(control(owner, "ConfirmDialog").open, false);
  release(); holding = null; await tick(); assert.equal(dismissed, 1); owner.unmount();
  calls = []; dismissed = 0; const empty = mount(AddApplicationSheet, { onClose() { dismissed++; } }); press(empty, "Set up web search");
  assert.equal(dismissed, 1); assert.equal(control(empty, "ConfirmDialog").open, false); empty.unmount();
 } finally { webSearch = true; }
});
await check("collapsed invalid job link explains disabled Save and reopens its correction", () => {
 const owner = form(); fillManual(owner); press(owner, "More details"); edit(owner, "TextField", "Job posting link", "ftp://example.invalid/job"); press(owner, "Hide details");
 assert.equal(control(owner, "Button", "Save job").disabled, true);
 const problem = elements(owner.tree).find((node) => node.type === "Banner" && node.props.tone === "danger");
 assert.ok(problem?.props.message.includes("http"), "Collapsed invalid link needs visible reason and recovery action");
 problem.props.action.onPress(); owner.render(); assert.equal(control(owner, "TextField", "Job posting link").value, "ftp://example.invalid/job");
 edit(owner, "TextField", "Job posting link", "https://example.invalid/job"); press(owner, "Hide details"); assert.equal(control(owner, "Button", "Save job").disabled, false); owner.unmount();
});
hooks.deregister(); console.log(`${checks} scenarios passed`);
