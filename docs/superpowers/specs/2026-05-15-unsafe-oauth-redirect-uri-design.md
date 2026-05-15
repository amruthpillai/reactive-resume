# Unsafe OAuth Redirect URI Flag Design

Date: 2026-05-15

## Goal

Replace `OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS` with a single explicit escape hatch:
`FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI`.

By default, dynamic OAuth client registration keeps the existing safe behavior: redirect URIs are allowed only when they target the app origin or local loopback callback hosts. When the flag is enabled, trusted self-hosted deployments may register any parseable redirect URI, including private network URLs, non-loopback `http://` URLs, and custom schemes such as `myapp://callback`.

## Non-Goals

- Do not change whether dynamic OAuth client registration is enabled.
- Do not change MCP OAuth audience handling, login, consent, token issuance, or public client registration defaults.
- Do not reuse `FLAG_ALLOW_UNSAFE_AI_BASE_URL`; OAuth redirect handling is a separate trust boundary.
- Do not keep a curated redirect-host allowlist after this change.

## Architecture

The existing redirect URI policy remains centralized in `@reactive-resume/utils/url-security.node`.

Introduce a mode-based OAuth redirect validator API, for example:

```ts
isAllowedOAuthRedirectUri(input, trustedOrigins, { allowUnsafe })
```

Safe mode keeps the current rules:

- Reject malformed URIs.
- Reject embedded credentials.
- Reject URI fragments.
- Allow `http://localhost`, `http://127.0.0.1`, and `http://[::1]` callbacks.
- Allow `https://` callbacks whose origin matches `APP_URL`.
- Reject other public HTTPS hosts, private HTTPS hosts, non-loopback HTTP hosts, and non-HTTP schemes.

Unsafe mode deliberately weakens the redirect URI trust check:

- Allow any URI accepted by the platform URL parser.
- Allow custom schemes such as `myapp://callback`.
- Allow private and loopback hosts on any supported URL scheme.
- Allow non-loopback `http://` URLs.

Unsafe mode should still reject strings that are not parseable as URLs. It does not preserve the current credentials or fragment restrictions, because the requested behavior is absolute unsafe: any parseable URI scheme is accepted.

## Data Flow

`packages/env/src/server.ts` defines `FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI` as a `z.stringbool().default(false)` feature flag and removes `OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS`.

`packages/auth/src/config.ts` uses the flag in the Better Auth `hooks.before` validation for `/oauth2/register`.

`apps/server/src/http/auth.ts` uses the same flag in the server-level registration preflight before forwarding the request to Better Auth.

Both validation paths must make the same allow or reject decision for the same redirect URI. The server preflight remains useful because it returns OAuth-shaped registration errors before the request enters Better Auth, while the Better Auth hook remains a defense-in-depth check.

## Documentation

Remove `OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS` from:

- `packages/env/src/server.ts`
- `turbo.json`
- `.env.example`
- Docker and self-hosting docs
- Quickstart docs

Add `FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI` to the feature flag sections and env examples with a warning that it is only appropriate for trusted self-hosted deployments. The warning should call out that enabling it permits arbitrary OAuth redirect URIs and can enable phishing or token exfiltration if used on public or multi-tenant instances.

## Error Handling

Rejected safe-mode redirects continue to return the existing error shape:

- Better Auth hook: `BAD_REQUEST` with `redirect_uri is not allowed for dynamic client registration`.
- Server preflight: `400` with `invalid_redirect_uri`.

Unsafe mode only returns those errors when the redirect URI cannot be parsed as a URL or a non-string entry is supplied in `redirect_uris`.

## Testing

Update focused tests in the relevant packages:

- URL policy tests cover safe mode preserving current allowed and rejected cases.
- URL policy tests cover unsafe mode allowing custom schemes, private hosts, non-loopback `http://`, credentials, and fragments when the URI is parseable.
- Auth/server tests cover the env mock shape after removing `OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS`.
- Documentation and env references no longer mention the removed variable.

Run focused validation after implementation:

```sh
pnpm --filter @reactive-resume/utils test -- src/url-security.node.test.ts
pnpm --filter server test -- src/http/auth.test.ts
pnpm --filter @reactive-resume/auth typecheck
pnpm --filter server typecheck
pnpm exec turbo boundaries
```
