import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import type { AuthSession } from "./types";

import { authClient } from "./client";
import { auth } from "./config";

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
