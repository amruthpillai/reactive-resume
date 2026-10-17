# DS3c report: Design, Check, Share & export, History, Assistant

Deliverable: `docs/plans/native-mobile-app/mockups/design.html`. It is one self-contained page. The only other files are 17 template thumbnails in `mockups/assets/ds3c/`, downscaled to 300 px from `apps/web/public/templates/jpg`.

## What the file contains

- **Controls:** Light / Dark, and iPhone 393×852 / Android 412×915 / Tablet 1180×820.
- **Left index:** every frame with its id, grouped as Design, Check, Share & export and Assistant. ▭ marks a frame that has a tablet variant.
- **Frames:** 112 phone frames in total after the DS4 round (76 at first), 10 of them with tablet variants.
  - Every frame has interaction notes: gestures, sheet detents, motion with `d1`/`d2`/`d3` and reduced-motion behaviour, keyboard, iOS / Android, and 44 pt targets.
  - In Tablet mode, a phone-only frame shows a note that names the tablet frame hosting the same content.
- **Jumps:** controls that lead to another state jump to that frame. Examples: a template card, Show on page, Share, ✦, ⋯ on a version.
- **Builder chrome:** the editor bar and the Write · Page · Design · Check tabs belong to DS3b. They are drawn here only to place these screens. The bar copies DS1 B: back, name with save status, ✦, Share with a public dot, Download PDF.

## Web parity decisions (mirrored from source, where the brief differed)

- **Tab label.** The tab is labelled **Color**, not "Colour": it is the web string (`design-panel.tsx`). The glossary lists Accent / Accent colour for descriptions only.
- **Text size** runs 9–12.5 pt in 0.5 steps, as the web does (`presets.ts:84`). The brief said 9–12.
- **Advanced** is not a tab on a phone. It sits at the end of the Page tab, as on the web phone sheet. Its groups push sub-screens inside the sheet. The tablet panel has a Template · Type · Color · Page · Advanced group nav.
- **No confirmation dialogs** for Reset design defaults or Restore this version. The web applies both at once, with an Undo toast and "Before restore" respectively.
- **QR code** shows the code only, with no save or share actions (web parity).
- **Print** is not in Share & export. It lives in the document menu (DS3b).
- **Severity.** Issues are numbered and ordered by severity. Severity is never shown as text, as on the web.
- **Assistant:**
  - Threads can't be renamed, and there is no Reject all.
  - There is no selection context chip.
  - The web's keyboard hint under change sets is dropped.
- **Stylesheet editor:** its Undo/Redo resume change buttons are left out on phone (owner: no undo/redo controls).

## Mobile-only adaptations (need owner or DS4 attention)

These are new strings, which need Lingui entries when built:

- **Template preview.** Press and hold for 400 ms (web touch behaviour). The caption reads "Previewing {name} · tap to apply". The web says "click to apply".
- **Share offline banner:** "You're offline. PDF still downloads; other formats, the link and history need a connection."
  - The PDF renders on the device, so Download PDF works offline.
  - The web disables Share when offline.
- **Assistant offline banner:** "You're offline. The assistant needs a connection; your conversations are here when you're back."
- **Locked banners.** Design, Check and Share reuse the existing "This resume is locked. Unlock it first to make changes." with an **Unlock** action. The web shows no banner in these panels.
- **Proposed-edit markings on phone.** The Assistant covers the page, so the markings and their caption show on Page after the Assistant closes. A floating **Review** button (existing string) reopens it (`assistant-page-markings`).
- **Hover-only actions.** History ⋯ and conversation Delete appear only on hover on the web. On a phone they are always visible, plus swipe-left on iOS.

## DS2 gaps in this part → screen ids

