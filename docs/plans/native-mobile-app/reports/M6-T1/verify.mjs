// Run from repository root: node docs/plans/native-mobile-app/reports/M6-T1/verify.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const root = fileURLToPath(new URL("../../../../../", import.meta.url));
const serverRequire = createRequire(resolve(root, "apps/server/package.json"));
const { transformSync } = createRequire(serverRequire.resolve("tsx"))("esbuild");
let clock = Date.parse("2026-10-17T10:00:00Z"),
	nextTimer = 0,
	active;
const timers = new Map(),
	listeners = new Set(),
	toasts = new Map(),
	calls = [];
const later = (work, delay) => {
	const id = ++nextTimer;
	timers.set(id, { work, at: clock + delay });
	return id;
};
const tick = async () => {
	for (let n = 0; n < 10; n++) await Promise.resolve();
};
async function advance(ms) {
	clock += ms;
	for (const [id, timer] of [...timers])
		if (timer.at <= clock) {
			timers.delete(id);
			timer.work();
		}
	await tick();
}
const tag = (parts, ...values) =>
	typeof parts === "object" && !Array.isArray(parts)
		? parts.message
		: parts.reduce((text, part, i) => text + part + (values[i] ?? ""), "");
let session = { server: "https://fixture.invalid", status: "signed-in" },
	fail = false,
	holding = null;
let applications = [];
let sheetWide = false;
const account = { id: "fixture-account", timezone: "Europe/Berlin", emailVerified: true };
const react = {
	createContext: (value) => ({ value }),
	use: (context) => context.value,
	createElement: (type, props, ...children) => ({
		type,
		props: { ...props, ...(children.length ? { children } : {}) },
	}),
	useState(initial) {
		const owner = active,
			index = owner.cursor++;
		if (!(index in owner.state)) owner.state[index] = typeof initial === "function" ? initial() : initial;
		return [
			owner.state[index],
			(value) => {
				owner.state[index] = typeof value === "function" ? value(owner.state[index]) : value;
			},
		];
	},
	useRef(initial) {
		const owner = active,
			index = owner.cursor++;
		return (owner.state[index] ??= { current: initial });
	},
	useEffect(effect, deps) {
		const owner = active,
			index = owner.cursor++,
			old = owner.state[index];
		if (!old || !deps || deps.some((dep, i) => !Object.is(dep, old.deps?.[i]))) {
			owner.effects.push(() => {
				old?.cleanup?.();
				owner.state[index] = { deps, cleanup: effect() };
			});
		}
	},
	useCallback(callback, deps) {
		const owner = active,
			index = owner.cursor++,
			old = owner.state[index];
		if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) owner.state[index] = { callback, deps };
		return owner.state[index].callback;
	},
};
react.useLayoutEffect = react.useEffect;
const ui = Object.fromEntries(
	[
		"Banner",
		"Button",
		"Card",
		"Chip",
		"ChipInput",
		"ConfirmDialog",
		"EmptyState",
		"Screen",
		"Segmented",
		"SelectSheet",
		"Sheet",
		"Skeleton",
		"Switch",
		"Text",
		"TextArea",
		"TextField",
	].map((key) => [key, key]),
);
ui.useTheme = () => ({ colors: {}, radius: {}, shadows: { e3: {} }, space: { s1: 4, s2: 8, s3: 12, s4: 16, s6: 24 }, size: { panel: 400 } });
ui.showToast = (options) => {
	const id = toasts.size + 1;
	toasts.set(id, options);
	return id;
};
ui.dismissToast = (id) => toasts.delete(id);
ui.toastLifetime = (ms) => ms;
const appState = {
	addEventListener(_name, callback) {
		listeners.add(callback);
		return { remove: () => listeners.delete(callback) };
	},
};
const apiPath = (path = []) =>
	new Proxy(() => {}, {
		get(_target, name) {
			if (name === "key") return () => path;
			if (name === "queryOptions") return () => ({ queryKey: path });
			return apiPath([...path, name]);
		},
	});
