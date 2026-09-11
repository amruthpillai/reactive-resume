# Plan 23 item-pagination execution evidence

## Scope

Plan 23 steps 1–3 were evaluated from `origin/main` at `368858a56` (Plan 21 / PR #3477 merged). Widow/orphan UI and authored-page continuation guidance remain deferred from this execution, and Semantic CSS was not changed.

## Durable diagnostic matrix

`packages/pdf/src/templates/shared/item-pagination.test.tsx` renders physical PDF pages and checks numbered tokens exactly once for:

- an item that fits remaining space;
- an item that fits a full page but not the remaining space;
- an oversized item taller than one page;
- a two-line paragraph at a boundary;
- nested bullets; and
- built-in plus custom items in an Azurill sidebar/main-column overflow fixture.

The fixture also keeps authored `metadata.layout.pages` separate from renderer-generated physical pages.

The current deterministic baseline is: fit remainder = 1 physical page; full-page-but-not-remainder = 3 pages with sampled tokens on pages 2/2/3; oversized = 5 pages with sampled tokens on pages 1/3/5; two-line boundary = 2 pages; nested bullets = 1 page; Azurill built-in/custom/sidebar = 5 pages with sampled tokens on pages 1/4/5/5/1. Page numbers here are 1-based; every token still appears exactly once.

## Concrete blocker

React PDF's only available item-level keep-together primitive is `View wrap={false}`. A durable renderer fixture with 180 paragraph-like child views shows that a non-wrapping item cannot safely fall back when its content exceeds one page: the renderer omits the oversized tail instead of splitting it. Applying the same prop to shared `SectionItem` would therefore violate the lossless token requirement; no item schema flag or menu control was added.

Do not estimate item height from HTML length, persist physical pages, alter existing Semantic CSS, or claim #3350 complete. A future implementation needs renderer-supported conditional keep-together behavior or an actual measured two-pass fallback that preserves every token.

## Verification

- `pnpm --filter @reactive-resume/pdf exec vitest run src/templates/shared/item-pagination.test.tsx`: 7 tests passed.
- No production source or schema changes made after the unsafe fallback was reproduced.
- Undo/persistence/lock UI coverage is intentionally absent because no item control was shipped; add it only when safe fallback exists.