| DS2 gap | Screen ids |
|---|---|
| Check issue pins, previous/next controls and contextual fix card (`page-layer.tsx:262`) | `check-stepper`, `check-fixed`, `check-issues` (tablet: pins + selected card) |
| Person/parser view toggle and parser output (`page-layer.tsx:226`) | `check-parser`, `check-issues` (tablet toggle) |
| Proposed-edit markings and pending-edit caption (`page-canvas.tsx:60`) | `assistant-page-markings`, `assistant-changeset` (tablet: page markings + caption) |
| Template preview/apply state (`page-canvas.tsx:179`) | `design-template-preview`, `design-template-sidebar` (applied + Undo) |
| Design controls placeholders: templates, type, density, accent, paper/language/margins, Advanced/reset (`design-panel.tsx:119`) | `design-template`, `design-template-full`, `design-type`, `design-color`, `design-color-contrast`, `design-page`, `design-advanced`, `design-adv-typography`, `design-adv-colours`, `design-adv-picker`, `design-adv-page`, `design-adv-layout`, `design-adv-layout-menu`, `design-adv-css`, `design-reset` |
| Check score, Issues, Job match and Writing placeholders (`check-panel.tsx:40`) | `check-issues`, `check-categories`, `check-empty`, `check-job-match`, `check-job-term`, `check-job-none`, `check-writing-optin`, `check-writing-loading`, `check-writing-results`, `check-writing-noprovider`, `check-writing-error` |
| Public-sharing badge in builder bar (`editor-bar.tsx:120`) | Drawn as the Share public dot on phone and the "Public" badge on tablet in every frame. The bar itself is owned by DS3b. |
| Public-link toggle/address validation, copy/share, visitor downloads, password, QR, statistics (`link-tab.tsx:34`) | `share-link-off`, `share-link-on`, `share-link-taken`, `share-password`, `share-password-remove`, `share-qr`, `share-loading` |
| PDF/DOCX/ODT/MD/JSON, filename, linked letter, generation/retry (`download-tab.tsx:250`) | `share-download`, `share-download-busy`, `share-download-error`, `share-download-done` |
| Version list, naming/renaming/deletion, read-only preview, Restore, Back to now (`history-tab.tsx:100`) | `share-history`, `share-history-menu`, `share-history-rename`, `share-history-delete`, `share-history-view`, `share-history-restored`, `share-history-empty` |
| Assistant content and proposed-edit review (`editor-shell.tsx:78`) | `assistant-empty`, `assistant-threads`, `assistant-threads-empty`, `assistant-delete`, `assistant-streaming`, `assistant-stopped`, `assistant-changeset`, `assistant-question`, `assistant-attach`, `assistant-noprovider`, `assistant-noprovider-error`, `assistant-error`, `assistant-loading`, `assistant-unconfigured`, `assistant-locked`, `assistant-offline` |
| Undo feedback after destructive edits (toasts only, owner) | `design-template-sidebar`, `design-reset`, `check-fixed`, `check-writing-results`, `assistant-changeset` |
| Offline editing guidance (`save-status.tsx:57`) | `design-offline`, `check-offline`, `share-offline`, `assistant-offline` |
| Locked/read-only state and Unlock | `design-locked`, `check-locked`, `share-locked`, `assistant-locked` |
| Non-token colours (`color-mix` tints) | None used. See Tokens below. |
| Touch targets under 44 pt | All targets are 44 pt or more, or have a hit extension. See Checks. |

## §5 parity items in this part → screen ids

- **Design: every M4-T1 control.**
  - Template picker: 17 templates, filter chips, thumbnails. `design-template`, `design-template-full`, `design-template-preview`.
  - Sidebar side and width. `design-template-sidebar`.
  - Type (5 pairings, size, density). `design-type`.
  - Colour (swatches, hex, contrast warning). `design-color`, `design-color-contrast`.
  - Page (Letter/A4/Free-form, language, margins). `design-page`.
  - Advanced:
    - date format: `design-advanced`
    - typography: `design-adv-typography`
    - design colours and picker, level type, icon: `design-adv-colours`, `design-adv-picker`
    - page gaps and toggles: `design-adv-page`
    - layout pages with drag between Main and Sidebar: `design-adv-layout`, `design-adv-layout-menu`
    - custom CSS: `design-adv-css`
    - reset: `design-reset`
  - States: `design-loading`, `design-error`, `design-offline`, `design-locked`.
- **Check:**
  - Issues: `check-issues`, `check-categories`, `check-stepper`, `check-fixed`, `check-empty`
  - Job match: `check-job-match`, `check-job-term`, `check-job-none`
  - Writing: `check-writing-*`
  - Person/parser view: `check-parser`
  - States: `check-loading`, `check-offline`, `check-locked`, `check-rtl`
- **Share:**
  - Link: `share-link-on`, `share-link-off`, `share-link-taken`
  - Password: `share-password`, `share-password-remove`
  - QR: `share-qr`
  - Stats: `share-link-on`, `share-loading`
  - Locked: `share-locked`
- **Download:**
  - PDF, DOCX, ODT, MD, JSON and the linked letter: `share-download`, `share-download-busy`, `share-download-error`, `share-download-done`
  - Offline: `share-offline`
