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

	it("replaces the runtime with canonical post-restore state and keeps route cleanup authoritative", async () => {
		const storeModule = await import("./store");
		const cleanup = storeModule.initializeStylesheetStore({
			resumeId: "resume-1",
			initial: { stylesheet: stylesheet("old"), revision: 3, renderDataVersion: 7 },
			resumeData: defaultResumeData,
		});
		mocks.getState.mockResolvedValue({
			stylesheet: stylesheet("restored"),
			revision: 9,
			renderDataVersion: 12,
		});

		await (
			storeModule as typeof storeModule & {
				reinitializeStylesheetStore(resumeId: string, resumeData: typeof defaultResumeData): Promise<void>;
			}
		).reinitializeStylesheetStore("resume-1", defaultResumeData);

		expect(mocks.getState).toHaveBeenCalledWith({ id: "resume-1" });
		expect(storeModule.useStylesheetStore.getState()).toMatchObject({
			resumeId: "resume-1",
			source: { text: "restored" },
			applied: { text: "restored" },
			revision: 9,
			renderDataVersion: 12,
		});
		expect(mocks.workers).toHaveLength(2);
		expect(mocks.workers[0]?.terminated).toBe(true);

		cleanup();

		expect(mocks.workers[1]?.terminated).toBe(true);
		expect(storeModule.useStylesheetStore.getState().resumeId).toBeUndefined();
	});
});
