import type { InferRouterInputs, InferRouterOutputs, RouterClient } from "@orpc/server";
import type router from "@reactive-resume/api/routers";
import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

const getRpcUrl = () => {
	if (typeof window === "undefined") return "http://localhost:3000/api/rpc";
	return `${window.location.origin}/api/rpc`;
};

const createRpcClient = (): RouterClient<typeof router> => {
	const link = new RPCLink({
		url: getRpcUrl(),
		fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
		plugins: [
			new BatchLinkPlugin({
				mode: "streaming",
				groups: [{ condition: () => true, context: {} }],
			}),
		],
		interceptors: [
			onError((error) => {
				if (error instanceof DOMException && error.name === "AbortError") return;
				console.warn("[oRPC client]", error);
			}),
		],
	});

	return createORPCClient(link);
};

export const client = createRpcClient();

const createStreamClient = (): RouterClient<typeof router> => {
	const link = new RPCLink({
		url: getRpcUrl(),
		fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
		interceptors: [
			onError((error) => {
				if (error instanceof DOMException && error.name === "AbortError") return;
				console.warn("[oRPC stream client]", error);
			}),
		],
	});

	return createORPCClient(link);
};

export const streamClient = createStreamClient();

export const orpc = createTanstackQueryUtils(client);

export type RouterInput = InferRouterInputs<typeof router>;

export type RouterOutput = InferRouterOutputs<typeof router>;
