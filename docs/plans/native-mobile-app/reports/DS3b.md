# DS3b report: Builder Write and Page, letters

Deliverable: `docs/plans/native-mobile-app/mockups/builder.html`. It is one self-contained file. It reuses `mockups/assets/onyx.jpg` from DS1, so `mockups/assets/ds3b/` was not needed.

## What the file contains

- **Controls:** Light / Dark, and iPhone 393×852 / Android 412×915 / Tablet 1180×820.
- **Index:** a left index lists every screen id with its states. A tablet-only item switches the device to Tablet, and a phone-only item switches it to iPhone.
- **Screens:** 48 phone screens with 110 states, and 5 tablet screens with 5 states.
- **States:** a state switch on each frame, and an interaction-notes block under each frame covering gestures, sheet detents, motion (d1/d2/d3 and reduced motion), keyboard, and iOS / Android.
- **Content:**
  - Page 1 is the Onyx preview image.
  - Pages 2 and 3 are typeset in HTML from `sample.ts`, so multi-page, overflow and proposed-edit states can be drawn.
  - Copy comes from the web components listed in the brief.

| Group           | Screens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder chrome  | C1 bar and save status (Saved, Saving, Offline, Not saved + Retry, Private)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Document menu   | M1 menu (unlocked, locked) · M2 Rename / Duplicate · M3 Notes · M4 Details · M5 Print · M6 Moved to Trash + Undo                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Write · outline | W1 outline (top, end) · W2 drag · W3 section sheet (built-in, Skills, custom) · W4 Columns / Keyword layout / Move to… · W5 Rename section · W6 Icon picker · W7 Clear / Delete + Undo · W8 Add section and custom type · W9 Blank resume · W10 Entry options, Move to…, Deleted + Undo · W11 Locked · W12 Imported · W13 200% text · W14 RTL                                                                                                                                                                                                                                          |
| Write · editors | E1 every entry type (13 types plus Custom) · E2 Draft entry · E3 Basics (filled, validation, custom field link) · E4 Picture (settings, source, crop, uploading, remove, hidden) · E5 Summary · E6 Link field · E7 Date field (range, single, picker, parse review, unreadable, reversed) · E8 Rich text toolbar (typing, scrolled, link, text style) · E9 Improve (choose, ask, loading, suggestion, stale, error) · E10 Remote updates (4 toasts and the waiting-while-typing strip) · E11 Conflict sheet (sheet, Use theirs confirm, Kept both) · E12 Entry at 200% · E13 Entry RTL |
| Page            | P1 pages, labels, zoom (Fit, 60%, 150%, page 2) · P2 tap selection + Edit entry · P3 overflow, Fit to N pages (over, fitting, fitted + Undo) · P4 loading, first failure, stale preview, lost characters · P5 proposed edits · P6 offline                                                                                                                                                                                                                                                                                                                                              |
| Cover letter    | L1 Write (For/To/From, Letter/Length, From copied, no application) · L2 application picker · L3 AI draft (offer, streaming, ready, failed, no provider) · L4 body editing and length · L5 Page · L6 Design (inherit, own) · L7 Share & export (Download, Generating, History) · L8 menu, locked, changed elsewhere                                                                                                                                                                                                                                                                     |
| Tablet          | T1 split (outline, offline, locked) · T2 entry in panel + page selection · T3 section popover · T4 conflict form sheet · T5 letter split                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## DS2 gaps in this part → screen

