import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { WritableDraft } from "immer";
import { t } from "@lingui/core/macro";
import { consumeEventIterator, ORPCError } from "@orpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { debounce, isEqual } from "es-toolkit";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";
import { applyResumePatches, createResumePatches } from "@reactive-resume/resume/patch";
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
	hasPendingLocalChanges: boolean;
	isSaving: boolean;
	pendingResume?: Resume;
	serverResume?: Resume;
	syncErrorToastId?: string | number;
	syncResume: ReturnType<typeof debounce<(resume: Resume) => void>>;
	beforeUnloadHandler?: () => void;
};

type ResumeUpdateSubscriptionOptions = {
	resumeId?: string;
	onUpdate: () => Promise<void> | void;
	onError?: (error: unknown) => void;
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

function cloneResume(resume: Resume): Resume {
	return { ...resume, data: cloneResumeData(resume.data) };
}

function createResumeUpdateEventIterator(resumeId: string) {
	return streamClient.resume.updates.subscribe({ id: resumeId });
}

function setRuntimeBaseline(resume: Resume) {
	const runtime = getRuntime(resume.id);
	runtime.serverResume = cloneResume(resume);
	runtime.hasPendingLocalChanges = false;
	runtime.pendingResume = undefined;
}

function isAbortError(error: unknown): error is DOMException {
	return error instanceof DOMException && error.name === "AbortError";
}

function isResumeVersionConflict(error: unknown): boolean {
	return error instanceof ORPCError && error.code === "RESUME_VERSION_CONFLICT";
}

function rebasePendingResumeOnServer(serverResume: Resume, localResume: Resume) {
	const runtime = getRuntime(serverResume.id);
	const baseline = runtime.serverResume;
	if (!baseline || baseline.id !== serverResume.id) {
		throw new Error("Cannot rebase resume draft without a server baseline.");
	}

	const operations = createResumePatches(baseline.data, localResume.data);
	runtime.serverResume = cloneResume(serverResume);
	runtime.queryClient?.setQueryData(getResumeQueryKey(serverResume.id), serverResume);

	if (operations.length === 0) {
		runtime.hasPendingLocalChanges = false;
		runtime.pendingResume = undefined;
		useResumeStore.getState().replaceResumeFromServer(serverResume);
		return;
	}

	const rebased: Resume = {
		...serverResume,
		data: applyResumePatches(serverResume.data, operations),
	};

	runtime.syncResume.cancel();
	runtime.pendingResume = cloneResume(rebased);
	runtime.hasPendingLocalChanges = true;
	useResumeStore.getState().replaceResumeDraft(rebased);
}

function handleSuccessfulResumeSave(runtime: Runtime, submitted: Resume, saved: Resume, submittedData: ResumeData) {
	runtime.serverResume = cloneResume(saved);
	runtime.queryClient?.setQueryData(getResumeQueryKey(submitted.id), saved);

	const currentResume = useResumeStore.getState().resume;
	const currentDataStillMatchesSubmission =
		currentResume?.id === submitted.id && isEqual(currentResume.data, submittedData);

	if (currentDataStillMatchesSubmission && !runtime.pendingResume) {
		runtime.hasPendingLocalChanges = false;
		useResumeStore.getState().replaceResumeFromServer(saved);
	} else {
		runtime.hasPendingLocalChanges = true;
		useResumeStore.getState().mergeResumeMetadata(saved);

		if (!runtime.pendingResume && currentResume?.id === submitted.id && !isEqual(currentResume.data, submittedData)) {
			runtime.syncResume.cancel();
			runtime.pendingResume = cloneResume(currentResume);
		}
	}

	if (runtime.syncErrorToastId !== undefined) {
		toast.dismiss(runtime.syncErrorToastId);
		runtime.syncErrorToastId = undefined;
	}
}

async function flushResumeSave(id: string) {
	const runtime = runtimes.get(id);
	if (!runtime || runtime.isSaving || !runtime.pendingResume) return;

	const submitted = runtime.pendingResume;
	const submittedData = cloneResumeData(submitted.data);
	const baseline = runtime.serverResume;
	runtime.pendingResume = undefined;
	runtime.isSaving = true;

	try {
		if (!baseline || baseline.id !== submitted.id) {
			throw new Error("Cannot save resume draft without a server baseline.");
		}

		const operations = createResumePatches(baseline.data, submittedData);
		if (operations.length === 0) {
			handleSuccessfulResumeSave(runtime, submitted, baseline, submittedData);
			return;
		}

		const updated = (await orpc.resume.patch.call(
			{ id: submitted.id, expectedUpdatedAt: baseline.updatedAt, operations },
			{ signal: runtime.abortController.signal },
		)) as Resume;

		handleSuccessfulResumeSave(runtime, submitted, updated, submittedData);
	} catch (error: unknown) {
		if (isAbortError(error)) return;

		let syncError = error;

		if (isResumeVersionConflict(error)) {
			try {
				const latest = (await orpc.resume.getById.call(
					{ id: submitted.id },
					{ signal: runtime.abortController.signal },
				)) as Resume;
				const currentResume = useResumeStore.getState().resume;
				const localResume = currentResume?.id === submitted.id ? currentResume : submitted;

				rebasePendingResumeOnServer(latest, localResume);
				return;
			} catch (rebaseError: unknown) {
				if (isAbortError(rebaseError)) return;
				syncError = rebaseError;
			}
		}

		runtime.pendingResume ??= submitted;
		runtime.hasPendingLocalChanges = true;
		runtime.syncErrorToastId = toast.error(t`Your latest changes could not be saved.`, {
			id: runtime.syncErrorToastId,
			duration: Number.POSITIVE_INFINITY,
		});
		console.warn("Resume autosave failed:", syncError);
	} finally {
		runtime.isSaving = false;
		if (runtime.pendingResume && runtime.syncErrorToastId === undefined) void flushResumeSave(id);
	}
}

function queueResumeSave(resume: Resume) {
	const runtime = getRuntime(resume.id);
	runtime.pendingResume = cloneResume(resume);
	runtime.hasPendingLocalChanges = true;
	void flushResumeSave(resume.id);
}

function createRuntime(): Runtime {
	const abortController = new AbortController();

	const syncResume = debounce(
		(resume: Resume) => {
			queueResumeSave(resume);
		},
		SAVE_DEBOUNCE_MS,
		{ signal: abortController.signal },
	);

	const runtime: Runtime = {
		abortController,
		hasPendingLocalChanges: false,
		isSaving: false,
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

export function useResumeUpdateSubscription({ resumeId, onUpdate, onError }: ResumeUpdateSubscriptionOptions) {
	const [_retryNonce, setRetryNonce] = useState(0);

	useEffect(() => {
		if (!resumeId) return;

		let didCancel = false;
		let retryTimer: number | undefined;
		const cancel = consumeEventIterator(createResumeUpdateEventIterator(resumeId), {
			onEvent: async () => {
				try {
					await onUpdate();
				} catch (error) {
					if (error instanceof DOMException && error.name === "AbortError") return;
					onError?.(error);
				}
			},
			onError: (error) => {
				if (didCancel) return;
				onError?.(error);
				retryTimer = window.setTimeout(() => setRetryNonce((value) => value + 1), 2500);
			},
		});

		return () => {
			didCancel = true;
			if (retryTimer) window.clearTimeout(retryTimer);
			void cancel().catch(() => {});
		};
	}, [onError, onUpdate, resumeId]);
}

export function useBuilderResumeUpdateSubscription() {
	const queryClient = useQueryClient();
	const replaceResumeFromServer = useResumeStore((state) => state.replaceResumeFromServer);
	const params = useParams({ strict: false }) as { resumeId?: string };
	const resumeId = params.resumeId;

	const onUpdate = useCallback(async () => {
		if (!resumeId) return;

		bindRuntimeQueryClient(resumeId, queryClient);
		const resume = (await orpc.resume.getById.call({ id: resumeId })) as Resume;

		queryClient.setQueryData(getResumeQueryKey(resumeId), resume);

		if (hasPendingLocalChanges(resumeId)) {
			const currentResume = useResumeStore.getState().resume;
			if (!currentResume || currentResume.id !== resumeId) return;

			rebasePendingResumeOnServer(resume, currentResume);
			const runtime = getRuntime(resumeId);
			if (!runtime.isSaving && runtime.syncErrorToastId === undefined) void flushResumeSave(resumeId);
			return;
		}

		replaceResumeFromServer(resume);
	}, [queryClient, replaceResumeFromServer, resumeId]);

	const onError = useCallback((error: unknown) => {
		console.warn("Resume update stream failed, reconnecting:", error);
	}, []);

	useResumeUpdateSubscription({ resumeId, onUpdate, onError });
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
