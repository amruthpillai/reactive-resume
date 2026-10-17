// Run from repository root: node --import ./apps/server/node_modules/tsx/dist/loader.mjs docs/plans/native-mobile-app/reports/M3-T3/verify.mjs
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createDraftStore } from "../../../../../apps/mobile/src/draft/store.ts";

mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10000 });
const drain = async () => {
	for (let i = 0; i < 30; i++) await Promise.resolve();
};
const advance = async (ms) => {
	mock.timers.tick(ms);
	await drain();
};
let passed = 0;
async function check(name, run) {
	await run();
	console.log(`PASS ${name}`);
	passed++;
}
function fixture({ delay = 500, disk = new Map(), initial, owner = "local/user-a" } = {}) {
	let remote = initial ?? {
		id: "draft",
		isLocked: false,
		revision: 1,
		name: "Resume",
		data: { name: "Before", detail: "" },
	};
	let online = true,
		focused = false,
		scope = owner,
		failure = false,
		hold = null;
	const writes = [],
		copies = [];
	const adapter = {
		kind: delay === 800 ? "letter" : "resume",
		delay,
		read: async (id) => {
			assert.equal(id, remote.id);
			return structuredClone(remote);
		},
		data: (d) => d.data,
		withData: (d, data) => ({ ...d, data }),
		version: (d) => d.revision,
		matches: (a, b) => a.name === b.name && JSON.stringify(a.data) === JSON.stringify(b.data),
		parse: (d) => d,
		merge: (saved, submitted, current) => ({ ...saved, data: current.data, name: current.name }),
		isConflict: (e) => e.message === "conflict",
		save: async (d, base, sessionId, force) => {
			writes.push({ d: structuredClone(d), base: structuredClone(base), sessionId, force });
			if (hold) await hold;
			if (failure) throw Error("unreachable");
			if (remote.isLocked) throw Error("locked");
			if (!force && base.revision !== remote.revision) throw Error("conflict");
			remote = { ...d, revision: remote.revision + 1 };
			return structuredClone(remote);
		},
		copy: async (d, id, remember) => {
			copies.push(structuredClone(d));
			remember(id ?? "copy");
		},
	};
	const env = {
		storage: {
			getItemSync: (k) => disk.get(k) ?? null,
			setItemSync: (k, v) => disk.set(k, v),
			removeItemSync: (k) => disk.delete(k),
			getAllKeysSync: () => [...disk.keys()],
		},
		scope: async () => scope,
		online: () => online,
		focused: () => focused,
	};
	const draft = createDraftStore(adapter, env),
		state = draft.store.getState;
	return {
		draft,
		state,
		disk,
		writes,
		copies,
		adapter,
		env,
		remote: () => remote,
		external: (values) => {
			remote = { ...remote, ...values, revision: remote.revision + 1 };
		},
		online: (v) => {
			online = v;
		},
		focused: (v) => {
			focused = v;
		},
		owner: (v) => {
			scope = v;
		},
		fail: (v) => {
			failure = v;
		},
		hold: () => {
			let release;
			hold = new Promise((r) => {
				release = r;
			});
			return () => {
				hold = null;
				release();
			};
		},
	};
}

