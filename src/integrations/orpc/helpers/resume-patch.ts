import { ORPCError } from "@orpc/client";
import isDeepEqual from "fast-deep-equal";
import z from "zod";
import { resumeDataSchema, sectionTypeSchema, type ResumeData, type SectionType } from "@/schema/resume/data";
import { generateId } from "@/utils/string";

const jsonPatchPathSchema = z.string().min(1);

export const jsonPatchOpSchema = z.discriminatedUnion("op", [
	z.object({ op: z.literal("add"), path: jsonPatchPathSchema, value: z.unknown() }),
	z.object({ op: z.literal("replace"), path: jsonPatchPathSchema, value: z.unknown() }),
	z.object({ op: z.literal("remove"), path: jsonPatchPathSchema }),
	z.object({ op: z.literal("test"), path: jsonPatchPathSchema, value: z.unknown() }),
]);

export const jsonPatchSchema = z.array(jsonPatchOpSchema);

export type JsonPatchOp = z.infer<typeof jsonPatchOpSchema>;

export type ResumePatchTarget = {
	name: string;
	slug: string;
	tags: string[];
	isPublic: boolean;
	data: ResumeData;
};

const patchTargetSchema = z.object({
	name: z.string(),
	slug: z.string(),
	tags: z.array(z.string()),
	isPublic: z.boolean(),
	data: resumeDataSchema,
});

const forbiddenPathSegments = new Set(["__proto__", "prototype", "constructor"]);
const topLevelPaths = new Set(["name", "slug", "tags", "isPublic"]);
const nonRemovableTopLevelPaths = new Set(["name", "slug", "tags", "isPublic"]);

const sectionsWithWebsite = new Set<SectionType>([
	"awards",
	"certifications",
	"education",
	"experience",
	"projects",
	"publications",
	"references",
	"volunteer",
	"profiles",
]);

const sectionsWithIcon = new Set<SectionType>(["profiles", "skills", "interests"]);

const allowedLayoutIds = new Set<string>(["summary", ...sectionTypeSchema.options]);

type ResolvedPatchOp = JsonPatchOp & { pathSegments: string[] };

export function applyResumePatch(input: { target: ResumePatchTarget; patch: JsonPatchOp[] }): ResumePatchTarget {
	const next = structuredClone(input.target);

	for (const op of input.patch) {
		const resolved = resolvePatchOp(op, next);
		const normalized = normalizeOpValue(resolved, next);
		applyPatchOperation(next, normalized);
	}

	normalizeLayout(next.data);

	const parsed = patchTargetSchema.safeParse(next);
	if (!parsed.success) {
		const issues = parsed.error.issues.map((issue) => ({
			path: toJsonPointer(issue.path),
			message: issue.message,
		}));
		throw new ORPCError("INVALID_PATCH", { status: 400, data: { issues } });
	}

	return parsed.data;
}

function resolvePatchOp(op: JsonPatchOp, target: ResumePatchTarget): ResolvedPatchOp {
	const pathSegments = parseJsonPointer(op.path);
	validatePatchPath(pathSegments, op);

	const resolved = resolveById(pathSegments, target.data);

	return { ...op, pathSegments: resolved };
}

function validatePatchPath(pathSegments: string[], op: JsonPatchOp) {
	if (pathSegments.length === 0) {
		throw new ORPCError("INVALID_PATCH_PATH", { status: 400, data: { path: op.path } });
	}

	if (pathSegments.some((segment) => forbiddenPathSegments.has(segment))) {
		throw new ORPCError("INVALID_PATCH_PATH", { status: 400, data: { path: op.path } });
	}

	if (pathSegments[0] === "data") return;

	if (topLevelPaths.has(pathSegments[0]) && pathSegments.length === 1) {
		if (op.op === "remove" && nonRemovableTopLevelPaths.has(pathSegments[0])) {
			throw new ORPCError("INVALID_PATCH_PATH", { status: 400, data: { path: op.path } });
		}
		return;
	}

	if (pathSegments[0] === "tags") {
		return;
	}

	throw new ORPCError("INVALID_PATCH_PATH", { status: 400, data: { path: op.path } });
}

