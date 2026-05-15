# Unsafe OAuth Redirect URI Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS` with `FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI`, preserving safe defaults and allowing any parseable redirect URI only when the flag is enabled.

**Architecture:** Keep OAuth redirect URI policy centralized in `packages/utils/src/url-security.node.ts`. Pass the new env flag from both Better Auth hook validation and the server auth preflight so both paths make identical decisions. Update env/docs references and tests in the same slice.

**Tech Stack:** TypeScript, Zod env schema, Better Auth hook middleware, Vitest, Turborepo env filtering, MDX docs.

---

## File Structure

- Modify `packages/utils/src/url-security.node.ts`: Change the OAuth redirect validator from allowlist-based to mode-based.
- Modify `packages/utils/src/url-security.node.test.ts`: Update safe-mode tests and add unsafe-mode coverage.
- Modify `packages/env/src/server.ts`: Remove the old allowlist env var and add `FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI`.
- Modify `packages/auth/src/config.ts`: Remove host-list parsing and pass `{ allowUnsafe: env.FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI }`.
- Modify `apps/server/src/http/auth.ts`: Remove host-list parsing and pass the same flag to the validator.
- Modify `apps/server/src/http/auth.test.ts`: Update env mock shape and preserve existing local edits.
- Modify `turbo.json`, `.env.example`, and MDX docs: Replace old env references with the new flag and warnings.

### Task 1: URL Policy Tests And Validator

**Files:**
- Modify: `packages/utils/src/url-security.node.test.ts`
- Modify: `packages/utils/src/url-security.node.ts`

- [ ] **Step 1: Write the failing safe/unsafe OAuth redirect tests**

Use this shape in `packages/utils/src/url-security.node.test.ts`:

```ts
describe("isAllowedOAuthRedirectUri", () => {
	const trustedOrigins = ["https://app.example.com"];

	it("returns false for malformed URI", () => {
		expect(isAllowedOAuthRedirectUri("nope", trustedOrigins)).toBe(false);
	});

	it("returns true for any parseable URI when unsafe mode is enabled", () => {
		const options = { allowUnsafe: true };

		expect(isAllowedOAuthRedirectUri("myapp://callback", trustedOrigins, options)).toBe(true);
		expect(isAllowedOAuthRedirectUri("http://example.com/cb", trustedOrigins, options)).toBe(true);
		expect(isAllowedOAuthRedirectUri("https://192.168.1.1/cb", trustedOrigins, options)).toBe(true);
		expect(isAllowedOAuthRedirectUri("https://u:p@app.example.com/cb#x", trustedOrigins, options)).toBe(true);
		expect(isAllowedOAuthRedirectUri("not a url", trustedOrigins, options)).toBe(false);
	});
});
```

- [ ] **Step 2: Run the focused utils test and verify it fails**

Run: `pnpm --filter @reactive-resume/utils test -- src/url-security.node.test.ts`

Expected before implementation: TypeScript/test failure because `isAllowedOAuthRedirectUri` still requires the removed allowlist argument.

- [ ] **Step 3: Implement mode-based OAuth redirect validation**

Use this signature in `packages/utils/src/url-security.node.ts`:

```ts
type OAuthRedirectUriOptions = {
	allowUnsafe?: boolean;
};

export function isAllowedOAuthRedirectUri(
	input: string,
	trustedOrigins: string[],
	options?: OAuthRedirectUriOptions,
) {
	const parsed = parseUrl(input);
	if (!parsed) return false;
	if (options?.allowUnsafe) return true;
	if (parsed.username || parsed.password) return false;
	if (parsed.hash) return false;

	const origin = parsed.origin.toLowerCase();
	const hostname = normalizeHostname(parsed.hostname);

	if (parsed.protocol === "http:") return isOAuthLoopbackRedirectHost(hostname);
	if (parsed.protocol !== "https:") return false;
	if (isPrivateOrLoopbackHost(hostname)) return false;

	return trustedOrigins.includes(origin);
}
```

- [ ] **Step 4: Run the focused utils test and verify it passes**

Run: `pnpm --filter @reactive-resume/utils test -- src/url-security.node.test.ts`

Expected after implementation: all tests in `url-security.node.test.ts` pass.

### Task 2: Env And Runtime Wiring

**Files:**
- Modify: `packages/env/src/server.ts`
- Modify: `packages/auth/src/config.ts`
- Modify: `apps/server/src/http/auth.ts`
- Modify: `apps/server/src/http/auth.test.ts`
- Modify: `turbo.json`

- [ ] **Step 1: Update env schema and Turbo env list**

In `packages/env/src/server.ts`, remove:

```ts
OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS: z.string().optional(),
```

Add with feature flags:

```ts
FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI: z.stringbool().default(false),
```

In `turbo.json`, remove `"OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS"` and add `"FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI"` beside the other flags.

- [ ] **Step 2: Wire the flag into Better Auth config**

In `packages/auth/src/config.ts`, remove `parseAllowedHostList` usage and call:

```ts
if (
	!isAllowedOAuthRedirectUri(uri, TRUSTED_ORIGINS, {
		allowUnsafe: env.FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI,
	})
) {
	throw new APIError("BAD_REQUEST", {
		message: "redirect_uri is not allowed for dynamic client registration",
	});
}
```

- [ ] **Step 3: Wire the flag into server preflight**

In `apps/server/src/http/auth.ts`, remove `parseAllowedHostList` usage and call:

```ts
!isAllowedOAuthRedirectUri(redirectUri, oauthTrustedOrigins, {
	allowUnsafe: env.FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI,
})
```

Update the test env mock in `apps/server/src/http/auth.test.ts`:

```ts
env: {
	SERVER_PORT: 3001,
	APP_URL: "http://localhost:3000",
	FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI: false,
},
```

- [ ] **Step 4: Run focused typechecks**

Run:

```sh
pnpm --filter @reactive-resume/auth typecheck
pnpm --filter server typecheck
```

Expected: both commands exit 0.

### Task 3: Docs And Env Examples

**Files:**
- Modify: `.env.example`
- Modify: `docs/self-hosting/docker.mdx`
- Modify: `docs/self-hosting/sso.mdx`
- Modify: `docs/getting-started/quickstart.mdx`

- [ ] **Step 1: Replace old env docs with the new flag**

Remove all `OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS` references.

Add this warning wherever feature flags are documented:

```md
`FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI`: Allows dynamic OAuth client registration to use any parseable redirect URI, including custom schemes, private hosts, and non-loopback `http://` URLs. Keep disabled unless this is a trusted self-hosted deployment. Enabling it on public or multi-tenant instances can enable phishing or token exfiltration.
```

- [ ] **Step 2: Verify the removed env is gone from product code and docs**

Run: `rg -n "OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS" . --glob "!docs/superpowers/**"`

Expected: no matches outside the approved design and implementation plan documents.

Run: `rg -n "FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI" .`

Expected: matches in env schema, Turbo config, docs, tests, and runtime validation paths.

### Task 4: Final Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run focused tests**

Run:

```sh
pnpm --filter @reactive-resume/utils test -- src/url-security.node.test.ts
pnpm --filter server test -- src/http/auth.test.ts
```

Expected: both commands exit 0.

- [ ] **Step 2: Run focused typechecks and boundaries**

Run:

```sh
pnpm --filter @reactive-resume/auth typecheck
pnpm --filter server typecheck
pnpm exec turbo boundaries
```

Expected: all commands exit 0.