await check("resume 500ms and letter 800ms debounce; session ID reused", async () => {
	for (const delay of [500, 800]) {
		const f = fixture({ delay });
		await f.state().open("draft");
		f.state().update((d) => {
			d.name = "First";
		});
		await advance(delay - 1);
		assert.equal(f.writes.length, 0);
		f.state().update((d) => {
			d.name = "Latest";
		});
		await advance(delay - 1);
		assert.equal(f.writes.length, 0);
		await advance(1);
		assert.equal(f.writes.length, 1);
		assert.equal(f.remote().data.name, "Latest");
		f.state().update((d) => {
			d.detail = "next";
		});
		await f.state().flush();
		assert.equal(f.writes[0].sessionId, f.writes[1].sessionId);
		assert.equal(f.state().status, "saved");
		await f.state().close();
	}
});
await check("flush drains edits typed during an in-flight request, retaining metadata and undo", async () => {
	const f = fixture();
	await f.state().open("draft");
	const release = f.hold();
	f.state().update((d) => {
		d.name = "First";
	});
	const flush = f.state().flush();
	await drain();
	f.state().update(
		(d) => {
			d.name = "Latest";
		},
		{ newStep: true },
	);
	f.state().updateDocument((d) => {
		d.name = "Renamed";
	});
	release();
	await flush;
	assert.equal(f.remote().data.name, "Latest");
	assert.equal(f.remote().name, "Renamed");
	assert.equal(f.writes.length, 2);
	assert.equal(f.writes[1].base.revision, 2);
	assert.equal(f.state().data.name, "Latest");
	assert(f.state().canUndo);
	assert.equal(f.disk.size, 0);
	await f.state().close();
});
await check("key coalescing, sameStep, newStep, redo invalidation and 200-step bound", async () => {
	const f = fixture();
	await f.state().open("draft");
	f.online(false);
	f.state().update(
		(d) => {
			d.name = "A";
		},
		{ coalesceKey: "name" },
	);
	await advance(900);
	f.state().update(
		(d) => {
			d.name = "AB";
		},
		{ coalesceKey: "name" },
	);
	f.state().undo();
	assert.equal(f.state().data.name, "Before");
	f.state().redo();
	assert.equal(f.state().data.name, "AB");
	f.state().update(
		(d) => {
			d.name = "C";
		},
		{ coalesceKey: "fit", sameStep: true },
	);
	await advance(2000);
	f.state().update(
		(d) => {
			d.detail = "D";
		},
		{ coalesceKey: "fit", sameStep: true },
	);
	f.state().undo();
	assert.equal(f.state().data.name, "AB");
	assert.equal(f.state().data.detail, "");
	f.state().update(
		(d) => {
			d.name = "fresh";
		},
		{ newStep: true },
	);
	assert.equal(f.state().canRedo, false);
	for (let i = 0; i < 205; i++)
		f.state().update(
			(d) => {
				d.name = String(i);
			},
			{ newStep: true },
		);
	let undos = 0;
	while (f.state().canUndo) {
		f.state().undo();
		undos++;
	}
	assert.equal(undos, 200);
	await f.state().close();
});
await check("offline draft survives close/restart, same session and original version retained", async () => {
	const f = fixture();
	await f.state().open("draft");
	f.online(false);
	f.state().update((d) => {
		d.name = "Written offline";
	});
	await f.state().close();
	assert.equal(f.disk.size, 1);
	const g = fixture({ disk: f.disk });
	g.online(false);
	await g.state().open("draft");
	assert.equal(g.state().data.name, "Written offline");
	assert.equal(g.state().status, "offline");
	g.online(true);
	await g.draft.replay();
	assert.equal(g.remote().data.name, "Written offline");
	assert.equal(g.disk.size, 0);
	await g.state().close();
});
await check("offline conflict pauses saves; Keep mine, Use theirs, Keep both preserve chosen copies", async () => {
	for (const choice of ["keep-mine", "use-theirs", "keep-both"]) {
		const f = fixture();
		await f.state().open("draft");
		f.online(false);
		f.state().update((d) => {
			d.name = "Mine";
		});
		f.external({ data: { name: "Theirs", detail: "" } });
		f.online(true);
		await f.state().flush();
		assert.equal(f.state().data.name, "Mine");
		assert.equal(f.state().conflict.remote.data.name, "Theirs");
		const count = f.writes.length;
		await f.state().flush();
		assert.equal(f.writes.length, count);
		await f.state().resolveConflict(choice);
		assert.equal(f.state().conflict, null);
		assert.equal(f.disk.size, 0);
		assert.equal(f.state().data.name, choice === "keep-mine" ? "Mine" : "Theirs");
		if (choice === "keep-both") assert.equal(f.copies[0].data.name, "Mine");
		if (choice === "keep-mine") assert.equal(f.writes.at(-1).force, true);
		await f.state().close();
	}
});
await check("resume SSE does not advance unsaved baseline; remote changes wait for blur", async () => {
	const f = fixture();
	await f.state().open("draft");
	f.focused(true);
	f.external({ data: { name: "Remote", detail: "" } });
	await f.draft.refresh();
	assert.equal(f.state().data.name, "Before");
	f.focused(false);
	await f.draft.blur();
	assert.equal(f.state().data.name, "Remote");
	f.state().update((d) => {
		d.name = "Local";
	});
	f.external({ data: { name: "Newest remote", detail: "" } });
	await f.draft.refresh();
	await f.state().flush();
	assert(f.state().conflict);
	assert.equal(f.state().data.name, "Local");
	await f.state().resolveConflict("use-theirs");
	await f.state().close();
});
await check("failed save retains newest edits for Retry; locked documents cannot edit or undo", async () => {
	const f = fixture();
	await f.state().open("draft");
	f.fail(true);
	f.state().update((d) => {
		d.name = "Keep";
	});
	await f.state().flush();
	assert.equal(f.state().status, "error");
	assert.equal(f.disk.size, 1);
	f.fail(false);
	await f.state().flush();
	assert.equal(f.state().status, "saved");
	f.external({ isLocked: true });
	await f.draft.refresh();
	f.state().update((d) => {
		d.name = "Dropped";
	});
	f.state().undo();
	assert.equal(f.state().data.name, "Keep");
	await f.state().close();
});
await check("closed queue replays on reconnect; account/server scope prevents cross-account replay", async () => {
	const f = fixture();
	await f.state().open("draft");
	f.online(false);
	f.state().update((d) => {
		d.name = "Queued";
	});
	await f.state().close();
	f.online(true);
	f.owner("other/user-a");
	await f.draft.replay();
	assert.equal(f.writes.length, 0);
	assert.equal(f.disk.size, 1);
	f.owner("local/user-a");
	await f.draft.replay();
	assert.equal(f.remote().data.name, "Queued");
	assert.equal(f.disk.size, 0);
	await f.state().open("draft");
	f.state().update((d) => {
		d.name = "Unsaved";
	});
	f.owner("local/user-b");
	await f.state().flush();
	assert.equal(f.remote().data.name, "Queued");
	f.draft.suspend();
	assert.equal(f.state().document, null);
});
await check("storage failure remains an error and navigation retains the in-memory draft", async () => {
	const f = fixture();
	await f.state().open("draft");
	f.online(false);
	const write = f.env.storage.setItemSync;
	f.env.storage.setItemSync = () => {
		throw Error("disk full");
	};
	f.state().update((d) => {
		d.name = "Keep despite disk failure";
	});
	await f.state().flush();
	assert.equal(f.state().status, "error");
	await f.state().close();
	await f.state().open("draft");
	assert.equal(f.state().data.name, "Keep despite disk failure");
	assert.equal(f.state().status, "error");
	f.env.storage.setItemSync = write;
	f.online(true);
	await f.state().flush();
	assert.equal(f.remote().data.name, "Keep despite disk failure");
	await f.state().close();
});
await check("a late remote refresh cannot replace the next open document", async () => {
	const f = fixture();
	await f.state().open("draft");
	f.adapter.read = async (id) => ({
		id,
		isLocked: false,
		revision: 2,
		name: id,
		data: { name: id === "draft" ? "Late remote" : "Other", detail: "" },
	});
	let releaseScope;
	f.env.scope = () =>
		new Promise((resolve) => {
			releaseScope = resolve;
		});
	const refresh = f.draft.refresh();
	await drain();
	assert(releaseScope);
	f.env.scope = async () => "local/user-a";
	await f.state().open("other");
	releaseScope("local/user-a");
	await refresh;
	assert.equal(f.state().document.id, "other");
	assert.equal(f.state().data.name, "Other");
	await f.state().close();
});
await check("stale refreshes after a successful save never roll back data or the next save baseline", async () => {
	for (const focused of [false, true]) {
		const f = fixture();
		await f.state().open("draft");
		f.focused(focused);
		const old = structuredClone(f.remote());
		let releaseRead;
		f.adapter.read = () =>
			new Promise((resolve) => {
				releaseRead = resolve;
			});
		const refresh = f.draft.refresh();
		await drain();
		f.state().update((d) => {
			d.name = "Saved here";
		});
		await f.state().flush();
		releaseRead(old);
		await refresh;
		f.focused(false);
		await f.draft.blur();
		assert.equal(f.state().data.name, "Saved here");
		f.state().update((d) => {
			d.detail = "Next edit";
		});
		await f.state().flush();
		assert.equal(f.state().conflict, null);
		assert.equal(f.writes.at(-1).base.revision, 2);
		await f.state().close();
	}
});
await check("corrupt persisted drafts are discarded and the server document can open repeatedly", async () => {
	const f = fixture();
	await f.state().open("draft");
	f.online(false);
	f.state().update((d) => {
		d.name = "Offline";
	});
	await f.state().close();
	const key = [...f.disk.keys()][0];
	assert(key);
	f.disk.set(key, "{broken JSON");
	const g = fixture({ disk: f.disk });
	await g.state().open("draft");
	assert.equal(g.state().data.name, "Before");
	assert.equal(g.disk.size, 0);
	await g.state().close();
	await g.state().open("draft");
	assert.equal(g.state().data.name, "Before");
	await g.state().close();
	const badKey = key.replace(/:draft$/, ":broken");
	const queuedDisk = new Map([[badKey, "{broken JSON"]]);
	const queued = fixture({ disk: queuedDisk });
	await queued.state().open("draft");
	queued.online(false);
	queued.state().update((d) => {
		d.name = "Replay after corrupt entry";
	});
	await queued.state().close();
	queued.online(true);
	await queued.draft.replay();
	assert.equal(queued.remote().data.name, "Replay after corrupt entry");
	assert.equal(queuedDisk.size, 0);
});
await check(
	"lost save responses recover without conflicts and preserve typing during the first open read",
	async () => {
		const f = fixture();
		await f.state().open("draft");
		const save = f.adapter.save;
		f.adapter.save = async (...args) => {
			await save(...args);
			throw Error("response lost");
		};
		f.state().update((d) => {
			d.name = "Arrived on server";
		});
		await f.state().flush();
		f.online(false);
		await f.state().close();
		const diskCopy = () => new Map(f.disk);
		const g = fixture({ disk: diskCopy(), initial: structuredClone(f.remote()) });
		await g.state().open("draft");
		assert.equal(g.state().conflict, null);
		assert.equal(g.state().data.name, "Arrived on server");
		assert.equal(g.disk.size, 0);
		assert.equal(g.writes.length, 0);
		await g.state().close();
		const h = fixture({ disk: diskCopy(), initial: structuredClone(f.remote()) });
		const read = h.adapter.read;
		let releaseRead;
		h.adapter.read = () =>
			new Promise((resolve) => {
				releaseRead = resolve;
			});
		const opening = h.state().open("draft");
		await drain();
		h.state().update((d) => {
			d.detail = "Typed during open";
		});
		releaseRead(await read("draft"));
		await opening;
		assert.equal(h.state().conflict, null);
		assert.equal(h.remote().data.detail, "Typed during open");
		assert.equal(h.writes.at(-1).base.revision, 2);
		await h.state().close();
		const m = fixture({ disk: diskCopy(), initial: { ...f.remote(), name: "Different server title" } });
		await m.state().open("draft");
		assert(m.state().conflict, "Equal data must not discard unsaved document metadata");
		await m.state().resolveConflict("use-theirs");
		await m.state().close();
	},
);
await check("an initial open read cannot conflict with a save completed while it was in flight", async () => {
	const f = fixture();
	await f.state().open("draft");
	f.online(false);
	f.state().update((d) => {
		d.name = "Restored";
	});
	await f.state().close();
	const g = fixture({ disk: f.disk });
	const old = structuredClone(g.remote());
	let releaseRead;
	g.adapter.read = () =>
		new Promise((resolve) => {
			releaseRead = resolve;
		});
	const opening = g.state().open("draft");
	await drain();
	g.state().update((d) => {
		d.name = "New typing";
	});
	await g.state().flush();
	releaseRead(old);
	await opening;
	assert.equal(g.state().conflict, null);
	assert.equal(g.state().data.name, "New typing");
	g.state().update((d) => {
		d.detail = "More";
	});
	await g.state().flush();
	assert.equal(g.writes.at(-1).base.revision, 2);
	await g.state().close();
});
await check("persistence coalesces typing within 300ms and flush/suspend keep the latest edit", async () => {
	const f = fixture();
	await f.state().open("draft");
	f.online(false);
	let writes = 0;
	const set = f.env.storage.setItemSync;
	f.env.storage.setItemSync = (...args) => {
		writes++;
		return set(...args);
	};
	for (let i = 0; i < 10; i++) {
		f.state().update((d) => {
			d.name = String(i);
		});
		await advance(25);
	}
	assert.equal(writes, 0);
	await advance(50);
	assert.equal(writes, 1);
	assert.equal(JSON.parse([...f.disk.values()][0]).document.data.name, "9");
	f.state().update((d) => {
		d.name = "Force on blur";
	});
	await f.draft.blur();
	assert.equal(writes, 2);
	f.state().update((d) => {
		d.name = "Force on suspend";
	});
	f.draft.suspend();
	assert.equal(writes, 3);
	assert.equal(JSON.parse([...f.disk.values()][0]).document.data.name, "Force on suspend");
	await advance(1000);
	assert.equal(writes, 3);
});
await check(
	"account cleanup clears both persisted and pending drafts without resurrecting in-flight saves",
	async () => {
		const disk = new Map();
		const a = fixture({ disk }),
			b = fixture({ disk, owner: "local/user-b" });
		for (const f of [a, b]) {
			await f.state().open("draft");
			f.online(false);
			f.state().update((d) => {
				d.name = "Account draft";
			});
			await f.state().flush();
		}
		assert.equal(disk.size, 2);
		a.online(true);
		const release = a.hold();
		const saving = a.state().flush();
		await drain();
		a.state().update((d) => {
			d.name = "Last unsaved edit";
		});
		a.draft.clearDraftsFor("local/user-a");
		release();
		await saving;
		await advance(1000);
		assert.equal(a.state().document, null);
		assert.equal(disk.size, 1);
		await a.draft.replay();
		assert.equal(disk.size, 1);
		await b.state().close();
		await a.state().open("draft");
		assert.equal(a.state().data.name, "Account draft");
		await a.state().close();
	},
);
mock.timers.reset();
console.log(`${passed} draft boundary scenarios passed`);

