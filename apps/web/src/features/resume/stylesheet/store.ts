import type { RrssDiagnostic, SemanticNode } from "@reactive-resume/resume/stylesheet";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SemanticStylesheet, StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { StoreApi } from "zustand/vanilla";
import type {
	CompileWorkerInput,
	CompileWorkerResponse,
	PreflightWorkerInput,
	PreflightWorkerResponse,
} from "./protocol";
import { create } from "zustand/react";
import { createStore } from "zustand/vanilla";
import { buildSemanticTree, semanticNodeKeys, shouldShowResumeHeader } from "@reactive-resume/pdf/semantic-tree";
import { orpc } from "@/libs/orpc/client";
import { createCompileWorkerClient, createPreflightWorkerClient } from "./worker-client";

export type StylesheetCanonicalState = {
	stylesheet: SemanticStylesheet;
	revision: number;
	renderDataVersion: number;
};

type StylesheetMutationResult = StylesheetCanonicalState & {
	editGeneration: number;
	diagnostics: readonly RrssDiagnostic[];
};

type EditMutation = {
	id: string;
	expectedRevision: number;
	expectedRenderDataVersion: number;
	editGeneration: number;
	transition: "edit_source";
	source: StylesheetSource;
};

type RestoreMutation = {
	id: string;
	expectedRevision: number;
	expectedRenderDataVersion: number;
	editGeneration: number;
	transition: "restore_history";
	restore: SemanticStylesheet;
};

type ActivateMutation = Omit<EditMutation, "transition"> & { transition: "activate" };
type DeactivateMutation = Omit<EditMutation, "transition" | "source"> & { transition: "deactivate" };
type StylesheetMutation = EditMutation | RestoreMutation | ActivateMutation | DeactivateMutation;

type Candidate =
	| { generation: number; transition: "edit_source"; source: StylesheetSource }
	| { generation: number; transition: "restore_history"; restore: SemanticStylesheet }
	| { generation: number; transition: "activate"; source: StylesheetSource }
	| { generation: number; transition: "deactivate" };

export type StylesheetStoreState = {
	resumeId?: string;
	mode: SemanticStylesheet["mode"];
	source: StylesheetSource;
	applied: StylesheetSource;
	revision: number;
	renderDataVersion: number;
	editGeneration: number;
	diagnostics: readonly RrssDiagnostic[];
	status: "idle" | "compiling" | "preflighting" | "saving" | "applied" | "error";
	focused: boolean;
	canUndo: boolean;
	canRedo: boolean;
	undoStack: SemanticStylesheet[];
	redoStack: SemanticStylesheet[];
	setSourceText(text: string): void;
	setFocused(focused: boolean): void;
	activate(): void;
	deactivate(): void;
	undo(): void;
	redo(): void;
};

type RuntimeDependencies = {
	compile(input: CompileWorkerInput): Promise<CompileWorkerResponse>;
	preflight(input: PreflightWorkerInput): Promise<PreflightWorkerResponse>;
	mutate(input: StylesheetMutation, signal: AbortSignal): Promise<StylesheetMutationResult>;
	destroy?(): void;
};

type CreateStylesheetStoreRuntimeOptions = RuntimeDependencies & {
	resumeId: string;
	initial: StylesheetCanonicalState;
	resumeData: ResumeData;
	debounceMs?: number;
	store?: StoreApi<StylesheetStoreState>;
};

const emptySource = (): StylesheetSource => ({ languageVersion: 1, text: "@rr-version 1;\n" });

const inactiveState = (): Omit<
	StylesheetStoreState,
	"setSourceText" | "setFocused" | "activate" | "deactivate" | "undo" | "redo"
> => ({
	resumeId: undefined,
	mode: "legacy",
	source: emptySource(),
	applied: emptySource(),
	revision: 0,
	renderDataVersion: 0,
	editGeneration: 0,
	diagnostics: [],
	status: "idle",
	focused: false,
	canUndo: false,
	canRedo: false,
	undoStack: [],
	redoStack: [],
});

const sourceFromText = (source: StylesheetSource, text: string): StylesheetSource => ({ ...source, text });
const isEditorFocused = () =>
	typeof document !== "undefined" && document.activeElement instanceof HTMLElement
		? document.activeElement.closest(".cm-editor") !== null
		: false;
