import type { User } from "better-auth";
import { eq } from "drizzle-orm";
import { auth } from "@/integrations/auth/config";
import { db } from "@/integrations/drizzle/client";
import { user } from "@/integrations/drizzle/schema";

export async function getUserFromHeaders(headers: Headers): Promise<User | null> {
	try {
		const result = await auth.api.getSession({ headers });
		if (!result || !result.user) return null;
		return result.user;
	} catch {
		return null;
	}
}

export async function getUserFromApiKey(apiKey: string): Promise<User | null> {
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

export async function resolveUserFromHeaders(headers: Headers): Promise<User | null> {
	const apiKey = headers.get("x-api-key");
	return apiKey ? await getUserFromApiKey(apiKey) : await getUserFromHeaders(headers);
}