// Exercise the shipped API adapters, replacing only the RPC transport and compile-time translation tag.
const { registerHooks, createRequire } = await import("node:module");
const requireMobile = createRequire(new URL("../../../../../apps/mobile/package.json", import.meta.url));
const { ORPCError } = await import(requireMobile.resolve("@orpc/client"));
let resumeRemote, letterRemote;
const resumeInputs = [],
	letterInputs = [],
	imported = [];
const clone = structuredClone;
globalThis.__m3t3client = {
	resume: {
		getById: async () => clone(resumeRemote),
		update: async (input) => {
			resumeInputs.push(clone(input));
			if (input.expectedUpdatedAt && +input.expectedUpdatedAt !== +resumeRemote.updatedAt)
				throw new ORPCError("RESUME_VERSION_CONFLICT", { status: 409 });
			const { expectedUpdatedAt, sessionId, ...fields } = input;
			resumeRemote = { ...resumeRemote, ...fields, updatedAt: new Date(+resumeRemote.updatedAt + 1) };
			return clone(resumeRemote);
		},
		import: async (input) => {
			imported.push(clone(input));
			return "copy-resume";
		},
	},
	coverLetters: {
		getById: async () => clone(letterRemote),
		update: async (input) => {
			letterInputs.push(clone(input));
			if (input.expectedRevision !== letterRemote.revision) throw new ORPCError("CONFLICT", { status: 409 });
			const { expectedRevision, sessionId, metadata, template, ...fields } = input;
			letterRemote = { ...letterRemote, ...fields, revision: letterRemote.revision + 1 };
			if (metadata)
				letterRemote.style = { ...letterRemote.style, metadata: { ...letterRemote.style.metadata, ...metadata } };
			return clone(letterRemote);
		},
		import: async (input) => {
			imported.push(clone(input));
			return { ...letterRemote, id: "copy-letter" };
		},
	},
};
const rpcClient = globalThis.__m3t3client;
const streamTransport = {};
globalThis.__m3t3streamClient = streamTransport;
const dataModule = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const hook = registerHooks({
	resolve(specifier, context, next) {
		if (specifier === "@/api/client")
			return {
				url: dataModule(
					"export const client=globalThis.__m3t3client;export const streamClient=globalThis.__m3t3streamClient;",
				),
				shortCircuit: true,
			};
		if (specifier === "@lingui/core/macro")
			return {
				url: dataModule('export const t=(strings,...values)=>strings.reduce((s,part,i)=>s+part+(values[i]??""),"");'),
				shortCircuit: true,
			};
		return next(specifier, context);
	},
	load(url, context, next) {
		if (url.startsWith("data:text/javascript,"))
			return {
				format: "commonjs",
				source: decodeURIComponent(url.slice("data:text/javascript,".length)).replaceAll(
					/export const (\w+)=/g,
					"exports.$1=",
				),
				shortCircuit: true,
			};
		return next(url, context);
	},
});
const { resumeAdapter, letterAdapter } = await import("../../../../../apps/mobile/src/draft/adapters.ts");
const { defaultResumeData } = await import("../../../../../packages/schema/src/resume/default.ts");
const baseResume = () => ({
	id: "real-resume",
	name: "Resume",
	slug: "resume",
	tags: [],
	data: clone(defaultResumeData),
	isLocked: false,
	isPublic: false,
	showDownloadButtons: true,
	hasPassword: false,
	applicationId: null,
	createdAt: new Date(0),
	updatedAt: new Date(1),
});
function realDraft(adapter) {
	const f = fixture();
	return createDraftStore(adapter, f.env);
}
await check("real resume adapter CAS, dated disk recovery and Keep both import unsaved content", async () => {
	resumeRemote = baseResume();
	const draft = realDraft(resumeAdapter),
		s = draft.store.getState;
	await s().open("real-resume");
	s().update((d) => {
		d.basics.name = "Mine";
	});
	await s().flush();
	assert.equal(+resumeInputs.at(-1).expectedUpdatedAt, 1);
	assert.equal(s().document.updatedAt.getTime(), 2);
	const parsed = resumeAdapter.parse(JSON.parse(JSON.stringify(s().document)));
	assert(parsed.updatedAt instanceof Date);
	s().update((d) => {
		d.basics.name = "Offline local";
	});
	resumeRemote = {
		...resumeRemote,
		updatedAt: new Date(3),
		data: { ...resumeRemote.data, basics: { ...resumeRemote.data.basics, name: "Other device" } },
	};
	await s().flush();
	assert(s().conflict);
	await s().resolveConflict("keep-both");
	assert.equal(imported.at(-1).data.basics.name, "Offline local");
	assert.equal(s().data.basics.name, "Other device");
	await s().close();
});
await check("real letter adapter revisions, body+design edits, restart dates and stale revision conflict", async () => {
	const data = baseResume().data;
	letterRemote = {
		id: "real-letter",
		name: "Letter",
		recipient: "",
		content: "Before",
		greeting: null,
		signOff: null,
		recipientName: "",
		recipientCompany: "",
		letterDate: null,
		layout: "structured",
		sourceResumeId: null,
		sourceApplicationId: null,
		senderLinked: false,
		designLinked: false,
		isLocked: false,
		revision: 1,
		createdAt: new Date(0),
		updatedAt: new Date(1),
		style: {
			basics: data.basics,
			picture: data.picture,
			metadata: data.metadata,
			sectionId: "letter",
			itemId: "letter",
		},
	};
	const draft = realDraft(letterAdapter),
		s = draft.store.getState;
	await s().open("real-letter");
	s().update((d) => {
		d.content = "First body";
	});
	await s().flush();
	assert.equal(s().document.revision, 2);
	assert.equal(s().data.revision, 2);
	s().updateDocument((d) => {
		d.name = "Renamed letter";
	});
	s().undo();
	assert.equal(s().document.name, "Renamed letter");
	assert.equal(s().document.content, "Before");
	s().redo();
	assert.equal(s().document.name, "Renamed letter");
	assert.equal(s().document.content, "First body");
	s().update((d) => {
		d.content = "Latest body";
		d.style.metadata.page.marginX = 12;
	});
	await s().flush();
	assert.equal(letterInputs.at(-1).expectedRevision, 2);
	assert.equal(s().document.revision, 3);
	const submitted = s().document;
	assert.equal(
		letterAdapter.merge(
			{ ...submitted, designLinked: false },
			{ ...submitted, designLinked: true },
			{ ...submitted, designLinked: true },
		).designLinked,
		false,
	);
	assert.equal(letterInputs.at(-1).metadata.page.marginX, 12);
	assert(letterAdapter.parse(JSON.parse(JSON.stringify(s().document))).createdAt instanceof Date);
	s().update((d) => {
		d.content = "Local";
	});
	letterRemote = { ...letterRemote, revision: 4, content: "Remote" };
	await s().flush();
	assert(s().conflict);
	await s().resolveConflict("keep-mine");
	assert.equal(letterInputs.at(-1).expectedRevision, 4);
	assert.equal(letterRemote.content, "Local");
	await s().close();
});
hook.deregister();
delete globalThis.__m3t3client;
console.log(`${passed} total boundary scenarios passed`);

