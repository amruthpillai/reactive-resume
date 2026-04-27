import type { JWTPayload } from "jose";

import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { dash } from "@better-auth/infra";
import { oauthProvider } from "@better-auth/oauth-provider";
import { passkey } from "@better-auth/passkey";
import { APIError, BetterAuthError, betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { verifyAccessToken } from "better-auth/oauth2";
import { admin, jwt, type GenericOAuthConfig } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { twoFactor } from "better-auth/plugins/two-factor";
import { username } from "better-auth/plugins/username";
import { eq, or } from "drizzle-orm";
import { createElement } from "react";

import { env } from "@/utils/env";
import { hashPassword, verifyPassword } from "@/utils/password";
import { generateId, toUsername } from "@/utils/string";
import { isAllowedOAuthRedirectUri, parseAllowedHostList } from "@/utils/url-security";

import { schema } from "../drizzle";
import { db } from "../drizzle/client";
import { lower } from "../drizzle/helpers";
import { sendEmail } from "../email/service";
import { ResetPasswordEmail, VerifyEmail, VerifyEmailChange } from "../email/templates/auth";

export const authBaseUrl = process.env.BETTER_AUTH_URL ?? env.APP_URL;

function getOAuthAudiences(): string[] {
  const base = authBaseUrl.replace(/\/$/, "");

  return [base, `${base}/`, `${base}/mcp`, `${base}/mcp/`];
}

const OAUTH_AUDIENCES = getOAuthAudiences();

export async function verifyOAuthToken(token: string): Promise<JWTPayload> {
  return await verifyAccessToken(token, {
    jwksUrl: `${authBaseUrl}/api/auth/jwks`,
    verifyOptions: {
      issuer: `${authBaseUrl}/api/auth`,
      audience: OAUTH_AUDIENCES,
    },
  });
}

function isCustomOAuthProviderEnabled() {
  const hasDiscovery = Boolean(env.OAUTH_DISCOVERY_URL);
  const hasManual =
    Boolean(env.OAUTH_AUTHORIZATION_URL) && Boolean(env.OAUTH_TOKEN_URL) && Boolean(env.OAUTH_USER_INFO_URL);

  return Boolean(env.OAUTH_CLIENT_ID) && Boolean(env.OAUTH_CLIENT_SECRET) && (hasDiscovery || hasManual);
}

function getTrustedOrigins(): string[] {
  const normalizeOrigin = (origin: string): string => origin.replace(/\/$/, "");
  const appUrl = new URL(env.APP_URL);
  const trustedOrigins = new Set<string>([normalizeOrigin(appUrl.origin)]);
  const LOCAL_ORIGINS = ["localhost", "127.0.0.1"];

  if (LOCAL_ORIGINS.includes(appUrl.hostname)) {
    for (const hostname of LOCAL_ORIGINS) {
      if (hostname !== appUrl.hostname) {
        const altUrl = new URL(env.APP_URL);
        altUrl.hostname = hostname;
        trustedOrigins.add(normalizeOrigin(altUrl.origin));
      }
    }
  }

  return Array.from(trustedOrigins);
}

const TRUSTED_ORIGINS = getTrustedOrigins();
const OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS = parseAllowedHostList(env.OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS);

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
    .where(eq(lower(schema.user.email), normalizedEmail))
    .limit(1);

  return existingUser;
}

function getEmailLocalPart(email: string): string {
  return email.split("@", 1)[0] ?? "";
}

function appendUsernameSuffix(base: string, suffix: string): string {
  const maxBaseLength = 64 - suffix.length;
  return `${base.slice(0, maxBaseLength)}${suffix}`;
}

async function isUsernameTaken(candidate: string): Promise<boolean> {
  const normalizedCandidate = candidate.trim().toLowerCase();

  const [existingUser] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(
      or(
        eq(lower(schema.user.username), normalizedCandidate),
        eq(lower(schema.user.displayUsername), normalizedCandidate),
      ),
    )
    .limit(1);

  return Boolean(existingUser);
}

async function allocateUniqueUsername(email: string, preferredUsername?: string | null): Promise<string> {
  const emailLocalPart = getEmailLocalPart(email);
  const preferred = preferredUsername ? toUsername(preferredUsername) : "";
  const normalizedEmailLocalPart = toUsername(emailLocalPart);
  const baseUsername = preferred || normalizedEmailLocalPart || "user";

  if (!(await isUsernameTaken(baseUsername))) return baseUsername;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = appendUsernameSuffix(baseUsername, `-${index}`);
    if (await isUsernameTaken(candidate)) continue;
    return candidate;
  }

  return appendUsernameSuffix(baseUsername, `-${generateId().slice(0, 8).toLowerCase()}`);
}

interface OAuthProfile {
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  image?: string | null;
  avatar_url?: string | null;
  login?: string | null;
  preferred_username?: string | null;
}

interface OAuthMapperContext {
  email: string;
  emailLocalPart: string;
}

interface OAuthMapperOptions<TProfile extends OAuthProfile> {
  providerName: string;
  getPreferredUsername?: (profile: TProfile, context: OAuthMapperContext) => string | undefined | null;
  getName?: (profile: TProfile, context: OAuthMapperContext) => string | undefined | null;
  getImage?: (profile: TProfile) => string | undefined | null;
}

