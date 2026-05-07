import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { WritableDraft } from "immer";
import type { TemporalState } from "zundo";
import { t } from "@lingui/core/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { debounce } from "es-toolkit";
import isDeepEqual from "fast-deep-equal";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { orpc } from "@/libs/orpc/client";

type Resume = {
	id: string;
	name: string;
	slug: string;
	tags: string[];
	data: ResumeData;
	isLocked: boolean;
	hasPassword?: boolean;
	isPublic?: boolean;
};

type ResumeStoreState = {
	resume: Resume | null;
	resumeId?: string;
	isReady: boolean;
};

type ResumeStoreActions = {
	initialize: (resume: Resume | null) => void;
	reset: () => void;
	updateResumeData: (fn: (draft: WritableDraft<ResumeData>) => void) => void;
	patchResume: (fn: (draft: WritableDraft<Resume>) => void) => void;
	mergeResumeMetadata: (resume: Resume) => void;
};

type ResumeStore = ResumeStoreState & ResumeStoreActions;

type PartializedState = { data: ResumeData | null };

type Runtime = {
	abortController: AbortController;
	queryClient?: QueryClient;
	syncErrorToastId?: string | number;
	syncResume: ReturnType<typeof debounce<(resume: Resume) => Promise<void>>>;
	beforeUnloadHandler?: () => void;
};

const HISTORY_LIMIT = 100;
const GROUPED_HISTORY_MS = 250;
const SAVE_DEBOUNCE_MS = 500;
const runtimes = new Map<string, Runtime>();

let lockedToastId: string | number | undefined;

function getResumeQueryKey(id: string): QueryKey {
	return orpc.resume.getById.queryOptions({ input: { id } }).queryKey as QueryKey;
}

function createRuntime(): Runtime {
	const abortController = new AbortController();

	const syncResume = debounce(
		async (resume: Resume) => {
			const runtime = runtimes.get(resume.id);
			if (!runtime) return;

			try {
				const updated = (await orpc.resume.update.call(
					{ id: resume.id, data: resume.data },
					{ signal: abortController.signal },
				)) as Resume;

				runtime.queryClient?.setQueryData(getResumeQueryKey(resume.id), updated);
				useResumeStore.getState().mergeResumeMetadata(updated);

				if (runtime.syncErrorToastId === undefined) return;
				toast.dismiss(runtime.syncErrorToastId);
				runtime.syncErrorToastId = undefined;
			} catch (error: unknown) {
				if (error instanceof DOMException && error.name === "AbortError") return;
				runtime.syncErrorToastId = toast.error(t`Your latest changes could not be saved.`, {
					id: runtime.syncErrorToastId,
					duration: Number.POSITIVE_INFINITY,
				});
			}
		},
		SAVE_DEBOUNCE_MS,
		{ signal: abortController.signal },
	);

	const runtime: Runtime = {
		abortController,
		syncResume,
	};

	if (typeof window !== "undefined") {
		runtime.beforeUnloadHandler = () => runtime.syncResume.flush();
		window.addEventListener("beforeunload", runtime.beforeUnloadHandler);
	}

	return runtime;
}

function getRuntime(id: string): Runtime {
	const existing = runtimes.get(id);
	if (existing) return existing;

	const runtime = createRuntime();
	runtimes.set(id, runtime);
	return runtime;
}

function bindRuntimeQueryClient(id: string, queryClient: QueryClient) {
	getRuntime(id).queryClient = queryClient;
}

function cleanupRuntime(id: string) {
	const runtime = runtimes.get(id);
	if (!runtime) return;

	runtime.syncResume.flush();
	runtime.abortController.abort();

	if (runtime.beforeUnloadHandler && typeof window !== "undefined") {
		window.removeEventListener("beforeunload", runtime.beforeUnloadHandler);
	}

	runtimes.delete(id);
}

function syncCurrentResume(id: string) {
	const resume = useResumeStore.getState().resume;
	if (!resume || resume.id !== id) return;

	getRuntime(id).syncResume(resume);
}

export const useResumeStore = create<ResumeStore>()(
	temporal(
		immer((set, get) => ({
			resume: null,
			resumeId: undefined,
			isReady: false,

			initialize: (resume) => {
				set((state) => {
					state.resume = resume;
					state.resumeId = resume?.id;
					state.isReady = resume !== null;
				});

				useResumeStore.temporal.getState().clear();
			},

			reset: () => {
				set((state) => {
					state.resume = null;
					state.resumeId = undefined;
					state.isReady = false;
				});

				useResumeStore.temporal.getState().clear();
			},

			patchResume: (fn) => {
				set((state) => {
					if (!state.resume) return;
					fn(state.resume as WritableDraft<Resume>);
				});
			},

			mergeResumeMetadata: (resume) => {
				set((state) => {
					if (!state.resume || state.resume.id !== resume.id) return;

					state.resume.name = resume.name;
					state.resume.slug = resume.slug;
					state.resume.tags = resume.tags;
					state.resume.isLocked = resume.isLocked;
					state.resume.hasPassword = resume.hasPassword;
					state.resume.isPublic = resume.isPublic;
				});
			},

			updateResumeData: (fn) => {
				const currentResume = get().resume;
				if (!currentResume) return;

				if (currentResume.isLocked) {
					lockedToastId = toast.error(t`This resume is locked and cannot be updated.`, {
						id: lockedToastId,
					});
					return;
				}

				set((state) => {
					if (!state.resume) return;
					fn(state.resume.data as WritableDraft<ResumeData>);
				});

				syncCurrentResume(currentResume.id);
			},
		})),
		{
			partialize: (state): PartializedState => ({ data: state.resume?.data ?? null }),
			equality: (pastState, currentState) => isDeepEqual(pastState, currentState),
			limit: HISTORY_LIMIT,
			handleSet: (handleSet) =>
				debounce((state: Parameters<typeof handleSet>[0], replace?: Parameters<typeof handleSet>[1]) => {
					handleSet(state as never, replace as never);
				}, GROUPED_HISTORY_MS) as typeof handleSet,
		},
	),
);

