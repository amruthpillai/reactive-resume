import type { auth } from "@reactive-resume/auth/config";
import { apiKeyClient } from "@better-auth/api-key/client";
import { dashClient } from "@better-auth/infra/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { passkeyClient } from "@better-auth/passkey/client";
import { adminClient, inferAdditionalFields, twoFactorClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { authSearchSchema } from "@/features/auth/redirect";

export const authClient = createAuthClient({
	plugins: [
		dashClient(),
		adminClient(),
		apiKeyClient(),
		passkeyClient(),
		usernameClient(),
		twoFactorClient({
			onTwoFactorRedirect() {
				// Redirect to 2FA verification page
				if (typeof window !== "undefined") {
					const { callbackURL, reauthenticate } = authSearchSchema.parse({
						reauthenticate: new URLSearchParams(window.location.search).get("reauthenticate") === "true",
						callbackURL: new URLSearchParams(window.location.search).get("callbackURL"),
					});
					const search = callbackURL
						? `?${new URLSearchParams({ callbackURL, ...(reauthenticate ? { reauthenticate: "true" } : {}) })}`
						: "";
					window.location.href = `/auth/verify-2fa${search}`;
				}
			},
		}),
		oauthProviderClient(),
		oauthProviderResourceClient(),
		inferAdditionalFields<typeof auth>(),
	],
});