const currentStylesheet = (state: StylesheetStoreState): SemanticStylesheet => ({
	mode: state.mode,
	source: structuredClone(state.source),
	applied: structuredClone(state.applied),
});

const pageDimensions = (data: ResumeData) => {
	const format = data.metadata.page.format;
	const size = format === "letter" ? { width: 612, height: 792 } : { width: 595.28, height: 841.89 };
	return data.metadata.layout.pages.map((_page, index) => ({
		pageKey: semanticNodeKeys.page(index + 1),
		...size,
	}));
};

const compileInput = (data: ResumeData, source: StylesheetSource, editGeneration: number): CompileWorkerInput => {
	const pages = data.metadata.layout.pages.map((page, index) =>
		buildSemanticTree({
			data,
			template: data.metadata.template,
			page,
			pageNumber: index + 1,
			showHeader: shouldShowResumeHeader(data, index),
		}),
	);
	const semanticTree: SemanticNode = {
		key: semanticNodeKeys.resume(),
		kind: "resume",
		attributes: { template: data.metadata.template },
		roles: [],
		children: pages.flatMap(({ children }) => children),
	};
	return {
		editGeneration,
		source,
		semanticTree,
		baseSettings: {
			picture: data.picture,
			template: data.metadata.template,
			design: data.metadata.design,
			typography: data.metadata.typography,
			page: data.metadata.page,
			layout: { sidebarWidth: data.metadata.layout.sidebarWidth },
		},
		pages: pageDimensions(data),
	};
};

const conflictState = (error: unknown): StylesheetCanonicalState | undefined => {
	if (!error || typeof error !== "object") return;
	const value = error as { code?: string; data?: { state?: StylesheetCanonicalState } };
	return value.code === "STYLESHEET_REVISION_CONFLICT" ? value.data?.state : undefined;
};

