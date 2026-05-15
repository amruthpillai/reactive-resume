# Manifest-Only PWA Design

Date: 2026-05-15

## Goal

Reduce Reactive Resume's PWA implementation to install metadata only.

The site should remain installable on supported phones and desktops through the web app manifest, icons,
screenshots, and mobile app meta tags. The PWA implementation should not generate, register, or rely on a
service worker, and it should not provide offline support, app-shell precaching, runtime caching, or fallback
navigation.

## Non-Goals

- Do not add offline support.
- Do not add a no-op service worker.
- Do not add runtime caching rules for app assets, API responses, uploaded files, generated PDFs, or routes.
- Do not change product UI, routing, auth, resume editing, public resume pages, or PDF generation behavior.
- Do not change normal browser or HTTP caching behavior owned by the browser or server.

## Architecture

Keep PWA install metadata centered in `apps/web/src/libs/pwa.ts`. That module continues to own:

- `pwaManifest`
- `pwaHeadMetaTags`
- app name, description, theme color, background color, icons, screenshots, categories, scope, and start URL

Remove the service-worker part of the current architecture:

- Remove `VitePWA` usage from `apps/web/vite.config.ts`.
- Remove the `vite-plugin-pwa` dependency from `apps/web/package.json` and the lockfile.
- Remove the exported `pwaServiceWorkerRegistrationScript` from `apps/web/src/libs/pwa.ts`.
- Stop injecting the production `navigator.serviceWorker.register("/sw.js", { scope: "/" })` script from
  `apps/web/src/routes/__root.tsx`.

The root route keeps the existing manifest link:

```tsx
{ rel: "manifest", href: "/manifest.webmanifest", crossOrigin: "use-credentials" }
```

The root route also keeps the PWA-related head meta tags, including `theme-color` and Apple mobile web app tags,
because those are part of the install/open-as-app experience rather than offline behavior.

## Data Flow

Browsers discover install metadata by reading the root document head and fetching `/manifest.webmanifest`.

Manifest-linked assets continue to be served as static public assets from `apps/web/public`, including:

- favicon assets
- PWA icons
- maskable icon
- Apple touch icon
- installation screenshots

No service worker is emitted by the web build, no service worker is registered at runtime, and no Workbox
precache manifest is produced.

## Error Handling

There is no PWA-controlled offline fallback.

When the network is unavailable, the app behaves like a normal website: navigations, API calls, uploaded assets,
and generated downloads fail according to the browser and server behavior already in place. This is intentional
because installability is the only remaining PWA goal.

## Testing

Remove `apps/web/src/libs/pwa.test.ts`.

The file currently tests both install metadata and service-worker registration behavior. After this change, the
remaining PWA surface is static manifest/head metadata with no behavior-specific module contract worth preserving
as a dedicated unit test.

Implementation should still verify by inspection and build output that:

- the root route keeps the manifest link
- PWA head meta tags remain present
- no service-worker registration script is exported or injected by the root route
- no `sw.js` or Workbox precache output is emitted by the web build

Focused validation after implementation:

```sh
pnpm --filter web typecheck
pnpm --filter web build
```

If the package dependency removal changes the lockfile, verify the lockfile remains scoped to removing
`vite-plugin-pwa` and its now-unused Workbox dependency graph.
