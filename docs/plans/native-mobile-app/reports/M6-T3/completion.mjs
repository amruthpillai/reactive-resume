// UI integration scenarios extend M6-T3: shipped handlers, real Chat, proposal helpers and DraftStore.
// Native views and I/O are replaced at their boundaries; no device build or production test seam.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { mock } from "node:test";

const mobile = new URL("../../../../../apps/mobile/", import.meta.url);
const requireMobile = createRequire(new URL("package.json", mobile));
const server = createRequire(new URL("../../../../../apps/server/package.json", import.meta.url));
const { transformSync } = createRequire(server.resolve("tsx"))("esbuild");
const { Chat } = requireMobile("@ai-sdk/react");
let active;
const tag = (parts, ...values) =>
	typeof parts === "object" && "message" in parts
		? parts.message
		: parts.reduce((text, part, index) => text + part + (values[index] ?? ""), "");
const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
const query = (name) => ({
	key: () => [name],
	queryOptions: (options = {}) => ({ ...options, queryKey: [name, options.input] }),
});
const provider = { id: "p1", label: "Fixture AI", model: "model-1", enabled: true };
const env = {
	Chat,
	jsx,
	tag,
	scope: "server/account-a",
	session: { status: "signed-in", server: "https://fixture.invalid" },
	providers: {
		usableProviders: [provider],
		defaultProvider: provider,
		hasAIProvider: true,
		isLoading: false,
		error: null,
		retry() {},
	},
	threads: [],
	saved: new Map(),
	calls: [],
	toasts: [],
	apps: [],
	chrome: [],
	threadError: null,
	useState(initial) {
		const owner = active,
			i = owner.cursor++;
		if (!(i in owner.hooks)) owner.hooks[i] = typeof initial === "function" ? initial() : initial;
		return [
			owner.hooks[i],
			(value) => {
				owner.hooks[i] = typeof value === "function" ? value(owner.hooks[i]) : value;
			},
		];
	},
	useRef(initial) {
		const owner = active,
			i = owner.cursor++;
		return (owner.hooks[i] ??= { current: initial });
	},
	useMemo(fn, deps) {
		const owner = active,
			i = owner.cursor++,
			old = owner.hooks[i];
		if (!old || deps.some((v, n) => !Object.is(v, old.deps[n]))) owner.hooks[i] = { deps, value: fn() };
		return owner.hooks[i].value;
	},
	useEffect(fn, deps) {
		const owner = active,
			i = owner.cursor++,
			old = owner.hooks[i];
		if (!old || !deps || deps.some((v, n) => !Object.is(v, old.deps?.[n])))
			owner.effects.push(() => {
				old?.cleanup?.();
				owner.hooks[i] = { deps, cleanup: fn() };
			});
	},
	useQuery(options) {
		env.calls.push(["query", options]);
		if (options.queryKey[0] === "threads")
			return {
				data: env.threads,
				isPending: false,
				isError: !!env.threadError,
				error: env.threadError,
				refetch: async () => {},
			};
		if (options.queryKey[0] === "thread") return { data: env.saved.get(options.input.id), isFetchedAfterMount: true };
		return { data: [], isPending: false, refetch: async () => {} };
	},
	queryClient: { invalidateQueries: async () => {}, fetchQuery: async () => null },
	useChat({ chat }) {
		return {
			messages: chat.messages,
			status: chat.status,
			error: chat.error,
			sendMessage: chat.sendMessage,
			regenerate: chat.regenerate,
			stop: chat.stop,
			resumeStream: chat.resumeStream,
			addToolOutput: chat.addToolOutput,
			clearError: chat.clearError,
			setMessages: (m) => {
				chat.messages = m;
			},
		};
	},
};
// Exercise shared Sheet against the installed library's real modal queue; only native views/refs are replaced.
env.createContext = (value) => {
	const context = { value };
	context.Provider = { context };
	return context;
};
env.useContext = (context) => context.value;
env.modalContext = env.createContext(null);
env.nativeCalls = [];
env.nativeRecords = new Map();
env.theme = {
	colors: {},
	radius: {},
	shadows: { e3: {} },
	space: { s0: 2, s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s12: 48 },
	size: { formSheet: 540, topBar: 48, grabber: { width: 36, height: 5 }, icon: {} },
	type: { body: {}, bodyLarge: {} },
};
function NativeModal(props) {
	const queue = env.useContext(env.modalContext);
	const state = env.useRef({ shown: false, id: `modal-${env.nativeRecords.size}`, status: { current: null } }).current;
	const methods = env.useMemo(
		() => ({
			status: state.status,
			present() {
				env.nativeCalls.push(["present", state.id]);
				queue.mountSheet(state.id, { current: methods }, props.stackBehavior ?? env.defaultStack);
				state.shown = true;
				state.status.current = env.modalStatus.PRESENTED;
			},
			minimize() {
				env.nativeCalls.push(["minimize", state.id]);
				state.status.current = env.modalStatus.MINIMIZED;
			},
			restore() {
				state.status.current = env.modalStatus.PRESENTED;
			},
			dismiss() {
				queue.willUnmountSheet(state.id);
				state.status.current = env.modalStatus.DISMISSING;
				queue.unmountSheet(state.id);
				state.shown = false;
				props.onDismiss();
			},
		}),
		[],
	);
	props.ref.current = methods;
	env.nativeRecords.set(state.id, methods);
	return jsx("NativeModal", { children: state.shown ? props.children : null });
}
env.orpc = { agent: { threads: { list: query("threads"), get: query("thread"), key: () => ["threads"] } } };
env.client = {
	agent: {
		threads: {
			start: async (input, options) => {
				env.calls.push(["start", input, options]);
				if (env.hold) await env.hold;
				return { id: "created", ...input };
			},
			update: async (input, options) => {
				env.calls.push(["update", input, options]);
			},
			delete: async (input, options) => {
				env.calls.push(["delete", input, options]);
			},
		},
		messages: {
			setEditStatus: async (input, options) => {
				env.calls.push(["edit-status", input, options]);
			},
			stop: async () => {},
			send: async (input, options) => {
				assert.equal(options.context.scope, env.scope, "requests cannot borrow another account");
				env.calls.push(["send", input, options]);
				return (async function* () {
					for (const frame of [
						{ type: "start", messageId: "reply" },
						{ type: "text-start", id: "t" },
						{ type: "text-delta", id: "t", delta: "Answer" },
						{ type: "text-end", id: "t" },
						{ type: "finish" },
					])
						yield `data: ${JSON.stringify(frame)}\n\n`;
				})();
			},
			resume: async () => (async function* () {})(),
		},
	},
};
env.router = Object.fromEntries(
	["push", "replace", "dismissTo", "back"].map((name) => [name, (href) => env.calls.push([name, href])]),
);
globalThis.__completion = env;
const uiNames = [
	"Banner",
	"Button",
	"IconButton",
	"Text",
	"Icon",
	"ListRow",
	"Sheet",
	"TextField",
	"ConfirmDialog",
	"SelectSheet",
	"Switch",
	"EmptyState",
	"Screen",
];
const mocks = {
	react:
		"exports.createElement=(type,props,...children)=>E.jsx(type,{...props,...(children.length?{children:children.length===1?children[0]:children}:{})},props?.key);exports.useState=E.useState;exports.useRef=E.useRef;exports.useMemo=E.useMemo;exports.useEffect=E.useEffect;exports.useLayoutEffect=E.useEffect;exports.useEffectEvent=(fn)=>fn;exports.createContext=E.createContext;exports.use=E.useContext;exports.useContext=E.useContext;exports.useCallback=(fn)=>fn;exports.useSyncExternalStore=()=>{};",
	"react/jsx-runtime": "exports.Fragment='Fragment';exports.jsx=E.jsx;exports.jsxs=E.jsx;",
	"@ai-sdk/react": "exports.Chat=E.Chat;exports.useChat=E.useChat;",
	"@lingui/core/macro": "exports.t=E.tag;exports.plural=(n,o)=>(n===1?o.one:o.other).replaceAll('#',n);",
	"@lingui/react/macro": "exports.useLingui=()=>({t:E.tag,i18n:{locale:'en'}});exports.Trans=({children})=>children;",
	"@tanstack/react-query": "exports.useQuery=E.useQuery;exports.useQueryClient=()=>E.queryClient;",
	"react-native":
		["View", "ScrollView", "Pressable", "ActivityIndicator", "TextInput", "Modal", "KeyboardAvoidingView"]
			.map((n) => `exports.${n}='${n}';`)
			.join("") +
		"exports.useWindowDimensions=()=>({height:800,width:400});exports.Platform={OS:'android',select:(v)=>v.android??v.default};exports.StyleSheet={hairlineWidth:1,absoluteFill:{}};exports.AccessibilityInfo={isScreenReaderEnabled:async()=>false,addEventListener:()=>({remove(){}}),announceForAccessibility(){}};exports.AppState={currentState:'active',addEventListener:()=>({remove(){}})};exports.BackHandler={addEventListener:()=>({remove(){}})};",
	"react-native-safe-area-context":
		"exports.SafeAreaView='SafeAreaView';exports.useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});",
	"react-native-keyboard-controller":
		"exports.KeyboardAvoidingView='KeyboardAvoidingView';exports.KeyboardAwareScrollView='KeyboardAwareScrollView';",
	"expo-router":
		"exports.router=new Proxy({},{get(){throw new Error('Global router unbound after activity recreation');}});exports.useRouter=()=>E.router;exports.Stack={Screen:'Stack.Screen'};exports.useLocalSearchParams=()=>E.params;",
	"expo-clipboard": "exports.setStringAsync=async()=>{};",
	"expo-document-picker": "exports.getDocumentAsync=async()=>({canceled:true});",
	"expo-file-system": "exports.File=class {};",
	"@/api/client":
		"exports.client=E.client;exports.streamClient=E.client;exports.orpc=E.orpc;exports.SessionChangedError=class extends Error {};",
	"@/auth/session": "exports.useSession=()=>E.session;exports.getAccountScope=()=>E.scope;",
	"@/draft":
		"exports.useLetterStore=(select)=>select(E.store.getState());exports.useLetterStore.getState=()=>E.store.getState();exports.useLetterStore.subscribe=(fn)=>E.store.subscribe(fn);exports.useResumeStore=(select)=>select(E.resumeStore?.getState()??{document:null,status:'idle'});exports.useResumeStore.getState=()=>E.resumeStore.getState();exports.useResumeStore.subscribe=(fn)=>E.resumeStore.subscribe(fn);",
	"@/features/ai/providers":
		"exports.useHasAIProvider=()=>E.providers;exports.AIProviderSetupSheet=(props)=>E.realSheets?E.SetupSheet(props):E.jsx('AIProviderSetupSheet',props);",
	"@/features/applications/queries":
		"exports.useApplications=()=>({data:E.apps});exports.useApplication=()=>({data:E.application});",
	"@/features/documents/queries": "exports.useDocuments=()=>({data:[]});",
	"@/shell/use-is-tablet": "exports.useIsTablet=()=>false;",
	"@/shell/workspace-chrome": "exports.useWorkspaceChrome=(value)=>E.chrome.push(value);",
	"@/features/application-detail/hooks":
		"exports.useNow=()=>new Date('2026-10-17T12:00:00Z');exports.useUserTime=()=>({day:()=>''});",
	"@/features/application-detail/interview-sheet": "exports.InterviewSheet='InterviewSheet';",
	"@/features/applications/error": "exports.applicationError=()=>'';",
	"@/features/applications/stages": "exports.getStageColor=()=>'';exports.getStageLabel=(v)=>v;",
	"@/ui":
		uiNames.map((name) => `exports.${name}='${name}';`).join("") +
		"exports.useTheme=()=>E.theme;exports.showToast=(value)=>E.toasts.push(value);exports.dismissToast=()=>{};exports.setThemePreference=()=>{};exports.Sheet=(props)=>E.realSheets?E.Sheet(props):(props.open?props.children:null);",
	"expo/fetch": "exports.fetch=async()=>{throw new Error('Unexpected network request');};",
	"react-native-reanimated":
		"exports.default={View:'AnimatedView'};exports.useSharedValue=(value)=>({value});exports.Easing={exp:0,out:(value)=>value};exports.FadeIn={};exports.FadeOut={};exports.FadeInDown={};exports.FadeOutDown={};",
	"@gorhom/bottom-sheet":
		"exports.BottomSheetModal=E.NativeModal;exports.BottomSheetBackdrop='Backdrop';exports.BottomSheetFooter='Footer';exports.BottomSheetScrollView='BottomSheetScrollView';",
	"@gorhom/portal": "exports.PortalProvider=({children})=>children;",
	"modal-contexts":
		"exports.BottomSheetModalProvider=({children})=>children;exports.BottomSheetModalInternalProvider=E.modalContext.Provider;",
	"hosting-container": "exports.BottomSheetHostingContainer=()=>null;",
	"provider-state": "exports.useHasAIProvider=()=>E.providers;",
	"overlay-motion":
		"exports.useIsWide=()=>false;exports.useReducedMotion=()=>false;exports.haptics={selection(){},warning(){},success(){}};",
	"overlay-theme": "exports.useTheme=()=>E.theme;",
	"overlay-text": "exports.Text='Text';",
	"messages-stub": "exports.MessageView='MessageView';exports.FileChip='FileChip';",
	"workspace-hooks":
		"exports.useSavedItems=()=>({data:E.savedItems,isPending:false});exports.useWorkspace=()=>({isPending:false,query:{isError:false}});",
};

