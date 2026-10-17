/**
 * The signed-in session: which server the app talks to and its OAuth tokens. Tokens live only in SecureStore
 * (Keychain / Keystore) and are never logged, rendered or written anywhere else.
 *
 * Sign-in (M3-T1) is OAuth 2.1 authorization code + PKCE (S256) in the system browser, against any server:
 * - Discovery from `<server>/.well-known/oauth-authorization-server`; dynamic client registration once per server,
 *   with `client_id` cached in SecureStore by server origin. Re-register only when the token endpoint answers
 *   `invalid_client`. Body in docs/plans/native-mobile-app/reports/S3.md §1.
 * - Send `resource=<server origin>` (RFC 8707) on authorize, token and refresh requests. Without it the server issues
 *   an opaque access token that `/api/rpc` rejects.
 * - The redirect is `https://rxresu.me/auth/native-callback` for every server (the app's associated domain, through
 *   Universal Links / App Links); see `redirectUri` in oauth.ts. On iOS pass `preferUniversalLinks: true` to
 *   `promptAsync`.
 * - A rejected refresh token (`invalid_grant`, `invalid_client`) deletes the tokens and sets status `expired`.
 * - Refresh is single-flight: concurrent callers share one in-flight refresh. Replaying a rotated refresh token makes
 *   the server revoke the whole token family and signs the phone out.
 */
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useSyncExternalStore } from "react";
import {
	discover,
	forgetClient,
	getClientId,
	isAllowedServer,
	redirectUri,
	registerClient,
	scopes,
	storeKey,
} from "./oauth";

export const DEFAULT_SERVER = "https://rxresu.me";

/**
 * - `loading`: tokens are being read from SecureStore at launch.
 * - `signed-out`: no tokens for the current server.
 * - `signed-in`: an access token (or a refresh token to get one) is stored.
 * - `expired`: the refresh token was rejected; the user must sign in again. The server is kept.
 */
export type SessionStatus = "loading" | "signed-out" | "signed-in" | "expired";

export type Session = {
	status: SessionStatus;
	/** The server origin, for example `https://rxresu.me`. */
	server: string;
};

export type Tokens = {
	accessToken: string;
	refreshToken?: string | undefined;
	/** Unix seconds. */
	expiresAt?: number | undefined;
};

const serverKey = "server";
const tokensKey = (server: string) => storeKey("tokens", server);
// Refresh this long before the access token expires, so a request never leaves with a token about to lapse.
const expirySkewSeconds = 60;

let session: Session = { status: "loading", server: DEFAULT_SERVER };
// Whether the user ever picked a server (a sign-in completed). First launch shows the server picker.
let serverChosen = false;
let tokens: Tokens | null = null;
// The signed-in account, `JSON.stringify([server, sub])` (the draft store's scope). Kept through `expired`, so signing
// out from there still clears that account's drafts; cleared on sign-out.
let accountScope: string | null = null;
let refreshing: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

/** The `sub` claim of a JWT access token, read without verifying it (the server verifies). */
function subjectOf(accessToken: string): string | null {
	try {
		const encoded = accessToken.split(".")[1];
		if (!encoded) return null;
		const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
		const payload = JSON.parse(atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4))) as { sub?: unknown };
		return typeof payload.sub === "string" ? payload.sub : null;
	} catch {
		return null;
	}
}

const scopeOf = (server: string, accessToken: string | null | undefined) => {
	const subject = accessToken ? subjectOf(accessToken) : null;
	return subject ? JSON.stringify([server, subject]) : null;
};

const setSession = (next: Session) => {
	session = next;
	for (const listener of listeners) listener();
};

