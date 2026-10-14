import type { OdtBlock } from "./types";
import type { CustomSection, CustomSectionType, ResumeData, SectionType } from "@reactive-resume/schema/resume/data";
import { htmlToOdtBlocks, toSafeLink } from "./html-to-odt";
import { entryHeading, linkParagraph, paragraph, sectionHeading, text } from "./types";

type Sections = ResumeData["sections"];

/** A section heading, skipped when the section hides its title. */
function headingBlocks(section: { showHeading?: boolean | undefined }, title: string): OdtBlock[] {
	return section.showHeading !== false && title ? [sectionHeading(title)] : [];
}

/** An italic muted line combining location and period, when either is present. */
function locationAndPeriod(location: string, period: string): OdtBlock | null {
	const parts = [location, period].filter(Boolean);
	if (parts.length === 0) return null;
	return paragraph([text(parts.join(" | "))], "meta");
}

/** A website link block, or null when the URL fails the safe-link check. */
function websiteBlock(url: string, label: string): OdtBlock | null {
	const href = toSafeLink(url);
	if (!href) return null;
	return linkParagraph(href, label || href);
}

/** Rich-text content is stored as HTML, so each field is converted to its own block sequence. */
function descriptionBlocks(html: string): OdtBlock[] {
	return htmlToOdtBlocks(html);
}

/** Renders the summary section as its heading plus its rich-text blocks. */
export function renderSummary(summary: ResumeData["summary"]): OdtBlock[] {
	if (summary.hidden || !summary.content) return [];
	return [...headingBlocks(summary, summary.title), ...descriptionBlocks(summary.content)];
}

/** Renders work experience, including entries that list several roles. */
function renderExperience(section: Sections["experience"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		const roles = item.roles.filter((role) => role.position.trim());

		if (roles.length > 0) {
			blocks.push(entryHeading(item.company, undefined, item.period));

			const location = locationAndPeriod(item.location, "");
			if (location) blocks.push(location);

			for (const role of roles) {
				blocks.push(entryHeading(role.position, role.period));
				if (role.description) blocks.push(...descriptionBlocks(role.description));
			}
		} else {
			blocks.push(entryHeading(item.company, item.position, item.period));

			const location = locationAndPeriod(item.location, "");
			if (location) blocks.push(location);
		}

		if (item.description) blocks.push(...descriptionBlocks(item.description));

		const website = websiteBlock(item.website.url, item.website.label);
		if (website) blocks.push(website);
	}

	return blocks;
}

/** Renders education entries with degree, area, grade and location. */
function renderEducation(section: Sections["education"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		const degreeArea = [item.degree, item.area].filter(Boolean).join(", ");
		blocks.push(entryHeading(item.school, degreeArea, item.period));

		if (item.grade) blocks.push(paragraph([text(`Grade: ${item.grade}`)], "meta"));

		const location = locationAndPeriod(item.location, "");
		if (location) blocks.push(location);

		if (item.description) blocks.push(...descriptionBlocks(item.description));

		const website = websiteBlock(item.website.url, item.website.label);
		if (website) blocks.push(website);
	}

	return blocks;
}

/** Renders project entries with their descriptions and links. */
function renderProjects(section: Sections["projects"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		blocks.push(entryHeading(item.name, undefined, item.period));

		if (item.description) blocks.push(...descriptionBlocks(item.description));

		const website = websiteBlock(item.website.url, item.website.label);
		if (website) blocks.push(website);
	}

	return blocks;
}

/** Renders skills, either inline with keywords or as a bulleted keyword list. */
function renderSkills(section: Sections["skills"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		const children = [text(item.name, { bold: true })];

		if (item.proficiency) children.push(text(` — ${item.proficiency}`));

		if (section.keywordLayout !== "list" && item.keywords.length > 0) {
			children.push(text(`: ${item.keywords.join(", ")}`));
		}

		blocks.push(paragraph(children));

		if (section.keywordLayout === "list") {
			blocks.push({
				type: "list",
				ordered: false,
				items: item.keywords.map((keyword) => ({ blocks: [paragraph([text(keyword)])] })),
			});
		}
	}

	return blocks;
}

/** Renders language entries with their fluency. */
function renderLanguages(section: Sections["languages"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		const children = [text(item.language, { bold: true })];
		if (item.fluency) children.push(text(` — ${item.fluency}`));
		blocks.push(paragraph(children));
	}

	return blocks;
}

/** Renders interest entries with their keywords. */
function renderInterests(section: Sections["interests"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		const children = [text(item.name, { bold: true })];
		if (item.keywords.length > 0) children.push(text(`: ${item.keywords.join(", ")}`));
		blocks.push(paragraph(children));
	}

	return blocks;
}

/** Renders award entries with their awarder and date. */
function renderAwards(section: Sections["awards"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		blocks.push(entryHeading(item.title, item.awarder, item.date, false));

		if (item.description) blocks.push(...descriptionBlocks(item.description));

		const website = websiteBlock(item.website.url, item.website.label);
		if (website) blocks.push(website);
	}

	return blocks;
}