env.NativeModal = NativeModal;
const scope = fileURLToPath(mobile);
const nativeSource = fileURLToPath(new URL("node_modules/@gorhom/bottom-sheet/src/", mobile));
const hook = registerHooks({
	resolve(specifier, context, next) {
		const ours =
			context.parentURL?.includes("/apps/mobile/") ||
			context.parentURL?.startsWith("completion:") ||
			context.parentURL?.includes("/@gorhom/bottom-sheet/src/");
		if (!ours) return next(specifier, context);
		if (context.parentURL?.includes("bottomSheetModalProvider/BottomSheetModalProvider")) {
			if (specifier === "../../contexts") specifier = "modal-contexts";
			if (specifier === "../bottomSheetHostingContainer") specifier = "hosting-container";
		}
		if (context.parentURL?.includes("/src/ui/overlays")) {
			if (specifier === "./motion") specifier = "overlay-motion";
			if (specifier === "./theme") specifier = "overlay-theme";
			if (specifier === "./text") specifier = "overlay-text";
		}
		if (specifier === "./provider-state" && context.parentURL?.includes("/features/ai/provider-editor"))
			specifier = "provider-state";
		if (specifier === "./messages" && context.parentURL.includes("assistant/chat-view")) specifier = "messages-stub";
		if (specifier === "./hooks" && context.parentURL.includes("workspace/shell")) specifier = "workspace-hooks";
		if (specifier in mocks) return { shortCircuit: true, url: `completion:${specifier}` };
		if (specifier.startsWith("@/")) specifier = new URL(`src/${specifier.slice(2)}`, mobile).href;
		if ((specifier.startsWith(".") || specifier.startsWith("file:")) && !/\.[mc]?[jt]sx?$/.test(specifier)) {
			for (const ext of [".ts", ".tsx", "/index.ts"]) {
				const url = new URL(specifier + ext, context.parentURL);
				if (existsSync(url)) return { shortCircuit: true, url: url.href };
			}
		}
		return next(specifier, context);
	},
	load(url, context, next) {
		if (url.startsWith("completion:"))
			return {
				shortCircuit: true,
				format: "commonjs",
				source: `const E=globalThis.__completion;${mocks[url.slice(11)]}`,
			};
		if (
			url.startsWith("file:") &&
			(fileURLToPath(url).startsWith(scope) || url.includes("/@gorhom/bottom-sheet/src/")) &&
			/\.[jt]sx?$/.test(url)
		)
			return {
				shortCircuit: true,
				format: "commonjs",
				source: transformSync(readFileSync(new URL(url), "utf8"), {
					loader: url.endsWith("x") ? "tsx" : "ts",
					format: "cjs",
					jsx: "automatic",
				}).code,
			};
		return next(url, context);
	},
});
const { LetterAssistantScreen } = requireMobile("./src/features/assistant/assistant-screen.tsx");
const { useLetterAssistantDocument } = requireMobile("./src/features/assistant/document.ts");
const { ProposedEditsCaption } = requireMobile("./src/features/assistant/page-marks.tsx");
const { ModelSheet, ProviderGate } = requireMobile("./src/features/assistant/provider.tsx");
const { ChatView } = requireMobile("./src/features/assistant/chat-view.tsx");
const { CoachSheet } = requireMobile("./src/features/workspace/coach-sheet.tsx");
const { WorkspaceScreen } = requireMobile("./src/features/workspace/shell.tsx");
const { SearchScreen } = requireMobile("./src/features/search/search-screen.tsx");
const { useAssistantChat } = requireMobile("./src/features/assistant/chat.ts");
const { acceptResumeProposals } = requireMobile("./src/features/assistant/proposals.ts");
const { letterAdapter, resumeAdapter } = requireMobile("./src/draft/adapters.ts");
const { sampleResumeData } = requireMobile("@reactive-resume/schema/resume/sample");
const { createDraftStore } = requireMobile("./src/draft/store.ts");

