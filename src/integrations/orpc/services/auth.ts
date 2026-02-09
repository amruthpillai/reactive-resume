import { ORPCError } from "@orpc/client";
import { eq } from "drizzle-orm";
import type { AuthProvider } from "@/integrations/auth/types";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { env } from "@/utils/env";
import { getStorageService } from "./storage";

export type ProviderList = Partial<Record<AuthProvider, string>>;

const providers = {
	list: (): ProviderList => {
		const providers: ProviderList = { credential: "Password" };

		if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.google = "Google";
		if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) providers.github = "GitHub";
		if (env.OAUTH_CLIENT_ID && env.OAUTH_CLIENT_SECRET) providers.custom = env.OAUTH_PROVIDER_NAME ?? "Custom OAuth";

		return providers;
	},
};

export const authService = {
	providers,

	deleteAccount: async (input: { userId: string }): Promise<void> => {
		if (!input.userId || input.userId.length === 0) return;

		const storageService = getStorageService();

		// Delete all user files in one call (pictures, screenshots, pdfs)
		// The storage service delete method supports recursive deletion via prefix
		try {
			await storageService.delete(`uploads/${input.userId}`);
		} catch {
			// Ignore error and proceed with deleting user
		}

		try {
			await db.delete(schema.user).where(eq(schema.user.id, input.userId));
		} catch (err) {
			console.error(`Failed to delete user record for userId=${input.userId}:`, err);

			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	},
};
