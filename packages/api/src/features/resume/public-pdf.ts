import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { ORPCError } from "@orpc/server";
import { env } from "@reactive-resume/env/server";
import { generateFilename } from "@reactive-resume/utils/file";
import { assertCanView, ownerIsNotBanned } from "./access-policy";
import { publicRenderRateLimiter } from "./public-render-rate-limit";
import { parseStoredResumeData } from "./resume-data-validation";

type PublicRenderResume = {
	id: string;
	userId: string;
	data: ResumeData;
	isPublic: boolean;
	passwordHash: string | null;
};

export type CreatePublicResumePdfInput = {
	username: string;
	slug: string;
	requestHeaders: Headers;
	trustedClient: string;
};

export type PublicResumePdfDependencies = {
	findResume(input: Pick<CreatePublicResumePdfInput, "username" | "slug">): Promise<PublicRenderResume | null>;
	hasPasswordAccess(requestHeaders: Headers, resumeId: string, passwordHash: string | null): boolean | Promise<boolean>;
	resolveCurrentUserId(requestHeaders: Headers): Promise<string | undefined>;
	rateLimiter: { consume(input: { trustedClient: string; resumeId: string }): void | Promise<void> };
	renderPdf(input: { data: ResumeData; filename: string }): Promise<File>;
};

const findResume = async ({ username, slug }: Pick<CreatePublicResumePdfInput, "username" | "slug">) => {
	const [{ db }, schema, { and, desc, eq, isNull, sql }, { matchesSlug }] = await Promise.all([
		import("@reactive-resume/db/client"),
		import("@reactive-resume/db/schema"),
		import("drizzle-orm"),
		import("./slugs"),
	]);
	const [resume] = await db
		.select({
			id: schema.resume.id,
			userId: schema.resume.userId,
			data: schema.resume.data,
			isPublic: schema.resume.isPublic,
			passwordHash: schema.resume.password,
		})
		.from(schema.resume)
		.innerJoin(schema.user, eq(schema.resume.userId, schema.user.id))
		.where(
			and(matchesSlug(slug), eq(schema.user.username, username), isNull(schema.resume.trashedAt), ownerIsNotBanned()),
		)
		.orderBy(desc(sql`${schema.resume.slug} = ${slug}`))
		.limit(1);
	return resume ?? null;
};

const defaultDependencies: PublicResumePdfDependencies = {
	findResume,
	hasPasswordAccess: async (requestHeaders, resumeId, passwordHash) =>
		(await import("./access")).hasResumeAccess(requestHeaders, resumeId, passwordHash),
	resolveCurrentUserId: async (requestHeaders) =>
		(await import("../../context"))
			.resolveAuthenticationFromRequestHeaders(requestHeaders)
			.then((authentication) => (authentication?.permissions.includes("read") ? authentication.user.id : undefined))
			// A cross-site session is refused (FORBIDDEN); fall back to the anonymous view, like /uploads.
			.catch(() => undefined),
	rateLimiter: publicRenderRateLimiter,
	renderPdf: async (input) =>
		(await import("@reactive-resume/pdf/server")).createResumePdfFile({ ...input, uploadOrigin: env.APP_URL }),
};

/**
 * Renders a PDF for a public resume identified by username and slug (current or unexpired redirect).
 * Enforces visibility, password access, and rate limiting before generating the file.
 */
export async function createPublicResumePdf(
	input: CreatePublicResumePdfInput,
	dependencies: Partial<PublicResumePdfDependencies> = {},
): Promise<{ body: File; filename: string }> {
	const deps = { ...defaultDependencies, ...dependencies };
	const resume = await deps.findResume(input);
	if (!resume) throw new ORPCError("NOT_FOUND");

	const currentUserId = await deps.resolveCurrentUserId(input.requestHeaders);
	assertCanView(resume, currentUserId ? { id: currentUserId } : null);
	if (resume.passwordHash && !(await deps.hasPasswordAccess(input.requestHeaders, resume.id, resume.passwordHash))) {
		throw new ORPCError("NEED_PASSWORD", {
			status: 401,
			data: { username: input.username, slug: input.slug },
		});
	}

	const data = parseStoredResumeData(resume.data);
	await deps.rateLimiter.consume({ trustedClient: input.trustedClient, resumeId: resume.id });
	const filename = generateFilename(data.basics.name || "Resume", "pdf");
	return { body: await deps.renderPdf({ data, filename }), filename };
}