env.Sheet = requireMobile("./src/ui/overlays.tsx").Sheet;
env.SetupSheet = requireMobile("./src/features/ai/provider-editor.tsx").AIProviderSetupSheet;
const ModalQueue = requireMobile(
	`${nativeSource}components/bottomSheetModalProvider/BottomSheetModalProvider.tsx`,
).default;
const modalConstants = requireMobile(`${nativeSource}components/bottomSheetModal/constants.ts`);
env.defaultStack = modalConstants.DEFAULT_STACK_BEHAVIOR;
env.modalStatus = modalConstants.MODAL_STATUS;

function mount(Component, props = {}) {
	const owners = new Map();
	let seen;
	function render(node, path) {
		if (Array.isArray(node)) return node.map((v, i) => render(v, `${path}/${v?.key ?? i}`));
		if (!node || typeof node !== "object") return node;
		if (node.type?.context) {
			const context = node.type.context,
				previous = context.value;
			context.value = node.props.value;
			const rendered = render(node.props.children, `${path}/context`);
			context.value = previous;
			return { ...node, rendered };
		}
		if (typeof node.type === "function") {
			const id = `${path}/${node.type.name}:${node.key ?? ""}`;
			seen.add(id);
			let owner = owners.get(id);
			if (!owner) {
				owner = { hooks: [], effects: [], cursor: 0 };
				owners.set(id, owner);
			}
			active = owner;
			owner.cursor = 0;
			const value = node.type(node.props);
			return { ...node, rendered: render(value, id) };
		}
		return { ...node, props: { ...node.props, children: render(node.props.children, `${path}/children`) } };
	}
	const result = {
		tree: null,
		props,
		render() {
			seen = new Set();
			result.tree = render(jsx(Component, result.props), "root");
			for (const [id, owner] of owners) {
				if (!seen.has(id)) {
					for (const h of owner.hooks) h?.cleanup?.();
					owners.delete(id);
				} else for (const effect of owner.effects.splice(0)) effect();
			}
			return result.tree;
		},
		unmount() {
			for (const owner of owners.values()) for (const h of owner.hooks) h?.cleanup?.();
			owners.clear();
		},
	};
	result.render();
	return result;
}
function elements(node) {
	if (!node || typeof node !== "object") return [];
	if (Array.isArray(node)) return node.flatMap(elements);
	return [
		node,
		...elements(typeof node.type === "function" || node.type?.context ? node.rendered : node.props.children),
	];
}
const find = (owner, type, predicate = () => true) => {
	const found = elements(owner.tree).find((n) => n.type === type && predicate(n.props));
	assert.ok(found, `Missing ${type.name ?? type}`);
	return found.props;
};
const has = (owner, type) => elements(owner.tree).some((n) => n.type === type);
const press = (owner, label) => find(owner, "IconButton", (p) => p.label === label).onPress();
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function settle(owner) {
	for (let i = 0; i < 8; i++) {
		await tick();
		owner.render();
	}
}
const letter = {
	id: "letter-a",
	isLocked: false,
	name: "Letter A",
	content: "<p>Original opening.</p><p>Original closing.</p>",
	revision: 1,
	sourceApplicationId: "app-a",
};
const thread = (id, patch = {}) => ({
	id,
	title: id,
	scope: "document",
	workingResumeId: null,
	coverLetterId: "letter-a",
	aiProviderId: "p1",
	lastMessageAt: new Date(),
	...patch,
});
async function draft(kind = "letter") {
	const disk = new Map();
	const initial =
		kind === "letter"
			? letter
			: {
					id: "resume-a",
					name: "Resume A",
					isLocked: false,
					updatedAt: new Date("2026-10-17T12:00:00Z"),
					data: structuredClone(sampleResumeData),
				};
	const adapter = {
		...(kind === "letter" ? letterAdapter : resumeAdapter),
		read: async (id) => ({ ...structuredClone(initial), id }),
		parse: (v) => v,
		save: async (d) =>
			kind === "letter"
				? { ...structuredClone(d), revision: d.revision + 1 }
				: { ...structuredClone(d), updatedAt: new Date(+d.updatedAt + 1000) },
		copy: async () => {},
	};
	const instance = createDraftStore(adapter, {
		scope: async () => env.scope,
		online: () => true,
		focused: () => false,
		storage: {
			getItemSync: (k) => disk.get(k) ?? null,
			setItemSync: (k, v) => disk.set(k, v),
			removeItemSync: (k) => disk.delete(k),
		},
	});
	if (kind === "letter") env.store = instance.store;
	else env.resumeStore = instance.store;
	await instance.store.getState().open(initial.id);
	return instance;
}
const proposals = [
	{
		id: "e1",
		target: { sectionId: "letter", field: "content" },
		location: "Letter",
		before: "<p>Original opening.</p>",
		after: "<p>New opening.</p>",
		why: "Clearer",
		status: "pending",
		source: "assistant",
	},
	{
		id: "e2",
		target: { sectionId: "letter", field: "content" },
		location: "Letter",
		before: "<p>Original closing.</p>",
		after: "<p>New closing.</p>",
		why: "Clearer",
		status: "pending",
		source: "assistant",
	},
];
let passed = 0;
async function check(name, run, timed = false) {
	if (process.env.COMPLETION_SCENARIO && !name.includes(process.env.COMPLETION_SCENARIO)) return;
	env.calls = [];
	env.chrome = [];
	env.toasts = [];
	env.resumeStore = null;
	env.scope = "server/account-a";
	env.realSheets = false;
	env.providers.providers = [];
	env.providers.hasAIProvider = true;
	env.threadError = null;
	env.threads = [];
	env.apps = [{ id: "app-a", company: "Northwind", role: "Engineer", updatedAt: new Date(), tags: [] }];
	if (timed) mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10000 });
	try {
		await draft();
		await run();
	} finally {
		await env.store.getState().close();
		await env.resumeStore?.getState().close();
		if (timed) mock.timers.reset();
	}
	console.log(`PASS ${name}`);
	passed++;
}

