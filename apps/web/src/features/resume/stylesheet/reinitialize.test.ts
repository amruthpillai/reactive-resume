// @vitest-environment happy-dom

import type { SemanticStylesheet } from "@reactive-resume/schema/resume/stylesheet";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const mocks = vi.hoisted(() => ({
	getState: vi.fn(),
	workers: [] as FakeWorker[],
}));

class FakeWorker {
	terminated = false;

	constructor() {
		mocks.workers.push(this);
	}

	postMessage() {}
	addEventListener() {}
	removeEventListener() {}
	terminate() {
		this.terminated = true;
	}
}

vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		resume: {
			stylesheet: {
				getState: { call: mocks.getState },
				mutate: { call: vi.fn() },
			},
		},
	},
}));

const stylesheet = (text: string): SemanticStylesheet => {
	const source = { languageVersion: 1, text };
	return { mode: "semantic", source, applied: source };
};

describe("stylesheet store reinitialization", () => {
	beforeEach(() => {
		mocks.workers.length = 0;
		vi.stubGlobal("Worker", FakeWorker);
	});

	afterEach(() => vi.unstubAllGlobals());

	it("suspends edits while a delayed restore is pending, then atomically installs the restored state", async () => {
		const storeModule = await import("./store");
		const cleanup = storeModule.initializeStylesheetStore({
			resumeId: "resume-1",
			initial: { stylesheet: stylesheet("old"), revision: 3, renderDataVersion: 7 },
			resumeData: defaultResumeData,
		});
		let finishRestore: (() => void) | undefined;
		const delayedRestore = new Promise<void>((resolve) => {
			finishRestore = resolve;
		});
		const restore = async () => {
			const token = storeModule.lockStylesheetStoreForRestore("resume-1");
			await delayedRestore;
			return storeModule.replaceStylesheetStoreAfterRestore({
				resumeId: "resume-1",
				resumeData: defaultResumeData,
				initial: { stylesheet: stylesheet("restored"), revision: 9, renderDataVersion: 12 },
				token,
			});
		};

		const pendingRestore = restore();
		expect(storeModule.useStylesheetStore.getState().restoreLocked).toBe(true);
		const editGeneration = storeModule.useStylesheetStore.getState().editGeneration;
		storeModule.useStylesheetStore.getState().setSourceText("edit while restoring");
		storeModule.useStylesheetStore.getState().deactivate();
		storeModule.useStylesheetStore.getState().undo();
		expect(storeModule.useStylesheetStore.getState().source.text).toBe("old");
		expect(storeModule.useStylesheetStore.getState().editGeneration).toBe(editGeneration);
		finishRestore?.();
		const replaced = await pendingRestore;
		expect(replaced).toBe(true);
		expect(mocks.getState).not.toHaveBeenCalled();
		expect(storeModule.useStylesheetStore.getState()).toMatchObject({
			resumeId: "resume-1",
			source: { text: "restored" },
			applied: { text: "restored" },
			revision: 9,
			renderDataVersion: 12,
			restoreLocked: false,
		});
		storeModule.useStylesheetStore.getState().setSourceText("later edit");
		expect(storeModule.useStylesheetStore.getState().source.text).toBe("later edit");
		expect(mocks.workers).toHaveLength(2);
		expect(mocks.workers[0]?.terminated).toBe(true);

		cleanup();

		expect(mocks.workers[1]?.terminated).toBe(true);
		expect(storeModule.useStylesheetStore.getState().resumeId).toBeUndefined();
	});

	it("unlocks interaction after a restore request fails", async () => {
		const storeModule = await import("./store");
		const cleanup = storeModule.initializeStylesheetStore({
			resumeId: "resume-1",
			initial: { stylesheet: stylesheet("old"), revision: 3, renderDataVersion: 7 },
			resumeData: defaultResumeData,
		});

		const token = storeModule.lockStylesheetStoreForRestore("resume-1");
		expect(storeModule.useStylesheetStore.getState().restoreLocked).toBe(true);
		expect(storeModule.unlockStylesheetStoreAfterRestore(token)).toBe(true);
		expect(storeModule.useStylesheetStore.getState().restoreLocked).toBe(false);

		storeModule.useStylesheetStore.getState().setSourceText("edit after failure");
		expect(storeModule.useStylesheetStore.getState().source.text).toBe("edit after failure");

		cleanup();
	});

	it("ignores a stale same-resume restore completion after away-and-back runtime replacement", async () => {
		const storeModule = await import("./store");
		const cleanupFirst = storeModule.initializeStylesheetStore({
			resumeId: "resume-1",
			initial: { stylesheet: stylesheet("first"), revision: 1, renderDataVersion: 1 },
			resumeData: defaultResumeData,
		});
		const staleToken = storeModule.lockStylesheetStoreForRestore("resume-1");

		cleanupFirst();
		const cleanupSecond = storeModule.initializeStylesheetStore({
			resumeId: "resume-1",
			initial: { stylesheet: stylesheet("second"), revision: 2, renderDataVersion: 2 },
			resumeData: defaultResumeData,
		});

		const replaced = storeModule.replaceStylesheetStoreAfterRestore({
			resumeId: "resume-1",
			resumeData: defaultResumeData,
			initial: { stylesheet: stylesheet("stale restore"), revision: 3, renderDataVersion: 3 },
			token: staleToken,
		});

		expect(replaced).toBe(false);
		expect(storeModule.useStylesheetStore.getState()).toMatchObject({
			source: { text: "second" },
			revision: 2,
			renderDataVersion: 2,
		});

		cleanupSecond();
	});
});