function useTemporalStore<T>(selector: (state: TemporalState<PartializedState>) => T): T {
	return useStoreWithEqualityFn(useResumeStore.temporal, selector);
}

export function useInitializeResumeStore() {
	return useResumeStore((state) => state.initialize);
}

function useResetResumeStore() {
	return useResumeStore((state) => state.reset);
}

export function useMergeResumeMetadata() {
	return useResumeStore((state) => state.mergeResumeMetadata);
}

export function usePatchResume() {
	return useResumeStore((state) => state.patchResume);
}

function useBuilderResumeSelector<T>(selector: (resume: Resume) => T): T | undefined {
	const params = useParams({ strict: false }) as { resumeId?: string };
	const resumeId = params.resumeId;

	return useResumeStore((state) => {
		if (!resumeId || !state.resume || state.resume.id !== resumeId) return undefined;
		return selector(state.resume);
	});
}

export function useCurrentBuilderResumeSelector<T>(selector: (resume: Resume) => T): T {
	const selected = useBuilderResumeSelector(selector);
	if (selected === undefined) throw new Error("Resume data is required before rendering this component.");
	return selected;
}

/**
 * Reads the resume from the builder store when editing, and from query cache
 * for non-builder/public routes.
 */
export function useResume(): Resume | undefined {
	const params = useParams({ strict: false }) as {
		resumeId?: string;
		username?: string;
		slug?: string;
	};

	const builderResume = useResumeStore((state) => {
		if (!params.resumeId || !state.resume || state.resume.id !== params.resumeId) return undefined;
		return state.resume;
	});

	const byIdQuery = useQuery({
		...orpc.resume.getById.queryOptions({ input: { id: params.resumeId ?? "" } }),
		enabled: !!params.resumeId,
	});

	const bySlugQuery = useQuery({
		...orpc.resume.getBySlug.queryOptions({
			input: { username: params.username ?? "", slug: params.slug ?? "" },
		}),
		enabled: !!(!params.resumeId && params.username && params.slug),
	});

	if (params.resumeId) return builderResume ?? (byIdQuery.data as Resume | undefined);
	return bySlugQuery.data as Resume | undefined;
}

export function useCurrentResume(): Resume {
	const resume = useResume();
	if (!resume) throw new Error("Resume data is required before rendering this component.");
	return resume;
}

export function useResumeData(): ResumeData | undefined {
	const params = useParams({ strict: false }) as { resumeId?: string; username?: string; slug?: string };
	const builderData = useBuilderResumeSelector((resume) => resume.data);

	const byIdQuery = useQuery({
		...orpc.resume.getById.queryOptions({ input: { id: params.resumeId ?? "" } }),
		enabled: !!params.resumeId,
	});

	const bySlugQuery = useQuery({
		...orpc.resume.getBySlug.queryOptions({
			input: { username: params.username ?? "", slug: params.slug ?? "" },
		}),
		enabled: !!(!params.resumeId && params.username && params.slug),
	});

	if (params.resumeId) return builderData ?? (byIdQuery.data as Resume | undefined)?.data;
	return (bySlugQuery.data as Resume | undefined)?.data;
}

export function useUpdateResumeData() {
	const queryClient = useQueryClient();
	const params = useParams({ strict: false }) as { resumeId?: string };
	const resumeId = params.resumeId;
	const updateResumeData = useResumeStore((state) => state.updateResumeData);

	return useCallback(
		(fn: (draft: WritableDraft<ResumeData>) => void) => {
			if (!resumeId) return;
			bindRuntimeQueryClient(resumeId, queryClient);
			updateResumeData(fn);
		},
		[queryClient, resumeId, updateResumeData],
	);
}

export function useResumeHistory() {
	const canUndo = useTemporalStore((state) => state.pastStates.length > 0);
	const canRedo = useTemporalStore((state) => state.futureStates.length > 0);

	const undo = useCallback(() => {
		const before = useResumeStore.getState().resume;
		if (!before) return;

		useResumeStore.temporal.getState().undo();
		syncCurrentResume(before.id);
	}, []);

	const redo = useCallback(() => {
		const before = useResumeStore.getState().resume;
		if (!before) return;

		useResumeStore.temporal.getState().redo();
		syncCurrentResume(before.id);
	}, []);

	return { undo, redo, canUndo, canRedo };
}

export function useResumeCleanup() {
	const params = useParams({ strict: false }) as { resumeId?: string };
	const resumeId = params.resumeId;
	const reset = useResetResumeStore();

	useEffect(() => {
		if (!resumeId) return;

		return () => {
			cleanupRuntime(resumeId);
			reset();
		};
	}, [resumeId, reset]);
}