| DS2 gap                                                                                    | Screen                                                                                                      |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Complete Basics form: email, phone, website, validation                                    | E3 (Filled, Validation)                                                                                     |
| Custom contact fields: icons, links, reorder, removal                                      | E3 (Custom field link), W6                                                                                  |
| Picture: upload/URL, crop, remove, visibility, fit, size, aspect, rounding, border, shadow | E4 (all states)                                                                                             |
| B Summary editor and guidance                                                              | E5; Summary row in W1                                                                                       |
| Languages and Interests rows and Add section choices                                       | W1 (Languages in Sidebar, Interests hidden), W8, E1 (Languages, Interests)                                  |
| Education … References field sets                                                          | E1 (each type)                                                                                              |
| Profiles and Skills editors                                                                | E1 (Profiles, Skills with More options)                                                                     |
| Selected entry keeps its identity (DS1 always opened Cascade)                              | P2 (the bar names the selected entry; Basics and Experience states), E1 back label                          |
| Multiple Experience roles: dates, descriptions, reorder, removal                           | E1 Experience                                                                                               |
| Entry links and Show link in title                                                         | E6, E1                                                                                                      |
| Level, entry icons, icon colours                                                           | E1 (Skills, Languages, Interests, Profiles), W6                                                             |
| Single date, Present, parse review, reversed range                                         | E7                                                                                                          |
| Add section picker and custom-section type                                                 | W8                                                                                                          |
| Hidden sections group and restore                                                          | W1 (End of outline), W3 Show on page switch                                                                 |
| Main/sidebar distinction                                                                   | W1 dividers, W4 Move to…                                                                                    |
| Section icon picker                                                                        | W6                                                                                                          |
| Move up / Move down alternative to dragging                                                | W3, W2 notes                                                                                                |
| Columns 1–6 and Skills inline                                                              | W4 Columns                                                                                                  |
| Skills keyword layout                                                                      | W4 Keyword layout                                                                                           |
| Built-in vs custom destructive action                                                      | W3 (Experience: Clear section; Custom: Delete section)                                                      |
| Entry Duplicate, Hide/Show, Move to section/page/new page, Delete                          | W10                                                                                                         |
| Draft / Hidden badges and missing-primary-field guidance                                   | W1, E2                                                                                                      |
| Section “to check” and proposed counts                                                     | W1                                                                                                          |
| Improve: request, suggestion, Replace / Keep mine, stale, retry                            | E9                                                                                                          |
| Extra web formatting                                                                       | E8 draws strike and headings (owner G2a). The other marks are an accepted loss (§0), so they are not drawn. |
| Blank-resume suggestions and Import it                                                     | W9                                                                                                          |
| Locked state and Unlock                                                                    | W11, M1 Locked, T1 Locked, L8 Locked                                                                        |
| Imported-content summary and dismissal                                                     | W12                                                                                                         |
| Saving, Offline, Not saved, Retry                                                          | C1                                                                                                          |
| Offline editing guidance                                                                   | C1 Offline, P6, T1 Offline                                                                                  |
| Undo/redo and Undo feedback                                                                | No controls (owner G2a). Undo toasts: W7, W10 Deleted, M6, P3 Fitted.                                       |
| Live remote update and deferred update                                                     | E10                                                                                                         |
| Page 2 onward, page labels, page count                                                     | P1                                                                                                          |
| Overflow estimate, boundary, Fit to N pages                                                | P3                                                                                                          |
| Preview loading, first failure, stale failure, lost characters                             | P4                                                                                                          |
| Proposed-edit markings and caption                                                         | P5                                                                                                          |
| Document menu: Rename, Duplicate, Lock/Unlock, Notes, Details, Print, Trash                | M1–M6                                                                                                       |
| Public badge in the builder bar                                                            | C1 (Saved vs Private)                                                                                       |
| Reconnect conflict sheet: Keep mine / Use theirs / Keep both                               | E11, T4                                                                                                     |

DS2 gaps in other parts:

- **DS3c (`design.html`):** Check pins and stepper, person/parser view, template preview/apply, Design controls, the Check panel, Share link / Download / History for resumes, and Assistant content. C1 draws the Assistant button and the Share entry point.
- **DS3a (`app.html`):** all Documents gaps.

**DS2 other findings:**

- No `color-mix` and no tints are used. Selection is an accent outline with no fill. Floating bars use `--surface`. So no `tokens.md` tint is needed from this file.
- **Touch targets:**
  - Handles are 36 pt with a 44 pt hit area.
  - Section ⋯ and eye buttons are 40 pt with a 44 pt hit area.
  - The grabber hit area extends to 44 pt.
  - Chips are 32 pt inside 44 pt rows.
  - Segmented controls and mode tabs extend their hit area by 3 pt each side.
  - The only targets under 44 pt are lines on the page. Their rule is in the P2 notes: a tap snaps to the nearest line, so targets never overlap.

## §5 parity items in this part → screen

| §5 item                               | Screen                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Write: every section, custom sections | E1, W8, W3                                                               |
| Write: roles                          | E1 Experience                                                            |
| Write: picture                        | E4                                                                       |
| Write: rich text                      | E8                                                                       |
| Write: Improve                        | E9                                                                       |
| Document menu                         | M1–M6                                                                    |
| Undo/redo                             | Owner G2a: undo toasts only on phone (W7, W10, M6, P3). Tablet ⌘Z is M8. |
| Autosave                              | C1                                                                       |
| Offline                               | C1, P6, T1                                                               |
| Conflicts                             | E11, T4                                                                  |
| Live remote updates                   | E10                                                                      |
| Letters: write                        | L1, L2, L4                                                               |
| Letters: AI draft                     | L3                                                                       |
| Letters: design                       | L6                                                                       |
| Letters: history and download         | L7                                                                       |

