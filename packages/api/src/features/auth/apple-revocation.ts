import { env } from "@reactive-resume/env/server";

type AppleTokens = { refreshToken: string | null; accessToken: string | null };

/** Apple requires erasure even when no usable token exists; callers must explain manual revocation fallback. */
export async function revokeAppleAuthorization(tokens: AppleTokens): Promise<boolean> {
	const token = tokens.refreshToken || tokens.accessToken;
	if (!token || !env.APPLE_CLIENT_ID || !env.APPLE_CLIENT_SECRET) return false;
	try {
		const response = await fetch("https://appleid.apple.com/auth/revoke", {
			method: "POST",
			body: new URLSearchParams({
				client_id: env.APPLE_CLIENT_ID,
				client_secret: env.APPLE_CLIENT_SECRET,
				token,
				token_type_hint: tokens.refreshToken ? "refresh_token" : "access_token",
			}),
			signal: AbortSignal.timeout(10_000),
			redirect: "error",
		});
		// Apple returns an empty 200 response for successful and already-revoked tokens.
		return response.status === 200;
	} catch {
		return false;
	}
}
