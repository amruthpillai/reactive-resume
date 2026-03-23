import { createFileRoute } from "@tanstack/react-router";

import { auth } from "@/integrations/auth/config";

function sanitizeOAuthAuthorizeRequest(request: Request): Request {
  if (request.method !== "GET") return request;

  const url = new URL(request.url);
  if (!url.pathname.endsWith("/oauth2/authorize")) return request;

  const sanitizeValue = (value: string) =>
    value
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const sanitizeParam = (key: string) => {
    const value = url.searchParams.get(key);
    if (!value) return;
    url.searchParams.set(key, sanitizeValue(value));
  };

  sanitizeParam("prompt");
  sanitizeParam("redirect_uri");
  sanitizeParam("client_id");
  sanitizeParam("code_challenge");
  sanitizeParam("code_challenge_method");
  sanitizeParam("response_type");
  sanitizeParam("scope");
  sanitizeParam("state");
  sanitizeParam("resource");

  const redirectUri = url.searchParams.get("redirect_uri");
  if (redirectUri && !URL.canParse(redirectUri)) {
    try {
      const decodedRedirectUri = decodeURIComponent(redirectUri);
      if (URL.canParse(decodedRedirectUri)) {
        url.searchParams.set("redirect_uri", decodedRedirectUri);
      }
    } catch {
      // Ignore malformed encoded values and let Better Auth validation handle them.
    }
  }

  if (url.toString() === request.url) return request;
  return new Request(url, request);
}

async function defaultPublicClientRegistration(request: Request): Promise<Request> {
  if (request.method !== "POST") return request;

  const url = new URL(request.url);
  if (!url.pathname.endsWith("/oauth2/register")) return request;

  const cloned = request.clone();
  let body: Record<string, unknown>;

  try {
    body = await cloned.json();
  } catch {
    return request;
  }

  // Claude.ai sends token_endpoint_auth_method: "client_secret_post" without a
  // client_secret, causing Better Auth to require authentication for what is
  // effectively a public client. Force to "none" for unauthenticated registrations.
  if (!request.headers.get("authorization")) {
    body.token_endpoint_auth_method = "none";
  }

  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(body),
  });
}

async function handler({ request }: { request: Request }) {
  const sanitizedRequest = sanitizeOAuthAuthorizeRequest(request);
  const finalRequest = await defaultPublicClientRegistration(sanitizedRequest);

  if (request.method === "GET" && request.url.endsWith("/spec.json")) {
    const spec = await auth.api.generateOpenAPISchema();

    return Response.json(spec);
  }

  return auth.handler(finalRequest);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
});