await check("real letter response loss adopts the server revision without discarding local content", async () => {
	letterRemote = letterAdapter.parse(letterRemote);
	const f = fixture();
	const draft = createDraftStore(letterAdapter, f.env),
		state = draft.store.getState;
	await state().open("real-letter");
	const update = rpcClient.coverLetters.update;
	rpcClient.coverLetters.update = async (input) => {
		await update(input);
		throw Error("lost letter response");
	};
	state().update((d) => {
		d.content = "Letter saved despite response loss";
	});
	await state().flush();
	rpcClient.coverLetters.update = update;
	f.online(false);
	await state().close();
	f.online(true);
	const recovered = createDraftStore(letterAdapter, f.env);
	await recovered.store.getState().open("real-letter");
	assert.equal(recovered.store.getState().conflict, null);
	assert.equal(recovered.store.getState().document.revision, letterRemote.revision);
	assert.equal(recovered.store.getState().document.content, "Letter saved despite response loss");
	assert.equal(f.disk.size, 0);
	await recovered.store.getState().close();
});

// Native lifecycle boundary: real watchDraft + scope logic, with platform event emitters as external inputs.
let token = `header.${Buffer.from(JSON.stringify({ sub: "user-a" })).toString("base64url")}.signature`;
let server = "http://local.test";
const networkListeners = new Set();
const callbacks = {},
	removed = [];
