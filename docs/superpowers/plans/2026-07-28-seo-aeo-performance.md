# SEO/AEO Performance Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the homepage bootstrap, LCP media path, initial root metadata, media caching, and canonical documentation URLs without adding SSR or new dependencies.

**Architecture:** Keep each change in its current owner: the server web fallback injects root-only SEO and cache headers, the homepage hero uses native lazy video behavior, the static HTML protects the module bootstrap, and Mintlify config owns documentation redirects. Existing client-rendered SEO remains as the hydration and client-navigation fallback.

**Tech Stack:** TypeScript, React 19, TanStack Router, Hono, Vitest, Testing Library, Vite, Mintlify, ffmpeg, cwebp.

## Global Constraints

- Do not add a dependency, package, SSR layer, prerenderer, special AEO schema, or `llms.txt` work.
- Preserve existing `noindex, follow` behavior for application shells and public resume routes.
- Do not add unconfirmed LinkedIn, AI-provider, v4, or placeholder redirects.
- Keep the existing WebSite, SoftwareApplication/WebApplication, Project, and FAQPage JSON-LD facts.
- Keep `/videos/` limited to versioned immutable media filenames.
- Do not claim field LCP, Core Web Vitals, or GSC validation from local verification.
- Do not use the write-capable repository-wide `pnpm check`; run focused non-mutating checks.

---

### Task 1: Initial root metadata and versioned-media caching

**Files:**

- Modify: `apps/server/src/static/web.test.ts`
- Modify: `apps/server/src/static/web.ts`

**Interfaces:**

- Consumes: `Request.url`, the built `apps/web/dist/index.html`, and Hono `serveStatic.onFound`.
- Produces: the unchanged `handleWebApp(request: Request): Promise<Response>` interface and the unchanged `serveWebDistStatic` middleware export.

- [ ] **Step 1: Make the static middleware options observable in the existing test**

Replace the current `serveStatic` mock with a hoisted mock and capture its options immediately after importing `web.ts`:

```ts
const mocks = vi.hoisted(() => ({
	serveStatic: vi.fn((_options?: unknown) => vi.fn()),
}));

vi.mock("@hono/node-server/serve-static", () => ({
	serveStatic: mocks.serveStatic,
}));

type StaticOptions = {
	onFound?: (
		path: string,
		context: {
			req: { path: string };
			header: (name: string, value: string) => void;
		},
	) => void | Promise<void>;
};

const { handleWebApp } = await import("./web");
const staticOptions = mocks.serveStatic.mock.calls[0]?.[0] as StaticOptions | undefined;
```

- [ ] **Step 2: Write the failing root metadata test**

Add this test to `apps/server/src/static/web.test.ts`:

```ts
it("injects canonical metadata and structured data into tracking-parameter root requests only", async () => {
	vi.mocked(fs.readFile).mockResolvedValue(`
		<!doctype html>
		<html>
			<head>
				<title>Reactive Resume — A free and open-source resume builder</title>
				<meta
					name="description"
					content="Reactive Resume is a free and open-source resume builder that simplifies the process of creating, updating, and sharing your resume."
				>
			</head>
			<body><div id="app"></div></body>
		</html>
	`);

	const response = await handleWebApp(new Request("https://example.com/?utm_source=search"));
	const html = await response.text();

	expect(html).toContain('<link rel="canonical" href="https://example.com/">');
	expect(html).toContain('<link rel="preload" href="/videos/timelapse-v1.webp" as="image" fetchpriority="high">');
	expect(html).toContain('<meta property="og:url" content="https://example.com/">');
	expect(html).toContain('<meta property="og:image" content="https://example.com/opengraph/banner.jpg">');
	expect(html).toContain('id="reactive-resume-structured-data"');
	expect(html).toContain('"@type":["SoftwareApplication","WebApplication"]');
	expect(html).not.toContain("utm_source");

	const dashboardResponse = await handleWebApp(new Request("https://example.com/dashboard"));
	expect(await dashboardResponse.text()).not.toContain('rel="canonical"');
});
```

- [ ] **Step 3: Write the failing immutable-cache test**

Add this test beside the root metadata test:

```ts
it("caches versioned homepage media immutably", async () => {
	const headers = new Headers();

	await staticOptions?.onFound?.("", {
		req: { path: "/videos/timelapse-v1.mp4" },
		header: (name, value) => headers.set(name, value),
	});

	expect(headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
});
```

- [ ] **Step 4: Run the focused server test and verify RED**