const rpc = new Proxy(
	{},
	{
		get(_target, namespace) {
			return new Proxy(
				{},
				{
					get(_target2, method) {
						return async (input) => {
							calls.push([`${namespace}.${method}`, input]);
							if (holding) await holding;
							if (fail) throw new Error("Synthetic transport failure");
							return input;
						};
					},
				},
			);
		},
	},
);
const queries = new Map();
const queryClient = { getQueryData: () => account, invalidateQueries: async () => {}, setQueryData: () => {} };
const mocks = {
	react,
	"react/jsx-runtime": {
		jsx: (type, props) => ({ type, props }),
		jsxs: (type, props) => ({ type, props }),
		Fragment: "Fragment",
	},
	"@lingui/core/macro": {
		t: tag,
		plural: (count, forms) =>
			(forms[new Intl.PluralRules("en").select(count)] ?? forms.other).replaceAll("#", String(count)),
	},
	"@lingui/react/macro": { useLingui: () => ({ t: tag, i18n: { locale: "en-US" } }) },
	"expo-crypto": { randomUUID },
	"@lingui/react": { useLingui: () => ({ i18n: { locale: "en-US" } }) },
	"react-native": {
		AppState: appState,
		Platform: { OS: "ios" },
		View: "View",
		Pressable: "Pressable",
		StyleSheet: { hairlineWidth: 1 },
		AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener() {} },
		ScrollView: "ScrollView",
		Modal: "Modal",
		KeyboardAvoidingView: "KeyboardAvoidingView",
		useWindowDimensions: () => ({ width: 390, height: 844 }),
	},
	"@/ui": ui,
	"@gorhom/bottom-sheet": { BottomSheetModal: "BottomSheetModal", BottomSheetBackdrop: "BottomSheetBackdrop", BottomSheetScrollView: "BottomSheetScrollView" },
	"react-native-reanimated": {},
	"@/auth/session": { useSession: () => session, getServer: () => session.server },
	"@/api/client": { client: rpc, orpc: apiPath() },
	"@tanstack/react-query": {
		useQueryClient: () => queryClient,
		useQuery: (options) => ({
			data: queries.get(options.queryKey.slice(0, 2).join(".")),
			isError: false,
			isPending: false,
			refetch: async () => {},
		}),
	},
	"@/features/settings/queries": {
		useProfile: () => ({ data: account, isError: false, isPending: false, refetch: async () => {} }),
	},
	"expo-router": {
		useRouter: () => ({ push: (href) => calls.push(["navigate", href]) }),
		Stack: { Screen: "StackScreen" },
	},
	"expo-web-browser": { openBrowserAsync: async () => {} },
	"@react-native-community/datetimepicker": { __esModule: true, default: "DateTimePicker" },
	"@/features/ai/providers": {
		useHasAIProvider: () => ({
			hasAIProvider: true,
			usableProviders: [{ id: "tested", label: "Tested" }],
			defaultProvider: { id: "tested", label: "Tested" },
		}),
		AIProviderSetupSheet: "AIProviderSetupSheet",
	},
	"@/features/applications/queries": {
		useApplications: () => ({ data: applications, isPending: false, isError: false }),
	},
};
const cache = new Map();
function load(path) {
	path = resolve(root, path);
	if (!existsSync(path)) path += existsSync(`${path}.ts`) ? ".ts" : ".tsx";
	if (cache.has(path)) return cache.get(path).exports;
	const module = { exports: {} };
	cache.set(path, module);
	const source = transformSync(readFileSync(path, "utf8"), {
		loader: path.endsWith("tsx") ? "tsx" : "ts",
		format: "cjs",
		jsx: "automatic",
		target: "es2022",
	}).code;
	const localRequire = (name) => {
		if (path.endsWith("/application-detail/interview-sheet.tsx") && name === "./hooks") return mocks["interview-hooks"];
		if (path.endsWith("/ui/overlays.tsx")) {
			if (name === "./button") return { Button: "Button" };
			if (name === "./theme") return { useTheme: ui.useTheme };
			if (name === "./text") return { Text: "Text" };
			if (name === "./motion") return { useIsWide: () => sheetWide, haptics: { selection() {} } };
			if (name === "./safe-area") return { useWindowSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) };
		}
		if (mocks[name]) return mocks[name];
		if (name === "@reactive-resume/utils/timezone") return load("packages/utils/src/timezone.ts");
		if (name === "@reactive-resume/schema/career") return load("packages/schema/src/career.ts");
		if (name.startsWith("@/")) return load(`apps/mobile/src/${name.slice(2)}`);
		if (name.startsWith(".")) return load(resolve(dirname(path), name));
		return createRequire(path)(name);
	};
	const FixedDate = class extends Date {
		constructor(...args) {
			super(...(args.length ? args : [clock]));
		}
		static now() {
			return clock;
		}
	};
	const execute = vm.runInNewContext(
		`(function(require,module,exports){${source}\n})`,
		{
			Date: FixedDate,
			Intl,
			URL,
			console,
			setTimeout: later,
			clearTimeout: (id) => timers.delete(id),
			setInterval: () => -1,
			clearInterval() {},
		},
		{ filename: path },
	);
	execute(localRequire, module, module.exports);
	return module.exports;
}
function mount(component, props = {}) {
	const owner = {
		state: [],
		cursor: 0,
		effects: [],
		props,
		component,
		tree: null,
		render() {
			active = this;
			this.cursor = 0;
			this.tree = this.component(this.props);
			active = null;
			for (const effect of this.effects.splice(0)) effect();
			return this.tree;
		},
		unmount() {
			for (const state of this.state) state?.cleanup?.();
		},
	};
	owner.render();
	return owner;
}
function nodes(node, result = []) {
	if (!node) return result;
	if (Array.isArray(node)) {
		node.forEach((value) => nodes(value, result));
		return result;
	}
	if (typeof node !== "object") return result;
	result.push(node);
	nodes(node.props?.children, result);
	return result;
}
const find = (owner, type, label) => {
	const node = nodes(owner.tree).find(
		(node) => node.type === type && (label === undefined || node.props.label === label),
	);
	assert.ok(node, `${type} ${label}`);
	return node.props;
};
const edit = (owner, label, value) => {
	find(owner, "TextField", label).onChangeText(value);
	owner.render();
};
const click = (owner, label) => {
	const button = find(owner, "Button", label);
	assert.ok(!button.disabled);
	button.onPress();
	owner.render();
};
let checks = 0;
async function check(name, work) {
	if (process.env.M6_SCENARIO && !name.includes(process.env.M6_SCENARIO)) return;
	await work();
	checks++;
	console.log(`PASS ${name}`);
}
const scheduling = load("apps/mobile/src/features/career/scheduling.ts");
const timezone = load("packages/utils/src/timezone.ts");
const iso = (date) => date.toISOString();
await check("account wall time differs from device timezone", () => {
	assert.deepEqual(JSON.parse(JSON.stringify(scheduling.toZoned(new Date("2026-10-17T10:00:00Z"), "Asia/Kolkata"))), {
		date: "2026-10-17",
		time: "15:30",
	});
	assert.equal(iso(timezone.fromZonedDateTime("2026-10-17", "15:30", "Asia/Kolkata")), "2026-10-17T10:00:00.000Z");
});
await check("manual dates reject invalid calendar and skipped DST minutes", () => {
	for (const [date, time] of [
		["2026-02-30", "08:00"],
		["2026-03-29", "02:30"],
		["2026-10-17", "25:00"],
	])
		assert.equal(timezone.fromZonedDateTime(date, time, "Europe/Berlin"), null);
});
await check("recurring discovery preserves wall time across both DST changes", () => {
	assert.equal(
		iso(scheduling.nextCareerRun(new Date("2026-03-28T07:00Z"), 1, "Europe/Berlin")),
		"2026-03-29T06:00:00.000Z",
	);
	assert.equal(
		iso(scheduling.nextCareerRun(new Date("2026-10-24T06:00Z"), 1, "Europe/Berlin")),
		"2026-10-25T07:00:00.000Z",
	);
});
await check("recurring nonexistent time advances forward", () => {
	assert.equal(
		iso(scheduling.nextCareerRun(new Date("2026-03-28T01:30Z"), 1, "Europe/Berlin")),
		"2026-03-29T01:30:00.000Z",
	);
});
await check("paused discovery coalesces missed runs into next future local run", () => {
	assert.equal(
		iso(scheduling.rollForward(new Date("2026-10-20T06:00Z"), 3, "Europe/Berlin", new Date("2026-10-27T12:00Z"))),
		"2026-10-29T07:00:00.000Z",
	);
});
await check("morning briefing uses 08:00 or two hours before early interview", () => {
	assert.equal(
		iso(scheduling.prepareRunAt(new Date("2026-10-19T14:00Z"), "morning", "Europe/Berlin")),
		"2026-10-19T06:00:00.000Z",
	);
	assert.equal(
		iso(scheduling.prepareRunAt(new Date("2026-10-19T07:00Z"), "morning", "Europe/Berlin")),
		"2026-10-19T05:00:00.000Z",
	);
	assert.equal(
		iso(scheduling.prepareRunAt(new Date("2026-10-25T15:00Z"), "24h", "Europe/Berlin")),
		"2026-10-24T15:00:00.000Z",
	);
});
const { withUndo } = load("apps/mobile/src/features/career/undo.ts");
await check("Undo waits six seconds and commits exactly once", async () => {
	let commits = 0;
	const operation = withUndo({
		message: "Fixture",
		commit: async () => commits++,
		restore() {},
		failed() {
			assert.fail();
		},
	});
	await advance(5999);
	assert.equal(commits, 0);
	await advance(1);
	assert.equal(commits, 1);
	operation.flush();
	await tick();
	assert.equal(commits, 1);
	assert.equal(listeners.size, 0);
});
await check("Undo cancels commit and restores immediately", async () => {
	let restored = 0;
	withUndo({
		message: "Fixture",
		commit: async () => assert.fail(),
		restore: () => restored++,
		failed() {
			assert.fail();
		},
	});
	[...toasts.values()].at(-1).action.onPress();
	await advance(6001);
	assert.equal(restored, 1);
	assert.equal(listeners.size, 0);
});
await check("background flush commits once; later timer and Undo cannot repeat it", async () => {
	let commits = 0,
		restores = 0;
	withUndo({
		message: "Fixture",
		commit: async () => commits++,
		restore: () => restores++,
		failed() {
			assert.fail();
		},
	});
	const undo = [...toasts.values()].at(-1).action;
	for (const listener of [...listeners]) listener("background");
	await tick();
	await advance(6001);
	undo.onPress();
	assert.equal(commits, 1);
	assert.equal(restores, 0);
});
await check("inactive preserves the Undo window until background", async () => {
	let commits = 0,
		restores = 0;
	withUndo({
		message: "Fixture",
		commit: async () => commits++,
		restore: () => restores++,
		failed() {
			assert.fail();
		},
	});
	for (const listener of [...listeners]) listener("inactive");
	await tick();
	assert.equal(commits, 0);
	assert.equal(toasts.size, 1);
	[...toasts.values()].at(-1).action.onPress();
	await advance(6000);
	assert.equal(commits, 0);
	assert.equal(restores, 1);
	withUndo({
		message: "Fixture",
		commit: async () => commits++,
		restore() {},
		failed() {
			assert.fail();
		},
	});
	for (const listener of [...listeners]) listener("inactive");
	await tick();
	assert.equal(commits, 0);
	for (const listener of [...listeners]) listener("background");
	await tick();
	assert.equal(commits, 1);
});
await check("failed delayed write restores row and reports failure", async () => {
	let restored = 0,
		failures = 0;
	withUndo({
		message: "Fixture",
		commit: async () => {
			throw new Error("fixture");
		},
		restore: () => restored++,
		failed: () => failures++,
	});
	await advance(6000);
	assert.equal(restored, 1);
	assert.equal(failures, 1);
});
const comparison = load("apps/mobile/src/features/career/offer-compare.ts");
await check("offer money comparisons preserve unknowns currency and pay period", () => {
	const a = { currency: "USD", period: "year", base: 110000 },
		b = { currency: "USD", period: "year", base: 100000 };
	assert.equal(comparison.moneyDifference(a, b, "base"), 10000);
	assert.equal(comparison.moneyDifference(a, { ...b, currency: "EUR" }, "base"), null);
	assert.equal(comparison.moneyDifference(a, { ...b, period: "month" }, "base"), null);
	assert.equal(comparison.moneyDifference(a, { ...b, base: null }, "base"), null);
	assert.equal(comparison.meetsMinimum(a, { amount: 95000, currency: "EUR", period: "year" }), null);
	assert.equal(comparison.meetsMinimum({ ...a, base: 0 }, { amount: 0, currency: "USD", period: "year" }), true);
});
await check("default offer pair never duplicates one application", () => {
	assert.deepEqual(
		Array.from(
			comparison.defaultPair([
				{ id: "a", applicationId: "job" },
				{ id: "b", applicationId: "job" },
				{ id: "c", applicationId: "other" },
			]),
		),
		["a", "c"],
	);
});
const { parseAmount } = load("apps/mobile/src/features/career/amount.ts");
await check("salary parser rejects partial notation without turning unknown into zero", () => {
	assert.equal(parseAmount("95k", "en-US"), undefined);
	assert.equal(parseAmount("", "en-US"), null);
	assert.equal(parseAmount("0", "en-US"), 0);
	assert.equal(parseAmount("95.000,50", "de-DE"), 95000.5);
});
const { careerProfileDataSchema } = load("packages/schema/src/career.ts");
const initial = careerProfileDataSchema.parse({});
const { Preferences } = load("apps/mobile/src/features/career/preferences.tsx");
await check("preferences debounce and reject invalid amount until corrected", async () => {
	calls.length = 0;
	const owner = mount(Preferences, { initial });
	edit(owner, "Minimum base salary", "95k");
	await advance(2100);
	assert.equal(calls.length, 0);
	edit(owner, "Minimum base salary", "95000");
	await advance(1999);
	assert.equal(calls.length, 0);
	await advance(1);
	assert.equal(calls.at(-1)[1].minBase.amount, 95000);
	owner.unmount();
	await tick();
});
await check("failed preference autosave retains draft and explicit Retry", async () => {
	calls.length = 0;
	fail = true;
	const owner = mount(Preferences, { initial });
	edit(owner, "Minimum base salary", "97000");
	await advance(2000);
	owner.render();
	assert.equal(find(owner, "TextField", "Minimum base salary").value, "97000");
	fail = false;
	click(owner, "Retry");
	await tick();
	owner.render();
	assert.equal(calls.length, 2);
	assert.equal(calls[1][1].minBase.amount, 97000);
	owner.unmount();
});
await check("preference writes serialize and flush on background", async () => {
	calls.length = 0;
	let release;
	holding = new Promise((resolve) => {
		release = resolve;
	});
	const owner = mount(Preferences, { initial });
	edit(owner, "Minimum base salary", "100000");
	await advance(2000);
	edit(owner, "Minimum base salary", "105000");
	for (const listener of [...listeners]) listener("background");
	await tick();
	assert.equal(calls.length, 1);
	holding = null;
	release();
	await tick();
	assert.equal(calls.length, 2);
	assert.equal(calls[1][1].minBase.amount, 105000);
	owner.unmount();
});
await check("invalid notice periods never flush or erase the previous value", async () => {
	calls.length = 0;
	const owner = mount(Preferences, { initial: { ...initial, noticeWeeks: 4 } });
	for (const value of ["53", "-1", "1.5", "abc"]) {
		edit(owner, "Notice period (weeks)", value);
		find(owner, "TextField", "Notice period (weeks)").onBlur();
		for (const listener of [...listeners]) listener("background");
		await advance(2100);
		assert.equal(calls.length, 0);
	}
	owner.unmount();
	await tick();
	assert.equal(calls.length, 0);
	const corrected = mount(Preferences, { initial: { ...initial, noticeWeeks: 4 } });
	edit(corrected, "Notice period (weeks)", "5");
	await advance(2000);
	assert.equal(calls[0][1].noticeWeeks, 5);
	edit(corrected, "Notice period (weeks)", "");
	await advance(2000);
	assert.equal(calls[1][1].noticeWeeks, null);
	corrected.unmount();
});
const hooks = load("apps/mobile/src/features/career/hooks.ts");
await check("double taps queue one removal and navigation flushes it", async () => {
	let writes = 0;
	const owner = mount(hooks.useUndoRows);
	owner.tree.remove("fact", "Fixture", async () => writes++);
	owner.tree.remove("fact", "Fixture", async () => writes++);
	owner.unmount();
	await tick();
	await advance(6000);
	assert.equal(writes, 1);
});
await check("server switch cancels delayed removal instead of writing to another server", async () => {
	let writes = 0;
	const owner = mount(hooks.useUndoRows);
	owner.tree.remove("fact", "Fixture", async () => writes++);
	session = { ...session, server: "https://other.invalid" };
	owner.render();
	await tick();
	await advance(6000);
	assert.equal(writes, 0);
	owner.unmount();
	session = { ...session, server: "https://fixture.invalid" };
});
const overlays = load("apps/mobile/src/ui/overlays.tsx");
ui.EditorSheet = overlays.EditorSheet;
const { EditorSheet } = load("apps/mobile/src/features/career/shared.tsx");
await check("native sheet dismissal requires discard or restores editor", () => {
	let closed = 0;
	const owner = mount(EditorSheet, { title: "Fixture", dirty: true, pending: false, onClose: () => closed++ });
	find(owner, overlays.Sheet).onClose();
	owner.render();
	assert.equal(closed, 0);
	assert.equal(find(owner, overlays.ConfirmDialog).open, true);
	owner.props.pending = true; owner.render();
	assert.equal(find(owner, overlays.Sheet).open, true);
	assert.equal(find(owner, overlays.ConfirmDialog).open, false);
	find(owner, overlays.ConfirmDialog).onConfirm(); assert.equal(closed, 0);
	owner.props.pending = false; owner.render();
	find(owner, overlays.ConfirmDialog).onCancel();
	owner.render();
	assert.equal(find(owner, overlays.Sheet).open, true);
	find(owner, overlays.Sheet).onClose();
	owner.render();
	find(owner, overlays.ConfirmDialog).onConfirm();
	assert.equal(closed, 1);
	owner.unmount();
	const saving = mount(EditorSheet, { title: "Fixture", dirty: true, pending: true, onClose: () => closed++ });
	assert.equal(find(saving, overlays.Sheet).dismissible, false);
	find(saving, overlays.Sheet).onClose();
	saving.render();
	assert.equal(find(saving, overlays.Sheet).open, true);
	assert.equal(find(saving, overlays.ConfirmDialog).open, false);
	assert.equal(closed, 1, "Pending save must not offer Discard or close its owner");
	saving.unmount();
});
await check("pending sheet blocks native dismissal and restores a late phone dismissal", () => {
	let closed = 0, presented = 0;
	const wrapper = overlays.Sheet({ open: true, dismissible: false, onClose: () => closed++ });
	const owner = mount(wrapper.type, wrapper.props);
	assert.equal(owner.tree.props.enablePanDownToClose, false);
	assert.equal(owner.tree.props.backdropComponent({}).props.pressBehavior, "none");
	assert.equal(find(owner, "BottomSheetScrollView").onAccessibilityEscape, undefined);
	owner.tree.props.ref.current = { present: () => presented++ };
	owner.tree.props.onDismiss();
	assert.equal(presented, 1, "Dismissal that began before save must restore pending form"); assert.equal(closed, 0);
	owner.unmount();
	sheetWide = true;
	try {
		const tabletWrapper = overlays.Sheet({ open: true, dismissible: false, onClose: () => closed++ });
		const tablet = mount(tabletWrapper.type, tabletWrapper.props);
		assert.equal(tablet.tree.props.onRequestClose, undefined);
		assert.equal(find(tablet, "Pressable").onPress, undefined); tablet.unmount();
	} finally { sheetWide = false; }
});
const { WallClockField } = load("apps/mobile/src/features/application-detail/date-field.tsx");
await check("optional native date starts empty, can cancel, choose unchanged default and clear", () => {
	let value = "";
	const owner = mount(WallClockField, { label: "Follow-up date", mode: "date", clearable: true, value, onChange: (next) => { value = next; owner.props.value = next; } });
	assert.equal(nodes(owner.tree).some((node) => node.type === "DateTimePicker"), false);
	find(owner, "Pressable").onPress(); owner.render();
	assert.equal(value, "", "Opening a picker must not silently set an optional date");
	click(owner, "Cancel"); assert.equal(value, "");
	find(owner, "Pressable").onPress(); owner.render();
	click(owner, "Use this date"); assert.equal(value, "2026-10-17", "Today can be chosen without moving the picker");
	click(owner, "Clear date"); assert.equal(value, ""); owner.unmount();
});
await check("native calendar dates retain selected day across device timezones and disabled fields cannot edit", () => {
	const previous = process.env.TZ;
	try {
		for (const timezone of ["Pacific/Honolulu", "Europe/Berlin", "Pacific/Kiritimati"]) {
			process.env.TZ = timezone;
			let value = "2026-10-25";
			const owner = mount(WallClockField, { label: "Application date", mode: "date", value, onChange: (next) => { value = next; } });
			const picker = find(owner, "DateTimePicker");
			assert.equal(picker.value.getFullYear(), 2026); assert.equal(picker.value.getMonth(), 9); assert.equal(picker.value.getDate(), 25);
			picker.onChange({ type: "set" }, new Date(2026, 9, 27, 0, 30)); assert.equal(value, "2026-10-27");
			owner.props.disabled = true; owner.render();
			find(owner, "DateTimePicker").onChange({ type: "set" }, new Date(2026, 9, 28)); assert.equal(value, "2026-10-27"); owner.unmount();
		}
	} finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

const reminderSchedule = load("apps/mobile/src/features/reminders/schedule.ts");
let interviewPending = false, reminderFails = false, savedInterview;
const interviewMutation = {
	get isPending() { return interviewPending; },
	async mutateAsync(input) {
		calls.push(["interview.save", input]); interviewPending = true;
		try { if (holding) await holding; if (fail) throw new Error("Synthetic save failure"); return savedInterview; }
		finally { interviewPending = false; }
	},
};
mocks["interview-hooks"] = {
	useUserTime: () => ({ timeZone: "Europe/Berlin", when: () => "time" }),
	useDetailMutations: () => ({ addInterview: interviewMutation, updateInterview: interviewMutation }),
	interviewTypeLabel: (value) => value,
	isInterview: (entry) => entry.type === "interview",
	interviewReminder: (application, entry) => ({ applicationId: application.id, entryId: entry.id }),
	leadLabel: String,
};
mocks["@/features/reminders"] = {
	...reminderSchedule,
	holdReminder() {}, releaseReminder() {},
	useReminders: () => ({ leadFor: () => null, turnOff: async () => {}, turnOn: async () => { if (reminderFails) throw new Error("Notification failure"); return "scheduled"; } }),
};
Object.assign(mocks["@/features/applications/queries"], { useInvalidateApplications: () => async () => {}, applicationDetailQueryKey: (id) => [id] });
const { InterviewSheet } = load("apps/mobile/src/features/application-detail/interview-sheet.tsx");
await check("interview edits survive dismiss and Keep editing; pending save cannot submit twice", async () => {
	calls.length = 0; let closed = 0;
	const interview = { id: "round", type: "interview", at: new Date("2026-10-25T01:30:00Z"), kind: "technical", timezone: "Europe/Berlin", durationMinutes: 45, location: "Video", notes: "Stored notes", audience: "panel", participants: [{ name: "Sam", role: "Lead", profileUrl: "https://example.org/sam" }] };
	const application = { id: "application", role: "Engineer", company: "Fictional", activity: [interview] };
	savedInterview = application;
	const wrapper = mount(InterviewSheet, { open: true, application, interview, onClose: () => closed++ });
	const owner = mount(wrapper.tree.type, wrapper.tree.props);
	edit(owner, "Location", "Office"); edit(owner, "Name of person 1", "Alex"); edit(owner, "Role", "Manager");
	find(owner, "TextArea", "What they asked you to prepare").onChangeText("Edited notes"); owner.render();
	const guard = mount(owner.tree.type, owner.tree.props);
	find(guard, overlays.Sheet).onClose(); guard.render(); assert.equal(closed, 0); assert.equal(find(guard, overlays.ConfirmDialog).open, true);
	find(guard, overlays.ConfirmDialog).onCancel(); guard.render(); assert.equal(find(guard, overlays.Sheet).open, true);
	owner.render(); assert.equal(find(owner, "TextField", "Location").value, "Office"); assert.equal(find(owner, "TextField", "Name of person 1").value, "Alex"); assert.equal(find(owner, "TextArea", "What they asked you to prepare").value, "Edited notes");
	let release; holding = new Promise((resolve) => { release = resolve; });
	const save = nodes(owner.tree.props.footer).find((node) => node.props.label === "Save interview").props.onPress;
	save(); save(); owner.render(); await tick();
	assert.equal(owner.tree.props.pending, true); assert.equal(calls.filter(([name]) => name === "interview.save").length, 1);
	find(owner, "TextField", "Location").onChangeText("Too late"); owner.render(); assert.equal(find(owner, "TextField", "Location").value, "Office");
	const payload = calls.find(([name]) => name === "interview.save")[1];
	assert.equal(payload.at, "2026-10-25T01:30:00.000Z", "Unchanged overlap clock time must preserve stored instant"); assert.equal(payload.audience, "panel"); assert.equal(payload.participants[0].profileUrl, "https://example.org/sam");
	release(); holding = null; await tick(); assert.equal(closed, 1);
	guard.unmount(); owner.unmount(); wrapper.unmount();
});
await check("interview transport failure retains edits; reminder failure reports saved status", async () => {
	let closed = 0; const application = { id: "application", role: "Engineer", company: "Fictional", activity: [] };
	const wrapper = mount(InterviewSheet, { open: true, application, interview: null, onClose: () => closed++ });
	const owner = mount(wrapper.tree.type, wrapper.tree.props);
	edit(owner, "Location", "Video room");
	fail = true; nodes(owner.tree.props.footer).find((node) => node.props.label === "Save interview").props.onPress(); await tick(); fail = false; owner.render();
	assert.equal(closed, 0); assert.equal(find(owner, "TextField", "Location").value, "Video room");
	assert.ok([...toasts.values()].at(-1).message.includes("avoid a duplicate"));
	nodes(owner.tree).find((node) => node.props.title === "Remind me on this device").props.trailing.props.onValueChange(true); owner.render();
	savedInterview = { ...application, activity: [{ id: "new-round", type: "interview" }] }; reminderFails = true;
	nodes(owner.tree.props.footer).find((node) => node.props.label === "Save interview").props.onPress(); await tick(); reminderFails = false;
	assert.equal(closed, 1); assert.equal([...toasts.values()].at(-1).message, "Interview saved. Couldn't update its reminder.");
	owner.unmount(); wrapper.unmount();
});

await check("queued preferences cannot cross same-origin account changes", async () => {
	calls.length = 0;
	let release;
	holding = new Promise((resolve) => {
		release = resolve;
	});
	const owner = mount(Preferences, { initial });
	edit(owner, "Minimum base salary", "110000");
	await advance(2000);
	edit(owner, "Minimum base salary", "115000");
	for (const listener of [...listeners]) listener("background");
	await tick();
	account.id = "other-account";
	holding = null;
	release();
	await tick();
	assert.equal(calls.length, 1);
	owner.unmount();
	account.id = "fixture-account";
});
const { ScheduleSheet } = load("apps/mobile/src/features/career/schedule-sheet.tsx");
queries.set("career.profile", initial);
queries.set("webAccess.status", { search: true });
queries.set("flags.get", { smtpEnabled: true, careerSchedulingEnabled: true });
function scheduleForm(kind = "discovery") {
	const parent = mount(ScheduleSheet, { schedule: null, kind, onClose() {}, onDelete() {} });
	const child = nodes(parent.tree).find((node) => typeof node.type === "function" && node.type.name === "ScheduleForm");
	assert.ok(child);
	const owner = mount(child.type, child.props);
	return { owner, parent };
}
await check("schedule controls reject invalid DST minute before sending RPC", async () => {
	calls.length = 0;
	const { owner, parent } = scheduleForm();
	edit(owner, "Look for", "Engineer");
	edit(owner, "First run (YYYY-MM-DD)", "2027-03-28");
	edit(owner, "Time (HH:mm)", "02:30");
	click(owner, "Save schedule");
	await tick();
	assert.equal(calls.length, 0);
	assert.match(nodes(owner.tree).find((node) => node.type === "Banner").props.message, /does not exist/);
	owner.unmount();
	parent.unmount();
});
await check("schedule save sends account timezone not device time", async () => {
	calls.length = 0;
	const { owner, parent } = scheduleForm();
	edit(owner, "Look for", "Engineer");
	edit(owner, "First run (YYYY-MM-DD)", "2026-10-20");
	edit(owner, "Time (HH:mm)", "08:00");
	click(owner, "Save schedule");
	await tick();
	const [name, payload] = calls[0];
	assert.equal(name, "career.saveSchedule");
	assert.equal(payload.timezone, "Europe/Berlin");
	assert.equal(iso(payload.nextRunAt), "2026-10-20T06:00:00.000Z");
	assert.equal(payload.email, false);
	owner.unmount();
	parent.unmount();
});
await check("unavailable scheduler blocks opt-in save", async () => {
	calls.length = 0;
	queries.set("flags.get", { smtpEnabled: false, careerSchedulingEnabled: false });
	const { owner, parent } = scheduleForm();
	assert.equal(find(owner, "Button", "Save schedule").disabled, true);
	owner.unmount();
	parent.unmount();
	queries.set("flags.get", { smtpEnabled: true, careerSchedulingEnabled: true });
});
await check("early interview preparation saves its lead and tested provider", async () => {
	applications = [
		{
			id: "job",
			status: "interview",
			company: "Fictional",
			role: "Engineer",
			activity: [{ id: "round", type: "interview", at: "2026-10-18T07:00:00Z", durationMinutes: 60 }],
		},
	];
	calls.length = 0;
	const { owner, parent } = scheduleForm("prepare");
	find(owner, "SelectSheet", "Prepare a briefing").onChange("morning");
	owner.render();
	click(owner, "Save schedule");
	await tick();
	const payload = calls[0][1];
	assert.equal(payload.applicationId, "job");
	assert.equal(payload.aiProviderId, "tested");
	assert.equal(payload.lead, "morning");
	assert.equal(iso(payload.nextRunAt), "2026-10-18T05:00:00.000Z");
	owner.unmount();
	parent.unmount();
	applications = [];
});
const fact = {
	id: "fact",
	text: "Fictional result",
	category: "accomplishment",
	applicationId: null,
	status: "active",
	source: { kind: "manual", quote: "", id: "" },
	revisions: [],
	usedBy: { stories: 0, savedItems: 0 },
	company: null,
};
queries.set("career.facts", [fact]);
queries.set("career.stories", []);
const { Facts } = load("apps/mobile/src/features/career/facts.tsx");
await check("fact correction sends text only and retains scope/category", async () => {
	calls.length = 0;
	const parent = mount(Facts);
	click(parent, "Correct");
	const child = nodes(parent.tree).find((node) => typeof node.type === "function" && node.type.name === "FactEditor");
	const owner = mount(child.type, child.props);
	find(owner, "TextArea", "Fact").onChangeText("Corrected fictional result");
	owner.render();
	click(owner, "Save fact");
	await tick();
	assert.equal(calls[0][0], "career.updateFact");
	assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { id: "fact", text: "Corrected fictional result" });
	owner.unmount();
	parent.unmount();
});
await check("manual fact payload includes UUID and trimmed source quote", async () => {
	calls.length = 0;
	const parent = mount(Facts);
	click(parent, "Add a fact");
	const child = nodes(parent.tree).find((node) => typeof node.type === "function" && node.type.name === "FactEditor");
	const owner = mount(child.type, child.props);
	find(owner, "TextArea", "Fact").onChangeText("  Supported fictional achievement  ");
	owner.render();
	click(owner, "Save fact");
	await tick();
	const [name, input] = calls[0];
	assert.equal(name, "career.saveFact");
	assert.equal(input.applicationId, null);
	assert.equal(input.text, "Supported fictional achievement");
	assert.equal(input.source.kind, "manual");
	assert.match(input.source.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
	assert.equal(input.source.quote, input.text);
	owner.unmount();
	parent.unmount();
});
await check("different fact toggles remain independent while the first saves", async () => {
	calls.length = 0;
	queries.set("career.facts", [fact, { ...fact, id: "second-fact", text: "Second fictional result" }]);
	let release;
	holding = new Promise((resolve) => {
		release = resolve;
	});
	const parent = mount(Facts);
	const switches = () =>
		nodes(parent.tree).filter((node) => typeof node.type === "function" && node.type.name === "SwitchRow");
	switches()[0].props.onValueChange(false);
	parent.render();
	assert.equal(switches()[0].props.disabled, true);
	assert.equal(switches()[1].props.disabled, false);
	switches()[1].props.onValueChange(false);
	await tick();
	assert.equal(calls.length, 2);
	assert.equal(calls[0][1].id, "fact");
	assert.equal(calls[1][1].id, "second-fact");
	holding = null;
	release();
	await tick();
	parent.render();
	assert.equal(switches()[0].props.disabled, false);
	parent.unmount();
	queries.set("career.facts", [fact]);
});
const { Stories } = load("apps/mobile/src/features/career/stories.tsx");
await check("STARR controls require Situation Task Action and allow unknown results", async () => {
	calls.length = 0;
	const parent = mount(Stories);
	click(parent, "Add a story");
	const child = nodes(parent.tree).find((node) => typeof node.type === "function" && node.type.name === "StoryEditor");
	const owner = mount(child.type, child.props);
	assert.equal(owner.tree.props.title, "New STARR story");
	assert.equal(find(owner, "Button", "Save story").disabled, true);
	edit(owner, "Title", "Fictional story");
	for (const label of ["Situation (required)", "Task (required)", "Action (required)"]) {
		find(owner, "TextArea", label).onChangeText("Supported fictional evidence");
		owner.render();
	}
	click(owner, "Save story");
	await tick();
	assert.equal(calls[0][0], "career.saveStory");
	assert.equal(calls[0][1].result, "");
	assert.equal(calls[0][1].reflection, "");
	owner.unmount();
	parent.unmount();
});
const displayedText = (owner) =>
	nodes(owner.tree)
		.filter((node) => node.type === "Text")
		.flatMap((node) => node.props.children)
		.filter((text) => typeof text === "string")
		.join(" ");
await check("fact usage renders singular and plural counts", () => {
	for (const count of [1, 2]) {
		queries.set("career.facts", [{ ...fact, usedBy: { stories: count, savedItems: count } }]);
		const owner = mount(Facts);
		const text = displayedText(owner);
		assert.ok(
			text.includes(count === 1 ? "Backs 1 story · used in 1 saved item" : "Backs 2 stories · used in 2 saved items"),
		);
		owner.unmount();
	}
	queries.set("career.facts", [fact]);
});
const { OffersScreen } = load("apps/mobile/src/features/career/offers.tsx");
const { offerTermsSchema } = load("packages/schema/src/career.ts");
await check("offer notice and office counts render singular and plural", () => {
	for (const count of [1, 2]) {
		queries.set("career.profile", { ...initial, noticeWeeks: count });
		queries.set("career.savedItems", [
			{
				id: "offer",
				applicationId: "job",
				application: { company: "Fictional", role: "Engineer" },
				data: {
					...offerTermsSchema.parse({ currency: "USD", period: "year", base: null, variable: null, officeDays: count }),
					kind: "offer",
				},
			},
		]);
		const parent = mount(OffersScreen);
		const child = nodes(parent.tree).find((node) => typeof node.type === "function" && node.type.name === "OfferCard");
		const owner = mount(child.type, child.props);
		const text = displayedText(owner);
		assert.ok(text.includes(count === 1 ? "Your notice period: 1 week." : "Your notice period: 2 weeks."));
		assert.ok(text.includes(count === 1 ? "1 office day a week" : "2 office days a week"));
		owner.unmount();
		parent.unmount();
	}
	queries.set("career.profile", initial);
	queries.set("career.savedItems", []);
});
const { TodayScreen } = load("apps/mobile/src/features/career/today.tsx");
await check("schedule interval renders Every day and plural days", () => {
	queries.set("career.notifications", []);
	queries.set("career.opportunities", []);
	for (const days of [1, 3]) {
		queries.set("career.schedules", [
			{
				id: "schedule",
				kind: "discovery",
				query: "Engineer",
				enabled: true,
				intervalDays: days,
				timezone: "Europe/Berlin",
				nextRunAt: new Date("2026-10-20T06:00Z"),
			},
		]);
		const owner = mount(TodayScreen);
		assert.ok(displayedText(owner).includes(days === 1 ? "Every day" : "Every 3 days"));
		owner.unmount();
	}
});
await check("Career columns use measured content width instead of window width", () => {
	queries.set("career.savedItems", [{
		id: "offer", applicationId: "job", application: { company: "Fictional", role: "Engineer" },
		data: { ...offerTermsSchema.parse({ currency: "USD", period: "year", base: null, variable: null }), kind: "offer" },
	}]);
	for (const [component, breakpoint] of [[TodayScreen, 824], [OffersScreen, 816]]) {
		const owner = mount(component);
		for (const width of [960, 650, breakpoint - 1, breakpoint]) {
			const group = nodes(owner.tree).find((node) => node.props?.onLayout && node.props.style?.flexDirection);
			assert.ok(group);
			group.props.onLayout({ nativeEvent: { layout: { width, y: 0 } } });
			owner.render();
			const measured = nodes(owner.tree).find((node) => node.props?.onLayout && node.props.style?.flexDirection);
			assert.equal(measured.props.style.flexDirection, width >= breakpoint ? "row" : "column");
		}
		owner.unmount();
	}
	queries.set("career.savedItems", []);
});
assert.equal(listeners.size, 0);
assert.equal(timers.size, 0);
console.log(
	`${checks} scenarios passed. Native UI, React lifecycle and transport simulated; production logic and control callbacks executed.`,
);
