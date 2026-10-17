// Pure state helpers for the workspace: drafts kept until the server has them, autosave with retry, one pending
// operation per item across screens, and dropping stale async results. Storage and timers are injected, and there are
// no React Native or path-alias imports, so the M6-T2 Node scenarios run this file directly.

// ---- Drafts on the device ----

export type DraftStorage = {
	getItemSync: (key: string) => string | null;
	setItemSync: (key: string, value: string) => void;
	removeItemSync: (key: string) => unknown;
};

/** JSON drafts in kv-store. Storage errors leave the draft usable on screen; nothing throws. */
export function createDraftStore(storage: DraftStorage) {
	return {
		read<T>(key: string): T | undefined {
			try {
				const raw = storage.getItemSync(key);
				return raw === null ? undefined : (JSON.parse(raw) as T);
			} catch {
				return undefined;
			}
		},
		write(key: string, value: unknown) {
			try {
				storage.setItemSync(key, JSON.stringify(value));
			} catch {
				// Full or unavailable storage: the draft lasts while the screen is open.
			}
		},
		/**
		 * Removes the draft. With `sent`, only while the stored draft is still that revision, so an edit made while it
		 * was being saved or reviewed is kept.
		 */
		clear(key: string, sent?: unknown) {
			try {
				if (sent !== undefined && storage.getItemSync(key) !== JSON.stringify(sent)) return;
				storage.removeItemSync(key);
			} catch {
				// Nothing to clear.
			}
		},
	};
}

// ---- Autosave ----

export type Timers = { set: (run: () => void, ms: number) => unknown; clear: (id: unknown) => void };

/** What a write did. `transient` failures (offline, 5xx, rate limit) may be retried; others need the user. */
export type SaveResult = { ok: true } | { ok: false; transient: boolean; code: string };

/**
 * Sorts a failed request: no HTTP status (network down, timeout) and 408/429/5xx are transient; any other 4xx,
 * including a 409 conflict with a concurrent edit, is permanent.
 */
export function saveFailure(error: unknown): Extract<SaveResult, { ok: false }> {
	const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
	const http = typeof status === "number" ? status : null;
	const transient = http === null || http === 408 || http === 429 || http >= 500;
	return { ok: false, transient, code: typeof code === "string" ? code : http === null ? "NETWORK" : String(http) };
}

/**
 * Why automatic saving stopped. `permanent` failures (4xx, a conflict with a concurrent edit) are kept with the draft
 * on the device, so reopening the screen still waits for the user instead of overwriting the newer server copy.
 */
export type SaveBlock = { value: string; code: string; permanent: boolean };

type AutosaveOptions = {
	/** Never rejects. */
	save: (value: string) => Promise<SaveResult>;
	/** The server confirmed this exact value (clear its device draft). Never called for an optimistic or refetched copy. */
	onSaved?: (value: string) => void;
	/** Automatic saving stopped (show it; persist it when permanent), or null once a save succeeded or the server version replaced it. */
	onError?: (block: SaveBlock | null) => void;
	delay: number;
	/** The first wait before retrying a transient failure; it doubles each time. */
	retryDelay: number;
	/** Automatic retries of one value after a transient failure. */
	maxRetries: number;
	timers: Timers;
};

/**
 * Saves text a moment after typing stops, on `flush` (blur) and on `dispose` (leaving). A transient failure is retried
 * with exponential backoff up to `maxRetries` times, and new typing afterwards starts afresh. A permanent failure (4xx,
 * conflict) stops all automatic saving, new typing and leaving included, until the user's `retry` succeeds or `takeServerVersion`
 * drops the draft; `block` restores that state from the device on reopen. A value already on its way is not sent twice.
 */