Run:

```bash
pnpm --filter server test -- src/static/web.test.ts
```

Expected: two failures. The root response lacks canonical/JSON-LD markup and the static middleware has no `onFound` callback.

- [ ] **Step 5: Add root metadata constants and serializer**

Add the following block after `BASE_SECURITY_HEADERS` in `apps/server/src/static/web.ts`:

```ts
const ROOT_TITLE = "Reactive Resume — A free and open-source resume builder";
const ROOT_DESCRIPTION =
	"Reactive Resume is a free and open-source resume builder that simplifies the process of creating, updating, and sharing your resume.";
const ROOT_POSTER_PATH = "/videos/timelapse-v1.webp";
const ROOT_FAQ_ITEMS = [
	{
		question: "Is Reactive Resume really free?",
		answer:
			"Yes! Reactive Resume is completely free to use, with no hidden costs, premium tiers, or subscription fees. It's open-source and will always remain free.",
	},
	{
		question: "How is my data protected?",
		answer:
			"Your data is stored securely and is never shared with third parties. You can also self-host Reactive Resume on your own servers for complete control over your data.",
	},
	{
		question: "Can I export my resume to PDF?",
		answer:
			"Absolutely! You can export your resume to PDF with a single click. The exported PDF maintains all your formatting and styling perfectly.",
	},
	{
		question: "Is Reactive Resume available in multiple languages?",
		answer:
			"Yes, Reactive Resume is available in multiple languages. You can choose your preferred language in the settings page, or using the language switcher in the top right corner. If you don't see your language, or you would like to improve the existing translations, you can contribute to the translations on Crowdin.",
	},
	{
		question: "What makes Reactive Resume different from other resume builders?",
		answer:
			"Reactive Resume is open-source, privacy-focused, and completely free. Unlike other resume builders, it doesn't show ads, track your data, or limit your features behind a paywall.",
	},
	{
		question: "How do I share my resume?",
		answer:
			"You can share your resume via a unique public URL, protect it with a password, or download it as a PDF to share directly. The choice is yours!",
	},
] as const;

function createRootSeoMarkup(canonicalUrl: string) {
	const origin = new URL(canonicalUrl).origin;
	const imageUrl = `${origin}/opengraph/banner.jpg`;
	const structuredData = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				name: "Reactive Resume",
				url: canonicalUrl,
			},
			{
				"@type": ["SoftwareApplication", "WebApplication"],
				name: "Reactive Resume",
				url: canonicalUrl,
				description: ROOT_DESCRIPTION,
				applicationCategory: "BusinessApplication",
				operatingSystem: "Web",
				isAccessibleForFree: true,
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
				},
				codeRepository: "https://github.com/amruthpillai/reactive-resume",
			},
			{
				"@type": "Project",
				name: "Reactive Resume",
				url: canonicalUrl,
				sameAs: ["https://github.com/amruthpillai/reactive-resume"],
			},
			{
				"@type": "FAQPage",
				mainEntity: ROOT_FAQ_ITEMS.map((item) => ({
					"@type": "Question",
					name: item.question,
					acceptedAnswer: {
						"@type": "Answer",
						text: item.answer,
					},
				})),
			},
		],
	};

	return `
		<link rel="canonical" href="${canonicalUrl}">
		<link rel="preload" href="${ROOT_POSTER_PATH}" as="image" fetchpriority="high">
		<meta property="og:type" content="website">
		<meta property="og:site_name" content="Reactive Resume">
		<meta property="og:title" content="${ROOT_TITLE}">
		<meta property="og:description" content="${ROOT_DESCRIPTION}">
		<meta property="og:url" content="${canonicalUrl}">
		<meta property="og:image" content="${imageUrl}">
		<meta name="twitter:card" content="summary_large_image">
		<meta name="twitter:title" content="${ROOT_TITLE}">
		<meta name="twitter:description" content="${ROOT_DESCRIPTION}">
		<meta name="twitter:image" content="${imageUrl}">
		<script id="reactive-resume-structured-data" type="application/ld+json">${JSON.stringify(structuredData)}</script>
	`;
}
```

- [ ] **Step 6: Add the immutable media header**

Replace the current `serveWebDistStatic` declaration with:

```ts
export const serveWebDistStatic = serveStatic({
	root: staticRoot,
	onFound: (_path, context) => {
		if (context.req.path.startsWith("/videos/")) {
			context.header("Cache-Control", "public, max-age=31536000, immutable");
		}
	},
});
```

