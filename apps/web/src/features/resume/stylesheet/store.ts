import type { SemanticCssDiagnostic, SemanticNode } from "@reactive-resume/resume/stylesheet";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SemanticStylesheet, StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { StoreApi } from "zustand/vanilla";
import type { SemanticCssColorToken } from "./color-tokens";
import type {
	CompileWorkerInput,
	CompileWorkerResponse,
	PreflightWorkerInput,
	PreflightWorkerResponse,
	SemanticCssEditorMetadata,
} from "./protocol";
import { create } from "zustand/react";
import { createStore } from "zustand/vanilla";
import {
	buildSemanticTree,
	getTemplateSemanticManifest,
	semanticNodeKeys,
	shouldShowResumeHeader,
} from "@reactive-resume/pdf/semantic-tree";
import { orpc } from "@/libs/orpc/client";
import { createCompileWorkerClient, createPreflightWorkerClient } from "./worker-client";

export type StylesheetCanonicalState = {
	stylesheet: SemanticStylesheet;
	revision: number;
	renderDataVersion: number;
};

type StylesheetMutationResult = StylesheetCanonicalState & {
	editGeneration: number;
	diagnostics: readonly SemanticCssDiagnostic[];
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
	diagnostics: readonly SemanticCssDiagnostic[];
	colorTokens: readonly SemanticCssColorToken[];
	editorMetadata: SemanticCssEditorMetadata;
	status: "idle" | "compiling" | "preflighting" | "saving" | "applied" | "error";
	restoreLocked: boolean;
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
	refreshIntelligence(): void;
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

const emptySource = (): StylesheetSource => ({ languageVersion: 1, text: "@version 1;\n" });
const emptySemanticTree = (): SemanticNode => ({
	key: "resume",
	kind: "resume",
	attributes: {},
	roles: [],
	children: [],
});
const HISTORY_COALESCE_MS = 500;
const MAX_HISTORY_ENTRIES = 50;

const inactiveState = (): Omit<
	StylesheetStoreState,
	"setSourceText" | "setFocused" | "activate" | "deactivate" | "undo" | "redo" | "refreshIntelligence"
> => ({
	resumeId: undefined,
	mode: "legacy",
	source: emptySource(),
	applied: emptySource(),
	revision: 0,
	renderDataVersion: 0,
	editGeneration: 0,
	diagnostics: [],
	colorTokens: [],
	editorMetadata: { semanticTree: emptySemanticTree(), templateParts: [] },
	status: "idle",
	restoreLocked: false,
	focused: false,
	canUndo: false,
	canRedo: false,
	undoStack: [],
	redoStack: [],
});

const sourceFromText = (source: StylesheetSource, text: string): StylesheetSource => ({ ...source, text });
const sourcesEqual = (left: StylesheetSource, right: StylesheetSource) =>
	left.languageVersion === right.languageVersion && left.text === right.text;
const isEditorFocused = () =>
	typeof document !== "undefined" && document.activeElement instanceof HTMLElement
		? document.activeElement.closest(".cm-editor") !== null
		: false;
const currentStylesheet = (state: StylesheetStoreState): SemanticStylesheet => ({
	mode: state.mode,
	source: structuredClone(state.source),
	applied: structuredClone(state.applied),
});
const appendHistory = (stack: SemanticStylesheet[], value: SemanticStylesheet) =>
	[...stack, value].slice(-MAX_HISTORY_ENTRIES);

const pageDimensions = (data: ResumeData) => {
	const format = data.metadata.page.format;
	const size = format === "letter" ? { width: 612, height: 792 } : { width: 595.28, height: 841.89 };
	return data.metadata.layout.pages.map((_page, index) => ({
		pageKey: semanticNodeKeys.page(index + 1),
		...size,
	}));
};

const createEditorMetadata = (data: ResumeData): SemanticCssEditorMetadata => {
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
		semanticTree,
		templateParts: getTemplateSemanticManifest(data.metadata.template).parts.map(({ name }) => name),
	};
};