- **History:** `share-history*`.
  - The letter editor reuses this sheet with Download and History only (web `letter/-components/share-sheet.tsx`). Its placement is DS3b's.
- **Assistant:**
  - Threads: `assistant-threads`, `assistant-threads-empty`, `assistant-delete`
  - Streaming, stop and resume: `assistant-streaming`, `assistant-stopped`. Resume is described in the notes; there is no UI beyond continuing the stream.
  - Context and attachments: `assistant-attach`, `assistant-empty`
  - Proposed edits: `assistant-changeset`, `assistant-page-markings`
  - Provider setup: `assistant-noprovider`, `assistant-noprovider-error`
  - Clarifying question: `assistant-question`
  - Errors: `assistant-error`, `assistant-loading`, `assistant-unconfigured`

**Tablet variants:** `design-template`, `design-template-preview`, `design-adv-layout`, `check-issues`, `share-link-on`, `share-download`, `share-history-view`, `assistant-empty`, `assistant-streaming`, `assistant-changeset`.

**RTL sample (Arabic):** `check-rtl`. Large text (200%) is for Builder Write only, which belongs to DS3b.

## Tokens

- **Names follow DS3a's `tokens.md`** (camelCase in the table, kebab-case CSS variables in the HTML, as `app.html` does). The tokens are:
  - `paperInk` (`--paper-ink`) and `paperLine` (`--paper-line`).
  - The page overlays `pageSelectLine`, `pageSelectFill`, `pageIssueFill` and `pageProposalFill`.
  - `paperAccent`, `paperWarn` and `paperWarnSoft`, which DS3a adds in the DS4 round with light values.
- **Page overlays never use theme colours.** Proposal and found-term outlines use `pageSelectLine` (5.71:1 on paper). Issue pins and outlines use `paperWarn` (6.68:1 on paper), and the selected pin uses `paperInk`.
- **Resume colours are resume data, not interface colours.** This covers the accent swatches, the 22 quick swatches, the picker gradients and the level preview.

## Checks

- **Browser check.** A headless Chromium Playwright script ran every theme × device combination: light/dark × iPhone/Android/Tablet.
  - Each combination rendered 76 frames: 76 devices on phone, or 10 devices plus 66 placeholders on tablet.
  - There were no page errors.
- **Target audit.** A script measured every button, switch, radio, slider and link inside a device, including `::after` hit extensions. It found 0 targets under 44 pt in all six combinations.
- **Visual review.** Screenshots were reviewed across all four groups in light iPhone, dark iPhone, dark Android and light Tablet. Fixed during review:
  - collapsed template strip
  - narrow layout columns on phone
  - Undo contrast on the inverted toast in dark mode
  - parser warning colour on paper
  - error border overridden by the focus border
  - DS1's `.tab` class leaking onto the tablet frame
- **Formatting.** `oxfmt` 0.73.0, the main checkout's binary, was run on `design.html`. `oxfmt --check` passes. The worktree has no `node_modules`.

## DS4 fix round