await check("Search opens the selected letter thread, not its editor or latest thread", () => {
	env.threads = [thread("Selected conversation")];
	const screen = mount(SearchScreen);
	find(screen, "TextInput").onChangeText("Selected");
	screen.render();
	find(screen, "ListRow", (p) => p.title === "Selected conversation").onPress();
	assert.deepEqual(env.calls.find((c) => c[0] === "dismissTo")?.[1], {
		pathname: "/letter/letter-a/assistant",
		params: { thread: "Selected conversation" },
	});
	screen.unmount();
});
await check(
	"Letter history reopens exact selection; mismatched and missing links cannot mount chat or redirect",
	() => {
		env.threads = [thread("latest"), thread("chosen"), thread("other", { coverLetterId: "letter-b" })];
		env.saved.set("chosen", { thread: {}, messages: [], isReadOnly: false });
		const screen = mount(LetterAssistantScreen, { letterId: "letter-a", threadId: "chosen" });
		assert.equal(find(screen, ChatView).threadId, "chosen");
		assert.equal(find(screen, ChatView).document.kind, "letter");
		assert.deepEqual(find(screen, ChatView).context, { document: true, posting: true, applicationId: "app-a" });
		assert.match(find(screen, ChatView).privacy, /this letter and the posting/);
		screen.unmount();
		for (const id of ["other", "missing"]) {
			const invalid = mount(LetterAssistantScreen, { letterId: "letter-a", threadId: id });
			assert.equal(has(invalid, ChatView), false);
			assert.equal(
				env.calls.some((c) => c[0] === "replace" || c[0] === "push"),
				false,
			);
			invalid.unmount();
		}
	},
);
await check(
	"Assistant navigation survives unbound global router and preserves another document's selected thread",
	() => {
		const caption = mount(ProposedEditsCaption, { resumeId: "resume-a", pending: 1 });
		find(caption, "Button", (p) => p.label === "Review").onPress();
		assert.deepEqual(env.calls.at(-1), ["push", "/builder/resume-a/assistant"]);
		caption.unmount();
		const models = mount(ModelSheet, { open: true, onClose() {}, providers: [], onChoose() {} });
		find(models, "ListRow", (p) => p.title === "Connect another…").onPress();
		assert.deepEqual(env.calls.at(-1), ["push", "/settings/ai-providers"]);
		models.unmount();
		env.providers.hasAIProvider = false;
		const gate = mount(ProviderGate, {
			providers: env.providers,
			threadsError: null,
			loading: false,
			onRetry() {},
			notSetUp: "Unavailable",
		});
		find(gate, "Button", (p) => p.label === "Open AI settings").onPress();
		assert.deepEqual(env.calls.at(-1), ["push", "/settings/ai-providers"]);
		gate.unmount();
		env.providers.hasAIProvider = true;
		for (const [target, documentPath, assistantPath] of [
			[thread("letter-chosen", { coverLetterId: "letter-b" }), "/letter/letter-b/write", "/letter/letter-b/assistant"],
			[
				thread("resume-chosen", { coverLetterId: null, workingResumeId: "resume-b" }),
				"/builder/resume-b/write",
				"/builder/resume-b/assistant",
			],
		]) {
			env.threads = [target];
			const screen = mount(LetterAssistantScreen, { letterId: "letter-a" });
			press(screen, "Past conversations");
			screen.render();
			find(screen, "ListRow", (p) => p.title === target.title).onPress();
			assert.deepEqual(env.calls.slice(-2), [
				["replace", documentPath],
				["push", { pathname: assistantPath, params: { thread: target.id } }],
			]);
			screen.unmount();
		}
	},
);
await check("New letter chat uses coverLetterId; history switches discard unsent chat state", async () => {
	env.threads = [thread("latest"), thread("earlier")];
	env.saved.set("latest", { thread: {}, messages: [], isReadOnly: false });
	env.saved.set("earlier", { thread: {}, messages: [], isReadOnly: false });
	const screen = mount(LetterAssistantScreen, { letterId: "letter-a" });
	press(screen, "New conversation");
	screen.render();
	await find(screen, ChatView).createThread(env.scope);
	assert.deepEqual(env.calls.find((c) => c[0] === "start").slice(1), [
		{ coverLetterId: "letter-a", aiProviderId: "p1" },
		{ context: { scope: env.scope } },
	]);
	press(screen, "Past conversations");
	screen.render();
	find(screen, "ListRow", (p) => p.title === "earlier").onPress();
	screen.render();
	assert.equal(find(screen, ChatView).threadId, "earlier");
	screen.unmount();
});
await check(
	"Letter proposals edit actual draft in one undo step, stale edits stay stale; Undo cannot touch another letter/account",
	async () => {
		let document;
		const probe = mount(() => {
			document = useLetterAssistantDocument("letter-a");
			return null;
		});
		document.accept(proposals);
		assert.equal(env.store.getState().data.content, "<p>New opening.</p><p>New closing.</p>");
		env.toasts.at(-1).action.onPress();
		assert.equal(env.store.getState().data.content, letter.content);
		assert.equal(env.store.getState().canUndo, false);
		env.store.getState().update((d) => {
			d.content = "<p>Typed meanwhile.</p>";
		});
		probe.render();
		assert.equal(document.stateOf(proposals[0]), "stale");
		document.accept(proposals);
		assert.equal(env.store.getState().data.content, "<p>Typed meanwhile.</p>");
		const undo = env.toasts.at(-1).action.onPress;
		await env.store.getState().open("letter-b");
		const other = env.store.getState();
		document.accept(proposals);
		undo();
		assert.equal(env.store.getState(), other);
		await env.store.getState().open("letter-a");
		env.scope = "server/account-b";
		const before = env.store.getState();
		document.accept(proposals);
		undo();
		assert.equal(env.store.getState(), before);
		probe.unmount();
	},
);

