import type { RouterOutput } from "@/api/client";

export type DocumentSummary = RouterOutput["documents"]["list"][number];
export type DocumentTypeFilter = "all" | "resume" | "letter";
export type DocumentSort = "edited" | "name" | "created";
export const documentKey = (document: Pick<DocumentSummary, "type" | "id">) => `${document.type}:${document.id}`;
export const documentRef = ({ type, id }: DocumentSummary) => ({ type, id });

type DocumentFilters = {
	type: DocumentTypeFilter;
	q: string;
	tags: readonly string[];
	sort: DocumentSort;
	public?: boolean | undefined;
};

const byName = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

export function filterDocuments(documents: readonly DocumentSummary[], filters: DocumentFilters) {
	const query = filters.q.trim().toLocaleLowerCase();
	return documents
		.filter((document) => filters.type === "all" || document.type === filters.type)
		.filter((document) => filters.tags.every((tag) => document.tags.includes(tag)))
		.filter((document) => !filters.public || document.isPublic)
		.filter(
			(document) =>
				!query ||
				[document.name, ...document.tags, document.application?.company, document.application?.role].some((text) =>
					text?.toLocaleLowerCase().includes(query),
				),
		)
		.sort((a, b) => {
			if (filters.sort === "name") return byName.compare(a.name, b.name);
			if (filters.sort === "created") return b.createdAt.getTime() - a.createdAt.getTime();
			return b.updatedAt.getTime() - a.updatedAt.getTime();
		});
}

export const collectTags = (documents: readonly DocumentSummary[]) =>
	[...new Set(documents.flatMap((document) => document.tags))].sort(byName.compare);

export const sharedTags = (documents: readonly DocumentSummary[]) =>
	documents[0]?.tags.filter((tag) => documents.every((document) => document.tags.includes(tag))) ?? [];

/** Apply only the shared-tag delta; retain tags unique to each document. */
export function changedTags(document: DocumentSummary, shared: readonly string[], next: readonly string[]) {
	return [
		...document.tags.filter((tag) => !shared.includes(tag) || next.includes(tag)),
		...next.filter((tag) => !shared.includes(tag) && !document.tags.includes(tag)),
	];
}

export function daysLeftInTrash(trashedAt: Date, now = Date.now()) {
	return Math.max(0, Math.ceil((trashedAt.getTime() + 30 * 86_400_000 - now) / 86_400_000));
}