- [ ] **Step 7: Inject metadata only for the root pathname**

Parse the request URL once and replace the closing head only for `/`:

```ts
export async function handleWebApp(request: Request) {
	const isHead = request.method === "HEAD";
	const requestUrl = new URL(request.url);
	const pathname = requestUrl.pathname;

	if (!isNoindexShellPath(pathname) && isAssetPath(pathname)) {
		return new Response(isHead ? null : "Not Found", { status: 404 });
	}

	const headers = getFallbackResponseHeaders(pathname);
	if (!headers) return notFoundResponse({ head: isHead, noindex: true });

	if (isHead) return new Response(null, { status: 200, headers });

	const html = await fs.readFile(indexHtmlPath, "utf-8");
	const canonicalUrl = new URL("/", requestUrl.origin).toString();
	const responseHtml = pathname === "/" ? html.replace("</head>", `${createRootSeoMarkup(canonicalUrl)}</head>`) : html;

	return new Response(responseHtml, { headers });
}
```

- [ ] **Step 8: Run the focused server test and verify GREEN**

Run:

```bash
pnpm --filter server test -- src/static/web.test.ts
```

Expected: all tests in `src/static/web.test.ts` pass.

- [ ] **Step 9: Run the focused server typecheck**

Run:

```bash
pnpm --filter server typecheck
```

Expected: exit code 0.

- [ ] **Step 10: Commit Task 1**

```bash
git add apps/server/src/static/web.test.ts apps/server/src/static/web.ts
git commit -m "fix(server): emit initial homepage SEO metadata"
```

---

### Task 2: Homepage poster, interaction-loaded video, and Rocket Loader exclusion

**Files:**

- Create: `apps/web/src/routes/_home/-sections/hero.test.tsx`
- Modify: `apps/web/src/routes/_home/-sections/hero.tsx`
- Modify: `apps/web/src/routes/_home/index.tsx`
- Modify: `apps/web/index.html`
- Rename: `apps/web/public/videos/timelapse.mp4` to `apps/web/public/videos/timelapse-v1.mp4`
- Create: `apps/web/public/videos/timelapse-v1.webp`

**Interfaces:**

- Consumes: the existing `Hero` component and TanStack route head descriptor.
- Produces: the unchanged `Hero(): JSX.Element` interface and versioned `/videos/timelapse-v1.{webp,mp4}` public media URLs.

- [ ] **Step 1: Write the failing hero media test**

Create `apps/web/src/routes/_home/-sections/hero.test.tsx`:

```tsx
// @vitest-environment happy-dom

import type { PropsWithChildren } from "react";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

type LinkProps = PropsWithChildren<{
	to: string;
}>;

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, ...rest }: LinkProps) => (
		<a href={to} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("@/components/animation/comet-card", () => ({
	CometCard: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

vi.mock("@/components/animation/spotlight", () => ({
	Spotlight: () => <div data-testid="spotlight" />,
}));

i18n.loadAndActivate({ locale: "en", messages: {} });

const { Hero } = await import("./hero");

describe("Hero", () => {
	it("shows a poster and waits for user interaction before loading the video", () => {
		const { container } = render(
			<I18nProvider i18n={i18n}>
				<Hero />
			</I18nProvider>,
		);
		const video = container.querySelector("video");

		expect(video).toHaveAttribute("poster", "/videos/timelapse-v1.webp");
		expect(video).toHaveAttribute("preload", "none");
		expect(video).toHaveAttribute("src", "/videos/timelapse-v1.mp4");
		expect(video).toHaveAttribute("controls");
		expect(video).not.toHaveAttribute("autoplay");
	});
});
```

- [ ] **Step 2: Run the hero test and verify RED**

Run:

```bash
pnpm --filter web test -- src/routes/_home/-sections/hero.test.tsx
```

Expected: failure because the existing video autoplays and has no poster, controls, or `preload="none"`.

- [ ] **Step 3: Version the video and generate the poster**

Run:

```bash
git mv apps/web/public/videos/timelapse.mp4 apps/web/public/videos/timelapse-v1.mp4
poster_tmp_dir=$(mktemp -d /tmp/reactive-resume-poster.XXXXXX)
ffmpeg -loglevel error -ss 00:00:03 -i apps/web/public/videos/timelapse-v1.mp4 -frames:v 1 "$poster_tmp_dir/frame.png"
cwebp -quiet -q 82 "$poster_tmp_dir/frame.png" -o apps/web/public/videos/timelapse-v1.webp
magick identify -format '%wx%h %b\n' apps/web/public/videos/timelapse-v1.webp
```

