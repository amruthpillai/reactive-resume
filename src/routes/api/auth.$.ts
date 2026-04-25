import { createFileRoute } from "@tanstack/react-router";

import { auth } from "@/integrations/auth/config";
import { env } from "@/utils/env";
import { isPrivateOrLoopbackHost, parseAllowedHostList, parseUrl } from "@/utils/url-security";

const oauthDynamicClientRedirectHosts = parseAllowedHostList(env.OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS);
const oauthAuthorizeSanitizedParams = [
  "prompt",
  "redirect_uri",
  "client_id",
  "code_challenge",
  "code_challenge_method",
  "response_type",
  "scope",
  "state",
  "resource",
] as const;

function isAllowedDynamicClientRedirectUri(value: string) {
  const parsed = parseUrl(value);
  if (!parsed) return false;
  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (parsed.hash) return false;
  if (isPrivateOrLoopbackHost(parsed.hostname)) return false;

  const appOrigin = new URL(env.APP_URL).origin.toLowerCase();
  const origin = parsed.origin.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();

  if (origin === appOrigin) return true;
  if (oauthDynamicClientRedirectHosts.has(origin)) return true;
  if (oauthDynamicClientRedirectHosts.has(hostname)) return true;

  return false;
}

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

  for (const key of oauthAuthorizeSanitizedParams) sanitizeParam(key);

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

async function validateDynamicClientRegistrationRequest(request: Request): Promise<Response | undefined> {
  if (request.method !== "POST") return;

  const url = new URL(request.url);
  if (!url.pathname.endsWith("/oauth2/register")) return;

  const cloned = request.clone();
  let body: Record<string, unknown>;

  try {
    body = await cloned.json();
  } catch {
    return Response.json({ message: "Invalid registration payload" }, { status: 400 });
  }

  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  for (const redirectUri of redirectUris) {
    if (typeof redirectUri !== "string" || !isAllowedDynamicClientRedirectUri(redirectUri)) {
      return Response.json({ message: "redirect_uri is not allowed" }, { status: 400 });
    }
  }
}

async function handler({ request }: { request: Request }) {
  const registrationValidationError = await validateDynamicClientRegistrationRequest(request);
  if (registrationValidationError) return registrationValidationError;

  const sanitizedRequest = sanitizeOAuthAuthorizeRequest(request);
  const finalRequest = await defaultPublicClientRegistration(sanitizedRequest);

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
