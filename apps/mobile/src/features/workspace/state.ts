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

type AutosaveOptions = {
	/** Resolves true once the server has the value, false when the write failed. Never rejects. */
	save: (value: string) => Promise<boolean>;
	/** Called once the server acknowledged `value`. */
	onSaved?: (value: string) => void;
	delay: number;
	/** The wait before retrying a value whose write failed. */
	retryDelay: number;
	timers: Timers;
};

/**
 * Saves text a moment after typing stops, on `flush` (blur) and on `dispose` (leaving). A failed value is retried after
 * `retryDelay` instead of being marked done; a value already on its way is not sent twice.
 */
export function createAutosave({ save, onSaved, delay, retryDelay, timers }: AutosaveOptions) {
	let value = "";
	let saved = "";
	let inFlight: string | null = null;
	let failed: string | null = null;
	let timer: unknown = null;
	let disposed = false;
	let acknowledged: string | null = null;
	const cancel = () => {
		if (timer !== null) timers.clear(timer);
		timer = null;
	};
	const schedule = (ms: number) => {
		cancel();
		if (!disposed) timer = timers.set(flush, ms);
	};
	function flush() {
		cancel();
		if (value === saved || value === inFlight) return;
		const sending = value;
		inFlight = sending;
		void save(sending).then((ok) => {
			if (inFlight === sending) inFlight = null;
			if (ok) {
				if (failed === sending) failed = null;
				acknowledged = sending;
				onSaved?.(sending);
				return;
			}
			failed = sending;
			if (value === sending && value !== saved) schedule(retryDelay);
		});
	}
	return {
		update(nextValue: string, nextSaved: string) {
			value = nextValue;
			saved = nextSaved;
			if (value === saved) {
				cancel();
				failed = null;
				// The server already has it (saved here, or elsewhere): its device draft can go.
				if (value !== acknowledged) {
					acknowledged = value;
					onSaved?.(value);
				}
				return;
			}
			if (value === inFlight) return;
			schedule(value === failed ? retryDelay : delay);
		},
		flush,
		dispose() {
			flush();
			disposed = true;
			cancel();
		},
	};
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
