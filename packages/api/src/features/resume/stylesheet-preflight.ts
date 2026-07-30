import type { StylesheetPreflightRunner } from "@reactive-resume/pdf/server";
import type { CompileStylesheetResult } from "@reactive-resume/resume/stylesheet";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SemanticStylesheet, StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { StylesheetSnapshot } from "./stylesheet-service";
import { ORPCError } from "@orpc/client";
import { compileStylesheet } from "@reactive-resume/resume/stylesheet";
import { EMPTY_RRSS_SOURCE } from "@reactive-resume/schema/resume/stylesheet";
import { templateSchema } from "@reactive-resume/schema/templates";
import { recordSemanticCssEvent } from "./stylesheet-observability";

type PrepareImportedResumeDataInput = {
	data: ResumeData;
	resumeId: string;
	revision: number;
	runner?: StylesheetPreflightRunner | undefined;
};

type ValidateHistoricalStylesheetInput = {
	data: ResumeData;
	resumeId: string;
	revision: number;
	stylesheet: SemanticStylesheet;
	runner?: StylesheetPreflightRunner | undefined;
};

const byteCount = (source: StylesheetSource): number => new TextEncoder().encode(source.text).byteLength;

const observeCompile = (
	input: Pick<PrepareImportedResumeDataInput, "data" | "resumeId" | "revision">,
	source: StylesheetSource,
): CompileStylesheetResult => {
	const startedAt = performance.now();
	try {
		const result = compileStylesheet(source);
		recordSemanticCssEvent({
			name: "semantic_css.compile",
			resumeId: input.resumeId,
			durationMs: performance.now() - startedAt,
			languageVersion: source.languageVersion,
			sourceBytes: byteCount(source),
			template: input.data.metadata.template,
			diagnosticCodes: result.diagnostics.map(({ code }) => code),
			pageCount: null,
			revision: input.revision,
			success: result.program !== null,
		});
		return result;
	} catch (error) {
		recordSemanticCssEvent({
			name: "semantic_css.compile",
			resumeId: input.resumeId,
			durationMs: performance.now() - startedAt,
			languageVersion: source.languageVersion,
			sourceBytes: byteCount(source),
			template: input.data.metadata.template,
			diagnosticCodes: [],
			pageCount: null,
			revision: input.revision,
			success: false,
		});
		throw error;
	}
};

const unavailableError = () =>
	new ORPCError("SEMANTIC_STYLESHEET_UNAVAILABLE", {
		status: 503,
		message: "Semantic stylesheet PDF preflight is unavailable.",
	});

const validationError = (message: string) =>
	new ORPCError("STYLESHEET_VALIDATION_FAILED", {
		status: 400,
		message,
	});

const runPreflight = async (
	input: Pick<PrepareImportedResumeDataInput, "data" | "resumeId" | "revision" | "runner">,
	stylesheet: StylesheetSource,
) => {
	const startedAt = performance.now();
	try {
		if (!input.runner) throw unavailableError();
		const result = await input.runner.run({
			data: input.data,
			template: input.data.metadata.template,
			stylesheet,
		});
		recordSemanticCssEvent({
			name: "semantic_css.preflight",
			resumeId: input.resumeId,
			durationMs: performance.now() - startedAt,
			languageVersion: stylesheet.languageVersion,
			sourceBytes: byteCount(stylesheet),
			template: input.data.metadata.template,
			diagnosticCodes: result.diagnostics.map(({ code }) => code),
			pageCount: result.ok ? result.pageCount : null,
			revision: input.revision,
			success: result.ok,
		});
		return result;
	} catch (error) {
		recordSemanticCssEvent({
			name: "semantic_css.preflight",
			resumeId: input.resumeId,
			durationMs: performance.now() - startedAt,
			languageVersion: stylesheet.languageVersion,
			sourceBytes: byteCount(stylesheet),
			template: input.data.metadata.template,
			diagnosticCodes: [],
			pageCount: null,
			revision: input.revision,
			success: false,
		});
		throw error;
	}
};

