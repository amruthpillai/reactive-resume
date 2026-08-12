import type { AtsRuleCode } from "./catalog";

export type AtsSeverity = "error" | "warning" | "info";

export type AtsFindingParams = Readonly<Record<string, string | number>>;

export type AtsFinding = {
	code: AtsRuleCode;
	severity: AtsSeverity;
	pointer: string;
	params?: AtsFindingParams;
};

export type AtsReport = {
	findings: readonly AtsFinding[];
	counts: Readonly<Record<AtsSeverity, number>>;
	totalRules: number;
	passedRules: number;
};
