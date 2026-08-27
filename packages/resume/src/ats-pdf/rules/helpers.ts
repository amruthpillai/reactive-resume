import type { PdfRuleCode } from "../catalog";
import type {
	PdfCheck,
	PdfCheckContext,
	PdfCheckOutcome,
	PdfEvidence,
	PdfFinding,
	PdfFindingParams,
	PdfSkipReason,
} from "../types";
import { pdfRuleCategory, pdfRuleSeverity } from "../catalog";
import { THRESHOLDS } from "./thresholds";

export const pass: PdfCheckOutcome = { status: "pass" };

export const skip = (reason: PdfSkipReason): PdfCheckOutcome => ({ status: "skip", reason });

function finding(code: PdfRuleCode, params?: PdfFindingParams, evidence?: PdfEvidence): PdfFinding {
	return {
		code,
		severity: pdfRuleSeverity(code),
		category: pdfRuleCategory(code),
		...(params ? { params } : {}),
		...(evidence ? { evidence } : {}),
	};
}

export const fail = (code: PdfRuleCode, params?: PdfFindingParams, evidence?: PdfEvidence): PdfCheckOutcome => ({
	status: "fail",
	findings: [finding(code, params, evidence)],
});

/** `condition ? fail : pass`, for the many checks that are exactly that. */
export const failIf = (
	condition: boolean,
	code: PdfRuleCode,
	params?: PdfFindingParams,
	evidence?: PdfEvidence,
): PdfCheckOutcome => (condition ? fail(code, params, evidence) : pass);

export function check(code: PdfRuleCode, run: (context: PdfCheckContext) => PdfCheckOutcome): PdfCheck {
	return { code, run };
}

/** True when there is too little text for any content-derived check to mean anything. */
export const hasNoText = (context: PdfCheckContext) => context.doc.charCount < THRESHOLDS.text.minCharacters;

/** Trims a snippet down to something a report row can show without wrapping three times. */
export function snippet(value: string, maxLength = 120): string {
	const collapsed = value.replace(/\s+/g, " ").trim();
	return collapsed.length <= maxLength ? collapsed : `${collapsed.slice(0, maxLength - 1)}…`;
}

export const roundRatio = (value: number) => Math.round(value * 100);
