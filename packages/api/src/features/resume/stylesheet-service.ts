import type { PdfPreflightResult, StylesheetPreflightRunner } from "@reactive-resume/pdf/server";
import type { CompileStylesheetResult, SemanticCssDiagnostic } from "@reactive-resume/resume/stylesheet";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SemanticStylesheet, StylesheetMode, StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { SemanticCssEventInput } from "./stylesheet-observability";
import { ORPCError } from "@orpc/client";
import { and, eq } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";
import { compileStylesheet } from "@reactive-resume/resume/stylesheet";
import { EMPTY_SEMANTIC_CSS_SOURCE } from "@reactive-resume/schema/resume/stylesheet";
import { publishResumeUpdated } from "./events";
import { parseStoredResumeData } from "./resume-data-validation";
import { recordSemanticCssEvent } from "./stylesheet-observability";
import { checkLegacyStylesheetParity, convertLegacyStylesheet } from "./stylesheet-preflight";

export type StylesheetSnapshot = {
	id: string;
	userId: string;
	data: ResumeData;
	isLocked: boolean;
	stylesheetRevision: number;
	renderDataVersion: number;
	updatedAt: Date;
};

type StylesheetMutationCommon = {
	id: string;
	userId: string;
	expectedRevision: number;
	expectedRenderDataVersion: number;
	editGeneration: number;
};

export type MutateResumeStylesheetInput = StylesheetMutationCommon &
	(
		| { transition: "edit_source"; source: StylesheetSource }
		| { transition: "activate"; source: StylesheetSource }
		| { transition: "deactivate" }
		| {
				transition: "restore_history";
				restore: {
					mode: StylesheetMode;
					source: StylesheetSource;
					applied: StylesheetSource;
				};
		  }
	);

export type StylesheetState = {
	stylesheet: SemanticStylesheet;
	revision: number;
	renderDataVersion: number;
};

export type StylesheetMutationResult = StylesheetState & {
	editGeneration: number;
	diagnostics: SemanticCssDiagnostic[];
};

type StylesheetTransaction = {
	lock(input: { id: string; userId: string }): Promise<StylesheetSnapshot>;
	update(input: { snapshot: StylesheetSnapshot; data: ResumeData }): Promise<StylesheetSnapshot>;
};

type StylesheetServiceDependencies = {
	readSnapshot(input: { id: string; userId: string }): Promise<StylesheetSnapshot>;
	convertLegacy(snapshot: StylesheetSnapshot): StylesheetSource | Promise<StylesheetSource>;
	compile(source: StylesheetSource): CompileStylesheetResult;
	preflight?(input: { data: ResumeData; stylesheet: StylesheetSource }): Promise<PdfPreflightResult>;
	parity(input: {
		data: ResumeData;
		stylesheet: StylesheetSource;
		resumeId: string;
		revision: number;
	}): Promise<{ mismatches: readonly string[] }>;
	transaction<T>(run: (transaction: StylesheetTransaction) => Promise<T>): Promise<T>;
	compare(snapshot: StylesheetSnapshot, input: StylesheetMutationCommon): boolean | Promise<boolean>;
	publish(snapshot: StylesheetSnapshot): Promise<void>;
	afterPreflight?(): Promise<void>;
	observe?(event: SemanticCssEventInput): void;
};

class StylesheetRevisionConflict extends Error {
	constructor(readonly snapshot: StylesheetSnapshot) {
		super("The resume or stylesheet changed while the candidate was being validated.");
	}
}

const emptySource = (): StylesheetSource => ({ languageVersion: 1, text: EMPTY_SEMANTIC_CSS_SOURCE });

export async function stylesheetFromSnapshot(
	snapshot: StylesheetSnapshot,
	convertLegacy: (snapshot: StylesheetSnapshot) => StylesheetSource | Promise<StylesheetSource>,
): Promise<SemanticStylesheet> {
	const stylesheet = snapshot.data.metadata.stylesheet;
	if (stylesheet) return stylesheet;

	return {
		mode: "legacy",
		source: await convertLegacy(snapshot),
		applied: emptySource(),
	};
}

