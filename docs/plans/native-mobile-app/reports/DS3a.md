# DS3a report: app shell, documents, account and utilities

Deliverables:

- `mockups/app.html`: 75 frames in 9 groups. Every frame has an id, a left-index entry and an interaction-notes block (gestures, sheet detents, motion with d1/d2/d3 and reduced motion, keyboard, iOS/Android).
  - Controls: Light / Dark and iPhone 393×852 / Android 412×915 / Tablet 1180×820.
  - Every frame renders in all six combinations. On tablet, tab roots sit beside the sidebar, pushed screens use a centred column, and sheets become 540 pt form sheets.
  - Direct links work: `app.html?theme=dark&device=tab#D12`.
- `mockups/tokens.md` (D4): the React Native token table. It covers:
  - colours, light and dark, as hex taken from `globals.css`
  - named tints
  - the type scale in pt, spacing, sizes and radii
  - shadows as `boxShadow` plus the legacy iOS shadow and Android `elevation`
  - motion, reduced-motion rules and a platform mapping
- `mockups/index.html`: a hub section added at the top. It links to the four DS3 files and tokens.md, and says DS1 below it is the historical study. The rest of the file is unchanged.

The visual language copies DS1 Direction B: the same tokens, frames, tab bar, New pill, cards, rows, sheets, menus and type.

## Screen ids

| Group         | Ids                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell         | S1 tab bar with counts (tablet: sidebar) · S2 guest banner · S3 offline banner                                                                                                                                                                                                                                                                                                                                                                      |
| Sign-in       | AU1 server picker · AU2 custom server, checking · AU3 custom server, error · AU4 sign-in landing · AU5 waiting for the browser · AU6 sign-ups disabled · AU7 signed out · AU8 session expired · AU9 sign-in didn't complete                                                                                                                                                                                                                         |
| Documents     | D1 list · D2 grid · D3 sort and view menu · D4 search results · D5 no results · D6 options menu, resume · D7 options menu, locked letter · D8 rename · D9 tags, one document · D10 tags, several documents · D11 link to application · D12 multi-select · D13 sharing menu · D14 partial success + Undo · D15 first run · D16 loading · D17 load error · D18 Trash · D19 delete now confirm · D20 Trash empty · D21 Arabic (RTL)                    |
| New document  | N1 New sheet · N2 import: choose a file (formats + AI note) · N3 importing · N4 import review · N5 import failed · N6 copy for a job · N7 sample added                                                                                                                                                                                                                                                                                              |
| Search        | Q1 search · Q2 results · Q3 no results                                                                                                                                                                                                                                                                                                                                                                                                              |
| Settings      | ST1 root · ST2 account · ST3 username error · ST4 change photo · ST5 in-app browser tab · ST6 export everything · ST7 delete account · ST8 sign out / switch server · ST9 preferences · ST10 timezone · ST11 AI & developer · ST12 AI providers · ST13 providers empty · ST14 add provider (test failed) · ST15 edit provider · ST16 web access · ST17 API keys · ST18 new API key · ST19 key shown once · ST20 MCP server + connected applications |
| Public resume | P1 reflow (tablet: page) · P2 download PDF · P3 password prompt · P4 not shared · P5 loading                                                                                                                                                                                                                                                                                                                                                        |
| ATS checker   | A1 choose a PDF · A2 error · A3 checking · A4 report · A5 posting terms · A6 as software reads it · A7 importing into the editor                                                                                                                                                                                                                                                                                                                    |

**State coverage:**

| State        | Frames                           |
| ------------ | -------------------------------- |
| Empty        | D15, D20, ST13                   |
| Empty search | D5, Q3                           |
| Loading      | D16, P5, N3, A3                  |
| Error        | D17, AU3, AU9, N5, A2, ST14, ST3 |
| Offline      | S3                               |
| Locked       | D7, D12/D13 (Lock and Unlock)    |
| RTL          | D21                              |

Large text applies to Builder Write only (DS3b). Each frame's notes give its loading or error copy where it has no frame of its own.

## DS2 gaps in this part

