// Isomorphic getSession.
// On the server, calls Better Auth's server API directly (uses request headers).
// On the client, calls the auth client's getSession over fetch.
//
// This lives in apps/web (not @reactive-resume/auth) because @reactive-resume/auth
// is server-only — importing its `auth` instance into client code drags in
// drizzle/pg/jose and triggers TanStack Start's client/server import-protection
// (the "tanstack-start-injected-head-scripts" virtual-module error).

import type { AuthSession } from "@reactive-resume/auth/types";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@reactive-resume/auth/config";
import { authClient } from "./client";

export const getSession = createIsomorphicFn()
	.client(async (): Promise<AuthSession | null> => {
		const { data, error } = await authClient.getSession();
		if (error) return null;
		return data as AuthSession;
	})
	.server(async (): Promise<AuthSession | null> => {
		const result = await auth.api.getSession({ headers: getRequestHeaders() });
		return result as AuthSession | null;
	});