export function createAutosave({ save, onSaved, onError, delay, retryDelay, maxRetries, timers }: AutosaveOptions) {
	let value = "";
	let saved = "";
	let inFlight: string | null = null;
	let failed: { value: string; attempts: number; stopped: boolean; permanent: boolean } | null = null;
	let timer: unknown = null;
	let disposed = false;
	// "Use server version" is loading the confirmed copy: nothing is sent meanwhile.
	let resolving = false;
	const cancel = () => {
		if (timer !== null) timers.clear(timer);
		timer = null;
	};
	const schedule = (ms: number) => {
		cancel();
		if (!disposed) timer = timers.set(() => send(false), ms);
	};
	const clearError = () => {
		if (failed?.stopped) onError?.(null);
		failed = null;
	};
	function send(manual: boolean) {
		cancel();
		if (resolving || value === saved || value === inFlight) return;
		if (!manual && (failed?.permanent || (failed?.value === value && failed.stopped))) return;
		const sending = value;
		inFlight = sending;
		void save(sending).then((result) => {
			if (inFlight === sending) inFlight = null;
			if (result.ok) {
				// A confirmed write resolves a conflict: the user chose to save over the other copy.
				if (failed && (failed.value === sending || failed.permanent)) clearError();
				onSaved?.(sending);
				return;
			}
			const attempts = failed?.value === sending && !manual ? failed.attempts + 1 : 1;
			const permanent = !result.transient;
			const stopped = permanent || attempts > maxRetries;
			failed = { value: sending, attempts, stopped, permanent };
			if (stopped) onError?.({ value: sending, code: result.code, permanent });
			else if (value === sending) schedule(retryDelay * 2 ** (attempts - 1));
		});
	}
	return {
		update(nextValue: string, nextSaved: string) {
			value = nextValue;
			saved = nextSaved;
			// An equal copy (optimistic or refetched) needs no write; it doesn't confirm a draft either.
			if (value === saved || value === inFlight) return cancel();
			// A conflict waits for the user whatever is typed; a failed value waits for its retry timer, or the user.
			if (failed?.permanent || failed?.value === value) return;
			clearError();
			schedule(delay);
		},
		/** Restores a permanent failure kept on the device: nothing is sent until `retry` or `takeServerVersion`. */
		block(blocked: { value: string; code: string }) {
			cancel();
			failed = { value: blocked.value, attempts: maxRetries + 1, stopped: true, permanent: true };
			onError?.({ ...blocked, permanent: true });
		},
		flush: () => send(false),
		/** The user's Retry: sends the current value now; the error stays until the server confirms it. */
		retry: () => {
			if (!resolving) send(true);
		},
		/**
		 * "Use server version". `fetchServer` must return a copy the server confirmed (a fresh fetch, never the
		 * optimistic cache). Saving stays blocked while it loads; once it arrives, `reset` puts it in the draft and the
		 * baseline moves to it, and only then is the block cleared. A failed fetch leaves everything blocked and rejects.
		 */
		async takeServerVersion(fetchServer: () => Promise<string>, reset: (server: string) => void) {
			if (resolving) return;
			resolving = true;
			cancel();
			try {
				const server = await fetchServer();
				reset(server);
				value = server;
				saved = server;
				cancel();
				clearError();
			} finally {
				resolving = false;
			}
		},
		dispose() {
			send(false);
			disposed = true;
			cancel();
		},
	};
}

// ---- Drafts per account ----

export type DraftState<T> = {
	key: string | null;
	/** The key the shown value belongs to; null while it was typed before any account was known. */
	owner: string | null;
	value: T;
	touched: boolean;
};

/**
 * The draft to show when the account key changes. A key going away (the identity is being re-checked) keeps what's on
 * screen; the same key coming back keeps it too. Another account's key never inherits it: that account's own draft,
 * or the server value, is shown instead. Text typed before any key was known is adopted by the first key.
 */
export function nextDraftState<T>(
	state: DraftState<T>,
	key: string | null,
	kept: T | undefined,
	initial: T,
): DraftState<T> {
	if (key === null) return { ...state, key };
	if (state.owner === key || (state.owner === null && state.touched)) return { ...state, key, owner: key };
	return { key, owner: key, value: kept ?? initial, touched: false };
}

// ---- Delayed work bound to who started it ----

/**
 * Runs a delayed operation (after its Undo toast) only if the account that started it is still the signed-in one.
 * Scopes are `getDraftScope()` values (server + OAuth subject); an unknown identity on either side cancels.
 */
export async function dispatchForOrigin(
	origin: Promise<string | null>,
	current: () => Promise<string | null>,
	run: () => Promise<unknown>,
): Promise<"sent" | "cancelled"> {
	const from = await origin;
	const now = await current();
	if (from === null || from !== now) return "cancelled";
	await run();
	return "sent";
}

// ---- One pending operation per item ----

/**
 * Operations waiting on an Undo toast, keyed by item id, outside any component: leaving and reopening a screen sees the
 * same pending operation instead of starting a second one.
 */
export function createPendingRegistry<T>() {
	const entries = new Map<string, T>();
	const listeners = new Set<() => void>();
	const emit = () => {
		for (const listener of listeners) listener();
	};
	return {
		get: (id: string) => entries.get(id),
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => void listeners.delete(listener);
		},
		/** Records the operation; false when one is already pending for this id. */
		start(id: string, value: T) {
			if (entries.has(id)) return false;
			entries.set(id, value);
			emit();
			return true;
		},
		finish(id: string) {
			if (entries.delete(id)) emit();
		},
	};
}

// ---- Stale async results ----

/** Hands out request tokens; `invalidate` (a newer request, or unmounting) makes every earlier one stale. */
export function createRequests() {
	let current = 0;
	return {
		begin: () => ++current,
		isCurrent: (token: number) => token === current,
		invalidate: () => {
			current += 1;
		},
	};
}

export type Requests = ReturnType<typeof createRequests>;

/**
 * Loads something to play (spoken audio) and plays it only if no newer request or unmount came first; a late result
 * is discarded (its file deleted) instead of playing on a screen that's gone.
 */
export async function playLatest<F>(
	requests: Requests,
	load: () => Promise<F>,
	play: (file: F) => Promise<void> | void,
	discard: (file: F) => void,
) {
	const token = requests.begin();
	const file = await load();
	if (!requests.isCurrent(token)) {
		discard(file);
		return false;
	}
	await play(file);
	return true;
}

// ---- Practise recordings ----

type Audio = { uri: string };

/**
 * After a transcription succeeds: without Keep, the uploaded file is deleted. Returns the recording to show next: the
 * current one, unless it is the uploaded file that was just deleted.
 */
export function afterTranscribed<A extends Audio>(input: {
	uploaded: A;
	current: A | null;
	keep: boolean;
	remove: (audio: A) => void;
}): A | null {
	if (input.keep) return input.current;
	input.remove(input.uploaded);
	return input.current?.uri === input.uploaded.uri ? null : input.current;
}