/** Calls `listener` synchronously on every session change (status or server). Returns the unsubscribe function. */
export function subscribeSession(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

const subscribe = subscribeSession;

/** The current session, outside React. */
export function getSession(): Session {
	return session;
}

/** The current session. Re-renders when the status or server changes. */
export function useSession(): Session {
	return useSyncExternalStore(subscribe, () => session);
}

/** The server origin requests go to. */
export function getServer(): string {
	return session.server;
}

/**
 * The signed-in account as the draft store's scope, `JSON.stringify([server origin, user id])`, read from the stored
 * token without a network refresh, so drafts open offline. Null unless signed in.
 */
export function getAccountScope(): string | null {
	return session.status === "signed-in" ? accountScope : null;
}

/** A server and the access token for it, read together. `scope` is the account the token belongs to. */
export type Credentials = { server: string; accessToken: string | null; scope: string | null };

/**
 * The current server with its access token (refreshed first when it is about to expire). Both come from the same
 * session, so a server switch can never pair one server's token with another server.
 */
export async function getCredentials(): Promise<Credentials> {
	const { server } = session;
	// Null when the server changed during a refresh: the new server's token is never returned for the old one.
	const token = await getAccessToken();
	const accessToken = session.server === server ? token : null;
	return { server, accessToken, scope: scopeOf(server, accessToken) };
}

/**
 * The server answered 401 to `used`, although its token looked valid. Refreshes once (shared with any refresh in
 * flight) and returns the credentials to retry with; null when there is nothing to retry. A rejected refresh token
 * marks the session `expired`.
 */
export async function recoverFromUnauthorized(used: Credentials): Promise<Credentials | null> {
	if (!used.accessToken || session.server !== used.server || !tokens) return null;
	// Another request already refreshed: retry with the newer token.
	if (tokens.accessToken !== used.accessToken) return { ...used, accessToken: tokens.accessToken };
	if (!tokens.refreshToken) {
		await expire(used.server, tokens);
		return null;
	}
	const accessToken = await refreshOnce(tokens.refreshToken);
	if (!accessToken || accessToken === used.accessToken || session.server !== used.server) return null;
	return { ...used, accessToken };
}

/** The retry after a refresh was rejected too: the server no longer accepts this account's tokens. */
export async function rejectCredentials(used: Credentials): Promise<void> {
	if (tokens && tokens.accessToken === used.accessToken) await expire(used.server, tokens);
}

/** False until a sign-in has completed on this device: the signed-out screen is then the server picker. */
export function hasChosenServer(): boolean {
	return serverChosen;
}

/** Reads the last server and its tokens from SecureStore. Call once at launch. An unreadable store signs out. */
export async function restoreSession(): Promise<void> {
	try {
		const storedServer = await SecureStore.getItemAsync(serverKey);
		const server = storedServer && isAllowedServer(storedServer) ? storedServer : DEFAULT_SERVER;
		serverChosen = server === storedServer;
		const stored = await SecureStore.getItemAsync(tokensKey(server));
		tokens = stored ? (JSON.parse(stored) as Tokens) : null;
		accountScope = scopeOf(server, tokens?.accessToken);
		setSession({ status: tokens ? "signed-in" : "signed-out", server });
	} catch {
		tokens = null;
		setSession({ status: "signed-out", server: DEFAULT_SERVER });
	}
}

/** Stores tokens for the current server (a refresh); null deletes them. */
export async function saveTokens(next: Tokens | null): Promise<void> {
	const { server } = session;
	const key = tokensKey(server);
	if (next) await SecureStore.setItemAsync(key, JSON.stringify(next));
	else await SecureStore.deleteItemAsync(key);
	// The server changed while writing: these tokens belong to the old one and must not become current.
	if (session.server !== server) return;
	tokens = next;
	accountScope = next ? (scopeOf(server, next.accessToken) ?? accountScope) : null;
	setSession({ ...session, status: next ? "signed-in" : "signed-out" });
}

/**
 * Makes `server` the current server with its tokens, in one step: tokens are written first, then the server, then
 * both switch in memory together, so no request can pair one server's token with another server.
 */
async function switchSession(server: string, next: Tokens): Promise<void> {
	await SecureStore.setItemAsync(tokensKey(server), JSON.stringify(next));
	await SecureStore.setItemAsync(serverKey, server);
	serverChosen = true;
	tokens = next;
	accountScope = scopeOf(server, next.accessToken);
	refreshing = null;
	setSession({ status: "signed-in", server });
}

/**
 * Signs in to `server` (an origin) in the system browser, then switches to it with `switchSession`.
 * Until that last step nothing changes: a cancelled or failed sign-in leaves the current server and tokens as they
 * were. Resolves true when signed in and false when the user cancelled; throws on discovery, registration or token
 * errors.
 */
export async function signIn(server: string): Promise<boolean> {
	const origin = new URL(server).origin;
	if (!isAllowedServer(origin)) throw new Error("The app needs an https server.");
	const next = await authorize(origin);
	if (!next) return false;
	await switchSession(origin, next);
	return true;
}

/** Discovery, DCR, PKCE in the system browser and the code exchange. Null when the user cancels. */
async function authorize(origin: string): Promise<Tokens | null> {
	const discovery = await discover(origin);
	const clientId = await registerClient(origin, discovery);
	const redirect = redirectUri(origin);
	const request = new AuthSession.AuthRequest({
		clientId,
		redirectUri: redirect,
		scopes,
		usePKCE: true,
		extraParams: { resource: origin },
	});
	// iOS 17.4+: an https redirect completes through ASWebAuthenticationSession's `.https` callback.
	const result = await request.promptAsync(discovery, { preferUniversalLinks: true });
	if (result.type === "cancel" || result.type === "dismiss") return null;
	if (result.type === "error") throw result.error ?? new Error("authorization_failed");
	if (result.type !== "success") throw new Error(`authorization_${result.type}`);

	try {
		const response = await AuthSession.exchangeCodeAsync(
			{
				clientId,
				code: result.params.code ?? "",
				redirectUri: redirect,
				extraParams: { code_verifier: request.codeVerifier ?? "", resource: origin },
			},
			discovery,
		);
		return toTokens(response);
	} catch (error) {
		if (error instanceof AuthSession.TokenError && error.code === "invalid_client") await forgetClient(origin);
		throw error;
	}
}

const toTokens = (response: AuthSession.TokenResponse, previousRefreshToken?: string): Tokens => ({
	accessToken: response.accessToken,
	refreshToken: response.refreshToken ?? previousRefreshToken,
	expiresAt: response.expiresIn ? response.issuedAt + response.expiresIn : undefined,
});

/** Closes the browser of a sign-in in progress; `signIn` then resolves false. */
export function cancelSignIn(): void {
	WebBrowser.dismissAuthSession();
}

/**
 * Clears the account's drafts on this device, revokes the refresh token on the server (best effort) and deletes the
 * stored tokens. The server and its registered client are kept. Access tokens already issued stay valid until they
 * expire (at most an hour). Throws, signed in as before, when the drafts cannot be cleared.
 */
export async function signOut(): Promise<void> {
	await refreshing?.catch(() => null);
	const { server } = session;
	if (accountScope) {
		// Imported here: the draft runtime imports the API client, which imports this module.
		const { clearDraftsFor } = await import("@/draft/runtime");
		clearDraftsFor(accountScope);
	}
	const refreshToken = tokens?.refreshToken;
	if (refreshToken) {
		await Promise.all([discover(server), getClientId(server)])
			.then(([discovery, clientId]) => {
				if (!clientId || !discovery.revocationEndpoint) return;
				return AuthSession.revokeAsync(
					{ clientId, token: refreshToken, tokenTypeHint: AuthSession.TokenTypeHint.RefreshToken },
					discovery,
				);
			})
			.catch(() => null);
	}
	await saveTokens(null);
}

/**
 * A valid access token for the current server, or null when signed out. Refreshes first when the token is about to
 * expire; concurrent callers share one refresh.
 */
export function getAccessToken(): Promise<string | null> {
	if (!tokens) return Promise.resolve(null);
	const expiresSoon = tokens.expiresAt !== undefined && tokens.expiresAt - expirySkewSeconds <= Date.now() / 1000;
	if (!expiresSoon) return Promise.resolve(tokens.accessToken);
	if (!tokens.refreshToken) return Promise.resolve(null);
	return refreshOnce(tokens.refreshToken);
}

/** Single flight: every caller shares the refresh in progress. */
function refreshOnce(refreshToken: string): Promise<string | null> {
	refreshing ??= refreshAccessToken(refreshToken).finally(() => {
		refreshing = null;
	});
	return refreshing;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
	const { server } = session;
	const stale = tokens;
	try {
		const [discovery, clientId] = await Promise.all([discover(server), getClientId(server)]);
		if (!clientId) {
			if (stale) await expire(server, stale);
			return null;
		}
		const response = await AuthSession.refreshAsync(
			{ clientId, refreshToken, extraParams: { resource: server } },
			discovery,
		);
		// Signed out or switched server meanwhile: these tokens must not come back.
		if (session.server !== server || tokens !== stale) return null;
		const next = toTokens(response, refreshToken);
		await saveTokens(next);
		return next.accessToken;
	} catch (error) {
		if (
			error instanceof AuthSession.TokenError &&
			(error.code === "invalid_grant" || error.code === "invalid_client")
		) {
			if (error.code === "invalid_client") await forgetClient(server);
			if (stale) await expire(server, stale);
			return null;
		}
		// Offline or a server error: send the old token and let the request fail the way it would have anyway.
		return session.server === server && tokens === stale ? (stale?.accessToken ?? null) : null;
	}
}

/**
 * The server rejected the refresh token (revoked, expired, or the client is gone). Deletes the tokens and marks the
 * session `expired`, which keeps the user on the current screen with a prompt to sign in again.
 */
async function expire(server: string, stale: Tokens): Promise<void> {
	if (session.server !== server || tokens !== stale) return;
	tokens = null;
	setSession({ status: "expired", server });
	await SecureStore.deleteItemAsync(tokensKey(server)).catch(() => null);
}