function resolveById(pathSegments: string[], data: ResumeData): string[] {
	if (pathSegments[0] !== "data") return pathSegments;

	if (pathSegments[1] === "sections") {
		const sectionType = pathSegments[2];
		if (!sectionTypeSchema.safeParse(sectionType).success) {
			throw new ORPCError("INVALID_PATCH_PATH", { status: 400, data: { path: toJsonPointer(pathSegments) } });
		}

		if (pathSegments[3] === "items" && pathSegments.length >= 5) {
			const itemSegment = pathSegments[4];
			if (shouldResolveId(itemSegment)) {
				const items = data.sections[sectionType as SectionType]?.items ?? [];
				const index = items.findIndex((item) => item.id === itemSegment);
				if (index === -1) {
					throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: toJsonPointer(pathSegments) } });
				}
				pathSegments[4] = String(index);
			}
		}

		return pathSegments;
	}

	if (pathSegments[1] === "customSections" && pathSegments.length >= 3) {
		const customSectionSegment = pathSegments[2];
		if (shouldResolveId(customSectionSegment)) {
			const index = data.customSections.findIndex((section) => section.id === customSectionSegment);
			if (index === -1) {
				throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: toJsonPointer(pathSegments) } });
			}
			pathSegments[2] = String(index);
		}

		if (pathSegments[3] === "items" && pathSegments.length >= 5) {
			const sectionIndex = Number(pathSegments[2]);
			const section = data.customSections[sectionIndex];
			if (!section) {
				throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: toJsonPointer(pathSegments) } });
			}

			const itemSegment = pathSegments[4];
			if (shouldResolveId(itemSegment)) {
				const index = section.items.findIndex((item) => item.id === itemSegment);
				if (index === -1) {
					throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: toJsonPointer(pathSegments) } });
				}
				pathSegments[4] = String(index);
			}
		}
	}

	return pathSegments;
}

function normalizeOpValue(op: ResolvedPatchOp, target: ResumePatchTarget): ResolvedPatchOp {
	if (!("value" in op)) return op;

	if (isSectionItemsArrayPath(op.pathSegments)) {
		const sectionType = op.pathSegments[2] as SectionType;
		const nextValue = normalizeItemsArray(sectionType, op.value);
		return { ...op, value: nextValue };
	}

	if (isSectionItemPath(op.pathSegments)) {
		const sectionType = op.pathSegments[2] as SectionType;
		const nextValue = normalizeItem(sectionType, op.value);
		return { ...op, value: nextValue };
	}

	if (isCustomSectionsArrayPath(op.pathSegments)) {
		const nextValue = normalizeCustomSections(op.value);
		return { ...op, value: nextValue };
	}

	if (isCustomSectionPath(op.pathSegments)) {
		const nextValue = normalizeCustomSection(op.value);
		return { ...op, value: nextValue };
	}

	if (isCustomSectionItemsArrayPath(op.pathSegments)) {
		const sectionType = getCustomSectionType(target.data, op.pathSegments[2]);
		const nextValue = normalizeItemsArray(sectionType, op.value);
		return { ...op, value: nextValue };
	}

	if (isCustomSectionItemPath(op.pathSegments)) {
		const sectionType = getCustomSectionType(target.data, op.pathSegments[2]);
		const nextValue = normalizeItem(sectionType, op.value);
		return { ...op, value: nextValue };
	}

	return op;
}

function getCustomSectionType(data: ResumeData, indexSegment: string): SectionType {
	const index = Number(indexSegment);
	const section = data.customSections[index];
	if (!section) {
		throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: `/data/customSections/${indexSegment}` } });
	}
	return section.type;
}

function normalizeItemsArray(sectionType: SectionType, value: unknown) {
	if (!Array.isArray(value)) return value;
	return value.map((item) => normalizeItem(sectionType, item));
}

