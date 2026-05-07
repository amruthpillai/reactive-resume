import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
	user: {
		sessions: r.many.session(),
		accounts: r.many.account(),
		twoFactors: r.many.twoFactor(),
		passkeys: r.many.passkey(),
		resumes: r.many.resume(),
		apiKeys: r.many.apikey(),
		oauthClients: r.many.oauthClient(),
		oauthRefreshTokens: r.many.oauthRefreshToken(),
		oauthAccessTokens: r.many.oauthAccessToken(),
		oauthConsents: r.many.oauthConsent(),
	},
	session: {
		user: r.one.user({
			from: r.session.userId,
			to: r.user.id,
		}),
		oauthRefreshTokens: r.many.oauthRefreshToken({
			from: r.session.id,
			to: r.oauthRefreshToken.sessionId,
		}),
		oauthAccessTokens: r.many.oauthAccessToken({
			from: r.session.id,
			to: r.oauthAccessToken.sessionId,
		}),
	},
	account: {
		user: r.one.user({
			from: r.account.userId,
			to: r.user.id,
		}),
	},
	twoFactor: {
		user: r.one.user({
			from: r.twoFactor.userId,
			to: r.user.id,
		}),
	},
	passkey: {
		user: r.one.user({
			from: r.passkey.userId,
			to: r.user.id,
		}),
	},
	resume: {
		user: r.one.user({
			from: r.resume.userId,
			to: r.user.id,
		}),
		statistics: r.one.resumeStatistics({
			from: r.resume.id,
			to: r.resumeStatistics.resumeId,
		}),
		analysis: r.one.resumeAnalysis({
			from: r.resume.id,
			to: r.resumeAnalysis.resumeId,
		}),
	},
	resumeStatistics: {
		resume: r.one.resume({
			from: r.resumeStatistics.resumeId,
			to: r.resume.id,
		}),
	},
	resumeAnalysis: {
		resume: r.one.resume({
			from: r.resumeAnalysis.resumeId,
			to: r.resume.id,
		}),
	},
	apikey: {
		user: r.one.user({
			from: r.apikey.referenceId,
			to: r.user.id,
		}),
	},
	oauthClient: {
		user: r.one.user({
			from: r.oauthClient.userId,
			to: r.user.id,
		}),
		oauthRefreshTokens: r.many.oauthRefreshToken({
			from: r.oauthClient.clientId,
			to: r.oauthRefreshToken.clientId,
		}),
		oauthAccessTokens: r.many.oauthAccessToken({
			from: r.oauthClient.clientId,
			to: r.oauthAccessToken.clientId,
		}),
		oauthConsents: r.many.oauthConsent({
			from: r.oauthClient.clientId,
			to: r.oauthConsent.clientId,
		}),
	},
	oauthRefreshToken: {
		user: r.one.user({
			from: r.oauthRefreshToken.userId,
			to: r.user.id,
		}),
		session: r.one.session({
			from: r.oauthRefreshToken.sessionId,
			to: r.session.id,
		}),
	},
	oauthAccessToken: {
		user: r.one.user({
			from: r.oauthAccessToken.userId,
			to: r.user.id,
		}),
		session: r.one.session({
			from: r.oauthAccessToken.sessionId,
			to: r.session.id,
		}),
		refreshToken: r.one.oauthRefreshToken({
			from: r.oauthAccessToken.refreshId,
			to: r.oauthRefreshToken.id,
		}),
	},
	oauthConsent: {
		user: r.one.user({
			from: r.oauthConsent.userId,
			to: r.user.id,
		}),
	},
}));
