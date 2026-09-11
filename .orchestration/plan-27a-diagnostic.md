# Plan 27 Phase A diagnostic evidence

Date: 2026-09-06  
Issue: [#3377](https://github.com/amruthpillai/reactive-resume/issues/3377)  
Revision: `2a4a1583b` (`origin/main` at run start)  
Scope: Phase A, steps 1–2 only. No resolver, runtime behavior, or remote-source behavior changed.

## Drift and authority

- Worktree started clean and `HEAD` matched `origin/main`; `git diff origin/main...HEAD` was empty.
- Current catalog is `packages/fonts/src/webfontlist.json`. Its web font records point at both Google Fonts static assets and jsDelivr assets; “Google blocked” is not an offline proof.
- Browser preview is `apps/web/src/components/typography/font-display.tsx` and calls `FontFace.load()` against each catalog preview URL.
- Browser PDF preview/download is `apps/web/src/features/resume/export/pdf-document.tsx` → `@reactive-resume/pdf/browser`; registration is `packages/pdf/src/hooks/use-register-fonts.ts`.
- Server PDF is `apps/server/src/http/resume-pdf.ts` → `createResumePdfDownload`; Playwright browser routing cannot observe that process’s outbound font fetches.
- The issue is open and unmodified. PR #3455 is the approved planning PR; its plan/decision log grants execution of this bounded diagnostic and manifest evidence.

## Deterministic fixture

`tests/e2e/fixtures/offline-fonts.ts` seeds one disposable resume after sample creation. It writes the same text into basics and summary, hides the picture, selects IBM Plex Serif 400/700 for body and heading, and marks the row public for the server-PDF surface.

The exact markers are versioned as `offline-font-scripts-v1`:

| Marker | Script or coverage |
| --- | --- |
| `Latin punctuation • — “quotes” €` | Latin plus General Punctuation and currency |
| `简体中文` | Han / Simplified Chinese |
| `العربية` | Arabic |
| `עברית` | Hebrew |
| `ไทย` | Thai |
| `Emoji 🚀` | Emoji |

`tests/e2e/specs/offline-fonts.spec.ts` is opt-in (`OFFLINE_FONT_DIAGNOSTIC=1`) so the normal PR E2E suite does not become network-dependent. Each surface creates a new browser context with persisted auth state, disabled service workers, and no prior browser cache. Every non-same-origin request is aborted and recorded as `{ hostname, path }`; query strings, fragments, headers, bodies, tokens, and full URLs never enter diagnostic output. Reports are attached as JSON and emitted with the same sanitized shape.

The four surfaces are separate tests:

1. Font picker preview opens Typography → Font Family and waits for lazy `FontFace` preview loads.
2. Builder PDF preview navigates to the builder, captures the active PDF canvas, and measures marker-local raster crops.
3. Browser PDF download uses the Export dialog, rasterizes the downloaded PDF, and measures marker-local crops when generation succeeds.
4. Server PDF calls the public PDF endpoint and records text-layer marker presence when generation succeeds.

Builder/browser-PDF reports keep PDF text extraction as a separate `textLayerMarkers` signal; it does not prove visible glyph outlines. Raster evidence attaches a rendered PNG and per-marker crop metrics, failing for blank or tofu-like visible crops. Blocked browser font requests classify browser surfaces as `network-error`. The server report deliberately says `server-outbound-requests-unobservable-from-playwright`; its cold-network gate remains unresolved because server outbound capture and verifiable restart identity require external host-level controls.

## Run protocol and cold-cache boundary

Build and database setup follow `tests/e2e/README.md`. Run each surface in a separately restarted production server process so module-level PDF font registration state cannot leak between controls:

```text
OFFLINE_FONT_DIAGNOSTIC=1 OFFLINE_FONT_DIAGNOSTIC_SERVER_RESTARTED=1 \
  pnpm exec playwright test tests/e2e/specs/offline-fonts.spec.ts --grep "picker preview"
```

Stop and restart the production server before repeating the command with `builder PDF`, `browser PDF`, and `server PDF` grep patterns. The environment used for this change had no built `apps/server/dist` or `apps/web/dist`, no running PostgreSQL instance, and no production server to restart, so the cold E2E matrix was not run. This is an explicit infrastructure blocker, not a pass claim. The test records `serverRestartFlag` only as caller input and labels it non-proof; it does not claim a completed cold-network gate.

The current Playwright route guard cannot impose host-level egress denial on Node.js running the server. A genuinely cold server test therefore needs a separately restarted server plus host-level egress capture/deny (for example, a controlled network namespace or an approved outbound proxy). Do not infer server network behavior from an empty browser request list.

## Administrator-hosted manifest proposal

This is a proposal, not an asset download. It intentionally contains only the primary family and glyph fallbacks required by the fixture and current PDF fallback map, not the full catalog.

```json
{
  "schemaVersion": "offline-fonts-v1",
  "mode": "local-only",
  "assetRoot": "/fonts/offline/v1",
  "families": {
    "IBM Plex Serif": {
      "normal": { "400": "ibm-plex-serif/400.ttf", "700": "ibm-plex-serif/700.ttf" },
      "italic": { "400": "ibm-plex-serif/400-italic.ttf", "700": "ibm-plex-serif/700-italic.ttf" },
      "preview": "ibm-plex-serif/preview.ttf"
    },
    "IBM Plex Sans": {
      "normal": { "400": "ibm-plex-sans/400.ttf", "700": "ibm-plex-sans/700.ttf" },
      "italic": { "400": "ibm-plex-sans/400-italic.ttf", "700": "ibm-plex-sans/700-italic.ttf" },
      "preview": "ibm-plex-sans/preview.ttf"
    },
    "Noto Serif": {
      "normal": { "400": "noto-serif/400.ttf", "700": "noto-serif/700.ttf" },
      "italic": { "400": "noto-serif/400-italic.ttf", "700": "noto-serif/700-italic.ttf" },
      "preview": "noto-serif/preview.ttf"
    },
    "Noto Sans": {
      "normal": { "400": "noto-sans/400.ttf", "700": "noto-sans/700.ttf" },
      "italic": { "400": "noto-sans/400-italic.ttf", "700": "noto-sans/700-italic.ttf" },
      "preview": "noto-sans/preview.ttf"
    },
    "Noto Sans SC": { "normal": { "400": "noto-sans-sc/400.ttf", "700": "noto-sans-sc/700.ttf" }, "italic": "reuse-normal", "preview": "noto-sans-sc/preview.ttf" },
    "Noto Serif SC": { "normal": { "400": "noto-serif-sc/400.ttf", "700": "noto-serif-sc/700.ttf" }, "italic": "reuse-normal", "preview": "noto-serif-sc/preview.ttf" },
    "Noto Sans TC": { "normal": { "400": "noto-sans-tc/400.ttf", "700": "noto-sans-tc/700.ttf" }, "italic": "reuse-normal", "preview": "noto-sans-tc/preview.ttf" },
    "Noto Serif TC": { "normal": { "400": "noto-serif-tc/400.ttf", "700": "noto-serif-tc/700.ttf" }, "italic": "reuse-normal", "preview": "noto-serif-tc/preview.ttf" },
    "Noto Sans JP": { "normal": { "400": "noto-sans-jp/400.ttf", "700": "noto-sans-jp/700.ttf" }, "italic": "reuse-normal", "preview": "noto-sans-jp/preview.ttf" },
    "Noto Serif JP": { "normal": { "400": "noto-serif-jp/400.ttf", "700": "noto-serif-jp/700.ttf" }, "italic": "reuse-normal", "preview": "noto-serif-jp/preview.ttf" },
    "Noto Sans KR": { "normal": { "400": "noto-sans-kr/400.ttf", "700": "noto-sans-kr/700.ttf" }, "italic": "reuse-normal", "preview": "noto-sans-kr/preview.ttf" },
    "Noto Serif KR": { "normal": { "400": "noto-serif-kr/400.ttf", "700": "noto-serif-kr/700.ttf" }, "italic": "reuse-normal", "preview": "noto-serif-kr/preview.ttf" },
    "Noto Sans Arabic": { "normal": { "400": "noto-sans-arabic/400.ttf", "700": "noto-sans-arabic/700.ttf" }, "italic": "reuse-normal", "preview": "noto-sans-arabic/preview.ttf" },
    "Noto Naskh Arabic": { "normal": { "400": "noto-naskh-arabic/400.ttf", "700": "noto-naskh-arabic/700.ttf" }, "italic": "reuse-normal", "preview": "noto-naskh-arabic/preview.ttf" },
    "Noto Sans Hebrew": { "normal": { "400": "noto-sans-hebrew/400.ttf", "700": "noto-sans-hebrew/700.ttf" }, "italic": "reuse-normal", "preview": "noto-sans-hebrew/preview.ttf" },
    "Noto Sans Thai": { "normal": { "400": "noto-sans-thai/400.ttf", "700": "noto-sans-thai/700.ttf" }, "italic": "reuse-normal", "preview": "noto-sans-thai/preview.ttf" },
    "Noto Emoji": { "normal": { "400": "noto-emoji/400.ttf", "700": "noto-emoji/700.ttf" }, "italic": "reuse-normal", "preview": "noto-emoji/preview.ttf" }
  }
}
```

### Candidate source, license, script, and size evidence

Sizes are `Content-Length` bytes from a HEAD request to the exact current catalog assets on 2026-09-06. Responses reported `Content-Encoding: gzip`; these are compressed transfer-size estimates, not a claim about the eventual on-disk representation. Preview paths are aliases to the selected 400 face and add no extra bytes when stored once. Primary sources: [IBM Plex LICENSE.txt](https://github.com/IBM/plex/blob/master/LICENSE.txt), [Noto core LICENSE](https://github.com/notofonts/noto-fonts/blob/main/LICENSE), [Noto CJK Sans LICENSE](https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE), and [Noto Emoji font LICENSE](https://github.com/googlefonts/noto-emoji/blob/main/fonts/LICENSE).

| Family | Style/weights in proposal | Current catalog source version | License | Script/fallback role | Gzip bytes (selected files) | Build owner; runtime owners |
| --- | --- | --- | --- | --- | ---: | --- |
| IBM Plex Serif | normal 400/700; italic 400/700 | `fonts.gstatic.com/s/ibmplexserif/v20` | OFL 1.1, Reserved Font Name `Plex` | Primary serif; Latin and punctuation stack | 294,717 | `packages/fonts`; `apps/web` FontDisplay; `packages/pdf` registration |
| IBM Plex Sans | normal 400/700; italic 400/700 | `fonts.gstatic.com/s/ibmplexsans/v23` | OFL 1.1, Reserved Font Name `Plex` | Primary sans | 435,469 | `packages/fonts`; `apps/web` FontDisplay; `packages/pdf` registration |
| Noto Serif | normal 400/700; italic 400/700 | `fonts.gstatic.com/s/notoserif/v33` | OFL 1.1 | Serif punctuation fallback | 1,055,120 | `packages/fonts`; `packages/pdf` fallback registration |
| Noto Sans | normal 400/700; italic 400/700 | `fonts.gstatic.com/s/notosans/v42` | OFL 1.1 | Sans punctuation fallback | 1,236,259 | `packages/fonts`; `packages/pdf` fallback registration |
| Noto Sans SC | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notosanssc/v40` | OFL 1.1 (Noto CJK) | Simplified Han; CJK fallback | 12,766,416 | `packages/fonts`; `packages/pdf` CJK fallback |
| Noto Serif SC | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notoserifsc/v35` | OFL 1.1 (Noto CJK) | Simplified Han serif fallback | 17,350,185 | `packages/fonts`; `packages/pdf` CJK fallback |
| Noto Sans TC | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notosanstc/v39` | OFL 1.1 (Noto CJK) | Traditional Han fallback | 8,628,278 | `packages/fonts`; `packages/pdf` CJK fallback |
| Noto Serif TC | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notoseriftc/v36` | OFL 1.1 (Noto CJK) | Traditional Han serif fallback | 11,804,923 | `packages/fonts`; `packages/pdf` CJK fallback |
| Noto Sans JP | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notosansjp/v56` | OFL 1.1 (Noto CJK) | Kana and Japanese Han fallback | 6,383,035 | `packages/fonts`; `packages/pdf` CJK fallback |
| Noto Serif JP | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notoserifjp/v33` | OFL 1.1 (Noto CJK) | Kana and Japanese Han serif fallback | 8,685,862 | `packages/fonts`; `packages/pdf` CJK fallback |
| Noto Sans KR | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notosanskr/v39` | OFL 1.1 (Noto CJK) | Hangul and Korean Han fallback | 6,102,888 | `packages/fonts`; `packages/pdf` CJK fallback |
| Noto Serif KR | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notoserifkr/v31` | OFL 1.1 (Noto CJK) | Hangul and Korean Han serif fallback | 11,113,442 | `packages/fonts`; `packages/pdf` CJK fallback |
| Noto Sans Arabic | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notosansarabic/v33` | OFL 1.1 | Arabic sans fallback | 178,455 | `packages/fonts`; `packages/pdf` script fallback |
| Noto Naskh Arabic | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notonaskharabic/v44` | OFL 1.1 | Arabic serif fallback | 190,924 | `packages/fonts`; `packages/pdf` script fallback |
| Noto Sans Hebrew | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notosanshebrew/v50` | OFL 1.1 | Hebrew fallback for both serif/sans slots | 55,707 | `packages/fonts`; `packages/pdf` script fallback |
| Noto Sans Thai | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notosansthai/v29` | OFL 1.1 | Thai fallback for both serif/sans slots | 55,173 | `packages/fonts`; `packages/pdf` script fallback |
| Noto Emoji | normal 400/700; italic reuses normal | `fonts.gstatic.com/s/notoemoji/v62` | OFL 1.1 for font files; assets/tools have separate licenses | Emoji outline fallback; verify renderer support | 1,153,847 | `packages/fonts`; `packages/pdf` script fallback |

Estimated transfer size for all rows and listed styles: **87,490,700 bytes (~83.44 MiB)**. This confirms why a full-catalog bundle is out of scope. A later implementation should subset by declared glyph requirements or make the administrator choose fallback families; it must not silently fetch another CDN.

### Source and license obligations

- Pin an upstream release/commit and retain source attribution plus the complete applicable license with hosted assets. Do not use mutable `@latest` URLs as runtime sources.
- IBM Plex’s license has Reserved Font Name `Plex`; modified/subset outputs must follow OFL naming requirements.
- Noto core, Noto CJK, and Noto Emoji font files are OFL 1.1, but Noto Emoji documents separate Apache/public-domain treatment for tools and flag image assets. Bundle only font files unless those other assets are intentionally needed and separately attributed.
- License checks are build-owner responsibility (`packages/fonts`/tooling); runtime owners (`apps/web` and `packages/pdf`) consume only the validated manifest.

### Missing-family and missing-asset behavior

Local mode must resolve only same-origin administrator-hosted manifest paths. If imported resume data names an unavailable family, show an actionable missing-family error naming the family and required local asset; apply a configured local fallback only when the administrator explicitly supplied one. If a required weight/style/fallback asset is absent, fail the affected preview/export with an actionable diagnostic containing family/style/weight and local path. Never retry Google Fonts, jsDelivr, or any other remote URL in local mode.

Standard PDF families (Helvetica, Courier, Times-Roman) remain file-free. They do not prove that a document containing punctuation, CJK, Arabic, Hebrew, Thai, or emoji is network-free; the script fallback rows remain required.

## Verification record

Completed read-only checks before handoff:

- CodeGraph exploration of font catalog, picker preview, browser PDF, server PDF, and existing fallback tests.
- `pnpm dlx @tanstack/intent@latest list`: no matching local intent skill for this work.
- `pnpm exec biome check tests/e2e/specs/offline-fonts.spec.ts tests/e2e/fixtures/offline-fonts.ts turbo.json`: passed.
- `git diff --check`: passed.
- `pnpm --filter @reactive-resume/fonts test`: passed (55 tests).
- `pnpm --filter @reactive-resume/pdf exec vitest run src/hooks/use-register-fonts.test.ts`: passed (35 tests).
- Web typography/regression suite: passed (940 tests across 135 files); web and server package typechecks passed.
- `pnpm exec playwright test tests/e2e/specs/offline-fonts.spec.ts --list`: passed (4 diagnostic tests collected).
- E2E diagnostic execution: blocked by missing build outputs and unavailable PostgreSQL/server; no success claim made.
- `pnpm exec turbo boundaries`: passed on fresh rerun (Turbo 2.10.12, 1108 files, no issues).

The implementation intentionally stops at diagnostic fixtures and manifest evidence. Shared source resolution, asset hosting, local-mode configuration, and production behavior remain Phase A step 3+ work.
