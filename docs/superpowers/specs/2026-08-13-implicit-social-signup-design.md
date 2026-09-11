# Implicit Social Signup

## Goal

Let social authentication behave identically wherever it is initiated: existing users sign in, while unknown users are created automatically when signups are enabled.

## Design

Use Better Auth's default implicit-signup behavior for Google, GitHub, and LinkedIn by removing `disableImplicitSignUp: true` from their provider configuration. Keep `disableSignUp: env.FLAG_DISABLE_SIGNUPS` as the server-enforced global restriction.

Delete the now-unnecessary `requestSignUp` prop, option builder, and page-specific handling from the shared social-auth component. Both login and registration pages will invoke the same social sign-in call with only the provider and callback URL.

Custom OAuth already permits implicit signup unless the global restriction is enabled. Passkey authentication is not a social provider and remains unchanged.

## Behavior

- A social identity linked to an existing Reactive Resume user signs that user in.
- An unknown social identity creates a user and signs them in when signups are enabled.
- An unknown social identity is rejected when `FLAG_DISABLE_SIGNUPS` is enabled.
- The behavior does not depend on whether authentication began on the login or registration page.

## Verification

Add one focused auth configuration regression test proving that built-in social providers allow implicit signup while continuing to follow the global `disableSignUp` setting. Run the focused auth tests and relevant typechecks.