The rest of Builder §5 is in `design.html` (DS3c): Design, Check, Share, Download and resume History.

## Decisions and new strings for builders

- **Section sheet, not a dropdown, on phone.** It has 15 rows plus switches (W3). Tablet uses a popover (T3).
- **Section “Move to…” is new on mobile.** It is the non-drag way to cross the Page and Sidebar dividers (W4). Web only has drag.
- **Tablet: tapping a line opens the entry in the panel straight away (T2).** There is no Edit entry step, because the panel and the page are both visible.
- **New strings (not on web), for Lingui in M-phase:**
  - Conflict sheet copy (E11, T4).
  - “An update from another device is waiting. It applies when you leave this field.” (E10).
  - “Page {n} of {count}” (zoom bar).
  - The fitted toast (P3).
  - Picture source choices (E4).
  - “Unlock to rename or move it to Trash.” (M1).
  - Month-picker hint (E7).
  - Keyword hint (E1).
- **Web copy used as-is:** Remote-update toasts use web copy. “Synced changes made in another tab.” may want a mobile wording such as “on another device”. The coordinator decides.
- **Print (M5) is system UI.** Its strings are the OS's own.

## Checks

- **Playwright (Chromium, `/tmp` script):** loaded the file and, for each of the 6 theme × device combinations, clicked every state of every visible frame.
  - 0 page errors and 0 console errors.
  - No interactive element in a device frame was under 44 pt without a hit-area extension, except the page lines noted above.
- **Screenshots** were reviewed for C1, W1, W3, W8, W10, W13, W14, E1, E3, E4, E7, E8, E9, E11, E13, L1, L3, L6, P2, P3, P5, M5, T1, T2, T3 and T5, in light and dark, iOS and Android.
- **oxfmt:** `oxfmt --check` on `builder.html` passes. It was run with the repo-identical `.oxfmtrc.json` from the main checkout, because this worktree has no `node_modules`.

## DS4 fix round

Merged `mobile/native-app` first. `builder.html` now defines and uses the `tokens.md` names: `lineStrong`, `paperInk`, `paperLine`, `paperAccent`, `paperWarn`, `paperWarnSoft`, `pageSelectFill`, `pageSelectLine`, `pageIssueFill` and `pageProposalFill`. The owner's wording “Synced changes made elsewhere.” is applied in E10.

New in this round:

- E14, a shared colour picker.
- New states in E3, E4, E6, M4, W7, W10, L1, L3, L4, L6, L7 and L8.
- The letter section was rewritten. The body is now separate from the greeting and sign-off, and the page shows the composed recipient block.

