// SPA session lookup. This stays in apps/web because @reactive-resume/auth is server-only.

import type { AuthSession } from "@reactive-resume/auth/types";
import { authClient } from "./client";

export const getSession = async (): Promise<AuthSession | null> => {
	const { data, error } = await authClient.getSession();
	if (error) return null;
	return data as AuthSession;
};
