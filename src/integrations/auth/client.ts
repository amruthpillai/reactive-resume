import {
	apiKeyClient,
	genericOAuthClient,
	inferAdditionalFields,
	twoFactorClient,
	usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./config";

const getAuthClient = () => {
	return createAuthClient({
		plugins: [
			apiKeyClient(),
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
			inferAdditionalFields<typeof auth>(),
		],
	});
};

export const authClient = getAuthClient();
