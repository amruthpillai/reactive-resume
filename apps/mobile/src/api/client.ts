// The typed API, same router types as apps/web/src/libs/orpc/client.ts. Requests go to the signed-in server with the
// session's bearer token through `expo/fetch`, which streams response bodies (SSE event iterators); React Native's
// built-in fetch does not.
import type { InferRouterInputs, InferRouterOutputs, RouterClient } from "@orpc/server";
// The server router is a type-only peer dependency, so the runtime:server deny rule for app:mobile still holds;
// apps/mobile/.oxlintrc.json rejects value imports from it.
// @boundaries-ignore type-only import of the server router
import type router from "@reactive-resume/api/routers";
import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { fetch as expoFetch } from "expo/fetch";
import { getAccessToken, getServer } from "@/auth/session";

const authorization = async (): Promise<Record<string, string>> => {
	const token = await getAccessToken();
	return token ? { authorization: `Bearer ${token}` } : {};
};

// RPCLink hands over a Request; expo/fetch takes a URL and init. Bodies are buffered (no request streaming).
const rpcFetch = async (request: Request): Promise<Response> => {
	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	const response = await expoFetch(request.url, {
		method: request.method,
		headers: request.headers,
		body: hasBody ? await request.arrayBuffer() : null,
		signal: request.signal,
	});
	return response as unknown as Response;
};

const isAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";

const createLink = (label: string) =>
	new RPCLink({
		url: () => `${getServer()}/api/rpc`,
		headers: authorization,
		fetch: rpcFetch,
		interceptors: [
			// Logs the failure only: errors can carry request data, which must never reach the device log.
			onError((error) => {
				if (isAbort(error)) return;
				console.warn(`[${label}]`, error instanceof Error ? error.name : "error");
			}),
		],
	});

/** Request/response calls. */
export const client: RouterClient<typeof router> = createORPCClient(createLink("oRPC client"));

/** Long-lived event iterators (assistant, resume updates, letter drafts), kept apart from `client`. */
export const streamClient: RouterClient<typeof router> = createORPCClient(createLink("oRPC stream client"));

/** TanStack Query helpers: `orpc.resume.list.queryOptions()` and friends. */
export const orpc = createTanstackQueryUtils(client);

export type RouterInput = InferRouterInputs<typeof router>;
export type RouterOutput = InferRouterOutputs<typeof router>;

/**
 * Binary endpoints outside `/api/rpc` (exports, `pdf-checks`, `file-imports`), relative to `/api/openapi`.
 * Sends the bearer token and returns the raw response; callers check `ok` and read `arrayBuffer()`/`json()`.
 */
export async function rest(path: `/${string}`, init: RequestInit = {}): Promise<Response> {
	const headers = new Headers(init.headers);
	for (const [name, value] of Object.entries(await authorization())) headers.set(name, value);
	const response = await expoFetch(`${getServer()}/api/openapi${path}`, {
		method: init.method ?? "GET",
		headers,
		body: init.body ?? null,
		signal: init.signal ?? null,
	});
	return response as unknown as Response;
}
