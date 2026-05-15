import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { ORPCError } from "@orpc/client";

/**
 * Single source of truth for "who can view/edit a resume" and "what fields
 * leak to non-owners on the public view path."
 *
 * Owner-only mutation methods (update / patch / delete / setPassword / …)
 * intentionally do **not** call this module — their `WHERE userId = :owner`
 * clauses already enforce ownership at the query level. The policy here
 * documents that contract and gates the dual-role read path (`getBySlug`)
 * where a non-owner viewer can legitimately read a public resume.
 */

type Resume = {
	userId: string;
	isPublic: boolean;
};

type Viewer = { id: string } | null;

export function isOwner(resume: Resume, viewer: Viewer): boolean {
	return viewer !== null && viewer.id === resume.userId;
}

/**
 * Throws `NOT_FOUND` (not `FORBIDDEN`) when the viewer is not allowed to see
 * the resume — same response as a nonexistent resume so the API does not
 * disclose existence of private resumes by id/slug.
 */
export function assertCanView(resume: Resume, viewer: Viewer): void {
	if (isOwner(resume, viewer)) return;
	if (resume.isPublic) return;
	throw new ORPCError("NOT_FOUND");
}

/**
 * Redact owner-only fields before serializing a resume to a non-owner viewer.
 *
 * Stripped on public view:
 *   - `resume.name` — the dashboard title chosen by the owner (often
 *     contains personal context like "Senior Eng @ Foo — final draft").
 *   - `resume.data.metadata.notes` — explicitly documented as "only visible
 *     to the author when editing" in the resume schema.
 *
 * Everything else (including `data.basics.name`, the person's name on the
 * resume itself) is part of the public payload and is returned unchanged.
 *
 * Owner views pass through untouched.
 */
export function redactResumeForViewer<T extends { name: string; data: ResumeData }>(
	resume: T,
	viewerIsOwner: boolean,
): T {
	if (viewerIsOwner) return resume;

	return {
		...resume,
		name: "",
		data: {
			...resume.data,
			metadata: {
				...resume.data.metadata,
				notes: "",
			},
		},
	};
}

/**
 * Owner self-views/downloads do not count toward the public statistics —
 * the dashboard would otherwise inflate metrics every time the author
 * previewed their own resume. Call sites that increment `views` /
 * `downloads` should gate on this helper.
 */
export function shouldCountForStatistics(resume: Resume, viewer: Viewer): boolean {
	return !isOwner(resume, viewer);
}
