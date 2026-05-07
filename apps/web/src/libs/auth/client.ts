import type { auth } from "@reactive-resume/auth/config";
import { apiKeyClient } from "@better-auth/api-key/client";
import { dashClient } from "@better-auth/infra/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { passkeyClient } from "@better-auth/passkey/client";
import {
	adminClient,
	genericOAuthClient,
	inferAdditionalFields,
	twoFactorClient,
	usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const getAuthClient = () => {
	return createAuthClient({
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
						window.location.href = "/auth/verify-2fa";
					}
				},
			}),
			genericOAuthClient(),
			oauthProviderClient(),
			oauthProviderResourceClient(),
			inferAdditionalFields<typeof auth>(),
		],
	});
};

export const authClient = getAuthClient();
