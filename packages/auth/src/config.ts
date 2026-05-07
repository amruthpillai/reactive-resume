import type { GenericOAuthConfig } from "better-auth/plugins";
import type { SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { JWTPayload } from "jose";
import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { dash } from "@better-auth/infra";
import { oauthProvider } from "@better-auth/oauth-provider";
import { passkey } from "@better-auth/passkey";
import { compare, hash } from "bcrypt";
import { APIError, BetterAuthError, betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { verifyAccessToken } from "better-auth/oauth2";
import { admin, jwt } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { twoFactor } from "better-auth/plugins/two-factor";
import { username } from "better-auth/plugins/username";
import { eq, or, sql } from "drizzle-orm";
import { createElement } from "react";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";
import { ResetPasswordEmail, VerifyEmail, VerifyEmailChange } from "@reactive-resume/email/templates/auth";
import { sendEmail } from "@reactive-resume/email/transport";
import { env } from "@reactive-resume/env/server";
import { rateLimitConfig, TRUSTED_IP_HEADERS } from "@reactive-resume/utils/rate-limit";
import { generateId, toUsername } from "@reactive-resume/utils/string";
import { isAllowedOAuthRedirectUri, parseAllowedHostList } from "@reactive-resume/utils/url-security";

const authBaseUrl = env.APP_URL;
const isRateLimitEnabled = process.env.NODE_ENV === "production";

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
	const trustedOrigins = new Set<string>(["http://localhost:3000", "http://127.0.0.1:3000"]);

	trustedOrigins.add(normalizeOrigin(new URL(env.APP_URL).origin));

	return Array.from(trustedOrigins);
}

const TRUSTED_ORIGINS = getTrustedOrigins();
const OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS = parseAllowedHostList(env.OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS);
const oauthProviderRateLimit = isRateLimitEnabled
	? rateLimitConfig.betterAuth.oauthProvider
	: ({
			register: false,
			authorize: false,
			token: false,
			introspect: false,
			revoke: false,
			userinfo: false,
		} as const);

function lower<T extends AnyPgColumn>(column: T): SQL<T> {
	return sql`lower(${column})`;
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
			redirectURI: `${authBaseUrl}/api/auth/oauth2/callback/custom`,
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
		secret: env.AUTH_SECRET,

		database: drizzleAdapter(db, { schema, provider: "pg" }),

		telemetry: { enabled: false },
		trustedOrigins: TRUSTED_ORIGINS,
		rateLimit: {
			...rateLimitConfig.betterAuth.global,
			enabled: isRateLimitEnabled,
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
			useSecureCookies: authBaseUrl.startsWith("https://"),
			ipAddress: { ipAddressHeaders: TRUSTED_IP_HEADERS },
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
				hash: (password) => hash(password, 10),
				verify: ({ password, hash }) => compare(password, hash),
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
				disableImplicitSignUp: true,
				clientId: env.GOOGLE_CLIENT_ID ?? "",
				clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
				mapProfileToUser: createProfileMapper({
					providerName: "Google",
					getName: (profile, context) => profile.name ?? context.emailLocalPart,
					getImage: (profile) => profile.picture,
				}),
			},

			github: {
				enabled: !!env.GITHUB_CLIENT_ID && !!env.GITHUB_CLIENT_SECRET,
				disableSignUp: env.FLAG_DISABLE_SIGNUPS,
				disableImplicitSignUp: true,
				clientId: env.GITHUB_CLIENT_ID ?? "",
				clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
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
				disableImplicitSignUp: true,
				clientId: env.LINKEDIN_CLIENT_ID ?? "",
				clientSecret: env.LINKEDIN_CLIENT_SECRET ?? "",
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
			apiKey({
				enableSessionForAPIKeys: true,
				rateLimit: {
					...rateLimitConfig.betterAuth.apiKey,
					enabled: isRateLimitEnabled,
				},
			}),
			oauthProvider({
				loginPage: "/auth/oauth",
				consentPage: "/auth/oauth",
				validAudiences: OAUTH_AUDIENCES,
				allowDynamicClientRegistration: true,
				// Required for MCP client onboarding (RFC 7591). Phishing vector is closed by the
				// redirect_uri allowlist in the hooks.before middleware above and in src/routes/api/auth.$.ts.
				allowUnauthenticatedClientRegistration: true,
				rateLimit: oauthProviderRateLimit,
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
			...(env.BETTER_AUTH_API_KEY
				? [dash({ apiKey: env.BETTER_AUTH_API_KEY, activityTracking: { enabled: true } })]
				: []),
		],
	});
};

export const auth = getAuthConfig();