export function createStylesheetStoreRuntime(options: CreateStylesheetStoreRuntimeOptions) {
	let resumeData = structuredClone(options.resumeData);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let scheduled: Candidate | undefined;
	let inFlight: Candidate | undefined;
	let pending: Candidate | undefined;
	let destroyed = false;
	const abortController = new AbortController();
	const debounceMs = options.debounceMs ?? 180;
	const initial = options.initial.stylesheet;
	const store =
		options.store ??
		createStore<StylesheetStoreState>(() => ({
			...inactiveState(),
			setSourceText: () => {},
			setFocused: () => {},
			activate: () => {},
			deactivate: () => {},
			undo: () => {},
			redo: () => {},
		}));

	const patch = (next: Partial<StylesheetStoreState>) => store.setState(next);
	const replaceCanonical = (canonical: StylesheetCanonicalState, preserveSource: boolean) => {
		const visibleSource = preserveSource ? store.getState().source : canonical.stylesheet.source;
		patch({
			mode: canonical.stylesheet.mode,
			source: visibleSource,
			applied: canonical.stylesheet.applied,
			revision: canonical.revision,
			renderDataVersion: canonical.renderDataVersion,
		});
	};

	const startNext = () => {
		if (destroyed || inFlight || !pending) return;
		const candidate = pending;
		pending = undefined;
		inFlight = candidate;
		const state = store.getState();
		const common = {
			id: options.resumeId,
			expectedRevision: state.revision,
			expectedRenderDataVersion: state.renderDataVersion,
			editGeneration: candidate.generation,
		};
		let input: StylesheetMutation;
		if (candidate.transition === "edit_source" || candidate.transition === "activate") {
			input = { ...common, transition: candidate.transition, source: candidate.source };
		} else if (candidate.transition === "restore_history") {
			input = { ...common, transition: "restore_history", restore: candidate.restore };
		} else {
			input = { ...common, transition: "deactivate" };
		}
		patch({ status: "saving" });

		void options
			.mutate(input, abortController.signal)
			.then((result) => {
				if (destroyed) return;
				patch({ revision: result.revision, renderDataVersion: result.renderDataVersion });
				if (result.editGeneration !== store.getState().editGeneration) return;
				patch({
					mode: result.stylesheet.mode,
					source: result.stylesheet.source,
					applied: result.stylesheet.applied,
					diagnostics: result.diagnostics,
					status: result.diagnostics.some(({ severity }) => severity === "error") ? "error" : "applied",
				});
			})
			.catch((error: unknown) => {
				if (destroyed) return;
				const canonical = conflictState(error);
				if (!canonical) {
					patch({ status: "error" });
					return;
				}
				replaceCanonical(canonical, true);
				pending ??= candidate;
			})
			.finally(() => {
				inFlight = undefined;
				startNext();
			});
	};

	const queue = (candidate: Candidate) => {
		pending = candidate;
		startNext();
	};

	const processCandidate = async (candidate: Candidate) => {
		if (destroyed || candidate.generation !== store.getState().editGeneration) return;
		if (candidate.transition === "deactivate") {
			queue(candidate);
			return;
		}
		const source = candidate.transition === "restore_history" ? candidate.restore.applied : candidate.source;
		patch({ status: "compiling" });
		let compiled: CompileWorkerResponse;
		try {
			compiled = await options.compile(compileInput(resumeData, source, candidate.generation));
		} catch {
			return;
		}
		if (destroyed || compiled.editGeneration !== store.getState().editGeneration) return;
		patch({ diagnostics: compiled.diagnostics });

		if (!compiled.program) {
			if (candidate.transition === "edit_source") queue(candidate);
			else patch({ status: "error" });
			return;
		}

		if (compiled.program) {
			patch({ status: "preflighting" });
			let preflight: PreflightWorkerResponse;
			try {
				preflight = await options.preflight({
					editGeneration: candidate.generation,
					input: { data: resumeData, template: resumeData.metadata.template, stylesheet: source },
					limits: {
						maxPages: 20,
						maxBytes: 10_000_000,
						maxPageWidthPt: 2_000,
						maxPageHeightPt: 20_000,
						maxPageAreaPt2: 20_000_000,
					},
				});
			} catch {
				if (candidate.generation !== store.getState().editGeneration) return;
				patch({ status: "error" });
				if (candidate.transition === "edit_source") queue(candidate);
				return;
			}
			if (destroyed || preflight.editGeneration !== store.getState().editGeneration) return;
			if (!preflight.result.ok) {
				patch({ diagnostics: [...compiled.diagnostics, ...preflight.result.diagnostics], status: "error" });
				if (candidate.transition !== "edit_source") return;
			}
		}

		queue(candidate);
	};

	const schedule = (candidate: Candidate) => {
		if (timer) clearTimeout(timer);
		scheduled = candidate;
		timer = setTimeout(() => {
			timer = undefined;
			scheduled = undefined;
			void processCandidate(candidate);
		}, debounceMs);
	};

	const restore = (target: SemanticStylesheet, opposite: "undoStack" | "redoStack") => {
		const state = store.getState();
		const stack = opposite === "undoStack" ? state.undoStack : state.redoStack;
		const previous = stack.at(-1);
		if (!previous) return;
		const generation = state.editGeneration + 1;
		const other = opposite === "undoStack" ? "redoStack" : "undoStack";
		patch({
			source: previous.source,
			editGeneration: generation,
			[opposite]: stack.slice(0, -1),
			[other]: [...state[other], target],
			canUndo: opposite === "redoStack" || stack.length > 1,
			canRedo: opposite === "undoStack" || stack.length > 1,
		});
		schedule({ generation, transition: "restore_history", restore: previous });
	};

	store.setState({
		resumeId: options.resumeId,
		mode: initial.mode,
		source: structuredClone(initial.source),
		applied: structuredClone(initial.applied),
		revision: options.initial.revision,
		renderDataVersion: options.initial.renderDataVersion,
		editGeneration: 0,
		diagnostics: [],
		status: "idle",
		focused: false,
		undoStack: [],
		redoStack: [],
		canUndo: false,
		canRedo: false,
		setSourceText(text) {
			const state = store.getState();
			if (text === state.source.text) return;
			const generation = state.editGeneration + 1;
			const nextSource = sourceFromText(state.source, text);
			patch({
				source: nextSource,
				editGeneration: generation,
				undoStack: [...state.undoStack, currentStylesheet(state)],
				redoStack: [],
				canUndo: true,
				canRedo: false,
			});
			schedule({ generation, transition: "edit_source", source: nextSource });
		},
		setFocused(focused) {
			patch({ focused });
		},
		activate() {
			const state = store.getState();
			if (state.mode === "semantic") return;
			const generation = state.editGeneration + 1;
			patch({
				editGeneration: generation,
				undoStack: [...state.undoStack, currentStylesheet(state)],
				redoStack: [],
				canUndo: true,
				canRedo: false,
			});
			schedule({ generation, transition: "activate", source: state.source });
		},
		deactivate() {
			const state = store.getState();
			if (state.mode === "legacy") return;
			const generation = state.editGeneration + 1;
			patch({
				editGeneration: generation,
				undoStack: [...state.undoStack, currentStylesheet(state)],
				redoStack: [],
				canUndo: true,
				canRedo: false,
			});
			queue({ generation, transition: "deactivate" });
		},
		undo() {
			restore(currentStylesheet(store.getState()), "undoStack");
		},
		redo() {
			restore(currentStylesheet(store.getState()), "redoStack");
		},
	});

	return {
		store,
		replaceResumeSnapshot(data: ResumeData, canonical: StylesheetCanonicalState) {
			const candidate = scheduled ?? pending ?? inFlight;
			resumeData = structuredClone(data);
			const renderDataChanged = canonical.renderDataVersion !== store.getState().renderDataVersion;
			const preserveSource = store.getState().focused || isEditorFocused() || candidate !== undefined;
			replaceCanonical(canonical, preserveSource);
			if (renderDataChanged && candidate) schedule(candidate);
		},
		rebaseCanonical(canonical: StylesheetCanonicalState) {
			const candidate = scheduled ?? pending ?? inFlight;
			const hasLocalDraft =
				candidate !== undefined && store.getState().source.text !== canonical.stylesheet.source.text;
			const preserveSource = store.getState().focused || isEditorFocused() || hasLocalDraft;
			replaceCanonical(canonical, preserveSource);
			if (hasLocalDraft && candidate) schedule(candidate);
		},
		destroy() {
			destroyed = true;
			abortController.abort();
			if (timer) clearTimeout(timer);
			timer = undefined;
			scheduled = undefined;
			pending = undefined;
			options.destroy?.();
			store.setState(inactiveState());
		},
	};
}