const validApplied = async (input: PrepareImportedResumeDataInput, stylesheet: StylesheetSource): Promise<boolean> => {
	const compiled = observeCompile(input, stylesheet);
	return compiled.program !== null && (await runPreflight(input, stylesheet)).ok;
};

export async function prepareImportedResumeData(input: PrepareImportedResumeDataInput): Promise<ResumeData> {
	const stylesheet = input.data.metadata.stylesheet;
	if (stylesheet?.mode !== "semantic") return input.data;

	let applied = stylesheet.source;
	if (!(await validApplied(input, stylesheet.source))) {
		applied = stylesheet.applied;
		if (!(await validApplied(input, stylesheet.applied))) {
			applied = { languageVersion: 1, text: EMPTY_RRSS_SOURCE };
			if (!(await validApplied(input, applied))) {
				throw validationError("The empty stylesheet failed PDF preflight.");
			}
		}
	}

	return {
		...input.data,
		metadata: {
			...input.data.metadata,
			stylesheet: { ...stylesheet, applied },
		},
	};
}

export async function validateHistoricalStylesheet(
	input: ValidateHistoricalStylesheetInput,
): Promise<SemanticStylesheet> {
	const compiled = observeCompile(input, input.stylesheet.applied);
	if (!compiled.program) throw validationError("The historical applied stylesheet is invalid.");
	if (!(await runPreflight(input, input.stylesheet.applied)).ok) {
		throw validationError("The historical applied stylesheet failed PDF preflight.");
	}
	return input.stylesheet;
}

export async function convertLegacyStylesheet(snapshot: StylesheetSnapshot): Promise<StylesheetSource> {
	const startedAt = performance.now();
	try {
		const { convertLegacyStyleRules } = await import("@reactive-resume/pdf/semantic");
		const source = convertLegacyStyleRules(snapshot.data).source;
		recordSemanticCssEvent({
			name: "semantic_css.convert_legacy",
			resumeId: snapshot.id,
			durationMs: performance.now() - startedAt,
			languageVersion: source.languageVersion,
			sourceBytes: byteCount(source),
			template: snapshot.data.metadata.template,
			diagnosticCodes: [],
			pageCount: null,
			revision: snapshot.stylesheetRevision,
			success: true,
		});
		return source;
	} catch (error) {
		recordSemanticCssEvent({
			name: "semantic_css.convert_legacy",
			resumeId: snapshot.id,
			durationMs: performance.now() - startedAt,
			languageVersion: 1,
			sourceBytes: 0,
			template: snapshot.data.metadata.template,
			diagnosticCodes: [],
			pageCount: null,
			revision: snapshot.stylesheetRevision,
			success: false,
		});
		throw error;
	}
}

export async function checkLegacyStylesheetParity(input: {
	data: ResumeData;
	stylesheet: StylesheetSource;
	resumeId: string;
	revision: number;
}): Promise<{ mismatches: readonly string[] }> {
	const startedAt = performance.now();
	try {
		const { compareLegacySemanticPresentation } = await import("@reactive-resume/pdf/semantic");
		const result = await compareLegacySemanticPresentation({
			data: input.data,
			convertedSource: input.stylesheet,
			templates: templateSchema.options,
		});
		recordSemanticCssEvent({
			name: "semantic_css.parity_check",
			resumeId: input.resumeId,
			durationMs: performance.now() - startedAt,
			languageVersion: input.stylesheet.languageVersion,
			sourceBytes: byteCount(input.stylesheet),
			template: input.data.metadata.template,
			diagnosticCodes: [],
			pageCount: null,
			revision: input.revision,
			success: result.mismatches.length === 0,
		});
		return result;
	} catch (error) {
		recordSemanticCssEvent({
			name: "semantic_css.parity_check",
			resumeId: input.resumeId,
			durationMs: performance.now() - startedAt,
			languageVersion: input.stylesheet.languageVersion,
			sourceBytes: byteCount(input.stylesheet),
			template: input.data.metadata.template,
			diagnosticCodes: [],
			pageCount: null,
			revision: input.revision,
			success: false,
		});
		throw error;
	}
}
