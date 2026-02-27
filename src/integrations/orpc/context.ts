import { ORPCError, os } from "@orpc/server";
import type { User } from "better-auth";
import { eq } from "drizzle-orm";
import { env } from "@/utils/env";
import type { Locale } from "@/utils/locale";
import { auth } from "../auth/config";
import { db } from "../drizzle/client";
import { user } from "../drizzle/schema";

interface ORPCContext {
	locale: Locale;
	reqHeaders?: Headers;
}

async function getUserFromHeaders(headers: Headers): Promise<User | null> {
	try {
		const result = await auth.api.getSession({ headers });
		if (!result || !result.user) return null;

		return result.user;
	} catch {
		return null;
	}
}

async function getUserFromApiKey(apiKey: string): Promise<User | null> {
	try {
		const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
		if (!result.key || !result.valid) return null;

		const [userResult] = await db.select().from(user).where(eq(user.id, result.key.userId)).limit(1);
		if (!userResult) return null;

		return userResult;
	} catch {
		return null;
	}
}

const base = os.$context<ORPCContext>();

export const publicProcedure = base.use(async ({ context, next }) => {
	const headers = context.reqHeaders ?? new Headers();
	const apiKey = headers.get("x-api-key");

	const user = apiKey ? await getUserFromApiKey(apiKey) : await getUserFromHeaders(headers);

	return next({
		context: {
			...context,
			user: user ?? null,
		},
	});
});

export const protectedProcedure = publicProcedure.use(async ({ context, next }) => {
	if (!context.user) throw new ORPCError("UNAUTHORIZED");

	return next({
		context: {
			...context,
			user: context.user,
		},
	});
});

/**
 * Server-only procedure that can only be called from server-side code (e.g., loaders).
 * Rejects requests from the browser with a 401 UNAUTHORIZED error.
 */
export const serverOnlyProcedure = publicProcedure.use(async ({ context, next }) => {
	const headers = context.reqHeaders ?? new Headers();
	const isDebugBypassEnabled = env.FLAG_DEBUG_PRINTER && process.env.NODE_ENV === "development";

	// Check for the custom header that indicates this is a server-side call
	// Server-side calls using createRouterClient have this header set
	const isServerSideCall = isDebugBypassEnabled || headers.get("x-server-side-call") === "true";

	// If the header is not present, this is a client-side HTTP request - reject it
	if (!isServerSideCall) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "This endpoint can only be called from server-side code",
		});
	}

	return next({ context });
});
