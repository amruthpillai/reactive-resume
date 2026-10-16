# DS1: Two mobile design directions for three anchor screens

Base: `mobile/native-app`. Branch: `mobile/DS1`. Harness: Claude Code. Reviewer: Codex (DS2).
Questions: end your turn with a `QUESTION:` block and `STATUS: blocked` (README §3.4).

## Read first

- `docs/plans/native-mobile-app/README.md`: §0, §1.5, §2 in full, §5
- `GLOSSARY.md`: use its exact terms on every label
- `packages/ui/src/styles/globals.css:19-205`: Desk & Paper tokens
  - oklch values with hex approximations
  - radii, shadows `e1`–`e3` and `page`
  - motion `d1`/`d2`/`d3` and the ease curves
- `packages/ui/src/components/icon.tsx`: the curated Phosphor names
- Today's phone web layout, which this app grows from:
  - `docs/guides/editing-on-mobile.mdx`
  - `apps/web/src/routes/dashboard/-components/app-shell.tsx` (5-tab bar with a raised "+")
  - `apps/web/src/routes/builder/$resumeId/-components/editor-shell.tsx`
  - `apps/web/src/features/resume/editor/write/*`
  - `apps/web/src/features/documents/*`
  - `packages/ui/src/components/sheet.tsx`
- Real page imagery: the template previews in `apps/web/public/templates/jpg/`. Use these JPGs for the "page" in mockups; do not draw fake pages.
- Sample content: `packages/schema/src/resume/sample.ts`. It is fictional; use no real personal data.

Load the `artifact-design` skill before writing HTML. Load `frontend-design` too if it is available.

## Target

One self-contained interactive HTML file, `docs/plans/native-mobile-app/mockups/index.html`.

**Controls on the page:**

- Toggle between Direction A and Direction B.
- Toggle between light and dark.
- iPhone frame (393×852 pt) by default, with an Android frame (412×915) toggle that shows the same screens with Material-style system bars and a back gesture note.

**Three screens per direction:**

1. **Documents**: the library, with search, type tabs, tag chips, cards with the real first-page thumbnail, the 5-tab bar with the raised "+", and a multi-select state.
2. **Builder, Write**: the outline in print order, a section header with its menu, entry cards with drag handles, a save status, and the open entry editor with the rich-text toolbar above the keyboard.
3. **Builder, Page**: the rendered page with zoom, a tapped entry outlined (page-map selection), the "Runs onto page 2 · Fit to one page" caption, and the path to Design and Share.

**The two directions:**

- **Direction A, "Paper first":** the page is the hero. Write is a draggable sheet over the page with detents. Tapping a line on the page opens its entry.
- **Direction B, "Outline first":** mirrors the web phone layout. Bottom tabs Write / Page / Design / Check; the outline is the hero.

**Under each screen**, short interaction notes:

- gestures
- sheet detents
- transitions using motion tokens `d1`/`d2`/`d3` with `cubic-bezier(.2,.8,.2,1)`, and reduced-motion behaviour
- iOS versus Android differences (navigation, back, haptics)

**Desk & Paper look:**

- Hanken Grotesk for UI and Newsreader for display (Google Fonts links are allowed).
- The green accent `#337344` (dark mode `#6FC082`), the desk `#F8F7F3` (dark `#100F0C`), and paper that is always white.
- 44 pt touch targets. 16 pt minimum input text.
- No other fonts or colours.

## Ownership

You may edit only:

- `docs/plans/native-mobile-app/mockups/**`
- `docs/plans/native-mobile-app/reports/DS1.md`

Do not publish anything. The coordinator publishes the page for the owner.

## Constraints

- One HTML file, plus copied images under `mockups/assets/` if needed. Prefer referencing the template JPGs by a relative path copied into `assets/`.
- Readable at phone width.
- Lowercase conventional commits (`docs(mobile): …`). Never push. No AI attribution.

## Acceptance

- [ ] Both directions, all 3 screens, light and dark, and the iPhone/Android toggle all work.
- [ ] Every label uses GLOSSARY terms.
- [ ] `reports/DS1.md` contains:
  - a 5-line rationale per direction
  - your recommendation
  - the open questions for the owner
  - any web capability on these three screens that has no home in the mockups yet

End with the final report block from README §3.5.
