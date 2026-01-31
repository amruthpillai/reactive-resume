import { BetterAuthError } from "@better-auth/core/error";
import { passkey } from "@better-auth/passkey";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { apiKey, type GenericOAuthConfig, genericOAuth, twoFactor } from "better-auth/plugins";
import { username } from "better-auth/plugins/username";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/integrations/drizzle/client";
import { env } from "@/utils/env";
import { hashPassword, verifyPassword } from "@/utils/password";
import { generateId, toUsername } from "@/utils/string";
import { schema } from "../drizzle";
import { sendEmail } from "../email/service";

function isCustomOAuthProviderEnabled() {
	const hasDiscovery = Boolean(env.OAUTH_DISCOVERY_URL);
	const hasManual =
		Boolean(env.OAUTH_AUTHORIZATION_URL) && Boolean(env.OAUTH_TOKEN_URL) && Boolean(env.OAUTH_USER_INFO_URL);

	return Boolean(env.OAUTH_CLIENT_ID) && Boolean(env.OAUTH_CLIENT_SECRET) && (hasDiscovery || hasManual);
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

				const email = profile.email;
				const name = profile.name ?? profile.preferred_username ?? email.split("@")[0];
				const username = profile.preferred_username ?? email.split("@")[0];
				const image = profile.image ?? profile.picture ?? profile.avatar_url;

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

		baseURL: env.APP_URL,
		secret: env.AUTH_SECRET,

		database: drizzleAdapter(db, { schema, provider: "pg" }),

		telemetry: { enabled: false },
		trustedOrigins: [env.APP_URL],
		advanced: {
			database: { generateId },
			useSecureCookies: env.APP_URL.startsWith("https://"),
		},

		emailAndPassword: {
			enabled: !env.FLAG_DISABLE_EMAIL_AUTH,
			autoSignIn: true,
			minPasswordLength: 6,
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
				trustedProviders: ["google", "github"],
			},
		},

		socialProviders: {
			google: {
				enabled: !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET,
				disableSignUp: env.FLAG_DISABLE_SIGNUPS,
				// biome-ignore lint/style/noNonNullAssertion: enabled check ensures these are not null
				clientId: env.GOOGLE_CLIENT_ID!,
				// biome-ignore lint/style/noNonNullAssertion: enabled check ensures these are not null
				clientSecret: env.GOOGLE_CLIENT_SECRET!,
				mapProfileToUser: async (profile) => {
					return {
						name: profile.name,
						email: profile.email,
						image: profile.picture,
						username: profile.email.split("@")[0],
						displayUsername: profile.email.split("@")[0],
						emailVerified: true,
					};
				},
			},

			github: {
				enabled: !!env.GITHUB_CLIENT_ID && !!env.GITHUB_CLIENT_SECRET,
				disableSignUp: env.FLAG_DISABLE_SIGNUPS,
				// biome-ignore lint/style/noNonNullAssertion: enabled check ensures these are not null
				clientId: env.GITHUB_CLIENT_ID!,
				// biome-ignore lint/style/noNonNullAssertion: enabled check ensures these are not null
				clientSecret: env.GITHUB_CLIENT_SECRET!,
				mapProfileToUser: async (profile) => {
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
								or(eq(schema.user.username, normalizedLogin), eq(schema.user.displayUsername, login)),
							),
						)
						.limit(1);

					if (legacyAccount) {
						return {
							id: legacyAccount.accountId,
							name: profile.name,
							email: legacyAccount.email,
							image: profile.avatar_url,
							username: legacyAccount.username,
							displayUsername: legacyAccount.displayUsername,
							emailVerified: legacyAccount.emailVerified,
						};
					}

					return {
						name: profile.name,
						email: profile.email,
						image: profile.avatar_url,
						username: normalizedLogin,
						displayUsername: login,
						emailVerified: true,
					};
				},
			},
		},

		plugins: [
			apiKey({
				enableSessionForAPIKeys: true,
				rateLimit: {
					enabled: true,
					timeWindow: 1000 * 60 * 60 * 24, // 1 day
					maxRequests: 500, // 500 requests per day
				},
			}),
			username({
				minUsernameLength: 3,
				maxUsernameLength: 64,
				usernameNormalization: (value) => toUsername(value),
				displayUsernameNormalization: (value) => toUsername(value),
				usernameValidator: (username) => /^[a-z0-9._-]+$/.test(username),
				validationOrder: { username: "post-normalization", displayUsername: "post-normalization" },
			}),
			twoFactor({
				issuer: "Reactive Resume",
			}),
			passkey({
				origin: env.APP_URL,
				rpName: "Reactive Resume",
				rpID: new URL(env.APP_URL).hostname,
			}),
			genericOAuth({
				config: authConfigs,
			}),
			tanstackStartCookies(),
		],
	});
};

export const auth = getAuthConfig();