const compileInput = (
	data: ResumeData,
	source: StylesheetSource,
	editGeneration: number,
	semanticTree: SemanticNode,
): CompileWorkerInput => {
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
	let inFlight: Candidate | undefined;
	let pending: Candidate | undefined;
	let latestCandidate: Candidate | undefined;
	let deferredCanonical: StylesheetCanonicalState | undefined;
	let validationEpoch = 0;
	let intelligenceEpoch = 0;
	let historyLastEditAt = 0;
	let historyCanCoalesce = false;
	let destroyed = false;
	const abortController = new AbortController();
	const debounceMs = options.debounceMs ?? 180;
	const initial = options.initial.stylesheet;
	let editorMetadata = createEditorMetadata(resumeData);
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
			refreshIntelligence: () => {},
		}));

	const patch = (next: Partial<StylesheetStoreState>) => store.setState(next);
	const replaceCanonical = (canonical: StylesheetCanonicalState, preserveSource: boolean) => {
		const state = store.getState();
		const next: Partial<StylesheetStoreState> = {
			revision: Math.max(state.revision, canonical.revision),
			renderDataVersion: Math.max(state.renderDataVersion, canonical.renderDataVersion),
		};
		if (canonical.revision >= state.revision) {
			next.mode = canonical.stylesheet.mode;
			const nextSource = preserveSource ? state.source : canonical.stylesheet.source;
			next.source = nextSource;
			next.applied = canonical.stylesheet.applied;
			if (!sourcesEqual(nextSource, state.source)) {
				intelligenceEpoch += 1;
				next.colorTokens = [];
			}
		}
		patch(next);
	};
	const resetHistoryCoalescing = () => {
		historyLastEditAt = 0;
		historyCanCoalesce = false;
	};

	const startNext = () => {
		if (destroyed || inFlight || !pending) return;
		const candidate = pending;
		pending = undefined;
		inFlight = candidate;
		const requestValidationEpoch = validationEpoch;
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
				const state = store.getState();
				const staleStylesheet = result.revision < state.revision;
				patch({
					revision: Math.max(state.revision, result.revision),
					renderDataVersion: Math.max(state.renderDataVersion, result.renderDataVersion),
				});
				if (result.editGeneration !== store.getState().editGeneration) return;
				if (staleStylesheet) return;
				const sourceChanged = !sourcesEqual(result.stylesheet.source, state.source);
				if (sourceChanged) intelligenceEpoch += 1;
				patch({
					mode: result.stylesheet.mode,
					source: result.stylesheet.source,
					applied: result.stylesheet.applied,
					diagnostics: result.diagnostics,
					colorTokens: sourceChanged ? [] : state.colorTokens,
					status: result.diagnostics.some(({ severity }) => severity === "error") ? "error" : "applied",
				});
				if (latestCandidate?.generation === result.editGeneration) latestCandidate = undefined;
				if (deferredCanonical && result.revision >= deferredCanonical.revision) deferredCanonical = undefined;
			})
			.catch((error: unknown) => {
				if (destroyed) return;
				const canonical = conflictState(error);
				if (!canonical) {
					patch({ status: "error" });
					return;
				}
				replaceCanonical(canonical, true);
				if (requestValidationEpoch === validationEpoch) pending ??= candidate;
			})
			.finally(() => {
				inFlight = undefined;
				startNext();
			});
	};

	const queue = (candidate: Candidate) => {
		latestCandidate = candidate;
		pending = candidate;
		startNext();
	};

	const processCandidate = async (candidate: Candidate) => {
		if (destroyed || candidate.generation !== store.getState().editGeneration) return;
		const candidateValidationEpoch = validationEpoch;
		if (candidate.transition === "deactivate") {
			queue(candidate);
			return;
		}
		const source = candidate.transition === "restore_history" ? candidate.restore.applied : candidate.source;
		patch({ status: "compiling" });
		let compiled: CompileWorkerResponse;
		try {
			compiled = await options.compile(
				compileInput(resumeData, source, candidate.generation, editorMetadata.semanticTree),
			);
		} catch {
			if (candidateValidationEpoch !== validationEpoch) return;
			if (destroyed || candidate.generation !== store.getState().editGeneration) return;
			patch({ status: "error" });
			return;
		}
		if (candidateValidationEpoch !== validationEpoch) return;
		if (destroyed || compiled.editGeneration !== store.getState().editGeneration) return;
		patch({ diagnostics: compiled.diagnostics, colorTokens: compiled.colorTokens ?? [] });

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
				if (candidateValidationEpoch !== validationEpoch) return;
				if (candidate.generation !== store.getState().editGeneration) return;
				patch({ status: "error" });
				if (candidate.transition === "edit_source") queue(candidate);
				return;
			}
			if (candidateValidationEpoch !== validationEpoch) return;
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
		latestCandidate = candidate;
		timer = setTimeout(() => {
			timer = undefined;
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
		resetHistoryCoalescing();
		patch({
			source: previous.source,
			editGeneration: generation,
			colorTokens: [],
			[opposite]: stack.slice(0, -1),
			[other]: appendHistory(state[other], target),
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
		colorTokens: [],
		editorMetadata,
		status: "idle",
		restoreLocked: false,
		focused: false,
		undoStack: [],
		redoStack: [],
		canUndo: false,
		canRedo: false,
		setSourceText(text) {
			const state = store.getState();
			if (state.restoreLocked || text === state.source.text) return;
			const generation = state.editGeneration + 1;
			const nextSource = sourceFromText(state.source, text);
			const now = Date.now();
			const undoStack =
				historyCanCoalesce && now - historyLastEditAt <= HISTORY_COALESCE_MS
					? state.undoStack
					: appendHistory(state.undoStack, currentStylesheet(state));
			historyLastEditAt = now;
			historyCanCoalesce = true;
			patch({
				source: nextSource,
				editGeneration: generation,
				colorTokens: [],
				undoStack,
				redoStack: [],
				canUndo: true,
				canRedo: false,
			});
			schedule({ generation, transition: "edit_source", source: nextSource });
		},
		setFocused(focused) {
			patch({ focused });
			if (focused || !deferredCanonical) return;
			const canonical = deferredCanonical;
			deferredCanonical = undefined;
			const candidate = latestCandidate;
			const hasLocalDraft =
				candidate !== undefined && store.getState().source.text !== canonical.stylesheet.source.text;
			replaceCanonical(canonical, hasLocalDraft);
			if (hasLocalDraft && candidate) schedule(candidate);
			else resetHistoryCoalescing();
		},
		activate() {
			const state = store.getState();
			if (state.restoreLocked || state.mode === "semantic") return;
			const generation = state.editGeneration + 1;
			resetHistoryCoalescing();
			patch({
				editGeneration: generation,
				colorTokens: [],
				undoStack: appendHistory(state.undoStack, currentStylesheet(state)),
				redoStack: [],
				canUndo: true,
				canRedo: false,
			});
			schedule({ generation, transition: "activate", source: state.source });
		},
		deactivate() {
			const state = store.getState();
			if (state.restoreLocked || state.mode === "legacy") return;
			const generation = state.editGeneration + 1;
			resetHistoryCoalescing();
			patch({
				editGeneration: generation,
				colorTokens: [],
				undoStack: appendHistory(state.undoStack, currentStylesheet(state)),
				redoStack: [],
				canUndo: true,
				canRedo: false,
			});
			queue({ generation, transition: "deactivate" });
		},
		undo() {
			if (store.getState().restoreLocked) return;
			restore(currentStylesheet(store.getState()), "undoStack");
		},
		redo() {
			if (store.getState().restoreLocked) return;
			restore(currentStylesheet(store.getState()), "redoStack");
		},
		refreshIntelligence() {
			const state = store.getState();
			const generation = state.editGeneration;
			const source = structuredClone(state.source);
			const requestEpoch = ++intelligenceEpoch;
			void options
				.compile(compileInput(resumeData, source, generation, editorMetadata.semanticTree))
				.then((compiled) => {
					const current = store.getState();
					if (
						destroyed ||
						requestEpoch !== intelligenceEpoch ||
						current.editGeneration !== generation ||
						!sourcesEqual(current.source, source)
					) {
						return;
					}
					patch({ diagnostics: compiled.diagnostics, colorTokens: compiled.colorTokens ?? [] });
				});
		},
	});

	return {
		store,
		replaceResumeSnapshot(data: ResumeData, canonical: StylesheetCanonicalState) {
			const candidate = latestCandidate;
			resumeData = structuredClone(data);
			editorMetadata = createEditorMetadata(resumeData);
			patch({ editorMetadata });
			const renderDataChanged = canonical.renderDataVersion > store.getState().renderDataVersion;
			const preserveSource = store.getState().focused || isEditorFocused() || candidate !== undefined;
			replaceCanonical(canonical, preserveSource);
			if (renderDataChanged) {
				validationEpoch += 1;
				pending = undefined;
				if (candidate) schedule(candidate);
			}
		},
		rebaseCanonical(canonical: StylesheetCanonicalState) {
			const candidate = latestCandidate;
			const hasLocalDraft =
				candidate !== undefined && store.getState().source.text !== canonical.stylesheet.source.text;
			const focused = store.getState().focused || isEditorFocused();
			const sourceChanged = store.getState().source.text !== canonical.stylesheet.source.text;
			if (focused && sourceChanged && canonical.revision >= store.getState().revision) deferredCanonical = canonical;
			const preserveSource = (focused && sourceChanged) || hasLocalDraft;
			replaceCanonical(canonical, preserveSource);
			if (hasLocalDraft && candidate) schedule(candidate);
			else if (!preserveSource) resetHistoryCoalescing();
		},
		destroy() {
			destroyed = true;
			abortController.abort();
			if (timer) clearTimeout(timer);
			timer = undefined;
			pending = undefined;
			latestCandidate = undefined;
			deferredCanonical = undefined;
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
	refreshIntelligence: () => {},
}));

let activeRuntime: ReturnType<typeof createStylesheetStoreRuntime> | undefined;
declare const stylesheetRuntimeTokenBrand: unique symbol;
export type StylesheetRuntimeToken = Readonly<{ [stylesheetRuntimeTokenBrand]: true }>;
let activeRuntimeToken: StylesheetRuntimeToken | undefined;

const compilerClient = () =>
	createCompileWorkerClient(
		() =>
			new Worker(new URL("./stylesheet.worker.ts", import.meta.url), { type: "module", name: "semantic-css-compiler" }),
	);
const preflightClient = () =>
	createPreflightWorkerClient(
		() =>
			new Worker(new URL("./preflight.worker.ts", import.meta.url), { type: "module", name: "semantic-css-preflight" }),
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
	preflight.warmup();
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
	activeRuntimeToken = {} as StylesheetRuntimeToken;
	return () => {
		if (activeRuntime?.store.getState().resumeId !== input.resumeId) return;
		activeRuntime.destroy();
		activeRuntime = undefined;
		activeRuntimeToken = undefined;
	};
}

export function lockStylesheetStoreForRestore(resumeId: string): StylesheetRuntimeToken | undefined {
	if (!activeRuntime || !activeRuntimeToken) return;
	const state = activeRuntime.store.getState();
	if (state.resumeId !== resumeId || state.restoreLocked) return;
	activeRuntime.store.setState({ restoreLocked: true });
	return activeRuntimeToken;
}

export function unlockStylesheetStoreAfterRestore(token: StylesheetRuntimeToken | undefined): boolean {
	if (!activeRuntime || !token || activeRuntimeToken !== token) return false;
	activeRuntime.store.setState({ restoreLocked: false });
	return true;
}

export function replaceStylesheetStoreAfterRestore(input: {
	resumeId: string;
	initial: StylesheetCanonicalState;
	resumeData: ResumeData;
	token: StylesheetRuntimeToken | undefined;
}): boolean {
	if (
		!activeRuntime ||
		!input.token ||
		activeRuntimeToken !== input.token ||
		activeRuntime.store.getState().resumeId !== input.resumeId ||
		!activeRuntime.store.getState().restoreLocked
	) {
		return false;
	}
	initializeStylesheetStore(input);
	return true;
}

export async function refreshStylesheetStore(resumeId: string, resumeData?: ResumeData) {
	if (!activeRuntime || activeRuntime.store.getState().resumeId !== resumeId) return;
	const canonical = await orpc.resume.stylesheet.getState.call({ id: resumeId });
	if (resumeData) activeRuntime.replaceResumeSnapshot(resumeData, canonical);
	else activeRuntime.rebaseCanonical(canonical);
}
