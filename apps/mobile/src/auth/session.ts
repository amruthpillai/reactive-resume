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
import { discover, forgetClient, getClientId, redirectUri, registerClient, scopes, storeKey } from "./oauth";

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
let refreshing: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

const setSession = (next: Session) => {
	session = next;
	for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

/** The current session. Re-renders when the status or server changes. */
export function useSession(): Session {
	return useSyncExternalStore(subscribe, () => session);
}

/** The server origin requests go to. */
export function getServer(): string {
	return session.server;
}

/** False until a sign-in has completed on this device: the signed-out screen is then the server picker. */
export function hasChosenServer(): boolean {
	return serverChosen;
}

/** Reads the last server and its tokens from SecureStore. Call once at launch. An unreadable store signs out. */
export async function restoreSession(): Promise<void> {
	try {
		const storedServer = await SecureStore.getItemAsync(serverKey);
		serverChosen = storedServer !== null;
		const server = storedServer ?? DEFAULT_SERVER;
		const stored = await SecureStore.getItemAsync(tokensKey(server));
		tokens = stored ? (JSON.parse(stored) as Tokens) : null;
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
 * Revokes the refresh token on the server (best effort) and deletes the stored tokens. The server and its registered
 * client are kept. Access tokens already issued stay valid until they expire (at most an hour).
 */
export async function signOut(): Promise<void> {
	await refreshing?.catch(() => null);
	const { server } = session;
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
	refreshing ??= refreshAccessToken(tokens.refreshToken).finally(() => {
		refreshing = null;
	});
	return refreshing;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
	const { server } = session;
	try {
		const [discovery, clientId] = await Promise.all([discover(server), getClientId(server)]);
		if (!clientId) {
			await expire(server, refreshToken);
			return null;
		}
		const response = await AuthSession.refreshAsync(
			{ clientId, refreshToken, extraParams: { resource: server } },
			discovery,
		);
		// Signed out or switched server meanwhile: these tokens must not come back.
		if (session.server !== server || tokens?.refreshToken !== refreshToken) return null;
		const next = toTokens(response, refreshToken);
		await saveTokens(next);
		return next.accessToken;
	} catch (error) {
		if (
			error instanceof AuthSession.TokenError &&
			(error.code === "invalid_grant" || error.code === "invalid_client")
		) {
			if (error.code === "invalid_client") await forgetClient(server);
			await expire(server, refreshToken);
			return null;
		}
		// Offline or a server error: send the old token and let the request fail the way it would have anyway.
		return tokens?.accessToken ?? null;
	}
}

/**
 * The server rejected the refresh token (revoked, expired, or the client is gone). Deletes the tokens and marks the
 * session `expired`, which keeps the user on the current screen with a prompt to sign in again.
 */
async function expire(server: string, refreshToken: string): Promise<void> {
	if (session.server !== server || tokens?.refreshToken !== refreshToken) return;
	tokens = null;
	setSession({ status: "expired", server });
	await SecureStore.deleteItemAsync(tokensKey(server)).catch(() => null);
}
