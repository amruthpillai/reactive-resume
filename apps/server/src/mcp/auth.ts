import { auth, verifyOAuthToken } from "@reactive-resume/auth/config";

const OAUTH_WARN_THROTTLE_MS = 60_000;
let lastOAuthWarnAt = 0;

function warnOAuthThrottled(message: string, detail?: unknown): void {
	const now = Date.now();
	if (now - lastOAuthWarnAt < OAUTH_WARN_THROTTLE_MS) return;
	lastOAuthWarnAt = now;

	if (detail !== undefined) {
		console.warn(message, detail);
		return;
	}

	console.warn(message);
}

export class AuthError extends Error {
	constructor() {
		super("Unauthorized");
	}
}

export async function authenticateRequest(request: Request): Promise<void> {
	const authHeader = request.headers.get("authorization");

	if (authHeader?.startsWith("Bearer ")) {
		try {
			const payload = await verifyOAuthToken(authHeader.slice(7));
			if (payload?.sub) return;
			warnOAuthThrottled("[MCP] OAuth token verified but missing `sub` claim");
		} catch (error) {
			warnOAuthThrottled("[MCP] OAuth token verification failed:", error);
		}
	}

	const apiKey = request.headers.get("x-api-key");

	if (apiKey) {
		try {
			const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
			if (result.valid) return;
		} catch {
			// Invalid or malformed key; fall through to AuthError.
		}
	}

	throw new AuthError();
}