async function proposalDraft(kind) {
	if (kind === "resume") await draft(kind);
	const store = kind === "letter" ? env.store : env.resumeStore;
	let document;
	const probe = mount(() => {
		if (kind === "letter") document = useLetterAssistantDocument("letter-a");
		return null;
	});
	const contentOf = (data) => (kind === "letter" ? data.content : data.summary.content);
	const proposal =
		kind === "letter"
			? proposals[0]
			: {
					...proposals[0],
					target: { sectionId: "summary", field: "content" },
					before: contentOf(store.getState().data),
				};
	return {
		store,
		probe,
		contentOf,
		accept: () => (kind === "letter" ? document.accept([proposal]) : acceptResumeProposals([proposal])),
	};
}

for (const kind of ["letter", "resume"]) {
	await check(`${kind} proposal toast refuses Undo after subsequent typing`, async () => {
		const { store, probe, contentOf, accept } = await proposalDraft(kind);
		accept();
		const undo = env.toasts.at(-1).action.onPress;
		probe.unmount(); // Closing Assistant keeps its toast, while the builder draft owner stays mounted.
		store.getState().update(
			(data) => {
				if (kind === "letter") data.content += "<p>Later typing.</p>";
				else data.summary.content += "<p>Later typing.</p>";
			},
			{ newStep: true },
		);
		const typed = contentOf(store.getState().data);
		undo();
		assert.equal(contentOf(store.getState().data), typed, "proposal toast must never undo later typing");
		store.getState().undo();
		assert.ok(
			!contentOf(store.getState().data).includes("Later typing"),
			"typing remains a separate builder Undo step",
		);
		const accepted = contentOf(store.getState().data);
		undo();
		assert.equal(
			contentOf(store.getState().data),
			accepted,
			"invalidated toast stays invalid after returning to accepted text",
		);
	});
	await check(
		`${kind} proposal toast still undoes acceptance after save at 11 seconds in screen-reader window`,
		async () => {
			const { store, probe, contentOf, accept } = await proposalDraft(kind);
			const before = contentOf(store.getState().data);
			accept();
			const undo = env.toasts.at(-1).action.onPress;
			const accepted = store.getState().data;
			await store.getState().flush();
			assert.equal(store.getState().status, "saved");
			if (kind === "letter") {
				assert.notEqual(store.getState().data, accepted);
				assert.equal(store.getState().data.revision, accepted.revision + 1);
			}
			mock.timers.tick(11000);
			await tick();
			probe.unmount();
			undo();
			assert.equal(contentOf(store.getState().data), before, "metadata-only save must not invalidate proposal Undo");
			assert.equal(store.getState().canUndo, false);
			if (kind === "letter")
				assert.equal(store.getState().data.revision, accepted.revision + 1, "Undo preserves saved revision metadata");
		},
		true,
	);
	await check(
		`${kind} proposal toast refuses edits back to accepted text after six seconds`,
		async () => {
			const { store, probe, contentOf, accept } = await proposalDraft(kind);
			accept();
			const undo = env.toasts.at(-1).action.onPress;
			const accepted = contentOf(store.getState().data);
			probe.unmount();
			mock.timers.tick(6100);
			await tick();
			store.getState().update((data) => {
				if (kind === "letter") data.content = "<p>Intervening typing.</p>";
				else data.summary.content = "<p>Intervening typing.</p>";
			});
			mock.timers.tick(1100); // Separate history steps, past the draft coalescing interval.
			await tick();
			store.getState().update((data) => {
				if (kind === "letter") data.content = accepted;
				else data.summary.content = accepted;
			});
			undo();
			assert.equal(
				contentOf(store.getState().data),
				accepted,
				"12-second accessible action must not undo intervening typing",
			);
			store.getState().undo();
			assert.equal(
				contentOf(store.getState().data),
				"<p>Intervening typing.</p>",
				"returning to accepted text created its own Undo step",
			);
		},
		true,
	);
	await check(
		`${kind} proposal toast expires eligibility after its accessible lifetime`,
		async () => {
			const { store, probe, contentOf, accept } = await proposalDraft(kind);
			accept();
			const undo = env.toasts.at(-1).action.onPress;
			const accepted = contentOf(store.getState().data);
			mock.timers.tick(12001);
			await tick();
			probe.unmount();
			undo();
			assert.equal(
				contentOf(store.getState().data),
				accepted,
				"a retained callback cannot Undo after its monitor expires",
			);
			assert.equal(store.getState().canUndo, true, "builder Undo history remains available");
		},
		true,
	);
}