| DS2 gap                                                                                                                        | Home                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sort choices and Grid/List                                                                                                     | D3 (D1 list, D2 grid)                                                                                                                                                         |
| Search scope (tags, linked applications); clear search and filters                                                             | D4 (match through linked application), D5 (Clear search and filters)                                                                                                          |
| Linked application company on cards and rows                                                                                   | D1, D2 (briefcase + company)                                                                                                                                                  |
| Card actions: Open, Copy public link, Rename, Duplicate, Copy for a job, Link to application, Tags, Lock/Unlock, Move to Trash | D6 (resume), D7 (letter, locked), D8 (Rename)                                                                                                                                 |
| Single and bulk tag editing                                                                                                    | D9, D10                                                                                                                                                                       |
| Application linking, picker, Unlink                                                                                            | D11                                                                                                                                                                           |
| Bulk Make public, Make private, Lock editing, Unlock                                                                           | D12 (Lock in the bar), D13 (Sharing menu)                                                                                                                                     |
| Partial success, locked-document feedback, Undo after Trash                                                                    | D14 (+ copy for every variant in its notes)                                                                                                                                   |
| Trash: days left, Restore, permanent delete confirm, empty state                                                               | D18, D19, D20                                                                                                                                                                 |
| New document sheet, incl. sample and new cover letter                                                                          | N1, N7                                                                                                                                                                        |
| Import picker for RR JSON, JSON Resume, LinkedIn ZIP, PDF, DOCX; AI requirement                                                | N2                                                                                                                                                                            |
| Import progress, cancel, success review, failure                                                                               | N3, N4, N5                                                                                                                                                                    |
| Copy for a job: source, application, name                                                                                      | N6                                                                                                                                                                            |
| First run: import, Start blank, Try a sample                                                                                   | D15                                                                                                                                                                           |
| Library loading skeleton and load-error retry                                                                                  | D16, D17                                                                                                                                                                      |
| Guest-account warning and actions                                                                                              | S2                                                                                                                                                                            |
| Global search across documents, conversations, actions                                                                         | Q1, Q2, Q3; entry point is the magnifier on Documents (D1) and "Search or run…" in the tablet sidebar (S1 tablet)                                                             |
| Navigation counts and Career unread                                                                                            | S1 (phone: Applications count, Career unread badge; tablet: all counts + Trash)                                                                                               |
| New document indicator                                                                                                         | D1, D2, N7 ("New" badge)                                                                                                                                                      |
| Non-token `color-mix` (DS2 other findings)                                                                                     | tokens.md §1.1: `pageSelectFill`, `pageSelectLine`, `pageIssueFill`, `pageProposalFill`, `selectedFill`; A's floating-bar tint retired                                        |
| Touch targets under 44 pt (DS2 other findings)                                                                                 | Chips 32 pt in 44 pt cells; grabber note in tokens.md §3.1; tag-chip × and small buttons use `hitSlop` (CSS `::after`). Checked by script: no target under 44 pt in any frame |

The other DS2 gaps (Basics through Assistant, and the conflict sheet) belong to DS3b and DS3c.

## §5 parity items in this part

| §5 item                                                            | Frames                                             |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| Documents: library, search, tags, sort, views, multi-select, trash | D1–D5, D9–D14, D18–D20                             |
| Import of RR JSON, JSON Resume, LinkedIn, PDF and DOCX (AI)        | N2–N5                                              |
| Copy for job, duplicate, lock, link to application                 | N6, D6 (Duplicate, Lock editing), D7 (Unlock), D11 |
| Settings: account (native plus browser handoff)                    | ST2, ST3, ST4, ST5                                 |
| Settings: preferences                                              | ST9, ST10                                          |
| Settings: AI providers                                             | ST12–ST15                                          |
| Settings: web access                                               | ST16                                               |
| Settings: API keys                                                 | ST17–ST19 (+ MCP in ST20)                          |
| Settings: export, delete                                           | ST6, ST7                                           |
| Public: shared resume viewer                                       | P1–P5                                              |
| Public: ATS checker                                                | A1–A7                                              |
| §1.5 `(auth)/server`, `(auth)/sign-in`, `search.tsx`               | AU1–AU9, Q1–Q3                                     |

## Decisions I made where web has no equivalent (review at G2b)

1. **Tab bar badges.** The web phone tab bar shows no counts; the brief asks for them.
   - Applications shows its open count as a quiet grey number.
   - Career shows unread as a filled accent badge, hidden at 0.
   - Documents has no badge, because its count is on the All tab.
2. **Search entry point.** The phone shows a magnifier in the Documents top bar. Web phones have no palette entry at all.
3. **New copy with no web source.** Drafted in the web's voice:
   - server picker labels and errors (AU1–AU3)
   - waiting for the browser (AU5)
   - signed out (AU7)
   - session expired (AU8)
   - the offline strip and offline toasts (S3)
   - Set up AI on the import sheet (N2)
   - the "No AI provider yet" banner (ST13)
   - the sign-out confirm (ST8)
   - P2 download failure
