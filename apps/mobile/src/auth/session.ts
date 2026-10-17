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
 * - The redirect is `https://<server host>/auth/native-callback` (Universal Links / App Links). On iOS pass
 *   `preferUniversalLinks: true` to `promptAsync`.
 * - Refresh is single-flight: concurrent callers share one in-flight refresh. Replaying a rotated refresh token makes
 *   the server revoke the whole token family and signs the phone out.
 */
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";

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
// SecureStore keys allow only `[A-Za-z0-9._-]`. Hex of the origin's UTF-8 bytes is collision-free within that set.
const tokensKey = (server: string) =>
	`tokens.${Array.from(new TextEncoder().encode(server), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
// Refresh this long before the access token expires, so a request never leaves with a token about to lapse.
const expirySkewSeconds = 60;

let session: Session = { status: "loading", server: DEFAULT_SERVER };
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

/** Reads the last server and its tokens from SecureStore. Call once at launch. An unreadable store signs out. */
export async function restoreSession(): Promise<void> {
	try {
		const server = (await SecureStore.getItemAsync(serverKey)) ?? DEFAULT_SERVER;
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

// M3-T1: discovery, DCR, PKCE in the system browser and the code exchange. Null when the user cancels.
function authorize(_origin: string): Promise<Tokens | null> {
	return Promise.reject(new Error("signIn is not implemented yet (M3-T1)."));
}

/** Revokes the refresh token on the server (best effort) and deletes the stored tokens. The server is kept. */
export async function signOut(): Promise<void> {
	// M3-T1: `AuthSession.revokeAsync` for the refresh token before deleting.
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

// M3-T1: `AuthSession.refreshAsync` with `resource`, then `saveTokens`; on `invalid_grant` set status `expired`.
function refreshAccessToken(_refreshToken: string): Promise<string | null> {
	return Promise.reject(new Error("Token refresh is not implemented yet (M3-T1)."));
}
