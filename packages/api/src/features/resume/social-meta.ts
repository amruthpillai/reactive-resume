import type { ResumeSocialMeta } from "@reactive-resume/resume/social-meta";
import { getResumeSocialMeta } from "@reactive-resume/resume/social-meta";
import { parseStoredResumeData } from "./resume-data-validation";

export type PublicResumeSocialMetaInput = { username: string; slug: string };

export type PublicResumeSocialMetaDependencies = {
	findResume(input: PublicResumeSocialMetaInput): Promise<{ name: string; data: unknown } | null>;
};

// Only public, password-free resumes are matched. Password-protected resumes must not leak their
// summary to an unauthenticated crawler, and this read deliberately skips the view counting and
// access gating in resumeService.getBySlug — a card render is not a visit.
const findResume = async ({ username, slug }: PublicResumeSocialMetaInput) => {
	const [{ db }, schema, { and, eq, isNull }] = await Promise.all([
		import("@reactive-resume/db/client"),
		import("@reactive-resume/db/schema"),
		import("drizzle-orm"),
	]);
	const [resume] = await db
		.select({ name: schema.resume.name, data: schema.resume.data })
		.from(schema.resume)
		.innerJoin(schema.user, eq(schema.resume.userId, schema.user.id))
		.where(
			and(
				eq(schema.resume.slug, slug),
				eq(schema.user.username, username),
				eq(schema.resume.isPublic, true),
				isNull(schema.resume.password),
			),
		);

	return resume ?? null;
};

const defaultDependencies: PublicResumeSocialMetaDependencies = { findResume };

export async function getPublicResumeSocialMeta(
	input: PublicResumeSocialMetaInput,
	dependencies: PublicResumeSocialMetaDependencies = defaultDependencies,
): Promise<ResumeSocialMeta | null> {
	const resume = await dependencies.findResume(input);
	if (!resume) return null;

	return getResumeSocialMeta(parseStoredResumeData(resume.data), resume.name);
}
