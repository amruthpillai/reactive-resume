import { apiKeyClient } from "@better-auth/api-key/client";
import { dashClient } from "@better-auth/infra/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { genericOAuthClient, inferAdditionalFields, twoFactorClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "./config";

const getAuthClient = () => {
  return createAuthClient({
    plugins: [
      dashClient(),
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
      oauthProviderClient(),
      inferAdditionalFields<typeof auth>(),
    ],
  });
};

export const authClient = getAuthClient();
