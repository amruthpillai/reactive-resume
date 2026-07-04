// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Resume } from "./draft";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { useBuilderResumeUpdateSubscription, useResumeStore, useResumeUpdateSubscription } from "./draft";

const orpcMocks = vi.hoisted(() => ({
	getResumeById: vi.fn(),
	patchResume: vi.fn(),
	streamSubscribe: vi.fn(),
	updateResume: vi.fn(),
}));

const consumeEventIteratorMock = vi.hoisted(() => vi.fn());

const queryClientMock = vi.hoisted(() => ({
	setQueryData: vi.fn(),
}));

const routerParamsMock = vi.hoisted(() => ({
	value: {} as { resumeId?: string },
}));

const toastMocks = vi.hoisted(() => ({
	dismiss: vi.fn(),
	error: vi.fn(() => "sync-error-toast"),
}));

vi.mock("@orpc/client", () => ({
	consumeEventIterator: consumeEventIteratorMock,
}));

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => queryClientMock,
}));

vi.mock("@tanstack/react-router", () => ({
	useParams: () => routerParamsMock.value,
}));

vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		resume: {
			getById: {
				call: orpcMocks.getResumeById,
				queryOptions: ({ input }: { input: { id: string } }) => ({
					queryKey: ["resume", "getById", input.id],
				}),
			},
			patch: {
				call: orpcMocks.patchResume,
			},
			update: {
				call: orpcMocks.updateResume,
			},
		},
	},
	streamClient: {
		resume: {
			updates: {
				subscribe: orpcMocks.streamSubscribe,
			},
		},
	},
}));

vi.mock("sonner", () => ({
	toast: toastMocks,
}));

function cloneResumeData(data: ResumeData): ResumeData {
	return structuredClone(data);
}

function makeResume(id: string): Resume {
	return {
		id,
		name: "Resume",
		slug: id,
		tags: [],
		data: cloneResumeData(defaultResumeData),
		isLocked: false,
		isPublic: false,
		hasPassword: false,
		updatedAt: new Date("2026-05-26T12:00:00.000Z"),
	};
}

function withBasicsName(resume: Resume, name: string): Resume {
	return {
		...resume,
		data: {
			...resume.data,
			basics: {
				...resume.data.basics,
				name,
			},
		},
	};
}

async function flushMicrotasks() {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}

describe("builder resume autosave", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		orpcMocks.getResumeById.mockReset();
		orpcMocks.patchResume.mockReset();
		orpcMocks.streamSubscribe.mockReset();
		orpcMocks.updateResume.mockReset();
		consumeEventIteratorMock.mockReset();
		queryClientMock.setQueryData.mockClear();
		routerParamsMock.value = {};
		i18n.loadAndActivate({ locale: "en-US", messages: {} });
		toastMocks.dismiss.mockClear();
		toastMocks.error.mockClear();
		useResumeStore.getState().reset();
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
		useResumeStore.getState().reset();
	});

	it("coalesces rapid local edits into one full-data update", async () => {
		const initial = makeResume("resume-rapid");
		const updated = withBasicsName(initial, "Latest Name");
		orpcMocks.updateResume.mockResolvedValue(updated);
		useResumeStore.getState().initialize(initial);

		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "First Name";
		});
		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "Latest Name";
		});

		vi.advanceTimersByTime(500);
		await flushMicrotasks();

		expect(orpcMocks.updateResume).toHaveBeenCalledTimes(1);
		expect(orpcMocks.updateResume).toHaveBeenCalledWith(
			{ id: initial.id, data: updated.data },
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
		expect(orpcMocks.patchResume).not.toHaveBeenCalled();
	});

	it("saves the latest pending snapshot after an in-flight save resolves", async () => {
		const initial = makeResume("resume-in-flight");
		const first = withBasicsName(initial, "First Name");
		const latest = withBasicsName(initial, "Latest Name");
		let resolveFirst!: (resume: Resume) => void;

		orpcMocks.updateResume
			.mockReturnValueOnce(
				new Promise<Resume>((resolve) => {
					resolveFirst = resolve;
				}),
			)
			.mockResolvedValueOnce(latest);

		useResumeStore.getState().initialize(initial);
		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "First Name";
		});

		vi.advanceTimersByTime(500);
		await flushMicrotasks();

		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "Latest Name";
		});
		vi.advanceTimersByTime(500);
		await flushMicrotasks();

		expect(orpcMocks.updateResume).toHaveBeenCalledTimes(1);

		resolveFirst(first);
		await flushMicrotasks();

		expect(orpcMocks.updateResume).toHaveBeenCalledTimes(2);
		expect(orpcMocks.updateResume.mock.calls[0]?.[0]).toEqual({ id: initial.id, data: first.data });
		expect(orpcMocks.updateResume.mock.calls[1]?.[0]).toEqual({ id: initial.id, data: latest.data });
		expect(orpcMocks.patchResume).not.toHaveBeenCalled();
	});

	it("does not run a stale debounced save after immediately saving an edit made during an in-flight save", async () => {
		const initial = makeResume("resume-stale-timer");
		const first = withBasicsName(initial, "First Name");
		const latest = withBasicsName(initial, "Latest Name");
		let resolveFirst!: (resume: Resume) => void;

		orpcMocks.updateResume
			.mockReturnValueOnce(
				new Promise<Resume>((resolve) => {
					resolveFirst = resolve;
				}),
			)
			.mockResolvedValue(latest);

		useResumeStore.getState().initialize(initial);
		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "First Name";
		});
		vi.advanceTimersByTime(500);
		await flushMicrotasks();

		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "Latest Name";
		});

		resolveFirst(first);
		await flushMicrotasks();
		expect(orpcMocks.updateResume).toHaveBeenCalledTimes(2);

		vi.advanceTimersByTime(500);
		await flushMicrotasks();

		expect(orpcMocks.updateResume).toHaveBeenCalledTimes(2);
		expect(orpcMocks.updateResume.mock.calls[1]?.[0]).toEqual({ id: initial.id, data: latest.data });
	});

	it("keeps the latest draft data and shows a persistent toast when saving fails", async () => {
		const initial = makeResume("resume-failure");
		orpcMocks.updateResume.mockRejectedValue(new Error("network down"));
		useResumeStore.getState().initialize(initial);

		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "Unsaved Name";
		});

		vi.advanceTimersByTime(500);
		await flushMicrotasks();

		expect(useResumeStore.getState().resume?.data.basics.name).toBe("Unsaved Name");
		expect(toastMocks.error).toHaveBeenCalledWith(
			"Your latest changes could not be saved.",
			expect.objectContaining({ duration: Number.POSITIVE_INFINITY }),
		);
		expect(orpcMocks.patchResume).not.toHaveBeenCalled();
	});
});