| # | Finding | Result |
|---|---|---|
| 1 | GAP design-page: Language search | FIXED: `design-page-language` |
| 2 | GAP design-advanced: Date format menu | FIXED: `design-date-format` |
| 3 | GAP design-adv-typography: font-family search, heading weight | FIXED: `design-adv-font-family`, `design-adv-heading-weight` |
| 4 | GAP design-adv-colours: icon picker, level type | FIXED: `design-adv-icon`, `design-adv-level-type` |
| 5 | GAP design-adv-layout: precise Sidebar Width | FIXED: numeric field (10–50, step 0.1) beside the slider in `design-adv-layout` |
| 6 | GAP design-adv-css: focus mode, inline colour, page-to-rule picking, guide | FIXED: `design-adv-css-focus` (focus mode plus inline colour swatch that opens the picker), `design-adv-css-pick`, and helper lines with the guide link in `design-adv-css` |
| 7 | GAP check-categories: exported-PDF check states | FIXED: `check-pdf-checking`, `check-pdf-report` (report sheet plus result toast), `check-pdf-failed`. The clean toast is in the notes |
| 8 | GAP check-parser: loading, unreadable, no text layer | FIXED: `check-parser-loading`, `check-parser-error`, `check-parser-notext` |
| 9 | GAP check-job-match: Change picker, Unlink | FIXED: `check-job-change` |
| 10 | GAP check-job-none: pasted results, Clear, Save as application | FIXED: `check-job-pasted`, `check-job-save-app` |
| 11 | GAP check-job-none: linked application without posting | FIXED: `check-job-noposting` |
| 12 | GAP check-job-match: found-term highlight, hidden recovery | FIXED: `check-job-found` (page highlight with `pageSelectFill`/`pageSelectLine`); “Hidden: … · Show again” added to `check-job-match` |
| 13 | GAP check-writing-optin: provider selection, empty-resume guidance | FIXED: `check-writing-provider`, `check-writing-empty` |
| 14 | GAP check-writing-results: notes without rewrite | FIXED: Notes (impact, quote, Show on page) added to `check-writing-results`, and drawn in full in `check-writing-notes` |
| 15 | GAP share-link-taken: empty, malformed, checking, saving, save failure | FIXED: `share-link-address-states` |
| 16 | GAP share-history: pending and failures | FIXED: `share-history-saving`, `share-history-error`. Rename and delete failure copy is in the notes |
| 17 | GAP assistant-empty: model menu, Connect another… | FIXED: `assistant-model-menu` |
| 18 | GAP assistant-noprovider: Base URL form, Anthropic form, testing | FIXED: `assistant-noprovider-compatible`, `assistant-noprovider-testing` |
| 19 | GAP assistant-threads: conversation loading and failure | FIXED: `assistant-thread-loading`, `assistant-thread-error` |
| 20 | GAP assistant-changeset: Copy transcript | FIXED: the button at the end of `assistant-changeset`, plus `assistant-transcript` (button and toast) |
| 21 | GAP assistant-attach: upload failure | FIXED: `assistant-attach-failed` |
| 22 | GAP assistant-attach: fresh-send disclosure after removing context | FIXED: `assistant-context-removed` |
| 23 | GAP assistant-streaming: Thinking, preparing edits, failures, page warnings | FIXED: `assistant-thinking`, `assistant-tool-states` |
| 24 | GAP assistant-question: answered state | FIXED: `assistant-question-answered` |
| 25 | FIX check-locked: Ignore enabled | FIXED: Ignore is disabled when locked |
| 26 | FIX assistant-locked: composer enabled, notes wrong | FIXED: suggestions and composer are disabled; the notes now say sending is blocked |
| 27 | FIX layout handles and Full Width rows under 44 pt | FIXED: the handle has a hit extension to 44 × 44. Each Full Width row is 44 pt tall and toggles as a whole (`role="switch"`). The notes are updated |
| 28 | FIX proposal outlines use theme `accent` on paper | FIXED: they use `pageSelectLine` (5.71:1) with `pageProposalFill`; the tags use `pageSelectLine` and `paper` |
| 29 | FIX warning pins and outlines below 3:1; ink outline inverts | FIXED: pins are `paperWarnSoft` with a 2 pt `paperWarn` border and `paperWarn` number (6.68:1). Issue outlines use `paperWarn` with `pageIssueFill`. The selected pin's outline is `paperInk` |
| 30 | FIX radio and composer boundaries below 3:1 | FIXED: the unselected radio, the unchecked checkbox, the Android switch track and the composer border use `ink3` (5.27:1 light, 5.57:1 dark on `raised`) |
| 31 | FIX assistant-offline: disclosure dimmed | FIXED: only the input box and chips dim. The disclosure keeps `ink3` at full opacity |
| 32 | FIX paper tints missing from tokens.md | FIXED: the names map to `paperAccent`, `paperWarn` and `paperWarnSoft` (DS3a adds them this round). `paperLine` replaces the parser divider. Resume colours stay as resume data |
| 33 | FIX “works without AI” overpromise | FIXED: provider footer “… Editing, design, Check issues and downloads work without AI.” Unconfigured server: “… Editing, design, Check issues and downloads work without it.” |

**Checks this round:**

- **Browser check.** The same Playwright script ran light/dark × iPhone/Android/Tablet: 112 frames each, 0 page errors.
- **Target audit.** It now also measures ⋮⋮ handles. 0 targets under 44 pt in every combination.
- **Visual review.** The new frames were reviewed in light iPhone. The overlay and contrast fixes were reviewed in dark iPhone.
- **Contrast** was computed from `tokens.md` hex values.
- **Formatting.** `oxfmt` (0.73.0, main checkout binary) was run on `design.html`.
