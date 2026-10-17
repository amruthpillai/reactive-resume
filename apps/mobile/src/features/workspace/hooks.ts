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
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EMPTY_WORKSPACE } from "@reactive-resume/schema/career";
import { orpc } from "@/api/client";
import { getServer, useSession } from "@/auth/session";
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
	const save = (patch: Partial<CareerWorkspace>) => {
		if (getServer() !== server) return;
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
		void write
			.catch(() => {
				void Promise.allSettled(pending).then(() => queryClient.invalidateQueries({ queryKey }));
			})
			.finally(() => pending.delete(write));
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

/** Saves text a moment after typing stops (2 s), and when the field loses focus or unmounts. Returns `flush` for blur. */
export function useDebouncedSave(value: string, saved: string, save: (value: string) => void, delay = 2000) {
	const latestValue = useRef({ value, saved, save });
	const attempted = useRef<string | undefined>(undefined);
	useLayoutEffect(() => {
		latestValue.current = { value, saved, save };
	});
	const flush = useCallback(() => {
		const current = latestValue.current;
		if (current.value !== current.saved && current.value !== attempted.current) {
			attempted.current = current.value;
			current.save(current.value);
		}
	}, []);
	useEffect(() => {
		if (value === saved) return;
		const id = setTimeout(flush, delay);
		return () => clearTimeout(id);
	}, [value, saved, delay, flush]);
	useEffect(() => flush, [flush]);
	return flush;
}

// Web keeps these drafts in sessionStorage; here they live for the app session, keyed by server, and are dropped
// when the session ends so another account never sees them.
// ponytail: memory only, so a killed app loses an unsent practice answer or debrief; persist to kv-store if that bites.
const drafts = new Map<string, unknown>();

/** A text draft that survives switching tabs and screens, without crossing servers or sign-outs. */
export function useDraft<T>(key: string | null, initial: T) {
	const session = useSession();
	const signedIn = session.status === "signed-in";
	useEffect(() => {
		if (!signedIn) drafts.clear();
	}, [signedIn]);
	const storageKey = key === null ? null : `${session.server}:${key}`;
	const read = () => (storageKey !== null && drafts.has(storageKey) ? (drafts.get(storageKey) as T) : initial);
	const [state, setState] = useState(() => ({ key: storageKey, value: read() }));
	if (state.key !== storageKey) setState({ key: storageKey, value: read() });
	const current = useRef(state);
	useLayoutEffect(() => {
		current.current = state;
	});
	const setValue = (update: SetStateAction<T>) => {
		const previous = current.current.key === storageKey ? current.current.value : read();
		const value = typeof update === "function" ? (update as (value: T) => T)(previous) : update;
		current.current = { key: storageKey, value };
		setState(current.current);
		if (storageKey !== null && signedIn) drafts.set(storageKey, value);
	};
	const clear = () => {
		if (storageKey !== null) drafts.delete(storageKey);
	};
	return { value: state.value, setValue, clear };
}
