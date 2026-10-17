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
