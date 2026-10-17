// The public resume as readable text, ported from apps/web/src/features/resume/public/{reflow.ts,resume-reflow.tsx}.
import type { IconName } from "@/ui";
import type { SemanticNode } from "@reactive-resume/resume/stylesheet/types";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { buildSemanticTree, shouldShowResumeHeader } from "@reactive-resume/pdf/semantic-tree";
import { contrastOnWhite, parseColorString } from "@reactive-resume/utils/color";

/** One section as the reflow shows it: its id and the ids of the entries the page prints. */
type ReflowSection = { sectionId: string; itemIds: string[] };

export type Entry = Record<string, unknown> & { id: string };

function collect(node: SemanticNode, into: ReflowSection[]) {
	if (node.kind === "section" && node.id) {
		const itemIds: string[] = [];
		const findItems = (child: SemanticNode) => {
			if (child.kind === "item" && child.id) itemIds.push(child.id);
			else for (const grandchild of child.children) findItems(grandchild);
		};
		for (const child of node.children) findItems(child);
		into.push({ sectionId: node.id, itemIds });
		return;
	}
	for (const child of node.children) collect(child, into);
}

/**
 * The sections and entries in the order the PDF prints them, page by page, with hidden and empty ones left out. The
 * semantic tree already applies the template's region order and the shared filtering.
 */
function reflowOrder(data: ResumeData): ReflowSection[] {
	const sections: ReflowSection[] = [];
	data.metadata.layout.pages.forEach((page, index) => {
		const tree = buildSemanticTree({
			data,
			template: data.metadata.template,
			page,
			pageNumber: index + 1,
			showHeader: shouldShowResumeHeader(data, index),
		});
		collect(tree, sections);
	});
	return sections;
}

function sectionOf(data: ResumeData, sectionId: string): { type: string; items: Entry[] } | null {
	if (sectionId === "summary") return { type: "summary", items: [{ id: "content", content: data.summary.content }] };
	if (sectionId in data.sections) {
		const section = data.sections[sectionId as keyof ResumeData["sections"]];
		return { type: sectionId, items: section.items as unknown as Entry[] };
	}
	const custom = data.customSections.find((section) => section.id === sectionId);
	return custom ? { type: custom.type, items: custom.items as unknown as Entry[] } : null;
}

/** Sections in print order, each with the entries it prints. */
export function reflowSections(data: ResumeData) {
	return reflowOrder(data).flatMap(({ sectionId, itemIds }) => {
		const section = sectionOf(data, sectionId);
		if (!section) return [];
		const entries = itemIds.length
			? itemIds.map((id) => section.items.find((item) => item.id === id)).filter((item): item is Entry => !!item)
			: section.items.filter((item) => !item.hidden);
		return entries.length ? [{ sectionId, type: section.type, entries }] : [];
	});
}

// What each kind of entry leads with, what follows it, and the date or place set beside it.
const SHAPES: Record<string, { title: string[]; subtitle: string[]; meta: string[] }> = {
	experience: { title: ["position", "company"], subtitle: ["company"], meta: ["period", "location"] },
	education: { title: ["school"], subtitle: ["degree", "area", "grade"], meta: ["period", "location"] },
	projects: { title: ["name"], subtitle: [], meta: ["period"] },
	skills: { title: ["name"], subtitle: ["proficiency"], meta: [] },
	languages: { title: ["language"], subtitle: ["fluency"], meta: [] },
	interests: { title: ["name"], subtitle: [], meta: [] },
	awards: { title: ["title"], subtitle: ["awarder"], meta: ["date"] },
	certifications: { title: ["title"], subtitle: ["issuer"], meta: ["date"] },
	publications: { title: ["title"], subtitle: ["publisher"], meta: ["date"] },
	volunteer: { title: ["organization"], subtitle: [], meta: ["period", "location"] },
	references: { title: ["name"], subtitle: ["position"], meta: [] },
	profiles: { title: ["network"], subtitle: ["username"], meta: [] },
	summary: { title: [], subtitle: [], meta: [] },
	"cover-letter": { title: [], subtitle: [], meta: [] },
};

const text = (entry: Entry, field: string) => (typeof entry[field] === "string" ? (entry[field] as string).trim() : "");

export const isWebLink = (url: string | undefined) => !!url && /^https?:/i.test(url);

/** An entry reduced to the lines the reflow shows. */
export function entryLines(type: string, entry: Entry) {
	const shape = SHAPES[type] ?? SHAPES.projects;
	const roles = Array.isArray(entry.roles) ? (entry.roles as Entry[]).filter((role) => text(role, "position")) : [];
	const repeatedPosition =
		type === "experience" && roles.some((role) => text(role, "position") === text(entry, "position"));
	const title =
		shape?.title
			.filter((field) => !repeatedPosition || field !== "position")
			.map((field) => text(entry, field))
			.find(Boolean) ?? "";
	const subtitle = [
		...(type === "experience" && text(entry, "position") ? ["company"] : []),
		...(shape?.subtitle.filter((field) => field !== "company") ?? []),
	]
		.map((field) => text(entry, field))
		.filter((value) => value && value !== title);
	const meta = shape?.meta.map((field) => text(entry, field)).filter(Boolean) ?? [];
	const website = entry.website as { url?: string; label?: string } | undefined;
	const url = typeof entry.url === "string" ? entry.url : website?.url;
	return {
		title,
		detail: [...subtitle, ...meta].join(" · "),
		link: isWebLink(url)
			? { url: url as string, label: website?.label || (url as string).replace(/^https?:\/\//, "") }
			: null,
		keywords: Array.isArray(entry.keywords) ? (entry.keywords as string[]).filter(Boolean).join(", ") : "",
		phone: type === "references" ? text(entry, "phone") : "",
		html: text(entry, "content") || text(entry, "description"),
		roles: roles.map((role) => ({
			id: role.id,
			position: text(role, "position"),
			period: text(role, "period"),
			html: text(role, "description"),
		})),
	};
}

export type ContactPill = { icon: IconName; label: string; href?: string };

export function contactPills(basics: ResumeData["basics"]): ContactPill[] {
	const pills: ContactPill[] = [];
	if (basics.email) pills.push({ icon: "envelope-simple", label: basics.email, href: `mailto:${basics.email}` });
	if (basics.phone) pills.push({ icon: "phone", label: basics.phone, href: `tel:${basics.phone.replace(/\s+/g, "")}` });
	if (isWebLink(basics.website.url))
		pills.push({
			icon: "globe",
			label: basics.website.label || basics.website.url.replace(/^https?:\/\//, ""),
			href: basics.website.url,
		});
	for (const field of basics.customFields)
		if (field.text)
			pills.push({
				icon: "link-simple-horizontal",
				label: field.text,
				...(/^(https?:|mailto:|tel:)/i.test(field.link) ? { href: field.link } : {}),
			});
	return pills;
}

/** The template's colour, darkened to 70% where it would be too faint to read on white; `fallback` if unreadable. */
export function readableAccent(primary: string, fallback: string) {
	if (contrastOnWhite(primary) >= 4.5) return primary;
	const color = parseColorString(primary);
	if (!color) return fallback;
	const mix = (channel: number) => Math.round((channel * color.a + 255 * (1 - color.a)) * 0.7);
	return `rgb(${mix(color.r)}, ${mix(color.g)}, ${mix(color.b)})`;
}
