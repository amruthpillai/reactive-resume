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
	signOutFails;
const exported = { user: { name: "Fictional fixture" }, resumes: [], applications: [] };
const reset = () => {
	events = [];
	stored = new Map();
	uploadUrl = "https://fixture.test/uploads/avatar.jpg";
	picked = { canceled: false, assets: [{ uri: "file:///fixture.jpg" }] };
	shareFails = false;
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
	async write(value) {
		stored.set(this.uri, value);
	}
	delete() {
		stored.delete(this.uri);
	}
}
globalThis.__m7 = {
	File: NativeFile,
	mutation: (options) => {
		callbacks.set(options.mutationKey.join("/"), options);
		return {};
	},
	client: {
		auth: {
			exportData: async () => exported,
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
};
const modules = {
	"@lingui/react/macro": 'export const useLingui=()=>({t:(s,...v)=>s.reduce((a,p,i)=>a+p+(v[i]??""),"")});',
	"@tanstack/react-query":
		"export const useMutation=globalThis.__m7.mutation;export const useQueryClient=()=>globalThis.__m7.queryClient;export const useIsMutating=()=>0;",
	react: 'export const useState=x=>[typeof x==="function"?x():x,()=>{}];',
	"react/jsx-runtime":
		'export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment="Fragment";',
	"react-native": 'export const View="View";',
	"expo-router": "export const router={replace:globalThis.__m7.route};",
	"expo-file-system": 'export const File=globalThis.__m7.File;export const Paths={cache:"cache"};',
	"expo-sharing": "export const isAvailableAsync=async()=>true;export const shareAsync=globalThis.__m7.share;",
	"expo-image-picker":
		"export const requestCameraPermissionsAsync=async()=>({granted:true});export const launchCameraAsync=globalThis.__m7.pick;export const launchImageLibraryAsync=globalThis.__m7.pick;",
	"@/api/client":
		'export const client=globalThis.__m7.client;export const rest=globalThis.__m7.rest;export const orpc={auth:{getProfile:{key:()=>["profile"]}}};',
	"@/auth/session":
		'export const signOut=globalThis.__m7.signOut;export const useSession=()=>({server:"https://fixture.test",status:"signed-in"});',
	"@/ui":
		'export const Avatar="Avatar",Button="Button",ListRow="ListRow",Sheet="Sheet",TextField="TextField",ConfirmDialog="ConfirmDialog";export const showToast=globalThis.__m7.toast;export const useTheme=()=>({space:{s2:8,s3:12,s4:16,s10:40}});',
};
const hook = registerHooks({
	resolve(specifier, context, next) {
		if (specifier in modules) return { url: `m7:${specifier}`, shortCircuit: true };
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
	reset();
	ExportDataRow();
	await callbacks.get("settings/export").mutationFn();
	assert.equal(stored.size, 0, "export must remove temporary personal data after sharing");
	reset();
	shareFails = true;
	await assert.rejects(callbacks.get("settings/export").mutationFn());
	assert.equal(stored.size, 0, "failed share must also remove temporary personal data");
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
	const drain = async () => {
		for (let i = 0; i < 15; i++) await Promise.resolve();
	};
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
	console.log(
		"PASS: export cleanup (success/failure), avatar cancel/URL boundary/upload/remove, sign-out/server-switch ordering and failure recovery",
	);
} finally {
	globalThis.FormData = originalFormData;
	hook.deregister();
	delete globalThis.__m7;
}
