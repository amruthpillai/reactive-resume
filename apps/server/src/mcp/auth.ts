import { auth, verifyOAuthToken } from "@reactive-resume/auth/config";

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
		} catch {
			// Invalid or expired token; fall through to API key auth.
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