const stateFromSnapshot = async (
	snapshot: StylesheetSnapshot,
	convertLegacy: (snapshot: StylesheetSnapshot) => StylesheetSource | Promise<StylesheetSource>,
): Promise<StylesheetState> => ({
	stylesheet: await stylesheetFromSnapshot(snapshot, convertLegacy),
	revision: snapshot.stylesheetRevision,
	renderDataVersion: snapshot.renderDataVersion,
});

const preflightDiagnostic = (result: Extract<PdfPreflightResult, { ok: false }>): SemanticCssDiagnostic => ({
	code: result.code,
	severity: "error",
	message: result.message,
	range: {
		start: { line: 1, column: 1, offset: 0 },
		end: { line: 1, column: 1, offset: 0 },
	},
});

const validationError = (message: string, diagnostics: readonly SemanticCssDiagnostic[]) =>
	new ORPCError("STYLESHEET_VALIDATION_FAILED", {
		status: 400,
		message,
		data: { diagnostics },
	});

const unavailableError = () =>
	new ORPCError("SEMANTIC_STYLESHEET_UNAVAILABLE", {
		status: 503,
		message: "Semantic stylesheet PDF preflight is unavailable.",
	});

export function createStylesheetService(dependencies: StylesheetServiceDependencies): {
	getState(input: { id: string; userId: string }): Promise<StylesheetState>;
	mutate(input: MutateResumeStylesheetInput): Promise<StylesheetMutationResult>;
} {
	const observe = dependencies.observe ?? recordSemanticCssEvent;
	const sourceBytes = (source: StylesheetSource) => new TextEncoder().encode(source.text).byteLength;
	const compile = (snapshot: StylesheetSnapshot, source: StylesheetSource) => {
		const startedAt = performance.now();
		try {
			const result = dependencies.compile(source);
			observe({
				name: "semantic_css.compile",
				resumeId: snapshot.id,
				durationMs: performance.now() - startedAt,
				languageVersion: source.languageVersion,
				sourceBytes: sourceBytes(source),
				template: snapshot.data.metadata.template,
				diagnosticCodes: result.diagnostics.map(({ code }) => code),
				pageCount: null,
				revision: snapshot.stylesheetRevision,
				success: result.program !== null,
			});
			return result;
		} catch (error) {
			observe({
				name: "semantic_css.compile",
				resumeId: snapshot.id,
				durationMs: performance.now() - startedAt,
				languageVersion: source.languageVersion,
				sourceBytes: sourceBytes(source),
				template: snapshot.data.metadata.template,
				diagnosticCodes: [],
				pageCount: null,
				revision: snapshot.stylesheetRevision,
				success: false,
			});
			throw error;
		}
	};
	const runPreflight = async (snapshot: StylesheetSnapshot, stylesheet: StylesheetSource) => {
		const startedAt = performance.now();
		try {
			if (!dependencies.preflight) throw unavailableError();
			const result = await dependencies.preflight({ data: snapshot.data, stylesheet });
			observe({
				name: "semantic_css.preflight",
				resumeId: snapshot.id,
				durationMs: performance.now() - startedAt,
				languageVersion: stylesheet.languageVersion,
				sourceBytes: sourceBytes(stylesheet),
				template: snapshot.data.metadata.template,
				diagnosticCodes: result.diagnostics.map(({ code }) => code),
				pageCount: result.ok ? result.pageCount : null,
				revision: snapshot.stylesheetRevision,
				success: result.ok,
			});
			return result;
		} catch (error) {
			observe({
				name: "semantic_css.preflight",
				resumeId: snapshot.id,
				durationMs: performance.now() - startedAt,
				languageVersion: stylesheet.languageVersion,
				sourceBytes: sourceBytes(stylesheet),
				template: snapshot.data.metadata.template,
				diagnosticCodes: [],
				pageCount: null,
				revision: snapshot.stylesheetRevision,
				success: false,
			});
			throw error;
		}
	};

	return {
		getState: async (input) => stateFromSnapshot(await dependencies.readSnapshot(input), dependencies.convertLegacy),

		mutate: async (input) => {
			const snapshot = await dependencies.readSnapshot(input);
			let diagnostics: SemanticCssDiagnostic[] = [];
			let activationPageCount: number | null = null;
			const activationStartedAt = performance.now();
			const observeActivation = (success: boolean, revision: number) => {
				if (input.transition !== "activate") return;
				observe({
					name: "semantic_css.activate",
					resumeId: snapshot.id,
					durationMs: performance.now() - activationStartedAt,
					languageVersion: input.source.languageVersion,
					sourceBytes: sourceBytes(input.source),
					template: snapshot.data.metadata.template,
					diagnosticCodes: diagnostics.map(({ code }) => code),
					pageCount: activationPageCount,
					revision,
					success,
				});
			};

			try {
				if (snapshot.isLocked) throw new ORPCError("RESUME_LOCKED");

				const current = await stylesheetFromSnapshot(snapshot, dependencies.convertLegacy);
				let next = current;
				let didPreflight = false;

				if (input.transition === "edit_source") {
					const compiled = compile(snapshot, input.source);
					diagnostics = [...compiled.diagnostics];
					next = { ...current, source: input.source };

					if (compiled.program && current.mode === "semantic") {
						const preflight = await runPreflight(snapshot, input.source);
						didPreflight = true;
						diagnostics = preflight.ok
							? [...compiled.diagnostics, ...preflight.diagnostics]
							: [...compiled.diagnostics, ...preflight.diagnostics, preflightDiagnostic(preflight)];
						if (preflight.ok) next = { ...next, applied: input.source };
					}
				}

				if (input.transition === "activate") {
					const compiled = compile(snapshot, input.source);
					diagnostics = [...compiled.diagnostics];
					if (!compiled.program) {
						throw validationError("The stylesheet cannot be activated because it is invalid.", compiled.diagnostics);
					}

					const parity = await dependencies.parity({
						data: snapshot.data,
						stylesheet: input.source,
						resumeId: snapshot.id,
						revision: snapshot.stylesheetRevision,
					});
					if (parity.mismatches.length > 0) {
						throw new ORPCError("STYLESHEET_PARITY_FAILED", {
							status: 400,
							message: "The converted stylesheet does not preserve the legacy PDF presentation.",
							data: { mismatches: parity.mismatches },
						});
					}

					const preflight = await runPreflight(snapshot, input.source);
					didPreflight = true;
					activationPageCount = preflight.ok ? preflight.pageCount : null;
					if (!preflight.ok) {
						diagnostics = [...compiled.diagnostics, ...preflight.diagnostics, preflightDiagnostic(preflight)];
						throw validationError("The stylesheet failed PDF preflight.", diagnostics);
					}

					diagnostics = [...compiled.diagnostics, ...preflight.diagnostics];
					next = { mode: "semantic", source: input.source, applied: input.source };
				}

				if (input.transition === "deactivate") {
					next = { ...current, mode: "legacy" };
				}

				if (input.transition === "restore_history") {
					const compiled = compile(snapshot, input.restore.applied);
					if (!compiled.program) {
						throw validationError("The historical applied stylesheet is invalid.", compiled.diagnostics);
					}

					const preflight = await runPreflight(snapshot, input.restore.applied);
					didPreflight = true;
					if (!preflight.ok) {
						throw validationError("The historical applied stylesheet failed PDF preflight.", [
							...compiled.diagnostics,
							...preflight.diagnostics,
							preflightDiagnostic(preflight),
						]);
					}

					diagnostics = [...compiled.diagnostics, ...preflight.diagnostics];
					next = input.restore;
				}

				if (didPreflight) await dependencies.afterPreflight?.();

				const updated = await dependencies.transaction(async (transaction) => {
					const locked = await transaction.lock(input);
					if (locked.isLocked) throw new ORPCError("RESUME_LOCKED");
					if (!(await dependencies.compare(locked, input))) throw new StylesheetRevisionConflict(locked);
					const data = parseStoredResumeData({
						...locked.data,
						metadata: { ...locked.data.metadata, stylesheet: next },
					});
					return transaction.update({ snapshot: locked, data });
				});

				await dependencies.publish(updated);
				observeActivation(true, updated.stylesheetRevision);

				return {
					...(await stateFromSnapshot(updated, dependencies.convertLegacy)),
					editGeneration: input.editGeneration,
					diagnostics,
				};
			} catch (error) {
				if (error instanceof StylesheetRevisionConflict) {
					observeActivation(false, error.snapshot.stylesheetRevision);
					throw new ORPCError("STYLESHEET_REVISION_CONFLICT", {
						status: 409,
						message: error.message,
						data: {
							state: await stateFromSnapshot(error.snapshot, dependencies.convertLegacy),
						},
					});
				}

				observeActivation(false, snapshot.stylesheetRevision);
				throw error;
			}
		},
	};
}