globalThis.__m3t3native = {
	network: {
		getNetworkStateAsync: async () => ({ isConnected: false, isInternetReachable: false }),
		addNetworkStateListener: (fn) => {
			callbacks.network = fn;
			networkListeners.add(fn);
			return {
				remove: () => {
					networkListeners.delete(fn);
					removed.push("network");
				},
			};
		},
	},
	storage: {},
	rn: {
		AppState: {
			addEventListener: (_, fn) => {
				callbacks.app = fn;
				return { remove: () => removed.push("app") };
			},
		},
		Keyboard: {
			isVisible: () => false,
			addListener: (_, fn) => {
				callbacks.keyboard = fn;
				return { remove: () => removed.push("keyboard") };
			},
		},
		TextInput: { State: { currentlyFocusedInput: () => null } },
	},
	session: { getServer: () => server, getAccessToken: async () => token },
};
const nativeHook = registerHooks({
	resolve(s, c, next) {
		const modules = {
			"expo-network": "network",
			"expo-sqlite/kv-store": "storage",
			"react-native": "rn",
			"@/auth/session": "session",
		};
		if (s in modules) return { url: `m3t3:${modules[s]}`, shortCircuit: true };
		return next(s, c);
	},
	load(url, c, next) {
		if (url.startsWith("m3t3:")) {
			const key = url.slice(5);
			return {
				format: "commonjs",
				source: Object.keys(globalThis.__m3t3native[key])
					.map((name) => `exports.${name}=globalThis.__m3t3native.${key}.${name};`)
					.join(""),
				shortCircuit: true,
			};
		}
		return next(url, c);
	},
});
const { watchDraft, nativeEnvironment } = await import("../../../../../apps/mobile/src/draft/native.ts");
await check("native network reconnect, AppState background flush, keyboard blur, and listener cleanup", async () => {
	const events = [];
	const stop = watchDraft({
		flush: async () => {
			events.push("flush");
		},
		replay: async () => {
			events.push("replay");
		},
		refresh: async () => {
			events.push("refresh");
		},
		blur: async () => {
			events.push("blur");
		},
	});
	await drain();
	assert.equal(nativeEnvironment.online(), false);
	callbacks.network({ isConnected: true, isInternetReachable: true });
	await drain();
	assert.deepEqual(events, ["flush", "replay", "refresh"]);
	callbacks.app("background");
	await drain();
	assert.equal(events.at(-1), "flush");
	callbacks.keyboard();
	await drain();
	assert.equal(events.at(-1), "blur");
	stop();
	assert.deepEqual(removed, ["network", "app", "keyboard"]);
});
await check("native queue scope uses only server and OAuth subject; signed-out state cannot read it", async () => {
	assert.equal(await nativeEnvironment.scope(), JSON.stringify(["http://local.test", "user-a"]));
	server = "http://other.test";
	assert.equal(await nativeEnvironment.scope(), JSON.stringify(["http://other.test", "user-a"]));
	token = null;
	assert.equal(await nativeEnvironment.scope(), null);
});
await check("both resume and letter queues receive the same reconnect", async () => {
	let first = 0,
		second = 0;
	const target = (count) => ({
		flush: async () => {},
		refresh: async () => {},
		blur: async () => {},
		replay: async () => {
			count();
		},
	});
	const stopFirst = watchDraft(target(() => first++));
	const stopSecond = watchDraft(target(() => second++));
	await drain();
	for (const listener of networkListeners) listener({ isConnected: true, isInternetReachable: true });
	await drain();
	assert.equal(first, 1);
	assert.equal(second, 1);
	stopFirst();
	stopSecond();
});
nativeHook.deregister();
delete globalThis.__m3t3native;
console.log(`${passed} total scenarios passed; native platform events simulated, RPC transport simulated`);