4. **ATS privacy line.** Mobile checks the PDF on the server (`POST /pdf-checks`, §1.5). So "checked in your browser, never uploaded" becomes "checked on the server and not stored". That claim must be true of the server implementation.
5. **Settings layout.**
   - Connected applications moves to the MCP server page on phone, to keep AI & developer short.
   - Email change is a browser-tab row next to the security rows, because it needs the web confirmation link.
6. **Rename** is an alert with a text field, not an inline edit.
7. **Trash and swipe actions.** Trash stays a row on phone even when empty (owner). Tablet shows Trash in the sidebar, as web does. iOS gets swipe actions on library and Trash rows; Android uses ⋯ only.

## Notes

- **Colours.** All UI colours are `var(--token)`. The tokens.md additions are:
  - `paperInk` and `paperLine`, for text and rules the app draws on the white page (letter cards, public reflow)
  - the named tints
  - `--resume-accent`, which is sample resume data and not a token
  - `--bezel` and `--camera`, hardware stand-ins drawn outside the app UI
- **Fonts.** Arabic uses the system Arabic face, because Hanken Grotesk and Newsreader have no Arabic glyphs.
- **Checks run:**
  - A Playwright script renders all six toggle combinations. Each has 75 frames, with no page errors, no content overflowing a screen, and no button or tab under 44 pt (`::after` hit extensions count).
  - I reviewed screenshots of about 25 frames across themes and devices.
  - `oxfmt --check` passes on `app.html`, `index.html` and `tokens.md`. The worktree has no `node_modules`, so I ran oxfmt from the main checkout with the identical `.oxfmtrc.json`.
- **Not done:**
  - No WCAG contrast check of the token pairs; that is DS4's job.
  - Tablet frames are drawn iPad-style only. The Android tablet differences are in the notes.
  - No Artifact was published; README §2.2 mentions one, but the brief asks only for files.

## DS4 fix round

The DS4a review (Codex) found 19 gaps and 15 fixes. All 34 are fixed; I disputed none. `app.html` now has 114 frames.

New frames carry a suffix and sit right after the frame they extend. For example, D11b comes after D11. The 0-issues result in the Checks list below covers these new frames too.

**Owner decisions applied:**

- Copy that has no web source is approved.
- The ATS "not stored" line is confirmed true.
- tokens.md now has `paperAccent`, `paperWarn` and `paperWarnSoft`, with light values in both themes. DS3c uses these names.

### Gaps

| Finding                                                          | Status | Where                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 tablet List view missing                                      | FIXED  | The tablet List view is now the web table (Name, Type, Application, Edited); D1 uses it on the Tablet toggle and D2 stays Grid. Added D2b, grid while selecting.                       |
| D11 empty application picker                                     | FIXED  | D11b, with "No applications yet. Add one in Applications first." and Go to Applications.                                                                                               |
| N6 no source resumes                                             | FIXED  | N6b, with the web message and an "Import or create a resume" button.                                                                                                                   |
| D18 Trash load failure                                           | FIXED  | D18b, Couldn't load Trash, with Try again.                                                                                                                                             |
| Q1/Q2 scoped lists and loading                                   | FIXED  | Q4 Resumes (with Create a new resume), Q5 Applications loading ("Loading applications…"), Q6 Assistant conversations. Q2 keeps the combined results as the mobile first page.          |
| ST2/ST3 name validation and failed save                          | FIXED  | ST3b: "Enter a name, up to 64 characters." plus the toast "Couldn't save. Try again."                                                                                                  |
| ST4 avatar pending and failure                                   | FIXED  | ST4b uploading (progress ring, "Uploading photo…"). ST4c "Couldn't upload the photo." with Try again.                                                                                  |
| ST6/ST7 export failure; delete not confirmed, pending and failed | FIXED  | ST6b "Couldn't export. Try again." ST7b Delete disabled while the field reads "delet". ST7c Deleting…. ST7d "Couldn't delete the account."                                             |
| ST9 language picker                                              | FIXED  | ST9b, a searchable list with locale code and name, plus Help translate.                                                                                                                |
| ST12/ST13 managed, loading, configuration and load error         | FIXED  | ST12b Managed by your server. ST12c Loading providers…. ST12d the ENCRYPTION_SECRET notice. ST12e load error with Try again.                                                           |
| ST14 provider picker and model suggestions                       | FIXED  | ST14b, the picker with all 16 providers. ST14c, the suggestion list above the keyboard. ST14d, the free-text fallback with the other hint variants.                                    |
| ST15 Base URL missing                                            | FIXED  | ST15 has a Base URL field (`https://gateway.example.com/v1`).                                                                                                                          |
| ST16 saved connection, test results, managed, loading, retry     | FIXED  | ST16b, saved Firecrawl with separate search and reading results and Test / Change / Remove. ST16c, Provided by your server: Tavily. ST16d, loading plus the load error with Try again. |
| ST17–ST19 loading, empty, create and revoke failures             | FIXED  | ST17b loading. ST17c empty ("No keys yet."). ST17d "Couldn't revoke the key." ST18b "Couldn't create the key. Try again."                                                              |
| ST20 connected apps loading, empty and errors                    | FIXED  | ST20b "Loading connections...". ST20c "No connected applications.". ST20d "Could not load connected applications." and "Could not revoke this connection. Try again."                  |
| P1 downloads off                                                 | FIXED  | P1b, a Share-only bar.                                                                                                                                                                 |
| P2 download pending and failure                                  | FIXED  | P2b Downloading…. P2c "Couldn't download the PDF. Try again." with Retry.                                                                                                              |
| A4–A6 Original page                                              | FIXED  | A6b, the uploaded PDF page rasterised on device, pinch to zoom, with the tab-switch transition in its notes.                                                                           |
| A4 zero-issue and truncated                                      | FIXED  | A4b Reads cleanly / "Nothing here should cost you a match." A4c "Only the first 10 pages were checked."                                                                                |

