import { defaultResumeData } from "@reactive-resume/schema/resume/default";

function makeEmptyItem(shape: Record<string, unknown>): Record<string, unknown> {
	const item: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(shape)) {
		if (typeof value === "string") item[key] = "";
		else if (typeof value === "number") item[key] = 0;
		else if (typeof value === "boolean") item[key] = false;
		else if (Array.isArray(value)) item[key] = [];
		else if (value !== null && typeof value === "object") {
			item[key] = makeEmptyItem(value as Record<string, unknown>);
		} else {
			item[key] = "";
		}
	}

	return item;
}

const SECTION_ITEM_SHAPES: Record<string, Record<string, unknown>> = {
	profiles: {
		id: "",
		hidden: false,
		icon: "",
		network: "",
		username: "",
		website: { url: "", label: "", inlineLink: false },
	},
	experience: {
		id: "",
		hidden: false,
		company: "",
		position: "",
		location: "",
		period: "",
		website: { url: "", label: "", inlineLink: false },
		description: "",
	},
	education: {
		id: "",
		hidden: false,
		school: "",
		degree: "",
		area: "",
		grade: "",
		location: "",
		period: "",
		website: { url: "", label: "", inlineLink: false },
		description: "",
	},
	projects: {
		id: "",
		hidden: false,
		name: "",
		period: "",
		website: { url: "", label: "", inlineLink: false },
		description: "",
	},
	skills: { id: "", hidden: false, icon: "", name: "", proficiency: "", level: 0, keywords: [] },
	languages: { id: "", hidden: false, language: "", fluency: "", level: 0 },
	interests: { id: "", hidden: false, icon: "", name: "", keywords: [] },
	awards: {
		id: "",
		hidden: false,
		title: "",
		awarder: "",
		date: "",
		website: { url: "", label: "", inlineLink: false },
		description: "",
	},
	certifications: {
		id: "",
		hidden: false,
		title: "",
		issuer: "",
		date: "",
		website: { url: "", label: "", inlineLink: false },
		description: "",
	},
	publications: {
		id: "",
		hidden: false,
		title: "",
		publisher: "",
		date: "",
		website: { url: "", label: "", inlineLink: false },
		description: "",
	},
	volunteer: {
		id: "",
		hidden: false,
		organization: "",
		location: "",
		period: "",
		website: { url: "", label: "", inlineLink: false },
		description: "",
	},
	references: {
		id: "",
		hidden: false,
		name: "",
		position: "",
		website: { url: "", label: "", inlineLink: false },
		phone: "",
		description: "",
	},
};

export function buildAiExtractionTemplate() {
	const sections: Record<string, unknown> = {};

	for (const [key, shape] of Object.entries(SECTION_ITEM_SHAPES)) {
		const sectionKey = key as keyof typeof defaultResumeData.sections;
		sections[key] = {
			...defaultResumeData.sections[sectionKey],
			items: [makeEmptyItem(shape)],
		};
	}

	return {
		...defaultResumeData,
		basics: {
			...defaultResumeData.basics,
			customFields: [{ id: "", icon: "", text: "", link: "" }],
		},
		sections: {
			...defaultResumeData.sections,
			...sections,
		},
	};
}
