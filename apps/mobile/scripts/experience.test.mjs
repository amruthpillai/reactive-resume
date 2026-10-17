// Shipped component actions run against native/export/network boundaries; no real account or outbound sharing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const serverRequire = createRequire(new URL("../../server/package.json", import.meta.url));
const { transformSync } = createRequire(serverRequire.resolve("tsx"))("esbuild");
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
const tag = (parts, ...values) => parts.reduce((text, part, index) => text + part + (values[index] ?? ""), "");
let hooks = [];
let cursor = 0;
const react = {
	createElement: element,
	useState(initial) {
		const index = cursor++;
		if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
		return [hooks[index], (value) => (hooks[index] = typeof value === "function" ? value(hooks[index]) : value)];
	},
	useRef(initial) {
		const [value] = react.useState(() => ({ current: initial }));
		return value;
	},
};
const calls = [];
const routes = {
	builder: (id, tab) => `/builder/${id}/${tab}`,
	application: (id, tab) => `/applications/${id}/${tab}`,
};
const router = { push: (href) => calls.push(href), back() {} };
const theme = {
	space: { s0: 2, s1: 4, s2: 8, s3: 12, s4: 16, s12: 48 },
	size: { sheetShare: 440 },
	radius: { rPill: 999 },
	colors: { ink: "#111", ink3: "#777", line: "#ddd" },
};
const ui = Object.fromEntries(
	[
		"Banner",
		"Button",
		"Card",
		"ChipInput",
		"ConfirmDialog",
		"Icon",
		"IconButton",
		"ListRow",
		"SelectSheet",
		"Switch",
		"Text",
		"TextArea",
		"TextField",
		"Segmented",
		"Skeleton",
	].map((name) => [name, name]),
);
ui.useTheme = () => theme;
ui.showToast = (value) => calls.push(value);
const mocks = {
	react,
	"react-native": { View: "View", Pressable: "Pressable", ScrollView: "ScrollView" },
	"expo-router": { useRouter: () => router, Stack: { Screen: "StackScreen" } },
	"@lingui/react/macro": { useLingui: () => ({ t: tag }) },
	"@lingui/core/macro": { t: tag, plural: (value, forms) => forms.other.replace("#", String(value)) },
	"@/routes": { routes },
	"@/ui": ui,
};
function load(path, extra = {}) {
	const module = { exports: {} };
	const code = transformSync(readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"), {
		loader: path.endsWith(".tsx") ? "tsx" : "ts",
		format: "cjs",
		jsx: "transform",
	}).code;
	const dependencies = { ...mocks, ...extra };
	new Function("React", "require", "module", "exports", code)(
		react,
		(name) => {
			assert.ok(name in dependencies, `Missing boundary: ${name}`);
			return dependencies[name];
		},
		module,
		module.exports,
	);
	return module.exports;
}
const nodes = (tree) =>
	!tree || typeof tree !== "object"
		? []
		: Array.isArray(tree)
			? tree.flatMap(nodes)
			: [tree, ...nodes(tree.props.children)];
const render = (component, props) => {
	cursor = 0;
	return component(props);
};
const reset = () => {
	hooks = [];
	calls.length = 0;
};
const control = (tree, label) => {
	const found = nodes(tree).find((node) => node.props.label === label);
	assert.ok(found, `Missing user action: ${label}`);
	return found.props;
};
const settle = async () => {
	for (let index = 0; index < 20; index++) await Promise.resolve();
};

const resume = { id: "resume-a", name: "Fictional resume", data: { basics: { name: "Alex Example" } } };
let state = { document: resume, status: "saved", conflict: null, flush: async () => calls.push("flush") };
const draftBoundary = {
	useResumeStore: { getState: () => state },
	useLetterStore: { getState: () => ({ document: null }) },
};
const document = load("features/share/document.ts", { "@/draft": draftBoundary });
const { safeFileName } = load("features/share/model.ts");
let rejectExport = false;
let releaseExport;
let holdExport = false;
const exportBoundary = {
	exportDirectory: () => "cache-batch",
	exportFile: async (options) => {
		calls.push({ export: options });
		if (holdExport) await new Promise((resolve) => (releaseExport = resolve));
		if (rejectExport) throw new Error("Export unavailable");
		return { uri: "file://fictional-resume.pdf" };
	},
	shareExport: async (file, format) => calls.push({ shared: format, uri: file.uri }),
	printResume: async () => calls.push("print"),
};
const { DownloadTab } = load("features/share/download.tsx", {
	"@reactive-resume/resume/ats": { lintResumeForAts: () => ({ findings: [] }) },
	"@reactive-resume/resume/cover-letter": {},
	"./document": document,
	"./files": exportBoundary,
	"./letter": {},
	"./model": { safeFileName },
	"@/api/client": { client: {} },
	"@/draft": draftBoundary,
	"@/features/applications/queries": { useApplications: () => ({ data: [] }) },
});
const { ShareScreen } = load("features/share/screen.tsx", {
	"expo-network": { useNetworkState: () => ({ isConnected: true }) },
	"react-native-safe-area-context": { SafeAreaProvider: "SafeAreaProvider", SafeAreaView: "SafeAreaView" },
	"./document": { useShareDocument: () => state },
	"./download": { DownloadTab },
	"./link": { LinkTab: "LinkTab" },
	"@/auth/session": { useSession: () => ({ status: "signed-in" }) },
	"@/features/document-menu": { DocumentMenu: "DocumentMenu" },
	"@/features/history/history": { HistoryPanel: "HistoryPanel" },
});
reset();
let tree = render(ShareScreen, { id: resume.id });
assert.equal(control(tree, "Share sections").value, "download", "Ordinary sharing must start with the file action");
assert.ok(nodes(tree).some((node) => node.type === DownloadTab));
reset();
tree = render(ShareScreen, { id: resume.id, history: true });
assert.equal(control(tree, "Share sections").value, "history", "Explicit version history keeps its destination");

