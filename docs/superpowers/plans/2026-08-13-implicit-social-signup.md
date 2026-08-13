# Implicit Social Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every built-in social sign-in create an unknown user automatically while preserving the global signup restriction.

**Architecture:** Use Better Auth's native implicit-signup behavior by removing the provider-level opt-out. Delete the client-side `requestSignUp` distinction so every page uses the same social sign-in call, while `disableSignUp: env.FLAG_DISABLE_SIGNUPS` remains the server-enforced hard stop.

**Tech Stack:** TypeScript, Better Auth 1.6.26, React 19, Vitest, pnpm

## Global Constraints

- Do not add dependencies or new abstractions.
- Apply the behavior to Google, GitHub, and LinkedIn.
- Leave custom OAuth and passkey behavior unchanged.
- Keep `FLAG_DISABLE_SIGNUPS` authoritative on the server.

---

## File Structure

- `packages/auth/src/config.test.ts`: Characterizes Reactive Resume's built-in social-provider signup policy.
- `packages/auth/src/config.ts`: Owns Better Auth provider configuration and the global signup restriction.
- `apps/web/src/features/auth/components/social-auth.tsx`: Starts social sign-in without page-specific signup intent.
- `apps/web/src/features/auth/pages/register.tsx`: Uses the shared social-auth component without signup-only props.

### Task 1: Use Better Auth's Native Implicit Social Signup

**Files:**
- Create: `packages/auth/src/config.test.ts`
- Modify: `packages/auth/src/config.ts:196-223`
- Modify: `apps/web/src/features/auth/components/social-auth.tsx:14-66,115-137`
- Modify: `apps/web/src/features/auth/pages/register.tsx:245`

**Interfaces:**
- Consumes: `auth.options.socialProviders`, `env.FLAG_DISABLE_SIGNUPS`, and `authClient.signIn.social({ provider, callbackURL })`.
- Produces: One social-auth flow in which existing identities sign in, unknown identities sign up implicitly, and globally disabled signups remain rejected by Better Auth.

- [ ] **Step 1: Write the failing configuration test**

Create `packages/auth/src/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { env } from "@reactive-resume/env/server";
import { auth } from "./config";

describe("social provider signup policy", () => {
	it.each(["google", "github", "linkedin"] as const)(
		"allows implicit signup through %s while honoring the global signup restriction",
		(provider) => {
			const config = auth.options.socialProviders?.[provider];

			expect(config?.disableImplicitSignUp).toBeUndefined();
			expect(config?.disableSignUp).toBe(env.FLAG_DISABLE_SIGNUPS);
		},
	);
});
```

This test catches a provider being opted out of implicit signup or becoming detached from `FLAG_DISABLE_SIGNUPS`.

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```bash
pnpm --filter @reactive-resume/auth test -- src/config.test.ts
```

Expected: FAIL for Google, GitHub, and LinkedIn because `disableImplicitSignUp` is currently `true`, not `undefined`.

- [ ] **Step 3: Enable native implicit signup and delete client-side signup intent**

In `packages/auth/src/config.ts`, remove only the three `disableImplicitSignUp: true` properties. Keep each provider's existing line:

```ts
disableSignUp: env.FLAG_DISABLE_SIGNUPS,
```

In `apps/web/src/features/auth/components/social-auth.tsx`, delete `SocialAuthProps`, `SocialSignInOptions`, and `getSocialSignInOptions`. Change the component signature:

```ts
export function SocialAuth() {
```

Change the loading branch to:

```tsx
{isLoading ? <SocialAuthSkeleton /> : <SocialAuthButtons providers={providers} />}
```

Remove `requestSignUp` from the button props and function parameter:

```ts
type SocialAuthButtonsProps = {
	providers: RouterOutput["auth"]["providers"]["list"];
};

function SocialAuthButtons({ providers }: SocialAuthButtonsProps) {
```

Replace the Google, GitHub, and LinkedIn calls with the native Better Auth input shape:

```ts
authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" });
authClient.signIn.social({ provider: "linkedin", callbackURL: "/dashboard" });
```

In `apps/web/src/features/auth/pages/register.tsx`, change:

```tsx
<SocialAuth requestSignUp />
```

to:

```tsx
<SocialAuth />
```

Do not modify `LoginPage`; it already renders `<SocialAuth />`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
pnpm --filter @reactive-resume/auth test -- src/config.test.ts
```

Expected: PASS for all three providers.

- [ ] **Step 5: Run focused validation**

Run:

```bash
pnpm --filter @reactive-resume/auth typecheck
pnpm --filter web typecheck
pnpm exec biome check packages/auth/src/config.test.ts packages/auth/src/config.ts apps/web/src/features/auth/components/social-auth.tsx apps/web/src/features/auth/pages/register.tsx
```

Expected: all commands exit successfully with no diagnostics and no file changes.

- [ ] **Step 6: Commit the implementation**

```bash
git add packages/auth/src/config.test.ts packages/auth/src/config.ts apps/web/src/features/auth/components/social-auth.tsx apps/web/src/features/auth/pages/register.tsx
git commit -m "fix(auth): allow implicit social signup"
```
