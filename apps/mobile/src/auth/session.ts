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
 * - Mix-up defence: discovery must name the chosen origin as issuer and endpoint host (oauth.ts `discover`); the
 *   redirect must carry the request's `state` and, when the server advertises RFC 9207, its `iss`.
 * - Every session transition (sign-in commit, sign-out, refresh, expiry) runs through one queue, so none interleave.
 * - Refresh is single-flight. A refresh whose answer never arrived may have rotated the token on the server; sending
 *   the old one again would look like a replay and revoke the family. So it is never sent again: a persisted marker
 *   turns a lost answer (or a process kill) into `expired`.
 * - Each account (sign-in) gets a new identity number. Requests carry it; a 401 retry or refresh for an account that
 *   is no longer current fails instead of borrowing the new account's token.
 */
import * as AuthSession from "expo-auth-session";
import * as Network from "expo-network";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useSyncExternalStore } from "react";
import {
	discover,
	forgetClient,
	getClientId,
	isAllowedServer,
	parseRedirectParams,
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
// Set while a refresh request is out; holds a fingerprint of the refresh token it sent.
const refreshMarkerKey = (server: string) => storeKey("refreshing", server);
// Refresh this long before the access token expires, so a request never leaves with a token about to lapse.
const expirySkewSeconds = 60;
const refreshTimeout = 20_000;

let session: Session = { status: "loading", server: DEFAULT_SERVER };
// Whether the user ever picked a server (a sign-in completed). First launch shows the server picker.
let serverChosen = false;
let tokens: Tokens | null = null;
// The signed-in account, `JSON.stringify([server, sub])` (the draft store's scope). Kept through `expired`, so signing
// out from there still clears that account's drafts; cleared on sign-out.
let accountScope: string | null = null;
// Changes whenever the account behind the tokens changes (sign-in, sign-out, expiry), never on a refresh.
let identity = 0;
let refreshing: { account: number; result: Promise<string | null> } | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();
const identityListeners = new Set<() => void>();

/** Runs session transitions one after another, in call order. */
function transition<T>(step: () => Promise<T>): Promise<T> {
	const run = queue.then(step, step);
	queue = run.catch(() => null);
	return run;
}

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

// FNV-1a: tells two refresh tokens apart without storing one a second time.
const fingerprint = (value: string) => {
	let hash = 0x811c9dc5;
	for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
	return (hash >>> 0).toString(16);
};

const setSession = (next: Session) => {
	session = next;
	for (const listener of listeners) listener();
};

/** A new account (or none) is behind the session: account-scoped caches must go before anything renders. */
const changeIdentity = () => {
	identity++;
	for (const listener of identityListeners) listener();
};

/** Calls `listener` synchronously on every session change (status or server). Returns the unsubscribe function. */
export function subscribeSession(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Calls `listener` synchronously when the account changes: sign-in, account or server switch, sign-out, expiry.
 * Not on a token refresh. Clear account-scoped caches here.
 */
export function subscribeIdentity(listener: () => void): () => void {
	identityListeners.add(listener);
	return () => identityListeners.delete(listener);
}

/** The current session, outside React. */
export function getSession(): Session {
	return session;
}

/** The current session. Re-renders when the status or server changes. */
export function useSession(): Session {
	return useSyncExternalStore(subscribeSession, () => session);
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

/**
 * A server and the access token for it, read together. `scope` is the account the token belongs to; `account` is the
 * session identity the snapshot was taken from.
 */
export type Credentials = { server: string; accessToken: string | null; scope: string | null; account: number };

/**
 * The current server with its access token (refreshed first when it is about to expire), from one account. If the
 * account changes while a refresh runs, the token is null rather than the next account's.
 */
export async function getCredentials(): Promise<Credentials> {
	const { server } = session;
	const account = identity;
	const token = await getAccessToken();
	const accessToken = identity === account ? token : null;
	return { server, accessToken, scope: scopeOf(server, accessToken), account };
}

/**
 * The server answered 401 to `used`, although its token looked valid. Refreshes once (shared with any refresh in
 * flight) and returns the credentials to retry with, for the same account only; null when there is nothing to retry,
 * including when the account changed since `used` was taken.
 */
export async function recoverFromUnauthorized(used: Credentials): Promise<Credentials | null> {
	if (!used.accessToken || used.account !== identity || !tokens) return null;
	// Another request already refreshed this account: retry with the newer token.
	if (tokens.accessToken !== used.accessToken) return { ...used, accessToken: tokens.accessToken };
	if (!tokens.refreshToken) {
		await transition(() => expire(used.account));
		return null;
	}
	const accessToken = await refreshOnce(used.account, tokens.refreshToken);
	if (!accessToken || accessToken === used.accessToken || used.account !== identity) return null;
	return { ...used, accessToken };
}

/** The retry after a refresh was rejected too: the server no longer accepts this account's tokens. */
export function rejectCredentials(used: Credentials): Promise<void> {
	return transition(async () => {
		if (tokens?.accessToken === used.accessToken) await expire(used.account);
	});
}

/** False until a sign-in has completed on this device: the signed-out screen is then the server picker. */
export function hasChosenServer(): boolean {
	return serverChosen;
}

/**
 * Reads the last server and its tokens from SecureStore. Call once at launch. An unreadable store signs out. A refresh
 * that was still out when the app last stopped leaves the session `expired`: its token may already be rotated.
 */
export async function restoreSession(): Promise<void> {
	try {
		const storedServer = await SecureStore.getItemAsync(serverKey);
		const server = storedServer && isAllowedServer(storedServer) ? storedServer : DEFAULT_SERVER;
		serverChosen = server === storedServer;
		const stored = await SecureStore.getItemAsync(tokensKey(server));
		tokens = stored ? (JSON.parse(stored) as Tokens) : null;
		accountScope = scopeOf(server, tokens?.accessToken);
		const marker = await SecureStore.getItemAsync(refreshMarkerKey(server));
		if (marker && tokens?.refreshToken && marker === fingerprint(tokens.refreshToken)) {
			tokens = null;
			await SecureStore.deleteItemAsync(tokensKey(server));
			await SecureStore.deleteItemAsync(refreshMarkerKey(server));
			setSession({ status: "expired", server });
			return;
		}
		if (marker) await SecureStore.deleteItemAsync(refreshMarkerKey(server));
		setSession({ status: tokens ? "signed-in" : "signed-out", server });
	} catch {
		tokens = null;
		accountScope = null;
		setSession({ status: "signed-out", server: DEFAULT_SERVER });
	}
}

/** Stores tokens for the current account (a refresh); null deletes them and signs out without revoking. */
export function saveTokens(next: Tokens | null): Promise<void> {
	return transition(async () => {
		const { server } = session;
		if (next) await SecureStore.setItemAsync(tokensKey(server), JSON.stringify(next));
		else await SecureStore.deleteItemAsync(tokensKey(server));
		tokens = next;
		if (next) {
			accountScope = scopeOf(server, next.accessToken) ?? accountScope;
			setSession({ ...session, status: "signed-in" });
		} else {
			accountScope = null;
			changeIdentity();
			setSession({ ...session, status: "signed-out" });
		}
	});
}

/**
 * Signs in to `server` (an origin) in the system browser, then makes it the current server with its tokens in one
 * queued step. Until then nothing changes: a cancelled or failed sign-in leaves the current server and tokens as they
 * were. Resolves true when signed in and false when the user cancelled; throws on discovery, registration, redirect
 * or token errors.
 */
export async function signIn(server: string): Promise<boolean> {
	const origin = new URL(server).origin;
	if (!isAllowedServer(origin)) throw new Error("The app needs an https server.");
	const next = await authorize(origin);
	if (!next) return false;
	await transition(async () => {
		await SecureStore.setItemAsync(tokensKey(origin), JSON.stringify(next));
		await SecureStore.setItemAsync(serverKey, origin);
		await SecureStore.deleteItemAsync(refreshMarkerKey(origin));
		serverChosen = true;
		tokens = next;
		accountScope = scopeOf(origin, next.accessToken);
		changeIdentity();
		setSession({ status: "signed-in", server: origin });
	});
	return true;
}

/** A sign-in that failed at the redirect, with the OAuth error code `messages.ts` maps. */
class SignInError extends Error {
	constructor(readonly code: string) {
		super(code);
		this.name = "SignInError";
	}
}

/** Discovery, DCR, PKCE in the system browser and the code exchange. Null when the user cancels. */
async function authorize(origin: string): Promise<Tokens | null> {
	const discovery = await discover(origin);
	const clientId = await registerClient(origin, discovery);
	const request = new AuthSession.AuthRequest({
		clientId,
		redirectUri: redirectUri(origin),
		scopes,
		usePKCE: true,
		extraParams: { resource: origin },
	});
	await request.makeAuthUrlAsync(discovery);
	// This attempt, bound to its state: only a redirect carrying the same state (and issuer) may use its verifier.
	const pending = {
		state: request.state,
		issuer: discovery.issuer,
		verifier: request.codeVerifier ?? "",
		redirect: request.redirectUri,
	};
	// iOS 17.4+: an https redirect completes through ASWebAuthenticationSession's `.https` callback.
	const result = await request.promptAsync(discovery, { preferUniversalLinks: true });
	if (result.type === "cancel" || result.type === "dismiss") return null;
	if (result.type !== "success" && result.type !== "error") throw new SignInError(`authorization_${result.type}`);

	// Parsed here, by hand, rather than trusting expo-auth-session's URL parsing (S3: URLSearchParams on RN).
	const params = parseRedirectParams(result.url);
	if (params.state !== pending.state) throw new SignInError("state_mismatch");
	// RFC 9207. Better Auth 1.7.7 advertises `authorization_response_iss_parameter_supported` and adds `iss` to code and
	// error redirects; a server that does not advertise it must at least not name another issuer.
	if (
		discovery.issParameterSupported
			? params.iss !== pending.issuer
			: params.iss !== undefined && params.iss !== pending.issuer
	)
		throw new SignInError("issuer_mismatch");
	if (params.error) throw new SignInError(params.error);
	if (!params.code) throw new SignInError("no_code");

	try {
		const response = await AuthSession.exchangeCodeAsync(
			{
				clientId,
				code: params.code,
				redirectUri: pending.redirect,
				extraParams: { code_verifier: pending.verifier, resource: origin },
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
 * Signs out the current account, after any queued refresh. Against a snapshot of that account only: revokes its
 * refresh token (best effort), clears its drafts on this device, then deletes its tokens. The server and its
 * registered client are kept. Access tokens already issued stay valid until they expire (at most an hour). Throws,
 * still signed in, when the drafts cannot be cleared.
 */
export function signOut(): Promise<void> {
	return transition(async () => {
		const departing = { server: session.server, tokens, scope: accountScope, account: identity };
		const refreshToken = departing.tokens?.refreshToken;
		if (refreshToken) {
			await Promise.all([discover(departing.server), getClientId(departing.server)])
				.then(([discovery, clientId]) => {
					if (!clientId || !discovery.revocationEndpoint) return;
					return AuthSession.revokeAsync(
						{ clientId, token: refreshToken, tokenTypeHint: AuthSession.TokenTypeHint.RefreshToken },
						discovery,
					);
				})
				.catch(() => null);
		}
		if (departing.scope) {
			// Imported here: the draft runtime imports the API client, which imports this module.
			const { clearDraftsFor } = await import("@/draft/runtime");
			clearDraftsFor(departing.scope);
		}
		await SecureStore.deleteItemAsync(tokensKey(departing.server));
		await SecureStore.deleteItemAsync(refreshMarkerKey(departing.server));
		if (identity !== departing.account) return;
		tokens = null;
		accountScope = null;
		changeIdentity();
		setSession({ status: "signed-out", server: departing.server });
	});
}

/**
 * A valid access token for the current account, or null when signed out. Refreshes first when the token is about to
 * expire; concurrent callers share one refresh.
 */
export function getAccessToken(): Promise<string | null> {
	if (!tokens) return Promise.resolve(null);
	const expiresSoon = tokens.expiresAt !== undefined && tokens.expiresAt - expirySkewSeconds <= Date.now() / 1000;
	if (!expiresSoon) return Promise.resolve(tokens.accessToken);
	if (!tokens.refreshToken) return Promise.resolve(null);
	return refreshOnce(identity, tokens.refreshToken);
}

/** Single flight through the transition queue: every caller shares the refresh in progress. */
function refreshOnce(account: number, refreshToken: string): Promise<string | null> {
	if (refreshing?.account === account) return refreshing.result;
	const current = {
		account,
		result: transition(() => refreshAccessToken(account, refreshToken)).finally(() => {
			if (refreshing === current) refreshing = null;
		}),
	};
	refreshing = current;
	return current.result;
}

async function refreshAccessToken(account: number, refreshToken: string): Promise<string | null> {
	if (identity !== account || !tokens) return null;
	// A refresh queued earlier already rotated this account's token.
	if (tokens.refreshToken !== refreshToken) return tokens.accessToken;
	const { server } = session;
	const stale = tokens;

	// Offline: nothing would reach the server, so keep the old token and let the request fail on its own.
	const network = await Network.getNetworkStateAsync().catch(() => null);
	if (network && (network.isConnected === false || network.isInternetReachable === false)) return stale.accessToken;

	const [discovery, clientId] = await Promise.all([discover(server), getClientId(server)]).catch(() => [null, null]);
	if (!discovery) return stale.accessToken;
	if (!clientId) {
		await expire(account);
		return null;
	}

	await SecureStore.setItemAsync(refreshMarkerKey(server), fingerprint(refreshToken));
	let response: AuthSession.TokenResponse;
	try {
		response = await Promise.race([
			AuthSession.refreshAsync({ clientId, refreshToken, extraParams: { resource: server } }, discovery),
			// A request that never answers would hold the transition queue (and sign-out) forever.
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Refresh timed out.")), refreshTimeout)),
		]);
	} catch (error) {
		if (!(error instanceof AuthSession.TokenError)) {
			// No answer: the server may have rotated the token, so it must never be sent again.
			await expire(account);
			return null;
		}
		// The server answered with an error, so the token was not rotated.
		await SecureStore.deleteItemAsync(refreshMarkerKey(server));
		if (error.code === "invalid_grant" || error.code === "invalid_client") {
			if (error.code === "invalid_client") await forgetClient(server);
			await expire(account);
			return null;
		}
		return stale.accessToken;
	}

	const next = toTokens(response, refreshToken);
	await SecureStore.setItemAsync(tokensKey(server), JSON.stringify(next));
	await SecureStore.deleteItemAsync(refreshMarkerKey(server));
	if (identity !== account) return null;
	tokens = next;
	accountScope = scopeOf(server, next.accessToken) ?? accountScope;
	return next.accessToken;
}

/**
 * The account's refresh token is gone or rejected. Deletes its tokens and marks the session `expired`, which keeps the
 * user on the current screen with a prompt to sign in again. Runs inside the transition queue.
 */
async function expire(account: number): Promise<void> {
	if (identity !== account) return;
	const { server } = session;
	tokens = null;
	changeIdentity();
	setSession({ status: "expired", server });
	await SecureStore.deleteItemAsync(tokensKey(server)).catch(() => null);
	await SecureStore.deleteItemAsync(refreshMarkerKey(server)).catch(() => null);
}
