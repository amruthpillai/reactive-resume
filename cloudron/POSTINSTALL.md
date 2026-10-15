Open the app and create an account. Anyone who can reach the app can sign up.

<sso>
Cloudron users can also sign in with their Cloudron account.
</sso>

To disable sign-ups, add other sign-in providers or set a shared AI provider, set the matching
[environment variables](https://docs.rxresu.me/self-hosting/environment-variables) with the Cloudron CLI. The app restarts with the new settings:

```
cloudron env set --app $CLOUDRON-APP-FQDN FLAG_DISABLE_SIGNUPS=true
```