function createProfileMapper<TProfile extends OAuthProfile>({
  providerName,
  getPreferredUsername,
  getName,
  getImage,
}: OAuthMapperOptions<TProfile>) {
  return async (profile: TProfile) => {
    if (!profile.email) {
      throw new BetterAuthError(
        `${providerName} provider did not return an email address. This is required for user creation.`,
        { cause: "EMAIL_REQUIRED" },
      );
    }

    const email = profile.email.trim().toLowerCase();
    const emailLocalPart = getEmailLocalPart(email);
    const context = { email, emailLocalPart };
    const existingUser = await findExistingUserByEmail(email);
    const image = getImage?.(profile) ?? undefined;

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

    const preferredUsername = getPreferredUsername?.(profile, context);
    const username = await allocateUniqueUsername(email, preferredUsername);
    const mappedName = getName?.(profile, context)?.trim();

    return {
      name: mappedName || username || emailLocalPart,
      email,
      image,
      username,
      displayUsername: username,
      emailVerified: true,
    };
  };
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
      mapProfileToUser: createProfileMapper({
        providerName: "OAuth Provider",
        getPreferredUsername: (profile, context) => profile.preferred_username ?? context.emailLocalPart,
        getName: (profile, context) => profile.name ?? profile.preferred_username ?? context.emailLocalPart,
        getImage: (profile) => profile.image ?? profile.picture ?? profile.avatar_url,
      }),
    } satisfies GenericOAuthConfig);
  }

  return betterAuth({
    appName: "Reactive Resume",
    baseURL: authBaseUrl,
    secret: process.env.BETTER_AUTH_SECRET ?? env.AUTH_SECRET,

    database: drizzleAdapter(db, { schema, provider: "pg" }),

    telemetry: { enabled: false },
    trustedOrigins: TRUSTED_ORIGINS,
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 600, max: 3 },
        "/send-verification-email": { window: 600, max: 3 },
        "/two-factor/verify-otp": { window: 600, max: 5 },
        "/two-factor/verify-totp": { window: 600, max: 5 },
        "/two-factor/verify-backup-code": { window: 600, max: 5 },
        "/is-username-available": { window: 60, max: 20 },
      },
    },

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!ctx.path.includes("/oauth2/register")) return;

        const body = ctx.body as { redirect_uris?: unknown } | undefined;
        const redirectUris = Array.isArray(body?.redirect_uris) ? body.redirect_uris : [];

        for (const uri of redirectUris) {
          if (typeof uri !== "string") {
            throw new APIError("BAD_REQUEST", { message: "redirect_uris entries must be strings" });
          }
          if (!isAllowedOAuthRedirectUri(uri, TRUSTED_ORIGINS, OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS)) {
            throw new APIError("BAD_REQUEST", {
              message: "redirect_uri is not allowed for dynamic client registration",
            });
          }
        }
      }),
    },

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
          react: createElement(ResetPasswordEmail, { url }),
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
          react: createElement(VerifyEmail, { url }),
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
            react: createElement(VerifyEmailChange, { url, previousEmail: user.email, newEmail }),
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
        mapProfileToUser: createProfileMapper({
          providerName: "Google",
          getName: (profile, context) => profile.name ?? context.emailLocalPart,
          getImage: (profile) => profile.picture,
        }),
      },

      github: {
        enabled: !!env.GITHUB_CLIENT_ID && !!env.GITHUB_CLIENT_SECRET,
        disableSignUp: env.FLAG_DISABLE_SIGNUPS,
        clientId: env.GITHUB_CLIENT_ID!,
        clientSecret: env.GITHUB_CLIENT_SECRET!,
        mapProfileToUser: createProfileMapper({
          providerName: "GitHub",
          getPreferredUsername: (profile, context) => profile.login ?? context.emailLocalPart,
          getName: (profile, context) => profile.name ?? profile.login ?? context.emailLocalPart,
          getImage: (profile) => profile.avatar_url,
        }),
      },

      linkedin: {
        enabled: !!env.LINKEDIN_CLIENT_ID && !!env.LINKEDIN_CLIENT_SECRET,
        disableSignUp: env.FLAG_DISABLE_SIGNUPS,
        clientId: env.LINKEDIN_CLIENT_ID!,
        clientSecret: env.LINKEDIN_CLIENT_SECRET!,
        mapProfileToUser: createProfileMapper({
          providerName: "LinkedIn",
          getName: (profile, context) => profile.name ?? context.emailLocalPart,
          getImage: (profile) => profile.picture,
        }),
      },
    },

    plugins: [
      jwt(),
      admin(),
      passkey(),
      genericOAuth({ config: authConfigs }),
      twoFactor({ issuer: "Reactive Resume" }),
      apiKey({ enableSessionForAPIKeys: true, rateLimit: { enabled: true } }),
      dash({ apiKey: env.BETTER_AUTH_API_KEY, activityTracking: { enabled: true } }),
      oauthProvider({
        loginPage: "/auth/oauth",
        consentPage: "/auth/oauth",
        validAudiences: OAUTH_AUDIENCES,
        allowDynamicClientRegistration: true,
        // Required for MCP client onboarding (RFC 7591). Phishing vector is closed by the
        // redirect_uri allowlist in the hooks.before middleware above and in src/routes/api/auth.$.ts.
        allowUnauthenticatedClientRegistration: true,
        rateLimit: {
          register: { window: 60, max: 5 },
          authorize: { window: 60, max: 30 },
          token: { window: 60, max: 20 },
          introspect: { window: 60, max: 60 },
          revoke: { window: 60, max: 30 },
          userinfo: { window: 60, max: 60 },
        },
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
