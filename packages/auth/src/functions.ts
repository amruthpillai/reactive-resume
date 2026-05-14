import type { AuthSession } from "./types";
import { auth } from "./config";

export async function getSession(headers: Headers): Promise<AuthSession | null> {
	const result = await auth.api.getSession({ headers });
	return result as AuthSession | null;
}
