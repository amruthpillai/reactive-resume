import crypto from "node:crypto";

import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { auth, authBaseUrl } from "@/integrations/auth/config";
import { db } from "@/integrations/drizzle/client";
import { oauthClient, verification } from "@/integrations/drizzle/schema";
import { generateId } from "@/utils/string";

function generateCode() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("base64url");
}

export const Route = createFileRoute("/auth/oauth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        const url = new URL(request.url);

        if (session?.user) {
          const clientId = url.searchParams.get("client_id");
          const redirectUri = url.searchParams.get("redirect_uri");
          const state = url.searchParams.get("state");
          const scope = url.searchParams.get("scope");
          const codeChallenge = url.searchParams.get("code_challenge");
          const codeChallengeMethod = url.searchParams.get("code_challenge_method");

          if (!clientId || !redirectUri) {
            return Response.json({ error: "missing client_id or redirect_uri" }, { status: 400 });
          }

          const [client] = await db
            .select()
            .from(oauthClient)
            .where(eq(oauthClient.clientId, clientId))
            .limit(1);

          if (!client) {
            return Response.json({ error: "invalid client" }, { status: 400 });
          }

          if (!client.redirectUris.includes(redirectUri)) {
            return Response.json({ error: "invalid redirect_uri" }, { status: 400 });
          }

          const code = generateCode();
          const hashedCode = hashCode(code);
          const now = new Date();
          const expiresAt = new Date(now.getTime() + 600_000); // 10 min

          await db.insert(verification).values({
            id: generateId(),
            identifier: hashedCode,
            value: JSON.stringify({
              type: "authorization_code",
              query: {
                response_type: "code",
                client_id: clientId,
                redirect_uri: redirectUri,
                scope,
                state,
                code_challenge: codeChallenge,
                code_challenge_method: codeChallengeMethod,
              },
              userId: session.user.id,
              sessionId: session.session.id,
              authTime: new Date(session.session.createdAt).getTime(),
            }),
            expiresAt,
            createdAt: now,
            updatedAt: now,
          });

          const callbackUrl = new URL(redirectUri);
          callbackUrl.searchParams.set("code", code);
          if (state) callbackUrl.searchParams.set("state", state);
          callbackUrl.searchParams.set("iss", `${authBaseUrl}/api/auth`);

          return new Response(null, {
            status: 302,
            headers: { Location: callbackUrl.toString() },
          });
        }

        // Not logged in — redirect to the real login page with a callback
        const loginUrl = new URL("/auth/login", url.origin);
        const oauthParams = new URLSearchParams();
        for (const [key, value] of url.searchParams) {
          if (!["exp", "sig"].includes(key)) {
            oauthParams.set(key, value);
          }
        }
        loginUrl.searchParams.set("callbackURL", `/auth/oauth?${oauthParams.toString()}`);

        return new Response(null, {
          status: 302,
          headers: { Location: loginUrl.toString() },
        });
      },
    },
  },
});
