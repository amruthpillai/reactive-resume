// Run from the repository root: node docs/plans/native-mobile-app/reports/M7-T1/verify.mjs
// Native transports/hooks are simulated; the shipped mutation and confirmation callbacks execute unchanged.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const requireServer = createRequire(new URL("../../../../../apps/server/package.json", import.meta.url));
const requireTsx = createRequire(requireServer.resolve("tsx"));
const { transformSync } = requireTsx("esbuild");
const root = new URL("../../../../../", import.meta.url);
const callbacks = new Map();
let events = [],
	stored = new Map(),
	picked,
	uploadUrl,
	shareFails,
	exportFails,
	signOutFails;
const exported = { user: { name: "Fictional fixture" }, resumes: [], applications: [] };
const reset = () => {
	events = [];
	stored = new Map();
	uploadUrl = "https://fixture.test/uploads/avatar.jpg";
	picked = { canceled: false, assets: [{ uri: "file:///fixture.jpg" }] };
	shareFails = false;
	exportFails = false;
	signOutFails = false;
};
class NativeFile {
	constructor(base, name) {
		this.uri = name ? `${base}/${name}` : base;
		this.size = 1024;
	}
	get exists() {
		return stored.has(this.uri);
	}
	get name() {
		return this.uri.slice(this.uri.lastIndexOf("/") + 1);
	}
	async write(value) {
		stored.set(this.uri, value);
	}
	delete() {
		stored.delete(this.uri);
	}
}
globalThis.__m7 = {
	File: NativeFile,
	list: () => [...stored.keys()].map((uri) => new NativeFile(uri)),
	mutation: (options) => {
		callbacks.set(options.mutationKey.join("/"), options);
		return {};
	},
	client: {
		auth: {
			exportData: async () => {
				if (exportFails) throw new Error("Fixture failure");
				return exported;
			},
			updateProfile: async (input) => {
				events.push(["profile", input]);
				return { status: true };
			},
		},
	},
	rest: async (path, init) => {
		events.push(["upload", path, init.method, init.body.fields]);
		return { ok: true, json: async () => ({ url: uploadUrl }) };
	},
	queryClient: {
		cancelQueries: async () => {
			events.push("cancel");
		},
		clear: () => events.push("clear"),
	},
	signOut: async () => {
		events.push("signOut");
		if (signOutFails === "partial") throw new globalThis.__m7.SignOutCleanupError([new Error("Fixture cleanup")]);
		if (signOutFails) throw new Error("Fixture failure");
	},
	share: async (uri) => {
		assert.equal(stored.has(uri), true, "shared file must exist during handoff");
		assert.deepEqual(JSON.parse(stored.get(uri)), exported);
		events.push("share");
		if (shareFails) throw new Error("Fixture failure");
	},
	pick: async () => picked,
	toast: () => events.push("toast"),
	route: (path) => events.push(["route", path]),
	browse: async (url) => {
		events.push(["browser", url]);
	},
};
const modules = {
	"@lingui/react/macro": 'export const useLingui=()=>({t:(s,...v)=>s.reduce((a,p,i)=>a+p+(v[i]??""),"")});',
	"@tanstack/react-query":
		"export const useMutation=globalThis.__m7.mutation;export const useQueryClient=()=>globalThis.__m7.queryClient;export const useIsMutating=()=>0;export const useQuery=()=>({data:{apiKeys:[]},refetch:async()=>{}});",
	react: 'export const useState=x=>[typeof x==="function"?x():x,()=>{}];',
	"react/jsx-runtime":
		'export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment="Fragment";',
	"react-native": 'export const View="View";',
	"expo-router": "export const router={replace:globalThis.__m7.route};",
	"expo-file-system":
		'export const File=globalThis.__m7.File;export const Paths={cache:{list:globalThis.__m7.list,toString:()=>"cache"}};',
	"expo-web-browser": "export const openBrowserAsync=globalThis.__m7.browse;",
	"expo-sharing": "export const isAvailableAsync=async()=>true;export const shareAsync=globalThis.__m7.share;",
	"expo-image-picker":
		"export const requestCameraPermissionsAsync=async()=>({granted:true});export const launchCameraAsync=globalThis.__m7.pick;export const launchImageLibraryAsync=globalThis.__m7.pick;",
	"@/api/client":
		'export const client=globalThis.__m7.client;export const rest=globalThis.__m7.rest;export const orpc={auth:{getProfile:{key:()=>["profile"]},apiKeys:{list:{key:()=>["keys"],queryOptions:()=>({})}}}};',
	"@/auth/session":
		'export class SignOutCleanupError extends AggregateError{};globalThis.__m7.SignOutCleanupError=SignOutCleanupError;export const signOut=globalThis.__m7.signOut;export const getServer=()=>"https://fixture.test";export const useSession=()=>({server:"https://fixture.test",status:"signed-in"});',
	"@/ui":
		'export const Avatar="Avatar",Button="Button",ListRow="ListRow",Sheet="Sheet",TextField="TextField",ConfirmDialog="ConfirmDialog",Banner="Banner",EmptyState="EmptyState",Text="Text";export const showToast=globalThis.__m7.toast;export const useTheme=()=>({space:{s2:8,s3:12,s4:16,s10:40}});',
	"./layout": 'export const SettingsGroup="SettingsGroup";',
};
const hook = registerHooks({
	resolve(specifier, context, next) {
		if (specifier in modules) return { url: `m7:${specifier}`, shortCircuit: true };
		if (specifier === "./browser")
			return { url: new URL("apps/mobile/src/features/settings/browser.ts", root).href, shortCircuit: true };
		if (specifier === "@/routes") return { url: new URL("apps/mobile/src/routes.ts", root).href, shortCircuit: true };
		return next(specifier, context);
	},
	load(url, context, next) {
		if (url.startsWith("m7:")) return { format: "module", source: modules[url.slice(3)], shortCircuit: true };
		if (url.startsWith(new URL("apps/mobile/", root).href) && /\.tsx?$/.test(url)) {
			const source = transformSync(readFileSync(new URL(url), "utf8"), {
				loader: "tsx",
				format: "esm",
				jsx: "automatic",
				sourcefile: fileURLToPath(url),
			}).code;
			return { format: "module", source, shortCircuit: true };
		}
		return next(url, context);
	},
});
const originalFormData = globalThis.FormData;
globalThis.FormData = class {
	fields = [];
	append(...field) {
		this.fields.push(field);
	}
};
try {
	const { ExportDataRow } = await import(new URL("apps/mobile/src/features/settings/export.tsx", root));
	const { ProfileEditor } = await import(new URL("apps/mobile/src/features/settings/profile.tsx", root));
	const { SignOutRow } = await import(new URL("apps/mobile/src/features/settings/sign-out.tsx", root));
	const { ApiKeys } = await import(new URL("apps/mobile/src/features/settings/api-keys.tsx", root));
	const { openAccountSettings } = await import(new URL("apps/mobile/src/features/settings/browser.ts", root));
	const drain = async () => {
		for (let i = 0; i < 15; i++) await Promise.resolve();
	};
	reset();
	ApiKeys({ userId: "fixture" }).props.children[0].props.onPress();
	await drain();
	assert.deepEqual(events, [["browser", "https://fixture.test/dashboard/settings/ai"]]);
	await openAccountSettings();
	assert.deepEqual(events.at(-1), ["browser", "https://fixture.test/dashboard/settings/account"]);
	reset();
	ExportDataRow();
	stored.set("cache/reactive-resume-1.json", "old personal data");
	stored.set("cache/keep.json", "unrelated cache");
	await callbacks.get("settings/export").mutationFn();
	assert.equal(stored.has("cache/reactive-resume-1.json"), false, "next export must sweep old account exports");
	assert.equal(stored.get("cache/keep.json"), "unrelated cache");
	assert.equal(stored.size, 2, "current export must remain readable after shareAsync resolves");
	shareFails = true;
	stored.set("cache/reactive-resume-2.json", "old personal data");
	await assert.rejects(callbacks.get("settings/export").mutationFn());
	assert.equal(stored.has("cache/reactive-resume-2.json"), false);
	assert.equal(stored.size, 2, "share rejection also retains the current file until next export");
	exportFails = true;
	await assert.rejects(callbacks.get("settings/export").mutationFn());
	assert.deepEqual([...stored.keys()], ["cache/keep.json"], "next export cleans up even when its network read fails");
	reset();
	ProfileEditor({ profile: { id: "fixture", name: "Fixture", username: "fixture", image: null } });
	const photo = callbacks.get("settings/photo").mutationFn;
	picked = { canceled: true };
	await photo("library");
	assert.equal(events.length, 0, "picker cancellation must not write");
	reset();
	uploadUrl = "javascript:fixture";
	await assert.rejects(photo("library"));
	assert.equal(
		events.some((e) => e[0] === "profile"),
		false,
		"untrusted upload URL must not enter profile",
	);
	reset();
	await photo("library");
	assert.equal(events[0][0], "upload");
	assert.equal(events[0][1], "/files");
	assert.equal(events[0][3][0][0], "file");
	assert.deepEqual(events[1], ["profile", { image: "https://fixture.test/uploads/avatar.jpg" }]);
	reset();
	await photo("remove");
	assert.deepEqual(events, [["profile", { image: null }]]);
	for (const switchServer of [false, true]) {
		reset();
		const tree = SignOutRow({ switchServer });
		tree.props.children.find((child) => child.type === "ConfirmDialog").props.onConfirm();
		await drain();
		assert.deepEqual(events, ["cancel", "signOut", "clear", ["route", switchServer ? "/server" : "/sign-in"]]);
	}
	reset();
	signOutFails = true;
	SignOutRow({})
		.props.children.find((child) => child.type === "ConfirmDialog")
		.props.onConfirm();
	await drain();
	assert.deepEqual(events, ["cancel", "signOut", "toast"]);
	// M3-T1: a partial cleanup still signs out; switching server continues to the picker, then says what was left.
	reset();
	signOutFails = "partial";
	SignOutRow({ switchServer: true })
		.props.children.find((child) => child.type === "ConfirmDialog")
		.props.onConfirm();
	await drain();
	assert.deepEqual(events, ["cancel", "signOut", "clear", ["route", "/server"], "toast"]);
	console.log(
		"PASS: browser destinations, retained share file and next-export sweep, avatar cancel/URL boundary/upload/remove, sign-out/server-switch ordering and failure recovery",
	);
} finally {
	globalThis.FormData = originalFormData;
	hook.deregister();
	delete globalThis.__m7;
}
