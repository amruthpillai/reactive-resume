import type { AuthSession } from "./types";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./config";

export async function getSession(): Promise<AuthSession | null> {
	const result = await auth.api.getSession({ headers: getRequestHeaders() });
	return result as AuthSession | null;
}