reset();
tree = render(DownloadTab, { resume, offline: false });
assert.equal(control(tree, "File name").value, "Alex Example-Resume");
holdExport = true;
control(tree, "Share PDF").onPress();
control(tree, "Share PDF").onPress();
await settle();
assert.equal(calls.filter((call) => call?.export).length, 1, "Repeated taps must not duplicate generation");
releaseExport();
await settle();
holdExport = false;
assert.equal(calls.filter((call) => call?.shared === "pdf").length, 1);
assert.equal(calls.find((call) => call?.export).export.name, "Alex Example-Resume");

reset();
state = {
	...state,
	status: "offline",
	flush: async () => {
		throw new Error("Offline must not wait for a save");
	},
};
tree = render(DownloadTab, { resume, offline: true });
control(tree, "Share PDF").onPress();
await settle();
assert.equal(calls.filter((call) => call?.shared === "pdf").length, 1, "Local PDF must remain available offline");

reset();
state = { ...state, status: "error", flush: async () => undefined };
tree = render(DownloadTab, { resume, offline: false });
control(tree, "Share PDF").onPress();
await settle();
assert.equal(calls.filter((call) => call?.export).length, 0, "An unsaved online document must not export stale text");

reset();
state = { ...state, status: "saved" };
tree = render(DownloadTab, { resume, offline: false });
control(tree, "File format").onChange("docx");
tree = render(DownloadTab, { resume, offline: false });
rejectExport = true;
control(tree, "Download DOCX").onPress();
await settle();
tree = render(DownloadTab, { resume, offline: false });
assert.ok(nodes(tree).some((node) => node.props.message === "Export unavailable"));
rejectExport = false;
control(tree, "Share PDF instead").onPress();
await settle();
assert.equal(
	calls.filter((call) => call?.shared === "pdf").length,
	1,
	"Failed alternate format retains a working PDF fallback",
);

const stages = load("features/applications/stages.ts");
const nextSteps = load("features/applications/next-step.ts", { "./stages": stages });
const time = { locale: "en-US", timeZone: "UTC", when: String, time: String, day: String };
const { StageStepper, NextStepCard } = load("features/application-detail/sections.tsx", {
	"@tanstack/react-query": {},
	"expo-document-picker": {},
	"expo-file-system": {},
	"expo-sqlite/kv-store": {},
	"expo-web-browser": {},
	"./attachment": {},
	"./notes-queue": { createNotesQueue: () => ({}) },
	"./hooks": {
		useNow: () => new Date(),
		useUserTime: () => time,
		followUpReminder: () => null,
		interviewReminder: () => null,
	},
	"./sheets": { FollowUpSheet: "FollowUpSheet", ReminderSheet: "ReminderSheet" },
	"@/api/client": {},
	"@/auth/session": {},
	"@/draft": {},
	"@/features/applications/error": {},
	"@/features/applications/next-step": nextSteps,
	"@/features/applications/stages": stages,
	"@/features/applications/queries": {
		useApplicationMutations: () => ({ update: { isPending: false, mutate: (input) => calls.push(input) } }),
	},
	"@/features/reminders": {},
});
const application = {
	id: "job-a",
	status: "saved",
	activity: [],
	appliedAt: new Date().toISOString(),
	followUpAt: null,
};
reset();
tree = render(StageStepper, { application, onMarkApplied: () => calls.push("mark-applied") });
assert.equal(
	nodes(tree).filter((node) => node.props.accessibilityRole === "tab").length,
	0,
	"Progress must not masquerade as navigation",
);
assert.equal(
	nodes(tree).filter((node) => node.type === "Pressable").length,
	0,
	"Progress labels must not mutate records",
);
assert.deepEqual(calls, []);
control(tree, "Change stage").onChange("applied");
assert.deepEqual(calls, ["mark-applied"], "Explicit Saved → Applied still captures submission details");
control(tree, "Change stage").onChange("interview");
assert.deepEqual(calls.at(-1), { id: "job-a", status: "interview" });

for (const [overrides, label, destination] of [
	[{}, "Prepare application", "fit"],
	[{ status: "applied" }, "Review application", "apply"],
	[{ status: "applied", followUpAt: "2000-01-01T09:00:00Z" }, "Draft a follow-up", "messages"],
	[
		{
			status: "interview",
			activity: [
				{ id: "interview-a", type: "interview", kind: "technical", at: "2099-01-01T12:00:00Z", durationMinutes: 60 },
			],
		},
		"Prepare for interview",
		"prepare",
	],
	[{ status: "closed" }, "View saved work", "saved"],
]) {
	reset();
	tree = render(NextStepCard, { application: { ...application, ...overrides }, onOpenInterview() {} });
	control(tree, label).onPress();
	assert.equal(calls.at(-1), `/applications/job-a/${destination}`);
	if (!overrides.status) assert.ok(!nodes(tree).some((node) => node.props.label === "Schedule an interview"));
}
console.log(
	"PASS file-first sharing, single-flight/current-document/offline PDF export, fallback, explicit stage edits and state-aware next actions",
);