mock.timers.enable({ apis: ["setTimeout"] });
const queueDisk = new Map();
Object.assign(nativeEnvironment.storage, {
	getItemSync: (k) => queueDisk.get(k) ?? null,
	setItemSync: (k, v) => queueDisk.set(k, v),
	removeItemSync: (k) => queueDisk.delete(k),
	getAllKeysSync: () => [...queueDisk.keys()],
});
token = `header.${Buffer.from(JSON.stringify({ sub: "user-a" })).toString("base64url")}.signature`;
const streams = [];
globalThis.__m3t3runtime = {
	client: rpcClient,
	streamClient: {
		resume: {
			updates: {
				subscribe: async (_input, { signal }) => {
					let wake;
					const stream = {
						signal,
						emit: () => wake?.({ done: false, value: { mutation: "update" } }),
						end: () => wake?.({ done: true }),
					};
					streams.push(stream);
					return {
						[Symbol.asyncIterator]() {
							return this;
						},
						next() {
							return new Promise((resolve) => {
								wake = resolve;
								if (signal.aborted) resolve({ done: true });
								else signal.addEventListener("abort", () => resolve({ done: true }), { once: true });
							});
						},
					};
				},
			},
		},
	},
};
const runtimeHook = registerHooks({
	resolve(s, c, next) {
		if (s === "@/api/client") return { url: "m3t3-runtime:api", shortCircuit: true };
		return next(s, c);
	},
	load(url, c, next) {
		if (url === "m3t3-runtime:api")
			return {
				format: "commonjs",
				source:
					"exports.client=globalThis.__m3t3runtime.client;exports.streamClient=globalThis.__m3t3runtime.streamClient;",
				shortCircuit: true,
			};
		return next(url, c);
	},
});
Object.assign(streamTransport, globalThis.__m3t3runtime.streamClient);
const runtime = await import("../../../../../apps/mobile/src/draft/runtime.ts");
await check("native store owns SSE retry/abort, defers updates to field blur, and replays after close", async () => {
	resumeRemote = baseResume();
	const draft = runtime.resume,
		s = runtime.useResumeStore.getState;
	await s().open("real-resume");
	await drain();
	callbacks.network({ isConnected: true, isInternetReachable: true });
	await drain();
	assert.equal(streams.length, 1);
	draft.focus();
	resumeRemote = {
		...resumeRemote,
		updatedAt: new Date(2),
		data: { ...resumeRemote.data, basics: { ...resumeRemote.data.basics, name: "External" } },
	};
	streams[0].emit();
	await drain();
	assert.equal(s().data.basics.name, "");
	await draft.blur();
	assert.equal(s().data.basics.name, "External");
	streams[0].end();
	await drain();
	await advance(2500);
	assert.equal(streams.length, 2);
	callbacks.network({ isConnected: false, isInternetReachable: false });
	s().update((d) => {
		d.basics.name = "Queued after close";
	});
	await s().close();
	assert(streams[1].signal.aborted);
	assert.equal(queueDisk.size, 1);
	callbacks.network({ isConnected: true, isInternetReachable: true });
	await drain();
	assert.equal(resumeRemote.data.basics.name, "Queued after close");
	assert.equal(queueDisk.size, 0);
	draft.suspend();
	runtime.letter.suspend();
});
await check("public sign-out cleanup removes resume and letter queues only for the supplied account", async () => {
	const scope = await runtime.getDraftScope();
	assert(scope);
	for (const [store, edit, id] of [
		[
			runtime.useResumeStore,
			(d) => {
				d.basics.name = "Sign-out resume";
			},
			"real-resume",
		],
		[
			runtime.useLetterStore,
			(d) => {
				d.content = "Sign-out letter";
			},
			"real-letter",
		],
	]) {
		await store.getState().open(id);
		await drain();
		callbacks.network({ isConnected: false, isInternetReachable: false });
		store.getState().update(edit);
		await store.getState().flush();
		await store.getState().close();
	}
	assert.equal(queueDisk.size, 2);
	const otherKey = `reactive-resume:unsaved:${encodeURIComponent(JSON.stringify([server, "user-b"]))}:resume:other`;
	queueDisk.set(otherKey, "Other account");
	runtime.clearDraftsFor(scope);
	await advance(1000);
	assert.deepEqual([...queueDisk.keys()], [otherKey]);
	assert.equal(runtime.useResumeStore.getState().document, null);
	assert.equal(runtime.useLetterStore.getState().document, null);
});
runtimeHook.deregister();
delete globalThis.__m3t3runtime;
mock.timers.reset();
console.log(`${passed} total boundary scenarios passed`);
