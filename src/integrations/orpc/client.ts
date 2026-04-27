import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import { createRouterClient, type InferRouterInputs, type InferRouterOutputs, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import router from "@/integrations/orpc/router";
import { getLocale } from "@/utils/locale";

const getORPCClient = createIsomorphicFn()
  .server((): RouterClient<typeof router> => {
    return createRouterClient(router, {
      interceptors: [
        onError((error) => {
          console.error("[oRPC server]", error);
        }),
      ],
      context: async () => {
        const locale = await getLocale();
        const reqHeaders = getRequestHeaders();

        return { locale, reqHeaders };
      },
    });
  })
  .client((): RouterClient<typeof router> => {
    const link = new RPCLink({
      url: `${window.location.origin}/api/rpc`,
      fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
      plugins: [
        new BatchLinkPlugin({
          mode: typeof window === "undefined" ? "buffered" : "streaming",
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
  });

export const client = getORPCClient();

export const orpc = createTanstackQueryUtils(client);

export type RouterInput = InferRouterInputs<typeof router>;

export type RouterOutput = InferRouterOutputs<typeof router>;