await check(
	"Letter history proposals accept/reject persist on selected thread and Undo restores pending status",
	() => {
		env.threads = [thread("chosen")];
		const part = {
			type: "tool-propose_edits",
			state: "output-available",
			toolCallId: "tool-1",
			output: { edits: proposals },
		};
		const message = { id: "assistant-1", role: "assistant", parts: [part] };
		env.saved.set("chosen", { thread: {}, messages: [message], isReadOnly: false });
		const screen = mount(LetterAssistantScreen, { letterId: "letter-a", threadId: "chosen" });
		find(screen, "MessageView").proposals.onAccept(message, part, proposals);
		assert.equal(env.store.getState().data.content, "<p>New opening.</p><p>New closing.</p>");
		assert.deepEqual(env.calls.find((c) => c[0] === "edit-status").slice(1), [
			{
				threadId: "chosen",
				messageId: "assistant-1",
				toolCallId: "tool-1",
				edits: [
					{ id: "e1", status: "accepted" },
					{ id: "e2", status: "accepted" },
				],
			},
			{ context: { scope: env.scope } },
		]);
		screen.render();
		env.toasts.at(-1).action.onPress();
		screen.render();
		assert.ok(env.calls.some((c) => c[0] === "edit-status" && c[1].edits.every((edit) => edit.status === "pending")));
		find(screen, "MessageView").proposals.onReject(message, part, [proposals[0]]);
		assert.equal(env.calls.at(-1)[1].edits[0].status, "rejected");
		assert.equal(env.store.getState().data.content, letter.content);
		screen.unmount();
	},
);
await check("Letter sends flush draft; conflict or changed account blocks model reads", async () => {
	let document;
	const probe = mount(() => {
		document = useLetterAssistantDocument("letter-a");
		return null;
	});
	env.store.getState().update((d) => {
		d.content = "<p>Unsaved typing.</p>";
	});
	assert.equal(await document.flush(), true);
	assert.equal(env.store.getState().status, "saved");
	env.store.setState({ conflict: { remote: letter } });
	assert.equal(await document.flush(), false);
	env.scope = "server/account-b";
	assert.equal(await document.flush(), false);
	probe.unmount();
});
await check("Removing document context permits chat without saving a conflicting draft", async () => {
	env.threads = [thread("chosen")];
	env.saved.set("chosen", { thread: {}, messages: [], isReadOnly: false });
	env.store.setState({ conflict: { remote: letter } });
	const screen = mount(LetterAssistantScreen, { letterId: "letter-a", threadId: "chosen" });
	const chip = elements(screen.tree).find((n) => n.type?.name === "ContextChip" && n.props.label === "Letter A");
	assert.ok(chip);
	chip.props.onRemove();
	screen.render();
	find(screen, "TextInput").onChangeText("A question without my letter");
	screen.render();
	find(screen, "Pressable", (p) => p.accessibilityLabel === "Send").onPress();
	await settle(screen);
	const sent = env.calls.find((c) => c[0] === "send");
	assert.ok(sent);
	assert.equal(sent[1].context.document, false);
	screen.unmount();
});
await check(
	"Workspace coach reopens application-only history, creates application scope, fixes context and tab, obeys provider gate",
	async () => {
		const application = { id: "app-a", company: "Northwind" };
		env.threads = [
			thread("career", { scope: "career", coverLetterId: null }),
			thread("other-job", { scope: "application", applicationId: "app-b", coverLetterId: null }),
			thread("job-latest", { scope: "application", applicationId: "app-a", coverLetterId: null }),
			thread("job-earlier", { scope: "application", applicationId: "app-a", coverLetterId: null }),
		];
		for (const id of ["job-latest", "job-earlier"]) env.saved.set(id, { thread: {}, messages: [], isReadOnly: false });
		const sheet = mount(CoachSheet, { application, tab: "apply", open: true, onClose() {} });
		assert.equal(find(sheet, ChatView).threadId, "job-latest");
		assert.equal(find(sheet, ChatView).document, null);
		assert.deepEqual(find(sheet, ChatView).context, {
			document: true,
			posting: true,
			application: true,
			memory: true,
			web: false,
			tab: "apply",
		});
		press(sheet, "Conversations");
		sheet.render();
		assert.deepEqual(
			elements(sheet.tree)
				.filter((n) => n.type === "ListRow")
				.map((n) => n.props.title),
			["New conversation", "job-latest", "job-earlier"],
		);
		find(sheet, "ListRow", (p) => p.title === "job-earlier").onPress();
		sheet.render();
		assert.equal(find(sheet, ChatView).threadId, "job-earlier");
		press(sheet, "New conversation");
		sheet.render();
		await find(sheet, ChatView).createThread(env.scope);
		assert.deepEqual(env.calls.find((c) => c[0] === "start")[1], {
			scope: "application",
			applicationId: "app-a",
			aiProviderId: "p1",
		});
		find(sheet, "TextInput").onChangeText("Help with this job");
		sheet.render();
		find(sheet, "Pressable", (p) => p.accessibilityLabel === "Send").onPress();
		await settle(sheet);
		assert.equal(find(sheet, ChatView).threadId, "created");
		const sent = env.calls.find((c) => c[0] === "send");
		assert.ok(sent, "new application chat must send before the thread list refreshes");
		assert.equal(sent[1].threadId, "created");
		assert.equal(sent[1].context.web, false);
		sheet.props.tab = "prepare";
		sheet.render();
		assert.equal(find(sheet, ChatView).context.tab, "prepare");
		sheet.props.open = false;
		sheet.render();
		assert.equal(has(sheet, ChatView), false);
		sheet.props.open = true;
		env.providers.hasAIProvider = false;
		sheet.render();
		assert.equal(find(sheet, ChatView).disabled, true);
		sheet.unmount();
	},
);
await check("Workspace conversations remain readable without a provider; empty history offers a way back", () => {
	env.providers.hasAIProvider = false;
	env.threads = [
		thread("job", { scope: "application", applicationId: "app-a", coverLetterId: null }),
		thread("other", { scope: "application", applicationId: "app-b", coverLetterId: null }),
	];
	env.saved.set("job", {
		thread: {},
		messages: [{ id: "old", role: "assistant", parts: [{ type: "text", text: "Earlier reply" }] }],
		isReadOnly: false,
	});
	const sheet = mount(CoachSheet, {
		application: { id: "app-a", company: "Northwind" },
		tab: "apply",
		open: true,
		onClose() {},
	});
	press(sheet, "Conversations");
	sheet.render();
	find(sheet, "ListRow", (p) => p.title === "job").onPress();
	sheet.render();
	assert.equal(find(sheet, ChatView).threadId, "job");
	assert.equal(find(sheet, ChatView).disabled, true, "history must not allow sends without a usable provider");
	assert.equal(find(sheet, "MessageView").message.parts[0].text, "Earlier reply");
	press(sheet, "Conversations");
	env.threads = [];
	sheet.render();
	find(sheet, "ListRow", (p) => p.title === "New conversation").onPress();
	sheet.render();
	find(sheet, "Button", (p) => p.label === "Connect");
	assert.equal(
		env.calls.some((c) => c[0] === "send" || c[0] === "start"),
		false,
	);
	sheet.unmount();
});
await check(
	"Nested provider setup keeps Coach presented through installed modal queue, then closes only itself",
	async () => {
		env.realSheets = true;
		env.providers.hasAIProvider = false;
		env.nativeCalls = [];
		env.nativeRecords.clear();
		let closed = 0;
		const screen = mount(() =>
			jsx(ModalQueue, {
				children: jsx(CoachSheet, {
					application: { id: "app-a", company: "Northwind" },
					tab: "apply",
					open: true,
					onClose: () => {
						closed++;
					},
				}),
			}),
		);
		await settle(screen);
		find(screen, "Button", (p) => p.label === "Connect").onPress();
		await settle(screen);
		find(screen, "TextField", (p) => p.label === "API key");
		assert.equal(
			env.nativeCalls.some(([event]) => event === "minimize"),
			false,
			"presenting setup must not minimize the parent Coach",
		);
		assert.equal(closed, 0);
		const setupId = env.nativeCalls.filter(([event]) => event === "present").at(-1)[1];
		env.nativeRecords.get(setupId).dismiss();
		await settle(screen);
		assert.equal(closed, 0, "closing setup must not close Coach");
		find(screen, "Button", (p) => p.label === "Connect");
		assert.equal(has(screen, "TextField"), false);
		screen.unmount();
		env.realSheets = false;
	},
);