### Fixes

| Finding                               | Status | Change                                                                                                                                                                                                                                                                |
| ------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ink3` on `selectedFill` 4.46:1       | FIXED  | Selected rows (D2b, D10, D12, D13) and the active sidebar count use `ink2`, which is 7.18:1 light and 6.92:1 dark. tokens.md notes the rule on `ink3`.                                                                                                                |
| Trashed rows at 0.7 opacity           | FIXED  | Only the thumbnail dims; the text stays opaque.                                                                                                                                                                                                                       |
| `line2` control boundaries 1.75:1     | FIXED  | New token `lineStrong` (`#888680` / `#73726C`) is used for inputs, radios, checkboxes and the switch track when off. It is ≥ 3.16:1 on `raised`, `surface`, `bg` and `sunken` in light, and ≥ 3.44:1 in dark. `line2` is limited to chips, the grabber and skeletons. |
| Warning icons in `warn` 2.52:1        | FIXED  | ATS category icons use `warnText`. tokens.md says icons and text use `warnText`; `warn` is for fills and the score ring.                                                                                                                                              |
| All tab 31×44                         | FIXED  | Type tabs have a minimum width of 44 pt.                                                                                                                                                                                                                              |
| Icon-only Back 36×44                  | FIXED  | `.back` has a minimum width of 44 pt on every platform.                                                                                                                                                                                                               |
| Bordered small buttons 42 pt          | FIXED  | The hit extension grew to 6 pt above and below, so a 36 pt button reaches 48 pt.                                                                                                                                                                                      |
| Contact pills 32 pt                   | FIXED  | The pills extend their hit area to 44 pt.                                                                                                                                                                                                                             |
| ST5 "Two-step verification"           | FIXED  | The mock web page now uses the glossary's "Two-factor authentication", matching ST2. The live web string (`security.tsx:56`) is outside DS3a ownership. FOLLOW-UP: change it to the glossary term.                                                                    |
| N2 "Read on this device"              | FIXED  | Now reads "Read on the server from its text layer. No AI needed. Up to 10 MB."                                                                                                                                                                                        |
| ST13 overclaims what works without AI | FIXED  | Now names Career coaching and generation among the features that need AI. It says only editing, Design, the readability checks and downloads work without it.                                                                                                         |
| A7 "Every issue will be waiting"      | FIXED  | Now "The editor opens on Check, which checks the imported resume again." It promises access to Check, not the original report.                                                                                                                                        |
| A1/A7 25 MB check vs 10 MiB import    | FIXED  | A1 notes the limit. A4d replaces Fix these in the editor for files over 10 MB, with "Export a smaller PDF…" and Start blank.                                                                                                                                          |

**tokens.md additions:** `lineStrong`, `paperAccent`, `paperWarn` and `paperWarnSoft`. `pageIssueFill`'s outline now names `paperWarn`.

**Checks:**

- Playwright renders all 6 theme and device combinations with 114 frames each: 0 page errors, 0 overflow, 0 targets under 44 pt.
- I reviewed screenshots of D1 (tablet), ST14c, A4d (dark Android) and ST7b.
- `oxfmt --check` passes.