function normalizeItem(sectionType: SectionType, value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return value;

	const item = { ...(value as Record<string, unknown>) };
	if (item.id === undefined) item.id = generateId();
	if (item.hidden === undefined) item.hidden = false;

	if (sectionsWithWebsite.has(sectionType) && item.website === undefined) {
		item.website = { url: "", label: "" };
	}

	if (sectionsWithIcon.has(sectionType) && item.icon === undefined) {
		item.icon = "";
	}

	return item;
}

function normalizeCustomSections(value: unknown) {
	if (!Array.isArray(value)) return value;
	return value.map((section) => normalizeCustomSection(section));
}

function normalizeCustomSection(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return value;

	const section = { ...(value as Record<string, unknown>) };
	if (section.id === undefined) section.id = generateId();
	if (section.hidden === undefined) section.hidden = false;
	if (section.columns === undefined) section.columns = 1;
	if (section.title === undefined) section.title = "";
	if (section.items === undefined) section.items = [];

	if (Array.isArray(section.items) && typeof section.type === "string") {
		const type = section.type as SectionType;
		section.items = section.items.map((item) => normalizeItem(type, item));
	}

	return section;
}

function applyPatchOperation(target: ResumePatchTarget, op: ResolvedPatchOp) {
	const { parent, key } = getParentAndKey(target, op);

	switch (op.op) {
		case "add":
			if ("value" in op) {
				applyAdd(parent, key, op.value);
				return;
			}
			break;
		case "replace":
			if ("value" in op) {
				applyReplace(parent, key, op.value);
				return;
			}
			break;
		case "remove":
			applyRemove(parent, key);
			return;
		case "test":
			if ("value" in op) {
				applyTest(parent, key, op.value);
				return;
			}
			break;
	}

	throw new ORPCError("INVALID_PATCH", { status: 400, data: { op } });
}

function getParentAndKey(target: ResumePatchTarget, op: ResolvedPatchOp) {
	const segments = op.pathSegments;
	if (segments.length === 0) {
		throw new ORPCError("INVALID_PATCH_PATH", { status: 400, data: { path: op.path } });
	}

	let parent: unknown = target;
	for (let i = 0; i < segments.length - 1; i++) {
		const segment = segments[i];
		if (Array.isArray(parent)) {
			const index = toArrayIndex(segment);
			if (index === null || index >= parent.length) {
				throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: op.path } });
			}
			parent = parent[index];
		} else if (parent && typeof parent === "object") {
			if (!(segment in parent)) {
				throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: op.path } });
			}
			parent = (parent as Record<string, unknown>)[segment];
		} else {
			throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: op.path } });
		}
	}

	return { parent, key: segments.at(-1) as string };
}

function applyAdd(parent: unknown, key: string, value: unknown) {
	if (Array.isArray(parent)) {
		const index = key === "-" ? parent.length : toArrayIndex(key);
		if (index === null || index > parent.length) {
			throw new ORPCError("INVALID_PATCH_PATH", { status: 400, data: { path: key } });
		}
		parent.splice(index, 0, value);
		return;
	}

	if (!parent || typeof parent !== "object") {
		throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: key } });
	}

	(parent as Record<string, unknown>)[key] = value;
}

function applyReplace(parent: unknown, key: string, value: unknown) {
	if (Array.isArray(parent)) {
		const index = toArrayIndex(key);
		if (index === null || index >= parent.length) {
			throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: key } });
		}
		parent[index] = value;
		return;
	}

	if (!parent || typeof parent !== "object") {
		throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: key } });
	}

	if (!(key in parent)) {
		throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: key } });
	}

	(parent as Record<string, unknown>)[key] = value;
}

function applyRemove(parent: unknown, key: string) {
	if (Array.isArray(parent)) {
		const index = toArrayIndex(key);
		if (index === null || index >= parent.length) {
			throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: key } });
		}
		parent.splice(index, 1);
		return;
	}

	if (!parent || typeof parent !== "object") {
		throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: key } });
	}

	if (!(key in parent)) {
		throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: key } });
	}

	delete (parent as Record<string, unknown>)[key];
}

