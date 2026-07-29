import type { PublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { ORPCError } from "@orpc/server";
import { createPublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import { assertCanView, isOwner } from "./access-policy";
import { publicRenderRateLimiter } from "./public-render-rate-limit";
import { assertStoredResumeData } from "./resume-data-validation";

type PublicRenderResume = {
	id: string;
	userId: string;
	name: string;
	slug: string;
	data: ResumeData;
	isPublic: boolean;
	passwordHash: string | null;
};

export type GetStyleProjectionInput = {
	username: string;
	slug: string;
	requestHeaders: Headers;
	trustedClient: string;
	currentUserId?: string;
};

export type PublicStyleProjectionDependencies = {
	findResume(input: Pick<GetStyleProjectionInput, "username" | "slug">): Promise<PublicRenderResume | null>;
	hasPasswordAccess(requestHeaders: Headers, resumeId: string, passwordHash: string | null): boolean | Promise<boolean>;
	rateLimiter: { consume(input: { trustedClient: string; resumeId: string }): void };
	createProjection(input: { data: ResumeData }): Promise<PublicStyleProjection>;
	cache: Map<string, PublicStyleProjection>;
};

export type AuthorizedPublicRenderResume = PublicRenderResume & {
	viewerIsOwner: boolean;
	hasPassword: boolean;
};

export type PublicRenderAccessDependencies = Pick<
	PublicStyleProjectionDependencies,
	"findResume" | "hasPasswordAccess"
>;

const findResume = async ({
	username,
	slug,
}: Pick<GetStyleProjectionInput, "username" | "slug">): Promise<PublicRenderResume | null> => {
	const [{ db }, schema, { and, eq }] = await Promise.all([
		import("@reactive-resume/db/client"),
		import("@reactive-resume/db/schema"),
		import("drizzle-orm"),
	]);
	const [resume] = await db
		.select({
			id: schema.resume.id,
			userId: schema.resume.userId,
			name: schema.resume.name,
			slug: schema.resume.slug,
			data: schema.resume.data,
			isPublic: schema.resume.isPublic,
			passwordHash: schema.resume.password,
		})
		.from(schema.resume)
		.innerJoin(schema.user, eq(schema.resume.userId, schema.user.id))
		.where(and(eq(schema.resume.slug, slug), eq(schema.user.username, username)));

	return resume ?? null;
};

export const defaultPublicRenderAccessDependencies: PublicRenderAccessDependencies = {
	findResume,
	hasPasswordAccess: async (requestHeaders, resumeId, passwordHash) =>
		(await import("./access")).hasResumeAccess(requestHeaders, resumeId, passwordHash),
};

const projectionCache = new Map<string, PublicStyleProjection>();
const MAX_PROJECTION_CACHE_ENTRIES = 128;

const defaultDependencies: PublicStyleProjectionDependencies = {
	...defaultPublicRenderAccessDependencies,
	rateLimiter: publicRenderRateLimiter,
	createProjection: createPublicStyleProjection,
	cache: projectionCache,
};

export async function loadAuthorizedPublicRenderResume(
	input: GetStyleProjectionInput,
	dependencies: PublicRenderAccessDependencies = defaultPublicRenderAccessDependencies,
): Promise<AuthorizedPublicRenderResume> {
	const resume = await dependencies.findResume(input);
	if (!resume) throw new ORPCError("NOT_FOUND");

	const viewer = input.currentUserId ? { id: input.currentUserId } : null;
	assertCanView(resume, viewer);
	if (
		resume.passwordHash &&
		!(await dependencies.hasPasswordAccess(input.requestHeaders, resume.id, resume.passwordHash))
	) {
		throw new ORPCError("NEED_PASSWORD", {
			status: 401,
			data: { username: input.username, slug: input.slug },
		});
	}
	assertStoredResumeData(resume.data);

	return {
		...resume,
		viewerIsOwner: isOwner(resume, viewer),
		hasPassword: resume.passwordHash !== null,
	};
}

export async function getStyleProjection(
	input: GetStyleProjectionInput,
	dependencies: PublicStyleProjectionDependencies = defaultDependencies,
): Promise<PublicStyleProjection> {
	const resume = await loadAuthorizedPublicRenderResume(input, dependencies);
	dependencies.rateLimiter.consume({ trustedClient: input.trustedClient, resumeId: resume.id });
	const candidate = await dependencies.createProjection({ data: resume.data });
	const cached = dependencies.cache.get(candidate.renderDataHash);
	if (cached) return cached;

	dependencies.cache.set(candidate.renderDataHash, candidate);
	if (dependencies.cache.size > MAX_PROJECTION_CACHE_ENTRIES) {
		dependencies.cache.delete(dependencies.cache.keys().next().value as string);
	}
	return candidate;
}