| # | Finding | Result |
| --- | --- | --- |
| 1 | E3/E6 Website and link label editing | FIXED. A label (tag) button sits in the link field; it is hidden while “Show link in title” is on, as in web `URLInput`. New states: E3 “Website label” (Basics has no Show link in title) and E6 “Label”, each with the Label sheet. |
| 2 | E1/E4 icon, border and shadow colour pickers | FIXED. New E14 colour picker: the 16 web presets plus Custom (square, hue, opacity, hex). It has Icon colour, Border Color and Shadow Color states. E1 and E4 rows open it. |
| 3 | E4 arbitrary ratio, radius in pt | FIXED. Aspect Ratio is a numeric field plus a slider (0.5–2.5), and the presets only fill it. Border Radius is a pt field plus a slider. Widths show pt. |
| 4 | E4 no-photo and upload failure | FIXED. New E4 states: “No photo” (“No photo. Most ATS ignore photos; some regions expect one.” with Add), and “Upload failed” (web error copy with Retry; the previous photo is kept). |
| 5 | W3 sort-by-date partial failure | FIXED. New W7 state “Sort by date: partly sorted” with web's warning naming the entries left at the end. The note explains the behaviour. |
| 6 | W10 hidden-entry “Show on page” | FIXED. New W10 state “Options, hidden entry”. |
| 7 | M4 public address, password and private variants | FIXED. M4 has states Public, Public with a password, and Private. The public address is shown and is tappable. Row order follows web. |
| 8 | W8 “Text” vs “Summary” | FIXED. The custom-section type is labelled Summary. |
| 9 | L1 freeform recipient | FIXED. New L1 state “Freeform letter”: a rich-text Recipient with “This letter keeps its recipient as written.”, and the old body keeps its own framing. |
| 10 | L1/L6 resume picker and No resume | FIXED. New L1 states “Resume picker” and “No resume” (“Your name and contact details come from a resume.”, own-design summary). New L6 state “No resume linked” with web copy. |
| 11 | L1 copied FROM invents editable fields | FIXED. The copied state now only switches the toggle off and shows web's description. No editors appear. |
| 12 | L1/L4/T5 body contains greeting and signature | FIXED. Greeting field, body (paragraphs only) and Sign-off field are now separate, with web's “Clear the greeting or sign-off…” hint. |
| 13 | L1 custom or cleared sign-off and Use default | FIXED. New L4 states: “Custom sign-off” (“Best,” with Use default) and “Greeting cleared” (empty field, omitted on the page). |
| 14 | L3 resume-only, posting-only and neither | FIXED. L3 offer states for posting + resume, resume only (Draft from your resume), posting only, and nothing linked (only Write it myself). Streaming states show each disclosure (“Draft · uses only …”). |
| 15 | L5/T5 recipient and date block on the page | FIXED. A shared `letterPage()` draws the sender header, the recipient (name, company), the date, greeting, body, sign-off and signature. L5, L6, L7 and T5 use it. |
| 16 | L7 History actions; autosaves with menus | FIXED. Name field plus Save, named-version menu (Rename…, Delete) and delete confirm. “Viewing a version” shows the read-only page with Restore this version and Back to now, and “Restored” shows the Before-restore toast. Only named versions have ⋯. Rows are full-width ≥44 pt buttons. |
| 17 | L7 download failure | FIXED. New L7 state “Download failed”: web's “The Word file couldn't be generated…” banner with Try again and Download PDF instead. |
| 18 | L8 Saving and Not saved · Retry | FIXED. New L8 states Saving and Not saved (status Retry plus a toast with web's letter copy). |
| 19 | Letters lack the Assistant entry | FIXED. The phone letter bar has ✦ (opens the DS3c Assistant), as web `letter-bar.tsx`. |
| 20 | T5 resume chrome | FIXED. The tablet bar takes a `letter` mode: letter name, Write / Design only, Share without the Public badge. |
| 21 | T5 missing FROM | FIXED. T5 panel includes From (resume plus the live/copied switch). |
| 22 | P4 dark Try again contrast | FIXED. The button on paper uses `paper` background and a `paperInk` border and text, so it is the same in both themes. `.paper-scope` maps ink, line and sunken to the paper tokens. |
| 23 | Control boundaries under 3:1 | FIXED. Inputs, checkboxes, switch off, slider knob, outline buttons, keyword fields, custom fields, swatches, rich-text fields and Android segmented controls use `lineStrong`. Decorative dashed outlines and chips keep `line2`, as tokens.md allows. |
| 24 | Document-name target 36 pt | FIXED. The name button's hit area is a centred 44 pt band (`::after`), including W13. |
| 25 | Tag and keyword remove 38 pt wide | FIXED. The hit extension is widened to 44 pt. |
| 26 | Improve 40 pt high | FIXED. Removed the 32 pt override; `.btn.sm` (36 pt plus 4 pt above and below) reaches 44 pt. |
| 27 | E13 Arabic Done 43.2 pt | FIXED. The toolbar Done has a minimum width of 48 pt. |
| 28 | L7 version buttons 40.6 pt | FIXED. Each version row's button fills the row (≥ 44 pt, `.li > button.grow`). |
| 29 | P1/P2 page targets at 60% | FIXED. `snapRegions()` gives each line the band to the midpoint of its neighbours' gaps, then grows any band under 44 pt into neighbours that stay ≥ 44 pt. When that is impossible (60% zoom on phone), lines are not targets: one page-sized “Zoom in to select a line” button zooms to Fit around the tap. The selection fill and outline use `pageSelectFill` and `pageSelectLine`. |

**Checks:**

- Playwright, light/dark × iPhone/Android/Tablet, every state of every frame: 0 errors.
- A stricter pass measured every enabled button's effective hit area, including `::after` extensions, in device pt, for every state. Nothing is under 44 pt. The only readings below 44 pt were alert buttons caught mid-way through the d2 pop-in scale animation; they are 44 pt at rest.
- `oxfmt --check` passes.
