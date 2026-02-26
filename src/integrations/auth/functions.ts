import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { authClient } from "./client";
import { auth } from "./config";
import type { AuthSession } from "./types";

export const getSession = createIsomorphicFn()
	.client(async (): Promise<AuthSession | null> => {
		const { data, error } = await authClient.getSession();
		if (error) return null;
		return data;
	})
	.server(async (): Promise<AuthSession | null> => {
		const result = await auth.api.getSession({ headers: getRequestHeaders() });
		return result as AuthSession | null;
	});