function applyTest(parent: unknown, key: string, value: unknown) {
	if (Array.isArray(parent)) {
		const index = toArrayIndex(key);
		if (index === null || index >= parent.length) {
			throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: key } });
		}
		if (!isDeepEqual(parent[index], value)) {
			throw new ORPCError("PATCH_CONFLICT", { status: 409, data: { path: key } });
		}
		return;
	}

	if (!parent || typeof parent !== "object") {
		throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: key } });
	}

	if (!(key in parent)) {
		throw new ORPCError("PATCH_TARGET_NOT_FOUND", { status: 404, data: { path: key } });
	}

	if (!isDeepEqual((parent as Record<string, unknown>)[key], value)) {
		throw new ORPCError("PATCH_CONFLICT", { status: 409, data: { path: key } });
	}
}

function normalizeLayout(data: ResumeData) {
	const pages = (data as Partial<ResumeData>).metadata?.layout?.pages;
	if (!pages) return;

	const customIds = new Set(data.customSections.map((section) => section.id));

	for (const page of pages) {
		page.main = page.main.filter((id) => allowedLayoutIds.has(id) || customIds.has(id));
		page.sidebar = page.sidebar.filter((id) => allowedLayoutIds.has(id) || customIds.has(id));
	}

	const referencedIds = new Set<string>();
	for (const page of pages) {
		for (const id of page.main) referencedIds.add(id);
		for (const id of page.sidebar) referencedIds.add(id);
	}

	const unreferencedCustomIds = data.customSections
		.map((section) => section.id)
		.filter((id) => !referencedIds.has(id));

	if (unreferencedCustomIds.length > 0) {
		const firstPage = pages[0];
		if (firstPage) {
			firstPage.main.push(...unreferencedCustomIds);
		}
	}
}

function parseJsonPointer(path: string): string[] {
	if (!path.startsWith("/")) {
		throw new ORPCError("INVALID_PATCH_PATH", { status: 400, data: { path } });
	}

	return path
		.slice(1)
		.split("/")
		.map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function toJsonPointer(path: Array<PropertyKey>): string {
	return `/${path
		.map(String)
		.map((segment) => segment.replaceAll("~", "~0").replaceAll("/", "~1"))
		.join("/")}`;
}

function shouldResolveId(segment: string): boolean {
	return segment !== "-" && !isArrayIndex(segment);
}

function isArrayIndex(segment: string): boolean {
	return /^\d+$/.test(segment);
}

function toArrayIndex(segment: string): number | null {
	if (!isArrayIndex(segment)) return null;
	const index = Number(segment);
	return Number.isInteger(index) ? index : null;
}

function isSectionItemsArrayPath(pathSegments: string[]) {
	return (
		pathSegments.length === 4 &&
		pathSegments[0] === "data" &&
		pathSegments[1] === "sections" &&
		pathSegments[3] === "items"
	);
}

function isSectionItemPath(pathSegments: string[]) {
	return (
		pathSegments.length === 5 &&
		pathSegments[0] === "data" &&
		pathSegments[1] === "sections" &&
		pathSegments[3] === "items"
	);
}

function isCustomSectionsArrayPath(pathSegments: string[]) {
	return pathSegments.length === 2 && pathSegments[0] === "data" && pathSegments[1] === "customSections";
}

function isCustomSectionPath(pathSegments: string[]) {
	return pathSegments.length === 3 && pathSegments[0] === "data" && pathSegments[1] === "customSections";
}

function isCustomSectionItemsArrayPath(pathSegments: string[]) {
	return (
		pathSegments.length === 4 &&
		pathSegments[0] === "data" &&
		pathSegments[1] === "customSections" &&
		pathSegments[3] === "items"
	);
}

function isCustomSectionItemPath(pathSegments: string[]) {
	return (
		pathSegments.length === 5 &&
		pathSegments[0] === "data" &&
		pathSegments[1] === "customSections" &&
		pathSegments[3] === "items"
	);
}
