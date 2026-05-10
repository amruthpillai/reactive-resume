import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { WritableDraft } from "immer";
import { t } from "@lingui/core/macro";
import { consumeEventIterator } from "@orpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { debounce, isEqual } from "es-toolkit";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";
import { applyResumePatches, createResumePatches } from "@reactive-resume/utils/resume/patch";
import { orpc, streamClient } from "@/libs/orpc/client";

export type Resume = {
	id: string;
	name: string;
	slug: string;
	tags: string[];
	data: ResumeData;
	isLocked: boolean;
	updatedAt: Date;
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
	replaceResumeDraft: (resume: Resume) => void;
	replaceResumeFromServer: (resume: Resume) => void;
	updateResumeData: (fn: (draft: WritableDraft<ResumeData>) => void) => void;
	patchResume: (fn: (draft: WritableDraft<Resume>) => void) => void;
	mergeResumeMetadata: (resume: Resume) => void;
};

type ResumeStore = ResumeStoreState & ResumeStoreActions;

type Runtime = {
	abortController: AbortController;
	queryClient?: QueryClient;
	baselineData?: ResumeData;
	hasPendingLocalChanges: boolean;
	syncErrorToastId?: string | number;
	syncResume: ReturnType<typeof debounce<(resume: Resume) => Promise<void>>>;
	beforeUnloadHandler?: () => void;
};

const SAVE_DEBOUNCE_MS = 500;
const runtimes = new Map<string, Runtime>();

let lockedToastId: string | number | undefined;

function getResumeQueryKey(id: string): QueryKey {
	return orpc.resume.getById.queryOptions({ input: { id } }).queryKey as QueryKey;
}

function cloneResumeData(data: ResumeData): ResumeData {
	return structuredClone(data);
}

function setRuntimeBaseline(resume: Resume) {
	const runtime = getRuntime(resume.id);
	runtime.baselineData = cloneResumeData(resume.data);
	runtime.hasPendingLocalChanges = false;
}

function createRuntime(): Runtime {
	const abortController = new AbortController();

	const syncResume = debounce(
		async (resume: Resume) => {
			const runtime = runtimes.get(resume.id);
			if (!runtime) return;

			const baselineData = runtime.baselineData ?? cloneResumeData(resume.data);
			const operations = createResumePatches(baselineData, resume.data);

			if (operations.length === 0) {
				runtime.hasPendingLocalChanges = false;
				return;
			}

			const submittedData = cloneResumeData(resume.data);

			try {
				const updated = (await orpc.resume.patch.call(
					{ id: resume.id, operations },
					{ signal: abortController.signal },
				)) as Resume;

				runtime.queryClient?.setQueryData(getResumeQueryKey(resume.id), updated);
				runtime.baselineData = cloneResumeData(updated.data);

				const currentResume = useResumeStore.getState().resume;
				const currentDataStillMatchesSubmission =
					currentResume?.id === resume.id && isEqual(currentResume.data, submittedData);

				if (currentDataStillMatchesSubmission) {
					runtime.hasPendingLocalChanges = false;
					useResumeStore.getState().replaceResumeFromServer(updated);
				} else {
					runtime.hasPendingLocalChanges = true;
					useResumeStore.getState().mergeResumeMetadata(updated);
					syncCurrentResume(resume.id);
				}

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
		hasPendingLocalChanges: false,
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

function hasPendingLocalChanges(id: string): boolean {
	return getRuntime(id).hasPendingLocalChanges;
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
	immer((set, get) => ({
		resume: null,
		resumeId: undefined,
		isReady: false,

		initialize: (resume) => {
			if (resume) setRuntimeBaseline(resume);

			set((state) => {
				state.resume = resume;
				state.resumeId = resume?.id;
				state.isReady = resume !== null;
			});
		},

		reset: () => {
			set((state) => {
				state.resume = null;
				state.resumeId = undefined;
				state.isReady = false;
			});
		},

		replaceResumeDraft: (resume) => {
			set((state) => {
				state.resume = resume;
				state.resumeId = resume.id;
				state.isReady = true;
			});
		},

		replaceResumeFromServer: (resume) => {
			setRuntimeBaseline(resume);

			set((state) => {
				state.resume = resume;
				state.resumeId = resume.id;
				state.isReady = true;
			});
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
				state.resume.updatedAt = resume.updatedAt;
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

			getRuntime(currentResume.id).hasPendingLocalChanges = true;
			syncCurrentResume(currentResume.id);
		},
	})),
);

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

export function useReplaceResumeFromServer() {
	const queryClient = useQueryClient();
	const replaceResumeFromServer = useResumeStore((state) => state.replaceResumeFromServer);

	return useCallback(
		(resume: Resume) => {
			bindRuntimeQueryClient(resume.id, queryClient);
			queryClient.setQueryData(getResumeQueryKey(resume.id), resume);
			replaceResumeFromServer(resume);
		},
		[queryClient, replaceResumeFromServer],
	);
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

export function useResume(): Resume | undefined {
	return useBuilderResumeSelector((resume) => resume);
}

export function useCurrentResume(): Resume {
	const resume = useResume();
	if (!resume) throw new Error("Resume data is required before rendering this component.");
	return resume;
}

export function useResumeData(): ResumeData | undefined {
	return useBuilderResumeSelector((resume) => resume.data);
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

export function useResumeUpdateSubscription() {
	const queryClient = useQueryClient();
	const replaceResumeFromServer = useResumeStore((state) => state.replaceResumeFromServer);
	const params = useParams({ strict: false }) as { resumeId?: string };
	const resumeId = params.resumeId;
	const [_retryNonce, setRetryNonce] = useState(0);

	useEffect(() => {
		if (!resumeId) return;

		bindRuntimeQueryClient(resumeId, queryClient);

		let didCancel = false;
		let retryTimer: number | undefined;
		const cancel = consumeEventIterator(streamClient.resume.updates.subscribe({ id: resumeId }), {
			onEvent: async () => {
				try {
					const resume = (await orpc.resume.getById.call({ id: resumeId })) as Resume;

					if (hasPendingLocalChanges(resumeId)) {
						const runtime = getRuntime(resumeId);
						const currentResume = useResumeStore.getState().resume;
						const baselineData = runtime.baselineData ?? currentResume?.data;

						if (currentResume && baselineData) {
							const localOperations = createResumePatches(baselineData, currentResume.data);
							const mergedData = applyResumePatches(resume.data, localOperations);

							runtime.baselineData = cloneResumeData(resume.data);
							runtime.hasPendingLocalChanges = localOperations.length > 0;
							queryClient.setQueryData(getResumeQueryKey(resumeId), resume);
							useResumeStore.getState().replaceResumeDraft({ ...resume, data: mergedData });
							syncCurrentResume(resumeId);
						} else {
							runtime.baselineData = cloneResumeData(resume.data);
							useResumeStore.getState().mergeResumeMetadata(resume);
						}
						return;
					}

					queryClient.setQueryData(getResumeQueryKey(resumeId), resume);
					replaceResumeFromServer(resume);
				} catch (error) {
					if (error instanceof DOMException && error.name === "AbortError") return;
					console.warn("Failed to refresh resume after update event:", error);
				}
			},
			onError: (error) => {
				if (didCancel) return;
				console.warn("Resume update stream failed, reconnecting:", error);
				retryTimer = window.setTimeout(() => setRetryNonce((value) => value + 1), 2500);
			},
		});

		return () => {
			didCancel = true;
			if (retryTimer) window.clearTimeout(retryTimer);
			void cancel().catch(() => {});
		};
	}, [queryClient, replaceResumeFromServer, resumeId]);
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
