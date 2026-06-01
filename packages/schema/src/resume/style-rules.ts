import type { CustomSectionType, ResumeData, SectionType, StyleIntent, StyleSlot } from "./data";

export type SectionStyleRuleContext = {
	sectionId: string;
	sectionType?: CustomSectionType | undefined;
};

export type ResolveStyleRuleSlotOptions = {
	slot: StyleSlot;
	sectionId?: string | undefined;
	sectionType?: CustomSectionType | undefined;
};

const builtInSectionTypes = new Set<SectionType>([
	"profiles",
	"experience",
	"education",
	"projects",
	"skills",
	"languages",
	"interests",
	"awards",
	"certifications",
	"publications",
	"volunteer",
	"references",
]);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getSectionStyleRuleContext = (data: ResumeData, sectionId: string): SectionStyleRuleContext => {
	if (sectionId === "summary") return { sectionId, sectionType: "summary" };
	if (builtInSectionTypes.has(sectionId as SectionType)) {
		return { sectionId, sectionType: sectionId as SectionType };
	}

	const customSection = data.customSections.find((section) => section.id === sectionId);

	return { sectionId, sectionType: customSection?.type };
};

export const resolveStyleIntentForSlot = (data: ResumeData, options: ResolveStyleRuleSlotOptions): StyleIntent => {
	const matchingRules = (data.metadata.styleRules ?? []).filter((rule) => {
		if (!rule.enabled) return false;
		if (!rule.slots[options.slot]) return false;

		if (rule.target.scope === "global") return true;
		if (rule.target.scope === "sectionType") return rule.target.sectionType === options.sectionType;
		if (rule.target.scope === "sectionId") return rule.target.sectionId === options.sectionId;

		return false;
	});

	const specificity = { global: 0, sectionType: 1, sectionId: 2 } satisfies Record<
		"global" | "sectionType" | "sectionId",
		number
	>;

	const bySpecificity = [...matchingRules].sort((a, b) => {
		return specificity[a.target.scope] - specificity[b.target.scope];
	});

	return Object.assign({}, ...bySpecificity.map((rule) => rule.slots[options.slot]));
};

export const resolveStyleRuleFontSize = (
	data: ResumeData,
	options: ResolveStyleRuleSlotOptions,
): number | undefined => {
	const fontSize = resolveStyleIntentForSlot(data, options).fontSize;
	if (fontSize === undefined) return undefined;

	return clamp(fontSize, 6, 48);
};