await check("Document assistant history stays readable without a provider and sending stays disabled", () => {
	env.providers.hasAIProvider = false;
	env.threads = [thread("chosen")];
	env.saved.set("chosen", { thread: {}, messages: [], isReadOnly: false });
	const screen = mount(LetterAssistantScreen, { letterId: "letter-a", threadId: "chosen" });
	press(screen, "Past conversations");
	screen.render();
	find(screen, "ListRow", (p) => p.title === "chosen").onPress();
	screen.render();
	assert.equal(find(screen, ChatView).threadId, "chosen");
	assert.equal(find(screen, ChatView).disabled, true);
	screen.unmount();
});
await check(
	"Workspace mounts no second tablist and fills real company/role plus countdown, unread and saved badges",
	() => {
		env.application = {
			id: "app-a",
			company: "Northwind",
			role: "Engineer",
			status: "interview",
			activity: [{ type: "interview", id: "i1", at: "2026-10-17T12:30:00Z", durationMinutes: 30 }],
		};
		env.savedItems = [{ id: "reply", data: { kind: "reply", changes: [{}], applied: false } }];
		env.params = { id: "app-a" };
		const screen = mount(WorkspaceScreen, { tab: "apply", children: () => null });
		assert.equal(elements(screen.tree).filter((n) => n.props.accessibilityRole === "tablist").length, 0);
		assert.ok(env.chrome.some((v) => v.title === "Northwind" && v.subtitle === "Engineer"));
		const badges = env.chrome.find((v) => v.badges)?.badges;
		assert.ok(badges.messages);
		assert.ok(badges.saved);
		assert.ok(badges.prepare);
		assert.equal(badges.prepare.props.children.props.children, "30 min");
		assert.equal(badges.messages.props.children.props.children, "1");
		assert.equal(badges.saved.props.children.props.children, "1");
		screen.unmount();
	},
);
await check("Late thread creation after unmount cannot reopen chat or send", async () => {
	let release;
	env.hold = new Promise((r) => {
		release = r;
	});
	let created = 0;
	const screen = mount(ChatView, {
		threadId: null,
		createThread: async (scope) =>
			(await env.client.agent.threads.start({ coverLetterId: "letter-a" }, { context: { scope } })).id,
		onThreadCreated: () => {
			created++;
		},
		context: { document: true, posting: true },
		document: null,
		connection: "Fixture",
		privacy: "",
		placeholder: "",
		assistantName: "Assistant",
	});
	find(screen, "TextInput").onChangeText("Hello");
	screen.render();
	find(screen, "Pressable", (p) => p.accessibilityLabel === "Send").onPress();
	await tick();
	screen.unmount();
	env.scope = "server/account-b";
	release();
	await tick();
	await tick();
	assert.equal(created, 0);
	assert.equal(
		env.calls.some((c) => c[0] === "send"),
		false,
	);
	env.hold = null;
});
await check(
	"Real Chat waits for draft confirmation; failed flush sends nothing and requests keep account scope",
	async () => {
		let chat;
		let saved = false;
		const probe = mount(() => {
			chat = useAssistantChat({
				threadId: "chosen",
				initialMessages: [],
				context: { document: true, posting: true, applicationId: "app-a" },
				scope: env.scope,
				beforeSend: async () => saved,
				onFinish() {},
			});
			return null;
		});
		await chat.sendMessage({ text: "Improve" });
		assert.equal(
			env.calls.some((c) => c[0] === "send"),
			false,
		);
		saved = true;
		chat.clearError();
		await chat.sendMessage({ text: "Try again" });
		assert.equal(env.calls.filter((c) => c[0] === "send").length, 1);
		assert.equal(env.calls.find((c) => c[0] === "send")[2].context.scope, env.scope);
		probe.unmount();
	},
);
hook.deregister();
delete globalThis.__completion;
console.log(`${passed} completion integration scenarios passed`);
