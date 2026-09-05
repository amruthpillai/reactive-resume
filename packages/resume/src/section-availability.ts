import type { ResumeData } from "@reactive-resume/schema/resume/data";

export type SectionLocation = {
	pageIndex: number;
	columnId: "main" | "sidebar";
};

export type SectionAvailability = {
	sectionId: string;
	hidden: boolean;
	locations: SectionLocation[];
};

function getSectionLocations(data: ResumeData, sectionId: string): SectionLocation[] {
	const locations: SectionLocation[] = [];

	for (const [pageIndex, page] of data.metadata.layout.pages.entries()) {
		for (const columnId of ["main", "sidebar"] as const) {
			for (const id of page[columnId]) {
				if (id === sectionId) locations.push({ pageIndex, columnId });
			}
		}
	}

	return locations;
}

export function getSectionAvailability(data: ResumeData): SectionAvailability[] {
	const sections = [
		{ sectionId: "summary", hidden: data.summary.hidden },
		...Object.entries(data.sections).map(([sectionId, section]) => ({ sectionId, hidden: section.hidden })),
		...data.customSections.map((section) => ({ sectionId: section.id, hidden: section.hidden })),
	];

	return sections.map((section) => ({
		...section,
		locations: getSectionLocations(data, section.sectionId),
	}));
}
