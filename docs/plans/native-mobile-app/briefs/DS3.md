# DS3: Full Direction B screen set (four parallel parts)

Base: `mobile/native-app`. Branch: `mobile/DS3<part>`.
Parts and harnesses: DS3a Claude Code, DS3b Claude Code, DS3c Claude Code, DS3d Codex. Reviewer: DS4, the other harness.
Questions: end your turn with a `QUESTION:` block and `STATUS: blocked` (README §3.4). Follow README §3.4 rule 5 (never end your turn while you wait on a background process).

## Decided by the owner (G2a). Do not revisit.

- **Direction B, "Outline first" only.** Phone builder has bottom tabs Write / Page / Design / Check; the outline is the hero. Do **not** use A's tap-a-line half-sheet. A tap on the page selects the entry and shows an "Edit entry" bar, the same as the web phone layout.
- **Raised "+"** is B's pill, as on web.
- **No undo/redo controls on phone.** Undo appears only as toast actions after destructive edits (for example "Moved to Trash · Undo"). Tablet hardware-keyboard shortcuts are M8.
- Trash is a row at the end of the library.
- Letter cards show live text.
- Rich text: the native toolbar has bold, italic, underline, strike, bullet and numbered lists, link, and headings. Other web marks have no home on mobile (accepted loss, README §0). Do not draw them.

## Read first (all parts)

- README §0, §1.5, §2, §5 and §5.10.
- `docs/plans/native-mobile-app/mockups/index.html`: DS1, **Direction B**. Copy its CSS variables, frames, tab bar, sheets, cards and type styles so all four files look like one app.
- `reports/DS1.md` and `reports/DS2.md`. DS2 is the gap list. **Every DS2 gap that falls in your part must get a home**, except the ones settled above.
- `GLOSSARY.md` for exact labels.
- `packages/ui/src/styles/globals.css:19-205` for tokens. Use tokens only. If you need a tint (for example a selected fill), use a named token from `tokens.md` (DS3a defines it). Do not use ad-hoc `color-mix`.
- The web source for your screens (paths below). Read the real components; mirror their fields, states and copy.
- Sample content: `packages/schema/src/resume/sample.ts` and `apps/web/public/templates/jpg/*`, copied into `mockups/assets/`. No real personal data.

## Rules (all parts)

- One self-contained HTML file per part in `docs/plans/native-mobile-app/mockups/`.
  - Same controls as DS1: light/dark toggle, and iPhone (393×852) / Android (412×915) toggle.
  - Add a **Tablet (1180×820 landscape)** toggle where your part lists tablet screens.
- A left index lists every screen and state in your file.
- Every frame has a short interaction-notes block:
  - gestures
  - sheet detents
  - transitions with tokens `d1`/`d2`/`d3`, and reduced-motion behaviour
  - keyboard behaviour
  - iOS/Android differences
- Every interactive element is ≥ 44 pt, or has a visible note on how its hit area reaches 44 pt. That covers drag handles, grabbers, mode tabs and chips.
- States to draw wherever they apply: empty, loading (skeleton), error with retry, offline, locked, and RTL (one Arabic sample per file). Builder Write also gets large text (200%).
- Use the `frontend-design` skill if it is available.
- Lowercase conventional commits (`docs(mobile): …`). Never push. No AI attribution.
- Run `pnpm exec oxfmt` on your HTML before committing.

## Ownership per part

