import { slugify } from "@reactive-resume/utils/string";

const AI_DRAFT_SUFFIX = " - AI Draft";

export function buildAgentDraftResumeName(sourceName: string) {
	const normalized = sourceName.trim() || "Resume";
	if (normalized.endsWith(AI_DRAFT_SUFFIX)) return normalized;

	return `${normalized}${AI_DRAFT_SUFFIX}`;
}

export function buildUniqueAgentDraftSlug(sourceName: string, existingSlugs: Set<string>) {
	const base = slugify(buildAgentDraftResumeName(sourceName));
	if (!existingSlugs.has(base)) return base;

	let index = 2;
	let candidate = `${base}-${index}`;

	while (existingSlugs.has(candidate)) {
		index += 1;
		candidate = `${base}-${index}`;
	}

	return candidate;
}
