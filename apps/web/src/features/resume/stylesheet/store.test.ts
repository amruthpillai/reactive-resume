import type { SemanticStylesheet, StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createStylesheetStoreRuntime } from "./store";

const source = (text: string): StylesheetSource => ({ languageVersion: 1, text });
const stylesheet = (text: string): SemanticStylesheet => ({
	mode: "semantic",
	source: source(text),
	applied: source(text),
});

const initial = {
	stylesheet: stylesheet("generation zero"),
	revision: 3,
	renderDataVersion: 7,
};

type MutationResult = {
	stylesheet: SemanticStylesheet;
	revision: number;
	renderDataVersion: number;
	editGeneration: number;
	diagnostics: [];
};

describe("stylesheet store runtime", () => {
	beforeEach(() => vi.useFakeTimers());

	it("clears compiler-confirmed color tokens synchronously when same-length source text changes", () => {
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial: { ...initial, stylesheet: stylesheet("section { color: red; }") },
			resumeData: defaultResumeData,
			debounceMs: 1_000_000,
			compile: vi.fn(),
			preflight: vi.fn(),
			mutate: vi.fn(),
		});
		runtime.store.setState({ colorTokens: [{ from: 17, to: 20, value: "red" }] });

		runtime.store.getState().setSourceText("section { color: var; }");

		expect(runtime.store.getState().source.text).toBe("section { color: var; }");
		expect(runtime.store.getState().colorTokens).toEqual([]);
	});

	it("rejects delayed editor intelligence for a canonically replaced source", async () => {
		let resolveCompile!: (value: {
			type: "compile_result";
			requestId: number;
			editGeneration: number;
			program: { languageVersion: number; rules: [] };
			diagnostics: [
				{
					code: string;
					severity: "error";
					message: string;
					range: {
						start: { line: number; column: number; offset: number };
						end: { line: number; column: number; offset: number };
					};
				},
			];
			colorTokens: [{ from: number; to: number; value: string }];
		}) => void;
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial: { ...initial, stylesheet: stylesheet("section { color: red; }") },
			resumeData: defaultResumeData,
			compile: () => new Promise((resolve) => (resolveCompile = resolve)),
			preflight: vi.fn(),
			mutate: vi.fn(),
		});

		runtime.store.getState().refreshIntelligence();
		runtime.rebaseCanonical({
			stylesheet: stylesheet("section { color: blue; }"),
			revision: 4,
			renderDataVersion: 7,
		});
		resolveCompile({
			type: "compile_result",
			requestId: 1,
			editGeneration: 0,
			program: { languageVersion: 1, rules: [] },
			diagnostics: [
				{
					code: "OLD_SOURCE",
					severity: "error",
					message: "Old source diagnostic",
					range: {
						start: { line: 1, column: 1, offset: 0 },
						end: { line: 1, column: 2, offset: 1 },
					},
				},
			],
			colorTokens: [{ from: 17, to: 20, value: "red" }],
		});
		await Promise.resolve();
		await Promise.resolve();

		expect(runtime.store.getState()).toMatchObject({
			source: source("section { color: blue; }"),
			diagnostics: [],
			colorTokens: [],
		});
	});

	it("consumes stale acknowledgements before saving the replaceable pending edit", async () => {
		const resolvers: Array<(value: MutationResult) => void> = [];
		const mutate = vi.fn(
			(_input: unknown) =>
				new Promise<MutationResult>((resolve) => {
					resolvers.push((value) => resolve(value));
				}),
		);
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: async ({ editGeneration }) => ({
				type: "compile_result",
				requestId: editGeneration,
				editGeneration,
				program: { languageVersion: 1, rules: [] },
				diagnostics: [],
			}),
			preflight: async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 4, diagnostics: [], pdf: new ArrayBuffer(4) },
			}),
			mutate,
		});

		runtime.store.getState().setSourceText("generation one");
		await vi.runAllTimersAsync();
		runtime.store.getState().setSourceText("generation two");
		await vi.runAllTimersAsync();

		resolvers[0]?.({
			stylesheet: stylesheet("generation one"),
			revision: 4,
			renderDataVersion: 8,
			editGeneration: 1,
			diagnostics: [],
		});
		await vi.runAllTimersAsync();

		expect(runtime.store.getState()).toMatchObject({
			revision: 4,
			renderDataVersion: 8,
			source: source("generation two"),
			applied: source("generation zero"),
		});
		expect(mutate).toHaveBeenCalledTimes(2);
		expect(mutate.mock.calls[1]?.[0]).toMatchObject({
			expectedRevision: 4,
			expectedRenderDataVersion: 8,
			editGeneration: 2,
		});
	});

	it("rebases conflicts without dropping the focused local draft", async () => {
		const mutate = vi
			.fn()
			.mockRejectedValueOnce({
				code: "STYLESHEET_REVISION_CONFLICT",
				data: {
					state: { stylesheet: stylesheet("remote"), revision: 8, renderDataVersion: 11 },
				},
			})
			.mockResolvedValueOnce({
				stylesheet: stylesheet("local unsaved source"),
				revision: 9,
				renderDataVersion: 11,
				editGeneration: 1,
				diagnostics: [],
			});
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: async ({ editGeneration }) => ({
				type: "compile_result",
				requestId: editGeneration,
				editGeneration,
				program: { languageVersion: 1, rules: [] },
				diagnostics: [],
			}),
			preflight: async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}),
			mutate,
		});

		runtime.store.getState().setFocused(true);
		runtime.store.getState().setSourceText("local unsaved source");
		await vi.runAllTimersAsync();

		expect(runtime.store.getState()).toMatchObject({
			revision: 9,
			renderDataVersion: 11,
			source: source("local unsaved source"),
		});
		expect(mutate.mock.calls[1]?.[0]).toMatchObject({ expectedRevision: 8, expectedRenderDataVersion: 11 });
	});

	it("keeps the newer pending edit when an older request conflicts", async () => {
		let rejectFirst!: (error: unknown) => void;
		const mutate = vi
			.fn()
			.mockReturnValueOnce(
				new Promise((_resolve, reject) => {
					rejectFirst = reject;
				}),
			)
			.mockResolvedValueOnce({
				stylesheet: stylesheet("newer"),
				revision: 9,
				renderDataVersion: 11,
				editGeneration: 2,
				diagnostics: [],
			});
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: async ({ editGeneration }) => ({
				type: "compile_result",
				requestId: editGeneration,
				editGeneration,
				program: { languageVersion: 1, rules: [] },
				diagnostics: [],
			}),
			preflight: async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}),
			mutate,
		});

		runtime.store.getState().setSourceText("older");
		await vi.runAllTimersAsync();
		runtime.store.getState().setSourceText("newer");
		await vi.runAllTimersAsync();
		rejectFirst({
			code: "STYLESHEET_REVISION_CONFLICT",
			data: { state: { stylesheet: stylesheet("remote"), revision: 8, renderDataVersion: 11 } },
		});
		await vi.runAllTimersAsync();

		expect(mutate.mock.calls[1]?.[0]).toMatchObject({
			transition: "edit_source",
			editGeneration: 2,
			source: source("newer"),
		});
	});

	it("invalidates pending preflight eligibility on content changes and keeps versions monotonic", async () => {
		let resolveMutation!: (result: MutationResult) => void;
		let resolveRepreflight!: (result: {
			type: "preflight_result";
			requestId: number;
			editGeneration: number;
			result: {
				ok: true;
				pageCount: number;
				byteCount: number;
				diagnostics: [];
				pdf: ArrayBuffer;
			};
		}) => void;
		const mutate = vi
			.fn()
			.mockReturnValueOnce(new Promise<MutationResult>((resolve) => (resolveMutation = resolve)))
			.mockResolvedValueOnce({
				stylesheet: stylesheet("newer"),
				revision: 11,
				renderDataVersion: 20,
				editGeneration: 2,
				diagnostics: [],
			});
		const preflight = vi
			.fn()
			.mockImplementationOnce(async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}))
			.mockImplementationOnce(async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}))
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveRepreflight = resolve;
					}),
			);
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: async ({ editGeneration }) => ({
				type: "compile_result",
				requestId: editGeneration,
				editGeneration,
				program: { languageVersion: 1, rules: [] },
				diagnostics: [],
			}),
			preflight,
			mutate,
		});

		runtime.store.getState().setSourceText("older");
		await vi.runAllTimersAsync();
		runtime.store.getState().setSourceText("newer");
		await vi.runAllTimersAsync();
		expect(mutate).toHaveBeenCalledTimes(1);

		runtime.replaceResumeSnapshot(defaultResumeData, {
			stylesheet: stylesheet("remote"),
			revision: 10,
			renderDataVersion: 20,
		});
		await vi.runAllTimersAsync();
		expect(preflight).toHaveBeenCalledTimes(3);

		resolveMutation({
			stylesheet: stylesheet("older"),
			revision: 4,
			renderDataVersion: 7,
			editGeneration: 1,
			diagnostics: [],
		});
		await Promise.resolve();
		await Promise.resolve();
		expect(runtime.store.getState()).toMatchObject({ revision: 10, renderDataVersion: 20 });
		expect(mutate).toHaveBeenCalledTimes(1);

		resolveRepreflight({
			type: "preflight_result",
			requestId: 3,
			editGeneration: 2,
			result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
		});
		await vi.runAllTimersAsync();
		expect(mutate.mock.calls[1]?.[0]).toMatchObject({
			source: source("newer"),
			expectedRevision: 10,
			expectedRenderDataVersion: 20,
		});
	});

	it("does not requeue an invalidated in-flight candidate after conflict", async () => {
		let rejectMutation!: (error: unknown) => void;
		let resolveRepreflight!: (result: {
			type: "preflight_result";
			requestId: number;
			editGeneration: number;
			result: {
				ok: true;
				pageCount: number;
				byteCount: number;
				diagnostics: [];
				pdf: ArrayBuffer;
			};
		}) => void;
		const mutate = vi
			.fn()
			.mockReturnValueOnce(new Promise<MutationResult>((_resolve, reject) => (rejectMutation = reject)))
			.mockResolvedValueOnce({
				stylesheet: stylesheet("newer"),
				revision: 11,
				renderDataVersion: 20,
				editGeneration: 2,
				diagnostics: [],
			});
		const preflight = vi
			.fn()
			.mockImplementationOnce(async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}))
			.mockImplementationOnce(async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}))
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveRepreflight = resolve;
					}),
			);
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: async ({ editGeneration }) => ({
				type: "compile_result",
				requestId: editGeneration,
				editGeneration,
				program: { languageVersion: 1, rules: [] },
				diagnostics: [],
			}),
			preflight,
			mutate,
		});

		runtime.store.getState().setSourceText("older");
		await vi.runAllTimersAsync();
		runtime.store.getState().setSourceText("newer");
		await vi.runAllTimersAsync();
		runtime.replaceResumeSnapshot(defaultResumeData, {
			stylesheet: stylesheet("remote"),
			revision: 10,
			renderDataVersion: 20,
		});
		await vi.runAllTimersAsync();

		rejectMutation({
			code: "STYLESHEET_REVISION_CONFLICT",
			data: { state: { stylesheet: stylesheet("remote"), revision: 10, renderDataVersion: 20 } },
		});
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect(mutate).toHaveBeenCalledTimes(1);

		resolveRepreflight({
			type: "preflight_result",
			requestId: 3,
			editGeneration: 2,
			result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
		});
		await vi.runAllTimersAsync();
		expect(mutate.mock.calls[1]?.[0]).toMatchObject({
			source: source("newer"),
			expectedRevision: 10,
			expectedRenderDataVersion: 20,
		});
	});

	it("reconciles a deferred focused canonical source on blur", () => {
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			compile: vi.fn(),
			preflight: vi.fn(),
			mutate: vi.fn(),
		});

		runtime.store.getState().setFocused(true);
		runtime.rebaseCanonical({
			stylesheet: stylesheet("remote"),
			revision: 8,
			renderDataVersion: 11,
		});

		expect(runtime.store.getState()).toMatchObject({
			source: source("generation zero"),
			applied: source("remote"),
			revision: 8,
			renderDataVersion: 11,
		});

		runtime.store.getState().setFocused(false);
		expect(runtime.store.getState()).toMatchObject({
			source: source("remote"),
			applied: source("remote"),
		});
	});

	it("persists invalid source while preserving applied and restores stylesheet history separately", async () => {
		const mutate = vi
			.fn()
			.mockResolvedValueOnce({
				stylesheet: {
					mode: "semantic",
					source: source("invalid {"),
					applied: source("generation zero"),
				},
				revision: 4,
				renderDataVersion: 7,
				editGeneration: 1,
				diagnostics: [
					{
						code: "PARSE_ERROR",
						severity: "error",
						message: "Invalid",
						range: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
					},
				],
			})
			.mockResolvedValueOnce({
				stylesheet: stylesheet("generation zero"),
				revision: 5,
				renderDataVersion: 7,
				editGeneration: 2,
				diagnostics: [],
			});
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: async ({ editGeneration, source: candidate }) => ({
				type: "compile_result",
				requestId: editGeneration,
				editGeneration,
				program: candidate.text === "invalid {" ? null : { languageVersion: 1, rules: [] },
				diagnostics: [],
			}),
			preflight: async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}),
			mutate,
		});

		runtime.store.getState().setSourceText("invalid {");
		await vi.runAllTimersAsync();
		expect(runtime.store.getState()).toMatchObject({
			source: source("invalid {"),
			applied: source("generation zero"),
		});
		expect(mutate.mock.calls[0]?.[0]).toMatchObject({ transition: "edit_source", source: source("invalid {") });

		runtime.store.getState().undo();
		await vi.runAllTimersAsync();
		expect(mutate.mock.calls[1]?.[0]).toMatchObject({
			transition: "restore_history",
			restore: stylesheet("generation zero"),
		});
	});

	it("does not publish historical applied state before restore acknowledgement", async () => {
		const mutate = vi.fn(() => new Promise<MutationResult>(() => {}));
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial: { ...initial, stylesheet: stylesheet("current applied") },
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: async ({ editGeneration }) => ({
				type: "compile_result",
				requestId: editGeneration,
				editGeneration,
				program: { languageVersion: 1, rules: [] },
				diagnostics: [],
			}),
			preflight: async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}),
			mutate,
		});
		runtime.store.setState({
			source: source("local invalid"),
			applied: source("current applied"),
			undoStack: [stylesheet("historical")],
			canUndo: true,
		});

		runtime.store.getState().undo();
		await vi.runAllTimersAsync();

		expect(runtime.store.getState().source).toEqual(source("historical"));
		expect(runtime.store.getState().applied).toEqual(source("current applied"));
		expect(mutate).toHaveBeenCalledWith(
			expect.objectContaining({ transition: "restore_history", restore: stylesheet("historical") }),
			expect.any(AbortSignal),
		);
	});

	it("retries the focused draft against a newer content render-data version", async () => {
		const mutate = vi.fn().mockResolvedValue({
			stylesheet: stylesheet("local"),
			revision: 4,
			renderDataVersion: 12,
			editGeneration: 1,
			diagnostics: [],
		});
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: async ({ editGeneration }) => ({
				type: "compile_result",
				requestId: editGeneration,
				editGeneration,
				program: { languageVersion: 1, rules: [] },
				diagnostics: [],
			}),
			preflight: async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}),
			mutate,
		});

		runtime.store.getState().setFocused(true);
		runtime.store.getState().setSourceText("local");
		runtime.replaceResumeSnapshot(defaultResumeData, {
			stylesheet: stylesheet("remote"),
			revision: 9,
			renderDataVersion: 12,
		});
		await vi.runAllTimersAsync();

		expect(runtime.store.getState().source).toEqual(source("local"));
		expect(mutate).toHaveBeenLastCalledWith(
			expect.objectContaining({ expectedRevision: 9, expectedRenderDataVersion: 12, source: source("local") }),
			expect.any(AbortSignal),
		);
	});

	it("keeps a queued draft when content changes after editor blur", async () => {
		const mutate = vi.fn().mockResolvedValue({
			stylesheet: stylesheet("local"),
			revision: 10,
			renderDataVersion: 12,
			editGeneration: 1,
			diagnostics: [],
		});
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: async ({ editGeneration }) => ({
				type: "compile_result",
				requestId: editGeneration,
				editGeneration,
				program: { languageVersion: 1, rules: [] },
				diagnostics: [],
			}),
			preflight: async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}),
			mutate,
		});

		runtime.store.getState().setSourceText("local");
		runtime.replaceResumeSnapshot(defaultResumeData, {
			stylesheet: stylesheet("remote"),
			revision: 9,
			renderDataVersion: 12,
		});
		await vi.runAllTimersAsync();

		expect(runtime.store.getState().source).toEqual(source("local"));
		expect(mutate).toHaveBeenLastCalledWith(
			expect.objectContaining({ expectedRevision: 9, expectedRenderDataVersion: 12, source: source("local") }),
			expect.any(AbortSignal),
		);
	});

	it("queues activation only after browser preflight succeeds", async () => {
		const mutate = vi.fn().mockResolvedValue({
			stylesheet: stylesheet("generation zero"),
			revision: 4,
			renderDataVersion: 7,
			editGeneration: 2,
			diagnostics: [],
		});
		const preflight = vi
			.fn()
			.mockResolvedValueOnce({
				type: "preflight_result",
				requestId: 1,
				editGeneration: 1,
				result: {
					ok: false,
					code: "STYLESHEET_PREFLIGHT_RENDER_FAILED",
					message: "failed",
					diagnostics: [],
				},
			})
			.mockResolvedValueOnce({
				type: "preflight_result",
				requestId: 2,
				editGeneration: 2,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			});
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial: { ...initial, stylesheet: { ...initial.stylesheet, mode: "legacy" } },
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: async ({ editGeneration }) => ({
				type: "compile_result",
				requestId: editGeneration,
				editGeneration,
				program: { languageVersion: 1, rules: [] },
				diagnostics: [],
			}),
			preflight,
			mutate,
		});

		runtime.store.getState().activate();
		await vi.runAllTimersAsync();
		expect(mutate).not.toHaveBeenCalled();

		runtime.store.getState().activate();
		await vi.runAllTimersAsync();
		expect(mutate).toHaveBeenCalledWith(
			expect.objectContaining({ transition: "activate", source: source("generation zero") }),
			expect.any(AbortSignal),
		);
	});

	it("does not leave Checking stuck when compile rejects for the current edit", async () => {
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: () => Promise.reject(new Error("Discarded stale stylesheet compiler result.")),
			preflight: vi.fn(),
			mutate: vi.fn(),
		});

		runtime.store.getState().setSourceText("edited source");
		await vi.runAllTimersAsync();

		expect(runtime.store.getState().status).not.toBe("compiling");
		expect(runtime.store.getState().status).toBe("error");
	});

	it("finishes an edit when refreshIntelligence interleaves through the shared compile client", async () => {
		const { createCompileWorkerClient } = await import("./worker-client");
		const listeners = new Map<string, Set<EventListener>>();
		const fake = {
			postMessage: vi.fn(),
			terminate: vi.fn(),
			addEventListener: vi.fn((type: string, listener: EventListener) => {
				const bucket = listeners.get(type) ?? new Set();
				bucket.add(listener);
				listeners.set(type, bucket);
			}),
			removeEventListener: vi.fn((type: string, listener: EventListener) => {
				listeners.get(type)?.delete(listener);
			}),
			emit(data: unknown) {
				for (const listener of listeners.get("message") ?? []) {
					(listener as (event: MessageEvent) => void)(new MessageEvent("message", { data }));
				}
			},
		};
		const client = createCompileWorkerClient(() => fake);
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 0,
			compile: client.compile,
			preflight: async ({ editGeneration }) => ({
				type: "preflight_result",
				requestId: editGeneration,
				editGeneration,
				result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [], pdf: new ArrayBuffer(1) },
			}),
			mutate: async ({ editGeneration }) => ({
				stylesheet: stylesheet("edited source"),
				revision: 4,
				renderDataVersion: 7,
				editGeneration,
				diagnostics: [],
			}),
		});

		runtime.store.getState().setSourceText("edited source");
		await vi.runAllTimersAsync();
		expect(runtime.store.getState().status).toBe("compiling");
		expect(fake.postMessage).toHaveBeenCalledTimes(1);

		// Mobile Design remount / accordion reopen refreshes intelligence while the edit is compiling.
		runtime.store.getState().refreshIntelligence();
		expect(fake.postMessage).toHaveBeenCalledTimes(2);

		fake.emit({
			type: "compile_result",
			requestId: 1,
			editGeneration: 1,
			program: { languageVersion: 1, rules: [] },
			diagnostics: [],
			colorTokens: [],
		});
		fake.emit({
			type: "compile_result",
			requestId: 2,
			editGeneration: 1,
			program: { languageVersion: 1, rules: [] },
			diagnostics: [],
			colorTokens: [],
		});
		await vi.runAllTimersAsync();

		expect(runtime.store.getState().status).toBe("applied");
		expect(runtime.store.getState().applied.text).toBe("edited source");
	});

	it("terminates both worker clients and clears the store on cleanup", () => {
		const destroy = vi.fn();
		let mutationSignal: AbortSignal | undefined;
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			compile: vi.fn(),
			preflight: vi.fn(),
			mutate: vi.fn((_input: unknown, signal: AbortSignal) => {
				mutationSignal = signal;
				return new Promise<MutationResult>(() => {});
			}),
			destroy,
		});

		runtime.store.getState().deactivate();
		runtime.destroy();

		expect(destroy).toHaveBeenCalledOnce();
		expect(mutationSignal?.aborted).toBe(true);
		expect(runtime.store.getState().resumeId).toBeUndefined();
	});

	it("coalesces rapid source edits and bounds stylesheet history", () => {
		const runtime = createStylesheetStoreRuntime({
			resumeId: "resume-1",
			initial,
			resumeData: defaultResumeData,
			debounceMs: 1_000_000,
			compile: vi.fn(),
			preflight: vi.fn(),
			mutate: vi.fn(),
		});

		for (let index = 0; index < 10; index++) runtime.store.getState().setSourceText(`rapid ${index}`);
		expect(runtime.store.getState().undoStack).toHaveLength(1);
		expect(runtime.store.getState().undoStack[0]).toEqual(stylesheet("generation zero"));

		for (let index = 0; index < 60; index++) {
			vi.advanceTimersByTime(501);
			runtime.store.getState().setSourceText(`separate ${index}`);
		}
		expect(runtime.store.getState().undoStack).toHaveLength(50);
	});
});
