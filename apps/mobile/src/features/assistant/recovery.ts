// Following a reply the connection lost (no React Native imports: reports/M6-T3/verify.mjs drives it in Node).
import type { UIMessage } from "ai";

export type SavedThread = { messages: UIMessage[]; active: boolean };

type RecoverOptions = {
	/** False once the caller moved on (unmounted, backgrounded, stopped, sent): nothing is touched after that. */
	isCurrent: () => boolean;
	/** The thread as the server saved it, or null when it couldn't be read. */
	reload: () => Promise<SavedThread | null>;
	/** Shows the saved messages. */
	apply: (messages: UIMessage[]) => void;
	/** Follows the running reply until it ends, goes quiet (transport.ts RESUME_IDLE_MS) or fails. */
	resume: () => Promise<void>;
	sleep?: (ms: number) => Promise<void>;
	backoff?: { first: number; max: number };
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Shows the thread as the server saved it and follows a running reply until the server says it finished. A resumed
 * stream that ends early (quiet or cut off) is resumed again, with backoff, as long as the run is still going.
 */
export async function recoverRun({ isCurrent, reload, apply, resume, sleep = wait, backoff }: RecoverOptions) {
	const { first, max } = backoff ?? { first: 1_000, max: 30_000 };
	let delay = first;
	while (isCurrent()) {
		const latest = await reload();
		if (!isCurrent()) return;
		if (latest) {
			apply(latest.messages);
			if (!latest.active) return;
			await resume();
			if (!isCurrent()) return;
		}
		await sleep(delay);
		delay = Math.min(delay * 2, max);
	}
}

type LaneOptions = {
	/** Aborts every request the chat has open (send, automatic continuation, resume) and waits for them to settle. */
	stop: () => Promise<void>;
	/** A request the lane didn't start, such as the SDK's automatic continuation after an answer. */
	busy: () => boolean;
};

/**
 * One request at a time for a conversation. `run` cancels and awaits whatever is open before its task starts, so
 * two streams never overlap; `runIfIdle` (recovery) starts only when nothing is open; `cancel` (Stop, background,
 * unmount) aborts everything. A task gets `isCurrent`, false once a later run or cancel replaced it.
 */
export function createRequestLane({ stop, busy }: LaneOptions) {
	let generation = 0;
	let active: Promise<void> | null = null;

	const settle = async () => {
		if (!active && !busy()) return;
		await stop();
		await active?.catch(() => undefined);
	};

	const start = (token: number, task: (isCurrent: () => boolean) => Promise<void>) => {
		const current: Promise<void> = task(() => token === generation).finally(() => {
			if (active === current) active = null;
		});
		active = current;
		return current;
	};

	const runIfIdle = (task: (isCurrent: () => boolean) => Promise<void>) => {
		if (active || busy()) return Promise.resolve();
		return start(++generation, task);
	};

	return {
		busy: () => active !== null || busy(),
		async run(task: (isCurrent: () => boolean) => Promise<void>) {
			const token = ++generation;
			await settle();
			if (token !== generation) return;
			await start(token, task);
		},
		runIfIdle,
		/**
		 * Waits for `settled` (a detach), then runs `task` as `runIfIdle` would, unless a run or cancel came in between
		 * (Stop, unmount, another background) or `allowed()` (the app is still active) says no.
		 */
		async runAfter(settled: Promise<void>, allowed: () => boolean, task: (isCurrent: () => boolean) => Promise<void>) {
			const token = generation;
			await settled.catch(() => undefined);
			if (token !== generation || !allowed()) return;
			await runIfIdle(task);
		},
		async cancel() {
			generation++;
			await settle();
		},
	};
}
