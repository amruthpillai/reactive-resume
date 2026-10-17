// Data for the application workspace, ported from apps/web/src/features/career/hooks.ts. Query keys append the
// server origin, as the other mobile features do, and stay under the oRPC prefixes so Career writes refresh them.
import type { RouterOutput } from "@/api/client";
import type { CareerWorkspace, GenerateTask } from "@reactive-resume/schema/career";
import type { QueryClient } from "@tanstack/react-query";
import type { SetStateAction } from "react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { ORPCError } from "@orpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EMPTY_WORKSPACE } from "@reactive-resume/schema/career";
import { createAutosave, createDraftStore } from "./state";
import { orpc } from "@/api/client";
import { getServer, useSession } from "@/auth/session";
import { getDraftScope } from "@/draft";
import { useHasAIProvider } from "@/features/ai/providers";
import { showToast } from "@/ui";

export type SavedItem = RouterOutput["career"]["savedItems"][number];
export type SavedData<K extends SavedItem["data"]["kind"]> = Extract<SavedItem["data"], { kind: K }>;
export type Fact = RouterOutput["career"]["facts"][number];
export type Story = RouterOutput["career"]["stories"][number];

/** The server's own message when it explains the problem (web `allowServerMessage`), otherwise `fallback`. */
export function workspaceError(error: unknown, fallback: string) {
	if (error instanceof ORPCError && error.message && error.code !== "INTERNAL_SERVER_ERROR") return error.message;
	return fallback;
}

function useSignedIn() {
	const session = useSession();
	return { server: session.server, enabled: session.status === "signed-in" };
}

const workspaceKey = (applicationId: string, server: string) => [
	...orpc.career.workspace.queryKey({ input: { applicationId } }),
	server,
];

const workspaceWrites = new WeakMap<QueryClient, Map<string, Set<Promise<unknown>>>>();

/**
 * One application's live workspace state. Saves are optimistic and run one at a time per application; a failure
 * explains the problem and refetches once queued writes finish, while text fields keep their local drafts.
 */
export function useWorkspace(applicationId: string) {
	const queryClient = useQueryClient();
	const { server, enabled } = useSignedIn();
	const queryKey = workspaceKey(applicationId, server);
	const query = useQuery({
		...orpc.career.workspace.queryOptions({ input: { applicationId } }),
		queryKey,
		enabled,
	});
	let byApplication = workspaceWrites.get(queryClient);
	if (!byApplication) workspaceWrites.set(queryClient, (byApplication = new Map()));
	const scope = `${server}:${applicationId}`;
	let writes = byApplication.get(scope);
	if (!writes) byApplication.set(scope, (writes = new Set()));
	const pending = writes;
	const mutation = useMutation({
		...orpc.career.saveWorkspace.mutationOptions(),
		// One at a time per application, and no refetch between them: a refetch landing between two quick ticks would
		// hand the second save a copy without the first.
		scope: { id: `career-workspace:${scope}` },
		onError: (error) =>
			showToast({
				message: workspaceError(error, t`Couldn't save that change. Check your connection and try again.`),
			}),
	});
	const current = () => queryClient.getQueryData<CareerWorkspace>(queryKey) ?? EMPTY_WORKSPACE;
	/** Resolves true once the server has the change, false when it failed (already reported). Never rejects. */
	const save = (patch: Partial<CareerWorkspace>): Promise<boolean> => {
		if (getServer() !== server) return Promise.resolve(false);
		const previous = current();
		const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
		const expected = Object.fromEntries(
			Object.keys(defined).map((key) => [key, previous[key as keyof CareerWorkspace]]),
		);
		// Capture and publish synchronously, so another control's immediate write builds on this one.
		void queryClient.cancelQueries({ queryKey });
		queryClient.setQueryData(queryKey, { ...previous, ...defined });
		const write = mutation.mutateAsync({ applicationId, ...defined, expected });
		pending.add(write);
		return write.then(
			() => {
				pending.delete(write);
				return true;
			},
			() => {
				pending.delete(write);
				void Promise.allSettled(pending).then(() => queryClient.invalidateQueries({ queryKey }));
				return false;
			},
		);
	};
	return {
		data: query.data ?? EMPTY_WORKSPACE,
		query,
		isPending: query.isPending,
		/** The latest copy, including saves still in flight, for a change that commits later (after an Undo toast). */
		current,
		save,
		/** Finish queued writes before an action that reads the authoritative workspace. */
		settled: async () => {
			while (pending.size > 0) await Promise.allSettled(pending);
			return current();
		},
		queryKey,
	};
}

/** Toggles one row of a ticked list in the workspace ("plan:{id}", "now:{interviewId}", "week:{id}"). */
export function useTicks(applicationId: string, key: string) {
	const workspace = useWorkspace(applicationId);
	return {
		ticked: workspace.data.ticks[key] ?? [],
		toggle: (row: string, on: boolean) => {
			const ticks = workspace.current().ticks;
			const rows = ticks[key] ?? [];
			workspace.save({
				ticks: { ...ticks, [key]: on ? [...new Set([...rows, row])] : rows.filter((item) => item !== row) },
			});
		},
	};
}

export function useSavedItems(applicationId: string) {
	const { server, enabled } = useSignedIn();
	const options = orpc.career.savedItems.queryOptions({ input: { applicationId } });
	return useQuery({ ...options, queryKey: [...options.queryKey, server], enabled });
}

export function useFacts(applicationId: string) {
	const { server, enabled } = useSignedIn();
	const options = orpc.career.facts.queryOptions({ input: { applicationId } });
	return useQuery({ ...options, queryKey: [...options.queryKey, server], enabled });
}