describe("builder resume undo/redo", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		orpcMocks.updateResume.mockReset();
		// Echo the submitted data back so the autosave completion doesn't count as an external rebase.
		orpcMocks.updateResume.mockImplementation((input: { id: string; data: ResumeData }) =>
			Promise.resolve({ ...makeResume(input.id), data: input.data }),
		);
		routerParamsMock.value = {};
		i18n.loadAndActivate({ locale: "en-US", messages: {} });
		useResumeStore.getState().reset();
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
		useResumeStore.getState().reset();
	});

	it("coalesces rapid edits into a single undo step and restores the pre-burst state", () => {
		const store = useResumeStore.getState;
		store().initialize(makeResume("undo-coalesce"));

		store().updateResumeData((draft) => {
			draft.basics.name = "First";
		});
		store().updateResumeData((draft) => {
			draft.basics.name = "Second";
		});

		expect(store().undoStack.length).toBe(1);
		expect(store().canUndo).toBe(true);
		expect(store().canRedo).toBe(false);
		expect(store().resume?.data.basics.name).toBe("Second");

		store().undo();
		expect(store().resume?.data.basics.name).toBe(defaultResumeData.basics.name);
		expect(store().canUndo).toBe(false);
		expect(store().canRedo).toBe(true);

		store().redo();
		expect(store().resume?.data.basics.name).toBe("Second");
		expect(store().canRedo).toBe(false);
	});

	it("separates edits outside the coalesce window into distinct undo steps", async () => {
		const store = useResumeStore.getState;
		store().initialize(makeResume("undo-boundary"));

		store().updateResumeData((draft) => {
			draft.basics.name = "A";
		});

		// Let the autosave flush (echoes the data back) and advance past the coalesce window.
		vi.advanceTimersByTime(600);
		await flushMicrotasks();

		store().updateResumeData((draft) => {
			draft.basics.name = "B";
		});

		expect(store().undoStack.length).toBe(2);

		store().undo();
		expect(store().resume?.data.basics.name).toBe("A");

		store().undo();
		expect(store().resume?.data.basics.name).toBe(defaultResumeData.basics.name);
	});

	it("clears the redo branch when a new edit follows an undo", () => {
		const store = useResumeStore.getState;
		store().initialize(makeResume("undo-redo-clear"));

		store().updateResumeData((draft) => {
			draft.basics.name = "One";
		});
		store().undo();
		expect(store().canRedo).toBe(true);

		store().updateResumeData((draft) => {
			draft.basics.name = "Two";
		});

		expect(store().canRedo).toBe(false);
		expect(store().redoStack.length).toBe(0);
	});

	it("does not undo when the resume is locked", () => {
		const store = useResumeStore.getState;
		store().initialize(makeResume("undo-locked"));

		store().updateResumeData((draft) => {
			draft.basics.name = "Editable";
		});
		store().patchResume((resume) => {
			resume.isLocked = true;
		});

		store().undo();
		expect(store().resume?.data.basics.name).toBe("Editable");
	});

	it("preserves the undo stack when the server echoes the current data (autosave)", () => {
		const store = useResumeStore.getState;
		store().initialize(makeResume("rebase-echo"));

		store().updateResumeData((draft) => {
			draft.basics.name = "Edited";
		});
		expect(store().undoStack.length).toBe(1);

		const current = store().resume;
		if (!current) throw new Error("expected a current resume");
		// Autosave echo: the server returns data identical to what's already in the store.
		store().replaceResumeFromServer({ ...current, data: cloneResumeData(current.data) });

		expect(store().undoStack.length).toBe(1);
		expect(store().canUndo).toBe(true);
	});

	it("clears the undo stack when the server sends different data (external rebase)", () => {
		const store = useResumeStore.getState;
		store().initialize(makeResume("rebase-external"));

		store().updateResumeData((draft) => {
			draft.basics.name = "Edited";
		});
		expect(store().undoStack.length).toBe(1);

		const current = store().resume;
		if (!current) throw new Error("expected a current resume");
		// External / AI rebase: incoming data differs, so the local undo history no longer applies.
		store().replaceResumeFromServer(withBasicsName(current, "External Name"));

		expect(store().undoStack.length).toBe(0);
		expect(store().canUndo).toBe(false);
	});
});

