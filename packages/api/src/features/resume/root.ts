import type { resumeService } from "./service";
import { ORPCError } from "@orpc/server";

type RootRequest = { requestHeaders: Headers; currentUserId?: string };
type RootDependencies = {
	config: { rootResumeId?: string | undefined; appUrl: string };
	findTarget(id: string): Promise<{ username: string; slug: string; isPublic: boolean } | null>;
	getBySlug: typeof resumeService.getBySlug;
};

const getDependencies = async (): Promise<RootDependencies> => {
	const [{ env }, { db }, schema, { eq }, { resumeService }] = await Promise.all([
		import("@reactive-resume/env/server"),
		import("@reactive-resume/db/client"),
		import("@reactive-resume/db/schema"),
		import("drizzle-orm"),
		import("./service"),
	]);
	return {
		config: { rootResumeId: env.ROOT_RESUME_ID, appUrl: env.APP_URL },
		findTarget: async (id) => {
			const [target] = await db
				.select({ username: schema.user.username, slug: schema.resume.slug, isPublic: schema.resume.isPublic })
				.from(schema.resume)
				.innerJoin(schema.user, eq(schema.resume.userId, schema.user.id))
				.where(eq(schema.resume.id, id));
			return target ?? null;
		},
		getBySlug: resumeService.getBySlug,
	};
};

/** Instance configuration is the sole authority; callers cannot choose a host or target. */
export async function getRootResume(input: RootRequest, dependencies?: RootDependencies) {
	const { config, findTarget, getBySlug } = dependencies ?? (await getDependencies());
	const id = config.rootResumeId?.trim();
	if (!id) return { status: "disabled" as const };

	const canonicalUrl = new URL("/", config.appUrl).href;
	const unavailable = { status: "unavailable" as const, canonicalUrl };
	const target = await findTarget(id);
	if (!target?.isPublic) return unavailable;

	try {
		const resume = await getBySlug({
			...input,
			username: target.username,
			slug: target.slug,
			requirePublic: true,
			expectedResumeId: id,
		});
		return { status: "public" as const, canonicalUrl, username: target.username, slug: target.slug, resume };
	} catch (error) {
		if (error instanceof ORPCError && error.code === "NOT_FOUND") return unavailable;
		throw error;
	}
}
