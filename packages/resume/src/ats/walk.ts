import type { CustomSectionType, ResumeData, SectionType } from "@reactive-resume/schema/resume/data";

export type SectionPlacement = "main" | "sidebar" | "none";

export type WalkedItem = {
	pointer: string;
	value: Readonly<Record<string, unknown>>;
};

export type WalkedSection = {
	id: string;
	type: CustomSectionType;
	title: string;
	columns: number;
	hidden: boolean;
	placement: SectionPlacement;
	pointer: string;
	items: readonly WalkedItem[];
};

export const escapePointerToken = (token: string) => token.replace(/~/g, "~0").replace(/\//g, "~1");

export const isRenderedSection = (section: WalkedSection) => !section.hidden && section.placement !== "none";

function buildPlacement(data: ResumeData): ReadonlyMap<string, SectionPlacement> {
	const placement = new Map<string, SectionPlacement>();

	for (const page of data.metadata.layout.pages) {
		for (const id of page.main) {
			if (!placement.has(id)) placement.set(id, "main");
		}

		const sidebarPlacement: SectionPlacement = page.fullWidth ? "main" : "sidebar";
		for (const id of page.sidebar) {
			if (!placement.has(id)) placement.set(id, sidebarPlacement);
		}
	}

	return placement;
}

function visibleItems(items: readonly unknown[], sectionPointer: string): WalkedItem[] {
	const walked: WalkedItem[] = [];

	items.forEach((item, index) => {
		const value = item as Record<string, unknown>;
		if (value.hidden === true) return;
		walked.push({ pointer: `${sectionPointer}/items/${index}`, value });
	});

	return walked;
}

export function walkSections(data: ResumeData): readonly WalkedSection[] {
	const placement = buildPlacement(data);
	const sections: WalkedSection[] = [];

	const summaryPointer = "/summary";
	sections.push({
		id: "summary",
		type: "summary",
		title: data.summary.title,
		columns: data.summary.columns,
		hidden: data.summary.hidden,
		placement: placement.get("summary") ?? "none",
		pointer: summaryPointer,
		items: data.summary.content.trim()
			? [{ pointer: `${summaryPointer}/content`, value: { content: data.summary.content } }]
			: [],
	});

	for (const [key, section] of Object.entries(data.sections) as [SectionType, ResumeData["sections"][SectionType]][]) {
		const pointer = `/sections/${escapePointerToken(key)}`;
		sections.push({
			id: key,
			type: key,
			title: section.title,
			columns: section.columns,
			hidden: section.hidden,
			placement: placement.get(key) ?? "none",
			pointer,
			items: visibleItems(section.items, pointer),
		});
	}

	data.customSections.forEach((section, index) => {
		const pointer = `/customSections/${index}`;
		sections.push({
			id: section.id,
			type: section.type,
			title: section.title,
			columns: section.columns,
			hidden: section.hidden,
			placement: placement.get(section.id) ?? "none",
			pointer,
			items: visibleItems(section.items, pointer),
		});
	});

	return sections;
}
