# SEO/AEO Performance Improvements Design

## Goal

Improve the homepage's initial rendering, LCP path, canonical metadata, and documentation crawl hygiene using the existing web, server, and Mintlify seams.

## Scope

This change will:

- Exclude the application bootstrap module from Cloudflare Rocket Loader rewriting.
- Replace the homepage's initial autoplay video load with a high-priority poster and interaction-triggered video load.
- Serve versioned homepage media with long-lived immutable caching.
- Put complete root-page canonical, social, and JSON-LD metadata in the initial HTML response.
- Move the documentation introduction to `/getting-started` and redirect confirmed historical paths.

This change will not:

- Add SSR, prerendering, a shared SEO package, special AEO schema, or `llms.txt` work.
- Change noindex behavior for auth, dashboard, builder, settings, templates, or public resume routes.
- Add redirects for unconfirmed LinkedIn, AI-provider, v4, or placeholder URLs.
- Change homepage animation or overlay code without an interaction-performance profile.
- Change the Cloudflare zone-wide Rocket Loader setting from repository code.
- Claim field LCP or GSC validation before post-deployment field data is available.

## Approach

Use the existing ownership seams:

- `apps/web/index.html` owns the bootstrap script attribute.
- `apps/web/src/routes/_home/-sections/hero.tsx` owns homepage media behavior.
- `apps/server/src/static/web.ts` owns root HTML transformation and static response headers.
- `docs/docs.json` and the documentation source files own canonical documentation paths.

The server will keep serving the same client application shell. Only requests whose pathname is `/` will receive root SEO markup, so tracking parameters such as `/?utm_source=...` consolidate to the root canonical without leaking root metadata into noindex application shells.

## Homepage boot and media

The module script in `apps/web/index.html` will place `data-cfasync="false"` before `src`, which is the Cloudflare-supported per-script Rocket Loader exclusion.

The current media will become:

- `/videos/timelapse-v1.webp`: a representative poster extracted from the existing video.
- `/videos/timelapse-v1.mp4`: the existing video under a versioned filename.

The homepage route will preload the poster as an image with `fetchpriority="high"`. The hero will render a native `<video>` with:

- `poster="/videos/timelapse-v1.webp"`
- `preload="none"`
- native controls
- no `autoPlay`
- the existing intrinsic width, height, label, and aspect ratio

This keeps the current layout while preventing the 4.2 MB video from entering the cold-load critical path. Playback and video data loading begin only when the user interacts with the native control.

The static file middleware will add `Cache-Control: public, max-age=31536000, immutable` to files under `/videos/`. The `/videos/` directory is therefore reserved for versioned media; changed media must use a new versioned filename.

## Initial root metadata

`handleWebApp` will transform the root shell before returning it. The injected head markup will contain:

- A canonical link whose URL is the request origin normalized to `/`.
- `Reactive Resume — A free and open-source resume builder` as the title.
- The existing complete product description.
- Open Graph and Twitter title, description, URL, and banner image metadata.
- The poster preload.
- The existing WebSite, SoftwareApplication/WebApplication, Project, and FAQPage JSON-LD graph.

The canonical derivation discards the request query and fragment. It yields `https://rxresu.me/` in production while preserving the request host expected by self-hosted instances.

The client-rendered metadata remains as a navigation and hydration fallback. A new package or cross-app source import is intentionally avoided; focused tests will lock the initial-response contract.

If a malformed build shell lacks `</head>`, the transform will return the original HTML rather than preventing the application from loading.

## Documentation canonical paths

The documentation introduction will move from:

- `docs/getting-started/index.mdx`

to:

- `docs/getting-started.mdx`

Navigation and internal links will use `/getting-started`. `docs/docs.json` will add permanent redirects:

- `/getting-started/index` to `/getting-started`
- `/translation/README` to `/contributing/translations`

The second source is grounded in the deleted historical `docs/translation/README.md` path. No guessed redirects will be added for URLs whose old source and accurate replacement are not present in repository history.

## Testing and verification

Implementation will follow focused red-green cycles:

1. Extend `apps/server/src/static/web.test.ts` with a failing test proving that a tracking-parameter root request receives the normalized canonical, complete metadata, poster preload, and JSON-LD while non-root shells do not.
2. Add a failing static-cache test proving that versioned `/videos/` responses receive the immutable cache header.
3. Add a failing homepage hero test proving the video has a poster, `preload="none"`, controls, and no autoplay.
4. Make the smallest production changes that pass each test.

Fresh verification will include:

- Focused server and web tests.
- Server and web typechecks.
- Server and web production builds.
- A built-HTML check that the module bootstrap retains `type="module"` and `data-cfasync="false"`.
- `mint broken-links --check-redirects` from the documentation directory.
- A final diff review confirming no unrelated files changed.

The ten cold production navigations, throttled LCP measurement, field Core Web Vitals, and GSC validation remain deployment checks because local tests cannot reproduce Cloudflare rewriting or the 28-day field-data window.