describe("resume update stream subscription", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		orpcMocks.streamSubscribe.mockReset();
		consumeEventIteratorMock.mockReset();
		orpcMocks.getResumeById.mockReset();
		queryClientMock.setQueryData.mockClear();
		routerParamsMock.value = {};
		i18n.loadAndActivate({ locale: "en-US", messages: {} });
		useResumeStore.getState().reset();
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
		useResumeStore.getState().reset();
	});

	it("subscribes by explicit resume id and calls the provided update handler", async () => {
		const cancel = vi.fn().mockResolvedValue(undefined);
		const onUpdate = vi.fn().mockResolvedValue(undefined);
		consumeEventIteratorMock.mockReturnValue(cancel);

		const { unmount } = renderHook(() =>
			useResumeUpdateSubscription({
				resumeId: "resume-stream",
				onUpdate,
			}),
		);

		expect(orpcMocks.streamSubscribe).toHaveBeenCalledWith({ id: "resume-stream" });
		const handlers = consumeEventIteratorMock.mock.calls[0]?.[1] as { onEvent: () => Promise<void> } | undefined;
		expect(handlers).toBeDefined();

		await act(async () => {
			await handlers?.onEvent();
		});

		expect(onUpdate).toHaveBeenCalledTimes(1);

		unmount();
		expect(cancel).toHaveBeenCalledTimes(1);
	});

	it("replaces the builder draft from the server when there are no pending local edits", async () => {
		const initial = makeResume("resume-clean");
		const remote = withBasicsName(initial, "Remote Name");
		const cancel = vi.fn().mockResolvedValue(undefined);
		consumeEventIteratorMock.mockReturnValue(cancel);
		orpcMocks.getResumeById.mockResolvedValue(remote);
		routerParamsMock.value = { resumeId: initial.id };
		useResumeStore.getState().initialize(initial);

		renderHook(() => useBuilderResumeUpdateSubscription());
		const handlers = consumeEventIteratorMock.mock.calls[0]?.[1] as { onEvent: () => Promise<void> } | undefined;

		await act(async () => {
			await handlers?.onEvent();
		});

		expect(queryClientMock.setQueryData).toHaveBeenCalledWith(["resume", "getById", initial.id], remote);
		expect(useResumeStore.getState().resume?.data.basics.name).toBe("Remote Name");
	});

	it("does not overwrite pending local builder edits when a remote update arrives", async () => {
		const initial = makeResume("resume-pending");
		const remote = withBasicsName(initial, "Remote Name");
		const cancel = vi.fn().mockResolvedValue(undefined);
		consumeEventIteratorMock.mockReturnValue(cancel);
		orpcMocks.getResumeById.mockResolvedValue(remote);
		routerParamsMock.value = { resumeId: initial.id };
		useResumeStore.getState().initialize(initial);
		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "Local Name";
		});

		renderHook(() => useBuilderResumeUpdateSubscription());
		const handlers = consumeEventIteratorMock.mock.calls[0]?.[1] as { onEvent: () => Promise<void> } | undefined;

		await act(async () => {
			await handlers?.onEvent();
		});

		expect(queryClientMock.setQueryData).toHaveBeenCalledWith(["resume", "getById", initial.id], remote);
		expect(useResumeStore.getState().resume?.data.basics.name).toBe("Local Name");
	});
});