type StylesheetDatabase = Pick<typeof db, "select" | "transaction">;

type DatabaseStylesheetServiceOptions = {
	database?: StylesheetDatabase;
	runner?: StylesheetPreflightRunner;
	afterPreflight?: () => Promise<void>;
	publish?: (snapshot: StylesheetSnapshot) => Promise<void>;
};

const snapshotSelection = {
	id: schema.resume.id,
	userId: schema.resume.userId,
	data: schema.resume.data,
	isLocked: schema.resume.isLocked,
	stylesheetRevision: schema.resume.stylesheetRevision,
	renderDataVersion: schema.resume.renderDataVersion,
	updatedAt: schema.resume.updatedAt,
};

export function createDatabaseStylesheetService(options: DatabaseStylesheetServiceOptions = {}) {
	const database = options.database ?? db;
	const runner = options.runner;
	const readSnapshot = async (input: { id: string; userId: string }) => {
		const [snapshot] = await database
			.select(snapshotSelection)
			.from(schema.resume)
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));
		if (!snapshot) throw new ORPCError("NOT_FOUND");
		return snapshot;
	};

	return createStylesheetService({
		readSnapshot,
		convertLegacy: convertLegacyStylesheet,
		compile: compileStylesheet,
		...(runner
			? {
					preflight: ({ data, stylesheet }: { data: ResumeData; stylesheet: StylesheetSource }) =>
						runner.run({
							data,
							template: data.metadata.template,
							stylesheet,
						}),
				}
			: {}),
		parity: checkLegacyStylesheetParity,
		transaction: (run) =>
			database.transaction((transaction) =>
				run({
					lock: async (input) => {
						const [snapshot] = await transaction
							.select(snapshotSelection)
							.from(schema.resume)
							.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)))
							.for("update");
						if (!snapshot) throw new ORPCError("NOT_FOUND");
						return snapshot;
					},
					update: async ({ snapshot, data }) => {
						const [updated] = await transaction
							.update(schema.resume)
							.set({
								data,
								stylesheetRevision: snapshot.stylesheetRevision + 1,
							})
							.where(and(eq(schema.resume.id, snapshot.id), eq(schema.resume.userId, snapshot.userId)))
							.returning(snapshotSelection);
						if (!updated) throw new ORPCError("NOT_FOUND");
						return updated;
					},
				}),
			),
		compare: (snapshot, input) =>
			snapshot.stylesheetRevision === input.expectedRevision &&
			snapshot.renderDataVersion === input.expectedRenderDataVersion,
		publish:
			options.publish ??
			(async (snapshot) => {
				try {
					await publishResumeUpdated({
						type: "resume.updated",
						resumeId: snapshot.id,
						userId: snapshot.userId,
						updatedAt: snapshot.updatedAt.toISOString(),
						mutation: "stylesheet",
					});
				} catch (error) {
					console.warn("Failed to publish resume.updated event:", error);
				}
			}),
		...(options.afterPreflight ? { afterPreflight: options.afterPreflight } : {}),
	});
}
