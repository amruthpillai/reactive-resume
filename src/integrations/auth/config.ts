import type { JWTPayload } from "jose";

import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { dash } from "@better-auth/infra";
import { oauthProvider } from "@better-auth/oauth-provider";
import { BetterAuthError, betterAuth } from "better-auth";
import { verifyAccessToken } from "better-auth/oauth2";
import { admin, jwt, openAPI, type GenericOAuthConfig } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { twoFactor } from "better-auth/plugins/two-factor";
import { username } from "better-auth/plugins/username";
import { and, eq, or, sql } from "drizzle-orm";

import { env } from "@/utils/env";
import { hashPassword, verifyPassword } from "@/utils/password";
import { generateId, toUsername } from "@/utils/string";

import { schema } from "../drizzle";
import { db } from "../drizzle/client";
import { sendEmail } from "../email/service";

export const authBaseUrl = process.env.BETTER_AUTH_URL ?? env.APP_URL;

function getOAuthAudiences(): string[] {
  const base = authBaseUrl.replace(/\/$/, "");

  return [base, `${base}/`, `${base}/mcp`, `${base}/mcp/`];
}

export async function verifyOAuthToken(token: string): Promise<JWTPayload> {
  return await verifyAccessToken(token, {
    jwksUrl: `${authBaseUrl}/api/auth/jwks`,
    verifyOptions: {
      issuer: `${authBaseUrl}/api/auth`,
      audience: getOAuthAudiences(),
    },
  });
}

function isCustomOAuthProviderEnabled() {
  const hasDiscovery = Boolean(env.OAUTH_DISCOVERY_URL);
  const hasManual =
    Boolean(env.OAUTH_AUTHORIZATION_URL) &&
    Boolean(env.OAUTH_TOKEN_URL) &&
    Boolean(env.OAUTH_USER_INFO_URL);

  return (
    Boolean(env.OAUTH_CLIENT_ID) && Boolean(env.OAUTH_CLIENT_SECRET) && (hasDiscovery || hasManual)
  );
}

function getTrustedOrigins(): string[] {
  const appUrl = new URL(env.APP_URL);
  const trustedOrigins = new Set<string>([appUrl.origin.replace(/\/$/, "")]);
  const LOCAL_ORIGINS = ["localhost", "127.0.0.1"];

  if (LOCAL_ORIGINS.includes(appUrl.hostname)) {
    for (const hostname of LOCAL_ORIGINS) {
      if (hostname !== appUrl.hostname) {
        const altUrl = new URL(env.APP_URL);
        altUrl.hostname = hostname;
        trustedOrigins.add(altUrl.origin.replace(/\/$/, ""));
      }
    }
  }

  return Array.from(trustedOrigins);
}

async function findExistingUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const [existingUser] = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      emailVerified: schema.user.emailVerified,
      username: schema.user.username,
      displayUsername: schema.user.displayUsername,
      name: schema.user.name,
      image: schema.user.image,
    })
    .from(schema.user)
    .where(sql`lower(${schema.user.email}) = ${normalizedEmail}`)
    .limit(1);

  return existingUser;
}