- **DS3a** owns:
  - `mockups/app.html`
  - `mockups/tokens.md` (deliverable D4: the RN token table with colours light and dark, the type scale in pt, spacing, radii, shadows mapped to iOS shadow and Android elevation, motion, and named tints that replace DS1's `color-mix`)
  - a hub section **added to the top** of `mockups/index.html`: links to app/builder/design/career, and a note that DS1 below is the historical direction study. Do not edit the rest of index.html.
- **DS3b** owns `mockups/builder.html`.
- **DS3c** owns `mockups/design.html`.
- **DS3d** owns `mockups/career.html`.
- Every part may add files under `mockups/assets/<part>/`, and writes `reports/DS3<part>.md`.

## Screens per part

### DS3a: App shell, documents, account, utilities (`app.html`)

- **Shell.**
  - Phone tab bar: Documents, Applications, the "+" pill, Career, Settings. Badges for counts and Career unread.
  - Tablet sidebar.
  - Guest banner.
  - Offline banner.
- **Auth.**
  - Server picker (rxresu.me default; custom URL with validation and its error state).
  - Sign-in landing ("Continue in browser"; guest when allowed; signups disabled).
  - Signed-out and session-expired states.
  - Web source: `apps/web/src/features/auth/*`.
- **Documents** (phone and tablet):
  - search and empty results
  - type tabs, tags, sort and view menu (grid/list)
  - cards with linked company, new badge, and public/locked markers
  - card options menu with every action
  - Tags sheet (single and bulk)
  - Link to application picker
  - multi-select bar (tags, sharing, lock, trash) with partial-success feedback and Undo
  - first-run empty state (Import, Start blank, Try a sample)
  - loading and error states
  - Trash row and the Trash screen (days left, Restore, permanent delete confirm, empty)
  - Web source: `apps/web/src/features/documents/*`.
- **New sheet.** Blank, sample, new letter, Import, Copy for a job.
  - Import picker for RR JSON, JSON Resume, LinkedIn ZIP, PDF and DOCX, with the AI-provider requirement note.
  - Import progress, cancel, success review and failure.
  - Copy-for-job form.
- **Search** (command palette equivalent): documents, conversations, actions. Web source: `apps/web/src/features/command-palette/*`.
- **Settings.**
  - Root list.
  - Account: name, username, avatar upload. Rows for Password, Two-factor authentication, Passkeys, Linked accounts and Email that open the web page in an in-app browser tab; draw that browser-tab state once. Data export. Delete account with type-to-confirm. Sign out. Switch server.
  - Preferences: theme, language, time zone.
  - AI & developer: providers list, add/edit/test/default; web access keys; API keys list/create/delete with a show-once key; MCP info.
  - Web source: `apps/web/src/features/settings/*`, `apps/web/src/routes/dashboard/settings/*`.
- **Public resume viewer** (`r/[username]/[slug]`): reflow, Download, password prompt. Web source: `apps/web/src/features/resume/public/*`.
- **ATS checker** (public): pick a PDF, analysing, report (score ring, categories, job-description keywords, parser view), "Fix these in the editor". Web source: `apps/web/src/features/ats-checker/*`.

### DS3b: Builder Write and Page, letters (`builder.html`)

- **Builder chrome.** Top bar with back, document name and menu, save status (Saved / Saving / Offline / Not saved with Retry), public badge, assistant ✦, Share. Bottom tabs Write / Page / Design / Check.
  - Tablet: panel plus page split.
  - Web source: `apps/web/src/routes/builder/$resumeId/-components/*`.
- **Document menu.** Rename, Duplicate, Lock/Unlock, Notes, Details, Print, Move to Trash (with Undo toast).
- **Write.**
  - Basics: every field, custom fields (icon, link, reorder, remove), validation.
  - Picture: upload or URL, crop, remove, visibility, fit, size, aspect, radius, border, shadow.
  - Summary.
  - Outline in print order with main/sidebar dividers, a Hidden sections group, and section rows with drag plus the Move up/down alternative.
  - Section menu with every web action: Rename, Icon picker, Columns 1–6 and the Skills inline option, Keyword layout, Hide, Move to, Show heading, Keep on one page, New page, Sort by date, Clear. Delete is for custom sections only.
  - Add section picker, including custom-section type.
  - Entry cards with Draft/Hidden badges, "to check" and proposed-edit counts.
  - Entry options: Duplicate, Hide/Show, Move to section/page/new page, Delete.
  - **Entry editor screens for every section type**: experience with multiple roles, education, projects, skills (level, keywords, icon and colour), languages, interests, awards, certifications, publications, volunteer, references, profiles, and custom sections.
  - Links with "Show link in title".
  - Date field (range, single, Present, parse review, reversed-range error).
  - Rich text field with the native toolbar above the keyboard.
  - Improve: request, suggestion, Replace / Keep mine, stale, retry.
  - Blank-resume suggestions with an Import action.
  - Locked banner with Unlock.
  - Imported-content banner.
  - Remote-update toast and deferred-update state.
  - **Conflict sheet** on reconnect: Keep mine / Use theirs / Keep both.
  - Web source: `apps/web/src/features/resume/editor/write/*`, `apps/web/src/features/resume/builder/draft.ts`, `save-status.tsx`.
- **Page.**
  - Multi-page canvas with page labels and count.
  - Zoom bar (60–150%, Fit).
  - Tap selection with the "Edit entry" bar.
  - Overflow estimate and "Fit to N pages".
  - Loading, first failure with retry, stale-preview failure, lost-characters warning.
  - Proposed-edit markings caption.
  - Web source: `page-canvas.tsx`, `apps/web/src/features/resume/preview/*`.
- **Cover letter editor.**
  - Write: FOR, TO, FROM (linked resume live or copied), body with the 180–320 word guide.
  - AI draft streaming state.
  - Design: inherit or own.
  - Share: Download and History.
  - Web source: `apps/web/src/routes/builder/letter/*`, `apps/web/src/features/letters/*`.

### DS3c: Design, Check, Share & export, History, Assistant (`design.html`)

- **Design** (phone sheet over the page with tabs; tablet panel).
  - Template: 17 templates with filter chips and thumbnails, a preview/apply state, and sidebar side and width for two-column templates.
  - Type: 5 pairings, size 9–12 pt, density.
  - Colour: swatches, hex, contrast warning.
  - Page: Letter/A4/free-form, language, margins.
  - Advanced: date format, typography, design colours with a picker, level type, icons, page gaps and toggles, layout pages with drag between main and sidebar, custom CSS in a monospace field, Reset.
  - Web source: `apps/web/src/routes/builder/$resumeId/-components/design-panel.tsx`, `apps/web/src/features/resume/editor/design/*`.
- **Check.**
  - Score ring, Issues tab with pins on the page and the phone issue stepper (previous/next and contextual fix card with one-tap fix and an Undo toast).
  - Job match from the linked application.
  - Writing review (opt-in AI; proposals Accept/Reject).
  - Person/parser view toggle with parser output.
  - Web source: `apps/web/src/features/resume/editor/check/*`.
- **Share & export.**
  - Link: public toggle, slug check, copy and share, visitor downloads, password, QR, views/downloads stats.
  - Download: PDF/DOCX/ODT/MD/JSON, filename, also export the linked letter, generating/retry states.
  - History: version list, name/rename/delete, read-only view on the page with "Back to now", Restore.
  - Web source: `apps/web/src/features/resume/share/*`.
- **Assistant** (phone full screen; tablet side panel).
  - Threads grouped by document.
  - Chat with streaming.
  - Context chips and attachments.
  - Stop.
  - Change-set cards Accept/Reject with page markings.
  - Clarifying-question card.
  - Inline provider setup when no AI provider exists.
  - Web source: `apps/web/src/features/assistant/*`.

### DS3d: Applications and Career (`career.html`)

- **Applications** (phone and tablet).
  - List grouped by stage with sort, bulk move/tag/close/delete.
  - Board (tablet; phone segmented), calendar, insights funnel.
  - Add flow: paste a link or text, parsing, autofill review, search postings.
  - Detail: stage stepper, next step with a reminder toggle (local notification) and `.ics` share, "What you sent", editable facts, contacts, notes, timeline, attachments, close with reason.
  - Interview editor with type, time zone and people.
  - CSV import with column mapping, and CSV export.
  - Web source: `apps/web/src/features/applications/*`, `apps/web/src/routes/dashboard/applications/*`.
- **Application workspace** (full screen).
  - Tabs: Fit, Apply, Prepare, Practise, Debrief, Messages, Saved.
  - Coach sheet.
  - Practise voice states: record, transcribing, playback; no-AI-provider state.
  - Web source: `apps/web/src/features/career/workspace/*`.
- **Career.**
  - Today: needs-you items, discovered roles, next interview, schedule sheet.
  - Coach chat.
  - Knowledge: facts, STARR story editor, preferences.
  - Offers: compare as stacked cards on phone, two columns on tablet.
  - Undo toasts.
  - Web source: `apps/web/src/features/career/*`, `apps/web/src/routes/dashboard/career/*`.

## Acceptance (each part)

- [ ] Every screen and state listed for your part is drawn, in light and dark, on iPhone and Android, and on tablet where listed.
- [ ] `reports/DS3<part>.md` maps every DS2 gap in your part, and every §5 parity item in your part, to a screen id in your file.
- [ ] No non-token colours. All targets ≥ 44 pt.
- [ ] Checked in a browser (Playwright or similar). Every toggle combination renders.

End with the final report block from README §3.5.
