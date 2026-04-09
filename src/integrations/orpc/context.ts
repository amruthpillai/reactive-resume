import type { User } from "better-auth";

import { ORPCError, os } from "@orpc/server";
import { eq } from "drizzle-orm";

import type { Locale } from "@/utils/locale";

import { env } from "@/utils/env";

import { auth, verifyOAuthToken } from "../auth/config";
import { db } from "../drizzle/client";
import { user } from "../drizzle/schema";

interface ORPCContext {
  locale: Locale;
  reqHeaders?: Headers;
}

async function getUserFromBearerToken(headers: Headers): Promise<User | null> {
  try {
    const authHeader = headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const payload = await verifyOAuthToken(authHeader.slice(7));
    if (!payload?.sub) return null;

    const [userResult] = await db.select().from(user).where(eq(user.id, payload.sub)).limit(1);
    return userResult ?? null;
  } catch (error) {
    console.warn("Bearer token verification failed:", error);
    return null;
  }
}

async function getUserFromHeaders(headers: Headers): Promise<User | null> {
  try {
    const result = await auth.api.getSession({ headers });
    if (!result || !result.user) return null;

    return result.user;
  } catch (error) {
    console.warn("Session verification failed:", error);
    return null;
  }
}

async function getUserFromApiKey(apiKey: string): Promise<User | null> {
  try {
    const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
    if (!result.key || !result.valid) return null;

    const [userResult] = await db.select().from(user).where(eq(user.id, result.key.referenceId)).limit(1);
    if (!userResult) return null;

    return userResult;
  } catch (error) {
    console.warn("API key verification failed:", error);
    return null;
  }
}

/**
 * Resolve the authenticated user from the same headers oRPC uses (`x-api-key`, `Authorization: Bearer`, or session cookies).
 * For callers outside oRPC handlers (e.g. MCP tools) where `context.user` is not in scope.
 */
export async function resolveUserFromRequestHeaders(headers: Headers): Promise<User | null> {
  // Try API key authentication first
  const apiKey = headers.get("x-api-key");
  if (apiKey) {
    const user = await getUserFromApiKey(apiKey);
    if (user) return user;
  } else {
    // Fall back to Bearer token authentication
    const user = await getUserFromBearerToken(headers);
    if (user) return user;
  }

  // Finally, try session authentication (cookies)
  const user = await getUserFromHeaders(headers);
  return user ?? null;
}

const base = os.$context<ORPCContext>();

export const publicProcedure = base.use(async ({ context, next }) => {
  const headers = context.reqHeaders ?? new Headers();
  const apiKey = headers.get("x-api-key");

  const user = apiKey
    ? await getUserFromApiKey(apiKey)
    : ((await getUserFromBearerToken(headers)) ?? (await getUserFromHeaders(headers)));

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