const getAuthConfig = () => {
  const authConfigs: GenericOAuthConfig[] = [];

  if (isCustomOAuthProviderEnabled()) {
    authConfigs.push({
      providerId: "custom",
      disableSignUp: env.FLAG_DISABLE_SIGNUPS,
      clientId: env.OAUTH_CLIENT_ID as string,
      clientSecret: env.OAUTH_CLIENT_SECRET as string,
      discoveryUrl: env.OAUTH_DISCOVERY_URL,
      authorizationUrl: env.OAUTH_AUTHORIZATION_URL,
      tokenUrl: env.OAUTH_TOKEN_URL,
      userInfoUrl: env.OAUTH_USER_INFO_URL,
      scopes: env.OAUTH_SCOPES,
      redirectURI: `${env.APP_URL}/api/auth/oauth2/callback/custom`,
      mapProfileToUser: async (profile) => {
        if (!profile.email) {
          throw new BetterAuthError(
            "OAuth Provider did not return an email address. This is required for user creation.",
            { cause: "EMAIL_REQUIRED" },
          );
        }

        const email = profile.email.trim().toLowerCase();
        const existingUser = await findExistingUserByEmail(email);
        const name = profile.name ?? profile.preferred_username ?? email.split("@")[0];
        const username = profile.preferred_username ?? email.split("@")[0];
        const image = profile.image ?? profile.picture ?? profile.avatar_url;

        if (existingUser) {
          return {
            name: existingUser.name,
            email: existingUser.email,
            image: image ?? existingUser.image,
            username: existingUser.username,
            displayUsername: existingUser.displayUsername,
            emailVerified: existingUser.emailVerified,
          };
        }

        return {
          name,
          email,
          image,
          username,
          displayUsername: username,
          emailVerified: true,
        };
      },
    } satisfies GenericOAuthConfig);
  }

  return betterAuth({
    appName: "Reactive Resume",
    baseURL: authBaseUrl,
    secret: process.env.BETTER_AUTH_SECRET ?? env.AUTH_SECRET,

    database: drizzleAdapter(db, { schema, provider: "pg" }),

    telemetry: { enabled: false },
    trustedOrigins: getTrustedOrigins(),

    advanced: {
      database: { generateId },
      useSecureCookies: env.APP_URL.startsWith("https://"),
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "cf-connecting-ip"] },
    },

    emailAndPassword: {
      enabled: !env.FLAG_DISABLE_EMAIL_AUTH,
      autoSignIn: true,
      minPasswordLength: 8,
      maxPasswordLength: 64,
      requireEmailVerification: false,
      disableSignUp: env.FLAG_DISABLE_SIGNUPS || env.FLAG_DISABLE_EMAIL_AUTH,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your password",
          text: `You requested a password reset for your Reactive Resume account.\n\nTo reset your password, please visit the following URL:\n${url}.\n\nIf you did not request a password reset, please ignore this email.`,
        });
      },
      password: {
        hash: (password) => hashPassword(password),
        verify: ({ password, hash }) => verifyPassword(password, hash),
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Verify your email",
          text: `You recently signed up for an account on Reactive Resume.\n\nTo verify your email, please visit the following URL:\n${url}`,
        });
      },
    },

    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          await sendEmail({
            to: newEmail,
            subject: "Verify your new email",
            text: `You recently requested to change your email on Reactive Resume from ${user.email} to ${newEmail}.\n\nTo verify this change, please visit the following URL:\n${url}\n\nIf you did not request this change, please ignore this email.`,
          });
        },
      },
      additionalFields: {
        username: {
          type: "string",
          required: true,
        },
      },
    },

    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github", "linkedin"],
      },
    },

    socialProviders: {
      google: {
        enabled: !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET,
        disableSignUp: env.FLAG_DISABLE_SIGNUPS,
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        mapProfileToUser: async (profile) => {
          if (!profile.email) {
            throw new BetterAuthError(
              "Google provider did not return an email address. This is required for user creation.",
              {
                cause: "EMAIL_REQUIRED",
              },
            );
          }

          const email = profile.email.trim().toLowerCase();
          const existingUser = await findExistingUserByEmail(email);
          const name = profile.name ?? email.split("@")[0];

          if (existingUser) {
            return {
              name: existingUser.name,
              email: existingUser.email,
              image: profile.picture ?? existingUser.image,
              username: existingUser.username,
              displayUsername: existingUser.displayUsername,
              emailVerified: existingUser.emailVerified,
            };
          }

          return {
            name,
            email,
            image: profile.picture,
            username: email.split("@")[0],
            displayUsername: email.split("@")[0],
            emailVerified: true,
          };
        },
      },

      github: {
        enabled: !!env.GITHUB_CLIENT_ID && !!env.GITHUB_CLIENT_SECRET,
        disableSignUp: env.FLAG_DISABLE_SIGNUPS,
        clientId: env.GITHUB_CLIENT_ID!,
        clientSecret: env.GITHUB_CLIENT_SECRET!,
        mapProfileToUser: async (profile) => {
          const name = profile.name ?? profile.login ?? String(profile.id);
          const login = profile.login ?? String(profile.id);
          const normalizedLogin = toUsername(login);

          const [legacyAccount] = await db
            .select({
              accountId: schema.account.accountId,
              email: schema.user.email,
              emailVerified: schema.user.emailVerified,
              username: schema.user.username,
              displayUsername: schema.user.displayUsername,
            })
            .from(schema.account)
            .innerJoin(schema.user, eq(schema.account.userId, schema.user.id))
            .where(
              and(
                eq(schema.account.providerId, "github"),
                or(
                  eq(schema.user.username, normalizedLogin),
                  eq(schema.user.displayUsername, login),
                ),
              ),
            )
            .limit(1);

          if (legacyAccount) {
            return {
              id: legacyAccount.accountId,
              name,
              email: legacyAccount.email,
              image: profile.avatar_url,
              username: legacyAccount.username,
              displayUsername: legacyAccount.displayUsername,
              emailVerified: legacyAccount.emailVerified,
            };
          }

          return {
            name,
            email: profile.email,
            image: profile.avatar_url,
            username: normalizedLogin,
            displayUsername: login,
            emailVerified: true,
          };
        },
      },

      linkedin: {
        enabled: !!env.LINKEDIN_CLIENT_ID && !!env.LINKEDIN_CLIENT_SECRET,
        disableSignUp: env.FLAG_DISABLE_SIGNUPS,
        clientId: env.LINKEDIN_CLIENT_ID!,
        clientSecret: env.LINKEDIN_CLIENT_SECRET!,
        mapProfileToUser: async (profile) => {
          if (!profile.email) {
            throw new BetterAuthError(
              "LinkedIn provider did not return an email address. This is required for user creation.",
              { cause: "EMAIL_REQUIRED" },
            );
          }

          const email = profile.email.trim().toLowerCase();
          const existingUser = await findExistingUserByEmail(email);
          const username = email.split("@")[0];
          const name = profile.name ?? username;

          if (existingUser) {
            return {
              name: existingUser.name,
              email: existingUser.email,
              image: profile.picture ?? existingUser.image,
              username: existingUser.username,
              displayUsername: existingUser.displayUsername,
              emailVerified: existingUser.emailVerified,
            };
          }

          return {
            name,
            email,
            image: profile.picture,
            username,
            displayUsername: username,
            emailVerified: true,
          };
        },
      },
    },

    plugins: [
      jwt(),
      admin(),
      openAPI(),
      genericOAuth({ config: authConfigs }),
      twoFactor({ issuer: "Reactive Resume" }),
      apiKey({ enableSessionForAPIKeys: true, rateLimit: { enabled: false } }),
      dash({ apiKey: env.BETTER_AUTH_API_KEY, activityTracking: { enabled: true } }),
      oauthProvider({
        loginPage: "/auth/oauth",
        consentPage: "/auth/oauth",
        validAudiences: getOAuthAudiences(),
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        silenceWarnings: { oauthAuthServerConfig: true },
      }),
      username({
        minUsernameLength: 3,
        maxUsernameLength: 64,
        usernameNormalization: (value) => toUsername(value),
        displayUsernameNormalization: (value) => toUsername(value),
        usernameValidator: (username) => /^[a-z0-9._-]+$/.test(username),
        validationOrder: { username: "post-normalization", displayUsername: "post-normalization" },
      }),
    ],
  });
};

export const auth = getAuthConfig();
