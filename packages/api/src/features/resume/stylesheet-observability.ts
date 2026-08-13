import type { Template } from "@reactive-resume/schema/templates";
import { createHash } from "node:crypto";

type SemanticCssEventName =
	| "semantic_css.compile"
	| "semantic_css.preflight"
	| "semantic_css.convert_legacy"
	| "semantic_css.activate";

export type SemanticCssEventInput = {
	name: SemanticCssEventName;
	resumeId: string;
	durationMs: number;
	languageVersion: number;
	sourceBytes: number;
	template: Template;
	diagnosticCodes: readonly string[];
	pageCount: number | null;
	revision: number;
	success: boolean;
};

export const hashSemanticCssResumeId = (resumeId: string): string =>
	createHash("sha256").update(`reactive-resume:semantic-css:resume:${resumeId}`).digest("hex");

const safeDiagnosticCode = (code: string): string =>
	/^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? code : "UNKNOWN_DIAGNOSTIC";

export function recordSemanticCssEvent(
	event: SemanticCssEventInput,
	logger: (event: Readonly<Record<string, unknown>>) => void = console.info,
): void {
	logger({
		name: event.name,
		resumeIdHash: hashSemanticCssResumeId(event.resumeId),
		durationMs: event.durationMs,
		languageVersion: event.languageVersion,
		sourceBytes: event.sourceBytes,
		template: event.template,
		diagnosticCodes: event.diagnosticCodes.map(safeDiagnosticCode),
		pageCount: event.pageCount,
		revision: event.revision,
		success: event.success,
	});
}
