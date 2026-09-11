import type { ResumeData } from "@reactive-resume/schema/resume/data";

export type ResumeSocialMeta = {
	name: string;
	title: string;
	description: string;
	template: string;
};

// Social cards truncate around this length; trimming here keeps the ellipsis on a word boundary
// instead of letting the crawler cut mid-word.
const DESCRIPTION_LIMIT = 160;

const truncate = (text: string) => {
	if (text.length <= DESCRIPTION_LIMIT) return text;

	const clipped = text.slice(0, DESCRIPTION_LIMIT);
	const lastSpace = clipped.lastIndexOf(" ");

	return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
};

/**
 * Derives the title/description/template used for OpenGraph and Twitter cards on a public resume.
 * Shared by the client route head and the server-side HTML injection so the two never drift.
 */
export const getResumeSocialMeta = (data: ResumeData, fallbackName = "Resume"): ResumeSocialMeta => {
	const name = data.basics.name || fallbackName;
	const summary = data.summary.content
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	return {
		name,
		title: data.basics.headline ? `${name} — ${data.basics.headline}` : name,
		description: truncate(summary || data.basics.headline || name),
		template: data.metadata.template,
	};
};