/** Renders certification entries with their issuer and date. */
function renderCertifications(section: Sections["certifications"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		blocks.push(entryHeading(item.title, item.issuer, item.date));

		if (item.description) blocks.push(...descriptionBlocks(item.description));

		const website = websiteBlock(item.website.url, item.website.label);
		if (website) blocks.push(website);
	}

	return blocks;
}

/** Renders publication entries with their publisher and date. */
function renderPublications(section: Sections["publications"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		blocks.push(entryHeading(item.title, item.publisher, item.date));

		if (item.description) blocks.push(...descriptionBlocks(item.description));

		const website = websiteBlock(item.website.url, item.website.label);
		if (website) blocks.push(website);
	}

	return blocks;
}

/** Renders volunteer entries with their organization and period. */
function renderVolunteer(section: Sections["volunteer"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		blocks.push(entryHeading(item.organization, undefined, item.period));

		const location = locationAndPeriod(item.location, "");
		if (location) blocks.push(location);

		if (item.description) blocks.push(...descriptionBlocks(item.description));

		const website = websiteBlock(item.website.url, item.website.label);
		if (website) blocks.push(website);
	}

	return blocks;
}

/** Renders reference entries with their position and phone. */
function renderReferences(section: Sections["references"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		const children = [text(item.name, { bold: true })];
		if (item.position) children.push(text(` — ${item.position}`));
		blocks.push(paragraph(children));

		if (item.phone) blocks.push(paragraph([text(item.phone)]));

		if (item.description) blocks.push(...descriptionBlocks(item.description));

		const website = websiteBlock(item.website.url, item.website.label);
		if (website) blocks.push(website);
	}

	return blocks;
}

/** Renders social profile entries with their network and username. */
function renderProfiles(section: Sections["profiles"]): OdtBlock[] {
	const items = section.items.filter((item) => !item.hidden);
	if (section.hidden || items.length === 0) return [];

	const blocks = headingBlocks(section, section.title);

	for (const item of items) {
		const children = [text(item.network, { bold: true })];
		if (item.username) children.push(text(` — ${item.username}`));
		blocks.push(paragraph(children));

		const website = websiteBlock(item.website.url, item.website.label);
		if (website) blocks.push(website);
	}

	return blocks;
}

/** Built-in section type to renderer, mirroring the DOCX/PDF export order. */
const sectionRenderers: Record<SectionType, (section: Sections[SectionType]) => OdtBlock[]> = {
	experience: renderExperience as (section: Sections[SectionType]) => OdtBlock[],
	education: renderEducation as (section: Sections[SectionType]) => OdtBlock[],
	projects: renderProjects as (section: Sections[SectionType]) => OdtBlock[],
	skills: renderSkills as (section: Sections[SectionType]) => OdtBlock[],
	languages: renderLanguages as (section: Sections[SectionType]) => OdtBlock[],
	interests: renderInterests as (section: Sections[SectionType]) => OdtBlock[],
	awards: renderAwards as (section: Sections[SectionType]) => OdtBlock[],
	certifications: renderCertifications as (section: Sections[SectionType]) => OdtBlock[],
	publications: renderPublications as (section: Sections[SectionType]) => OdtBlock[],
	volunteer: renderVolunteer as (section: Sections[SectionType]) => OdtBlock[],
	references: renderReferences as (section: Sections[SectionType]) => OdtBlock[],
	profiles: renderProfiles as (section: Sections[SectionType]) => OdtBlock[],
};

/** Dispatches a built-in section to its renderer, or an empty list when unknown. */
export function renderBuiltInSection(type: SectionType, section: Sections[SectionType]): OdtBlock[] {
	const renderer = sectionRenderers[type];
	return renderer ? renderer(section) : [];
}

/** Custom sections reuse the built-in renderers, or print their own HTML for summary/cover-letter types. */
export function renderCustomSection(section: CustomSection): OdtBlock[] {
	if (section.hidden) return [];

	const items = section.items.filter((item) => !item.hidden);
	if (items.length === 0) return [];

	const type = section.type as CustomSectionType;

	if (type === "summary") {
		const blocks: OdtBlock[] = [];
		for (const item of items) if ("content" in item && item.content) blocks.push(...descriptionBlocks(item.content));
		return blocks.length > 0 ? [...headingBlocks(section, section.title), ...blocks] : [];
	}

	if (type === "cover-letter") {
		const blocks: OdtBlock[] = [];
		for (const item of items) {
			if ("recipient" in item && item.recipient) blocks.push(...descriptionBlocks(item.recipient));
			if ("content" in item && item.content) blocks.push(...descriptionBlocks(item.content));
		}
		return blocks;
	}

	const renderer = sectionRenderers[type as SectionType];
	if (!renderer) return [];

	const synthetic = {
		...(section.type === "skills" ? { keywordLayout: section.keywordLayout } : {}),
		title: section.title,
		columns: section.columns,
		hidden: false,
		showHeading: section.showHeading,
		items,
	} as Sections[SectionType];

	return renderer(synthetic);
}
