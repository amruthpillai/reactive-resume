import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { AtsRuleCode } from "./catalog";
import type { RuleContext } from "./rules";
import type { AtsFinding, AtsReport, AtsSeverity } from "./types";
import { ATS_RULE_CODES } from "./catalog";
import { ATS_RULES } from "./rules";
import { walkSections } from "./walk";

export type AtsLintOptions = {
	now?: Date;
};

const SEVERITY_ORDER: Readonly<Record<AtsSeverity, number>> = { error: 0, warning: 1, info: 2 };

function compareFindings(a: AtsFinding, b: AtsFinding): number {
	const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
	if (bySeverity !== 0) return bySeverity;
	if (a.pointer !== b.pointer) return a.pointer < b.pointer ? -1 : 1;
	if (a.code === b.code) return 0;
	return a.code < b.code ? -1 : 1;
}

export function lintResumeForAts(data: ResumeData, options: AtsLintOptions = {}): AtsReport {
	const context: RuleContext = {
		data,
		sections: walkSections(data),
		locale: data.metadata.page.locale.trim() || "en-US",
		now: options.now ?? new Date(),
	};

	const findings = ATS_RULES.flatMap((rule) => rule(context)).sort(compareFindings);

	const counts: Record<AtsSeverity, number> = { error: 0, warning: 0, info: 0 };
	const fired = new Set<AtsRuleCode>();

	for (const item of findings) {
		counts[item.severity] += 1;
		fired.add(item.code);
	}

	return {
		findings,
		counts,
		totalRules: ATS_RULE_CODES.length,
		passedRules: ATS_RULE_CODES.length - fired.size,
	};
}

export type { AtsRuleCode } from "./catalog";
export type { ParsedPeriod, PeriodEndpoint } from "./period";
export type { AtsFinding, AtsFindingParams, AtsReport, AtsSeverity } from "./types";
export type { SectionPlacement, WalkedItem, WalkedSection } from "./walk";
export { ATS_RULE_CATALOG_V1, ATS_RULE_CODES, atsRuleSeverity } from "./catalog";
export { isFutureEndpoint, isReversedPeriod, parsePeriod, parseSingleDate } from "./period";
export { escapePointerToken, isRenderedSection, walkSections } from "./walk";