export function useStories(applicationId: string) {
	const { server, enabled } = useSignedIn();
	const options = orpc.career.stories.queryOptions({ input: { applicationId } });
	return useQuery({ ...options, queryKey: [...options.queryKey, server], enabled });
}

export function useSchedules() {
	const { server, enabled } = useSignedIn();
	const options = orpc.career.schedules.queryOptions({ input: {} });
	return useQuery({ ...options, queryKey: [...options.queryKey, server], enabled });
}

export function useFlags() {
	const { server } = useSignedIn();
	return useQuery({ ...orpc.flags.get.queryOptions(), queryKey: [...orpc.flags.get.key(), server] });
}

/** The newest saved item of one kind, optionally for one interview. */
export function latest<K extends SavedItem["data"]["kind"]>(
	items: SavedItem[] | undefined,
	kind: K,
	interviewId?: string | null,
) {
	return items?.find(
		(item): item is SavedItem & { data: SavedData<K> } =>
			item.data.kind === kind && (interviewId === undefined || item.interviewId === interviewId),
	);
}

/**
 * Asks the coach for one structured piece of work for a tab. Errors say what didn't run; stored data stays usable.
 */
export function useGenerate(applicationId: string) {
	const { i18n } = useLingui();
	const queryClient = useQueryClient();
	const connection = useHasAIProvider();
	const name = connection.defaultProvider?.label ?? t`Your AI connection`;
	const mutation = useMutation({
		...orpc.career.generate.mutationOptions(),
		onSuccess: (result) => {
			if (result.item) void queryClient.invalidateQueries({ queryKey: orpc.career.savedItems.key() });
		},
		onError: (error) =>
			showToast({ message: workspaceError(error, t`${name} didn't respond. Nothing was changed; try again.`) }),
	});
	return {
		...mutation,
		run: (task: GenerateTask) => {
			if (connection.isUnavailable)
				return Promise.reject(new Error(t`AI connections haven't loaded. Try again before generating.`));
			return mutation.mutateAsync({ applicationId, locale: i18n.locale, task });
		},
	};
}

/**
 * Saves text a moment after typing stops (2 s), on blur (`flush`) and when leaving. A failed write is retried after
 * 10 s rather than dropped; `onSaved` runs once the server has the value (clear the device draft there).
 */
export function useAutosave(
	value: string,
	saved: string,
	save: (value: string) => Promise<boolean>,
	onSaved?: (value: string) => void,
) {
	const latestCallbacks = useRef({ save, onSaved });
	useLayoutEffect(() => {
		latestCallbacks.current = { save, onSaved };
	});
	const [autosave] = useState(() =>
		createAutosave({
			save: (next) => latestCallbacks.current.save(next),
			onSaved: (next) => latestCallbacks.current.onSaved?.(next),
			delay: 2000,
			retryDelay: 10_000,
			timers: {
				set: (run, ms) => setTimeout(run, ms),
				clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
			},
		}),
	);
	useEffect(() => autosave.update(value, saved), [autosave, value, saved]);
	useEffect(() => () => autosave.dispose(), [autosave]);
	return autosave.flush;
}

const draftStore = createDraftStore(Storage);
/** The key prefix of every workspace draft for one account; sign-out cleanup can sweep it. */
export const draftPrefix = (scope: string) => `reactive-resume:career-draft:${scope}:`;

/** The signed-in account's draft scope (server + OAuth subject, as resume drafts and application notes use). */
function useDraftScope() {
	const session = useSession();
	const signedIn = session.status === "signed-in";
	const [scope, setScope] = useState<{ server: string; value: string | null } | null>(null);
	useEffect(() => {
		if (!signedIn) return;
		let live = true;
		void getDraftScope().then((value) => {
			if (live) setScope({ server: session.server, value });
		});
		return () => {
			live = false;
		};
	}, [signedIn, session.server]);
	// No scope (signed out, or the token can't name the account) keeps drafts on screen only.
	return signedIn && scope?.server === session.server ? scope.value : null;
}

/**
 * A draft kept on the device until the server or the coach has it: it survives leaving the screen and restarting the
 * app, scoped by server and account. `clear(sent)` removes it only while it is still that revision.
 */
export function useDraft<T>(name: string | null, initial: T) {
	const scope = useDraftScope();
	const key = name !== null && scope !== null ? `${draftPrefix(scope)}${name}` : null;
	const [state, setState] = useState(() => ({ key, value: initial, touched: false }));
	if (state.key !== key) {
		// The scope resolves after the first render: an edit made before then is kept and written below.
		const kept = key === null ? undefined : draftStore.read<T>(key);
		setState({
			key,
			value: state.touched && state.key === null ? state.value : (kept ?? initial),
			touched: state.touched && state.key === null,
		});
	}
	useEffect(() => {
		if (state.key !== null && state.touched) draftStore.write(state.key, state.value);
	}, [state]);
	const current = useRef(state);
	useLayoutEffect(() => {
		current.current = state;
	});
	const setValue = (update: SetStateAction<T>) => {
		const previous = current.current.value;
		const value = typeof update === "function" ? (update as (value: T) => T)(previous) : update;
		current.current = { key, value, touched: true };
		setState(current.current);
		if (key !== null) draftStore.write(key, value);
	};
	return {
		value: state.value,
		setValue,
		/** Drops the device copy once `sent` is safe elsewhere; a newer edit stays. */
		clear: (sent: T) => {
			if (key !== null) draftStore.clear(key, sent);
		},
	};
}
