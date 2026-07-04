import type { ProviderList } from "./service";
import { protectedProcedure, publicProcedure } from "../../context";
import { authService } from "./service";

export const authRouter = {
	providers: {
		list: publicProcedure
			.route({
				method: "GET",
				path: "/auth/providers",
				tags: ["Authentication"],
				operationId: "listAuthProviders",
				summary: "List authentication providers",
				description:
					"Returns a list of all authentication providers enabled on this Reactive Resume instance, along with their display names. Possible providers include password-based credentials, Google, GitHub, LinkedIn, and custom OAuth. No authentication required.",
				successDescription: "A map of enabled authentication provider identifiers to their display names.",
			})
			.handler((): ProviderList => {
				return authService.providers.list();
			}),
	},

	exportData: protectedProcedure
		.route({
			method: "GET",
			path: "/auth/account/export",
			tags: ["Authentication"],
			operationId: "exportAccountData",
			summary: "Export user account data",
			description:
				"Returns a JSON-serializable export of the authenticated user's data, including their public profile fields and all of their resumes. Secrets such as password hashes, tokens, and API keys are never included. Requires authentication.",
			successDescription: "The user's exported account data.",
		})
		.handler(async ({ context }) => {
			return await authService.exportData({ userId: context.user.id });
		}),

	deleteAccount: protectedProcedure
		.route({
			method: "DELETE",
			path: "/auth/account",
			tags: ["Authentication"],
			operationId: "deleteAccount",
			summary: "Delete user account",
			description:
				"Permanently deletes the authenticated user's account, including all resumes, uploaded files (profile pictures, screenshots, PDFs), and associated data. This action is irreversible. Requires authentication.",
			successDescription: "The user account and all associated data have been successfully deleted.",
		})
		.handler(async ({ context }): Promise<void> => {
			return await authService.deleteAccount({ userId: context.user.id });
		}),
};