export const useStylesheetStore = create<StylesheetStoreState>(() => ({
	...inactiveState(),
	setSourceText: () => {},
	setFocused: () => {},
	activate: () => {},
	deactivate: () => {},
	undo: () => {},
	redo: () => {},
}));

let activeRuntime: ReturnType<typeof createStylesheetStoreRuntime> | undefined;

const compilerClient = () =>
	createCompileWorkerClient(
		() => new Worker(new URL("./stylesheet.worker.ts", import.meta.url), { type: "module", name: "rrss-compiler" }),
	);
const preflightClient = () =>
	createPreflightWorkerClient(
		() => new Worker(new URL("./preflight.worker.ts", import.meta.url), { type: "module", name: "rrss-preflight" }),
		5_000,
	);

export function initializeStylesheetStore(input: {
	resumeId: string;
	initial: StylesheetCanonicalState;
	resumeData: ResumeData;
}) {
	activeRuntime?.destroy();
	const compiler = compilerClient();
	const preflight = preflightClient();
	const runtime = createStylesheetStoreRuntime({
		...input,
		store: useStylesheetStore,
		compile: compiler.compile,
		preflight: preflight.preflight,
		mutate: (mutation, signal) => orpc.resume.stylesheet.mutate.call(mutation, { signal }),
		destroy: () => {
			compiler.destroy();
			preflight.destroy();
		},
	});
	activeRuntime = runtime;
	return () => {
		if (activeRuntime !== runtime) return;
		runtime.destroy();
		activeRuntime = undefined;
	};
}

export async function refreshStylesheetStore(resumeId: string, resumeData?: ResumeData) {
	if (!activeRuntime || activeRuntime.store.getState().resumeId !== resumeId) return;
	const canonical = await orpc.resume.stylesheet.getState.call({ id: resumeId });
	if (resumeData) activeRuntime.replaceResumeSnapshot(resumeData, canonical);
	else activeRuntime.rebaseCanonical(canonical);
}