Expected: `1146x720` and a WebP size substantially below the 4.2 MB video.

- [ ] **Step 4: Replace autoplay with native lazy video behavior**

Replace the video element in `apps/web/src/routes/_home/-sections/hero.tsx` with:

```tsx
<video
	loop
	muted
	controls
	playsInline
	preload="none"
	width={1146}
	height={720}
	poster="/videos/timelapse-v1.webp"
	src="/videos/timelapse-v1.mp4"
	aria-label={t`Timelapse demonstration of building a resume with Reactive Resume`}
	className="aspect-[1146/720] w-full rounded-md border object-cover"
/>
```

- [ ] **Step 5: Add the client-navigation poster preload**

Change the homepage route `links` array in `apps/web/src/routes/_home/index.tsx` to:

```ts
links: [
	{ rel: "canonical", href: canonicalUrl },
	{ rel: "preload", href: "/videos/timelapse-v1.webp", as: "image", fetchPriority: "high" },
],
```

- [ ] **Step 6: Protect the bootstrap and make the base title complete**

Change the title and module script in `apps/web/index.html` to:

```html
<title>Reactive Resume — A free and open-source resume builder</title>
```

```html
<script type="module" data-cfasync="false" src="/src/main.tsx"></script>
```

The `data-cfasync` attribute must remain before `src`.

- [ ] **Step 7: Run the hero test and verify GREEN**

Run:

```bash
pnpm --filter web test -- src/routes/_home/-sections/hero.test.tsx
```

Expected: the hero test passes.

- [ ] **Step 8: Run the focused web typecheck and production build**

Run:

```bash
pnpm --filter web typecheck
pnpm --filter web build
```

Expected: both commands exit 0.

- [ ] **Step 9: Verify the built bootstrap and media**

Run:

```bash
rg -n '<script[^>]*type="module"[^>]*data-cfasync="false"[^>]*src=' apps/web/dist/index.html
test -f apps/web/dist/videos/timelapse-v1.webp
test -f apps/web/dist/videos/timelapse-v1.mp4
```

Expected: one module script match and both versioned media files exist in `dist`.

- [ ] **Step 10: Commit Task 2**

```bash
git add apps/web/index.html apps/web/public/videos/timelapse-v1.mp4 apps/web/public/videos/timelapse-v1.webp apps/web/src/routes/_home/-sections/hero.test.tsx apps/web/src/routes/_home/-sections/hero.tsx apps/web/src/routes/_home/index.tsx
git commit -m "perf(web): remove homepage video from the LCP path"
```

---

### Task 3: Canonical documentation paths and redirects

**Files:**

- Rename: `docs/getting-started/index.mdx` to `docs/getting-started.mdx`
- Modify: `docs/docs.json`
- Modify: `docs/use-cases/free-resume-builder.mdx`
- Modify: `docs/use-cases/open-source-resume-builder.mdx`

**Interfaces:**

- Consumes: Mintlify page paths and `docs.json` redirects.
- Produces: `/getting-started` as the canonical introduction and permanent redirects from `/getting-started/index` and `/translation/README`.

- [ ] **Step 1: Run a desired-state check and verify RED**

Run:

```bash
test -f docs/getting-started.mdx &&
	test ! -e docs/getting-started/index.mdx &&
	! rg -n '"getting-started/index"' docs/docs.json &&
	! rg -n '\]\(/getting-started/index\)' docs --glob '*.mdx'
```

Expected: nonzero exit because the introduction still lives at `docs/getting-started/index.mdx`.

- [ ] **Step 2: Move the introduction page**

Run:

```bash
git mv docs/getting-started/index.mdx docs/getting-started.mdx
```

- [ ] **Step 3: Add redirects and update navigation**

Add this top-level field after `description` in `docs/docs.json`:

```json
"redirects": [
	{
		"source": "/getting-started/index",
		"destination": "/getting-started"
	},
	{
		"source": "/translation/README",
		"destination": "/contributing/translations"
	}
],
```

Change the first Getting Started navigation page from:

```json
"getting-started/index"
```

to:

```json
"getting-started"
```

- [ ] **Step 4: Update internal links**

In `docs/use-cases/free-resume-builder.mdx`, change:

```md
Start with [Introduction](/getting-started) for the product overview or follow the [Quickstart](/getting-started/quickstart) to create your first resume on [rxresu.me](https://rxresu.me).
```

In `docs/use-cases/open-source-resume-builder.mdx`, change:

```md
- [Introduction](/getting-started)
```

- [ ] **Step 5: Re-run the desired-state check and verify GREEN**

Run:

```bash
test -f docs/getting-started.mdx &&
	test ! -e docs/getting-started/index.mdx &&
	! rg -n '"getting-started/index"' docs/docs.json &&
	! rg -n '\]\(/getting-started/index\)' docs --glob '*.mdx'
```

Expected: exit code 0. The redirect source includes a leading slash, so it does not match the removed navigation value.

- [ ] **Step 6: Validate Mintlify redirects and links**

Run from the repository root:

```bash
cd docs && pnpm dlx mint@4.2.748 broken-links --check-redirects
```

Expected: no broken internal links or invalid redirect destinations.

- [ ] **Step 7: Run Markdown and JSON checks**

Run:

```bash
pnpm exec markdownlint-cli2 docs/getting-started.mdx docs/use-cases/free-resume-builder.mdx docs/use-cases/open-source-resume-builder.mdx
node -e 'JSON.parse(require("node:fs").readFileSync("docs/docs.json", "utf8"))'
```

Expected: both commands exit 0.

- [ ] **Step 8: Commit Task 3**

```bash
git add docs/docs.json docs/getting-started.mdx docs/use-cases/free-resume-builder.mdx docs/use-cases/open-source-resume-builder.mdx
git commit -m "docs: repair canonical documentation paths"
```

---

### Task 4: Fresh completion verification

**Files:**

- Verify only; do not create or modify files.

**Interfaces:**

- Consumes: all changes from Tasks 1–3.
- Produces: current test, typecheck, build, documentation, and diff evidence.

- [ ] **Step 1: Run focused formatting and lint checks**

Run:

```bash
pnpm exec biome check --error-on-warnings apps/server/src/static/web.test.ts apps/server/src/static/web.ts apps/web/src/routes/_home/-sections/hero.test.tsx apps/web/src/routes/_home/-sections/hero.tsx apps/web/src/routes/_home/index.tsx
pnpm exec markdownlint-cli2 docs/superpowers/specs/2026-07-28-seo-aeo-performance-design.md docs/superpowers/plans/2026-07-28-seo-aeo-performance.md docs/getting-started.mdx docs/use-cases/free-resume-builder.mdx docs/use-cases/open-source-resume-builder.mdx
```

Expected: no errors or warnings.

- [ ] **Step 2: Run focused tests**

Run:

```bash
pnpm --filter server test -- src/static/web.test.ts
pnpm --filter web test -- src/routes/_home/-sections/hero.test.tsx src/libs/seo.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 3: Run package typechecks**

Run:

```bash
pnpm --filter server typecheck
pnpm --filter web typecheck
```

Expected: both commands exit 0.

- [ ] **Step 4: Run production builds**

Run:

```bash
pnpm --filter web build
pnpm --filter server build
```

Expected: both commands exit 0.

- [ ] **Step 5: Re-run documentation validation**

Run:

```bash
cd docs && pnpm dlx mint@4.2.748 broken-links --check-redirects
```

Expected: no broken internal links or invalid redirect destinations.

- [ ] **Step 6: Inspect the final built artifacts and diff**

Run:

```bash
rg -n '<script[^>]*type="module"[^>]*data-cfasync="false"[^>]*src=' apps/web/dist/index.html
magick identify -format '%wx%h %b\n' apps/web/public/videos/timelapse-v1.webp
git diff --check HEAD~3..HEAD
git status --short
git log -5 --oneline
```

Expected:

- The built module script remains a normal module with `data-cfasync="false"` before `src`.
- The poster is `1146x720` and substantially smaller than the video.
- `git diff --check` reports no whitespace errors.
- The only untracked path not created by this plan may be the pre-existing `.playwright-mcp/` directory; do not stage or remove it.
- The log shows the design commit, plan commit, and three implementation commits.

- [ ] **Step 7: Report deployment-only follow-up**

Report these as unverified deployment checks, not completed local work:

- Disable Rocket Loader for `rxresu.me` with a Cloudflare Configuration Rule.
- Run ten cold production Chromium navigations and confirm headline and CTA visibility.
- Measure throttled mobile LCP.
- Monitor field LCP/INP and GSC canonical/5xx validation after deployment.
