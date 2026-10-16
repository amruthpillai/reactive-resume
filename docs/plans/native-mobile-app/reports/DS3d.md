# DS3d: Applications and Career

Status: succeeded. Branch: `mobile/DS3d`. Local commit only; no push.

Deliverable: [career.html](../mockups/career.html). Open directly in a browser; no server or build required. The left index names every screen and state. A hash such as `career.html#ws-practise` opens that screen directly. Theme and device controls cover Light/Dark, iPhone 393×852, Android 412×915, and Tablet 1180×820 landscape.

Scope: DS3d only. No runtime code, shared manifests, lockfile, ledger, other mockups, or token table changed. `frontend-design`, `agent-browser`, and the `test-audit` authoring gate were used. No new dependency added.

## Visual and interaction contract

- Direction B, Desk & Paper. DS1 variables, device frames, list rows, raised New pill, sheets, cards, Hanken Grotesk and Newsreader, with the same inline Phosphor SVG paths as DS1. No Direction A editing sheet or phone undo/redo controls.
- Colours come from DS1 and `packages/ui/src/styles/globals.css:19–205`; the additional existing tokens are `info-soft`, `info-text`, `accent-hover`, and the six stage colours. No new tints or `color-mix`; DS3a does not need a new token contract for this file.
- Each selected frame has six interaction-note entries: gestures, sheet detents, d1/d2/d3 transitions and reduced motion, keyboard, iOS/Android differences, accessibility.
- Half/Full sheet detents are interactive through the 44 pt grabber button. Phone sheets open Full; tablet sheets become 480 pt trailing panels. Escape/backdrop closes them. Text focus expands Half to Full. Background is inert while a sheet is open.
- Phone workspace fills the screen, with horizontally scrolling seven-tab navigation. Tablet workspace adds an application context column. Applications Board scrolls by stage; each card has Move to… as the accessible drag alternative.
- Phone Offers stack; tablet Offers use two columns. Different currency/pay-period offers are not converted or totaled. Unknown terms are explicit.
- All visible controls have at least 44×44 pt targets. Checkbox labels supply the hit area. Focus is visible; stage names accompany stage dots. Arabic sample mirrors the frame and isolates Latin company/timezone values.
- Destructive Career actions show six-second Undo toasts; Forget actually hides the fact and Undo restores it. `career-undo` is an indexed frozen toast state for review. Permanent application/timeline deletion uses confirmation and promises no Undo.
- Applications/Career offline views show cached information and reconnect recovery. They do not promise the resume/letter offline edit queue. Locked applies to a linked resume, not an invented application lock.
- Reminder permission follows explicit opt-in. Permission-denied recovery offers device settings and `.ics` sharing. Reminders are local to the device; Career server schedules remain a separate, opt-in Today feature with provider/web-search availability and optional verified-email copies.
- Practice uses server transcription through a configured provider, with record/stop/transcribing/review/playback/error/typed fallback states. No browser dictation fallback. Data-sharing and retention copy remains visible.

Resume evidence and name are from current `packages/schema/src/resume/sample.ts`: David Kowalski, Cascade Studios, C++ tooling and the 40% iteration-time result. Applications, recruiters, jobs and offer values are explicitly fictional examples, using glossary company names and example domains.

## Current-source inputs checked

- `apps/web/src/features/applications/stages.ts` and `components/list-view.tsx`: Interview, Offer, Screening, Applied, Saved, Closed grouping; Updated/Role/Next step sort; bulk move/tag/close/permanent delete.
- `components/add-application-dialog.tsx`, `application-form-sheet.tsx`, and `application-detail-sheet.tsx`: link/text reading, search, manual fallback, role/company review, saved posting provenance, editable facts, submission confirmation.
- `components/detail/{next-step-card,sent-documents,contacts,activity,close-dialog}.tsx`: next action, sent versus merely linked documents, contact fields, timeline and close reasons.
- `components/interview-dialog.tsx`, `file-attachment-field.tsx`, import/export sheets, Board/Calendar/Insights components and application routes: interview types, timezones and people; PDF attachments; 500-row CSV cap; mapping and export filters.
- `apps/web/src/features/career/workspace/{shell,fit,apply,prepare,practise,debrief,messages,saved,coach-sheet}.tsx`: seven tabs, result review, briefings, voice limits, consent and application-scoped Coach.
- `apps/web/src/features/career/{today,schedule-sheet,coach,coach-thread,offers,shared}.tsx`, Knowledge components and Career routes: Today/discovery, scheduled activity, conversation context, fact sources and corrections, STARR, numeric preferences, offer comparison and six-second Undo.

The mobile notification permission, `.ics` share sheet and reconnect/read-only states adapt the approved mobile brief; they are not claims that those native integrations already exist.

## README §5 parity map

Every identifier below is selectable in the left index and usable as a URL fragment.

| §5 item | Screen ids |
| --- | --- |
| Applications: list, stage grouping, search, sort | `app-list`, `app-sort`, `app-search-results`, `app-search-empty` |
| Applications: board | `app-board`, `app-move` |
| Applications: calendar | `app-calendar`, `app-interview-new` |
| Applications: insights | `app-insights`, `app-pipeline` |
| Add from link or text, parsing, autofill review, search postings | `app-add`, `app-paste`, `app-parsing`, `app-review`, `app-search`, `app-add-error`, `app-add-provider` |
| Detail, stage stepper, next step and editable facts | `app-detail`, `app-edit`, `app-tags`, `app-actions`, `app-move`, `app-posting` |
| What you sent, linked versus submitted, sent snapshot | `app-submission`, `app-sent`, `app-detail` |
| Contacts | `app-contacts` |
| Notes | `app-notes`, `app-notes-error` |
| Timeline | `app-timeline`, `app-timeline-edit`, `app-timeline-delete` |
| Interviews: type, date/time, timezone, length, location, people, preparation | `app-interview`, `app-interview-new`, `app-interview-error` |
| Attachments: PDF ≤10 MB, picker, failure | `app-attachments`, `app-file-picker`, `app-file-error` |
| Close with reason, reopen, permanent delete | `app-close`, `app-closed`, `app-delete` |
| Bulk move, tag, close, delete and partial failure | `app-bulk`, `app-bulk-move`, `app-bulk-tag`, `app-bulk-close`, `app-bulk-delete`, `app-bulk-result` |
| CSV import, mapping, invalid values, cap, progress, results | `app-csv-menu`, `app-csv-import`, `app-csv-map`, `app-csv-error`, `app-csv-progress`, `app-csv-done` |
| CSV export, filters/date range and share | `app-csv-export`, `app-export-error` |
| Reminders, consent, denied permission, `.ics` | `app-follow-up`, `app-reminder`, `app-permission`, `app-permission-denied`, `app-ics` |
| Career: Today, needs-you, opportunities, next interview | `career-today`, `career-today-empty` |
| Career: schedules, timezone, opt-ins and unavailable server | `career-schedule`, `career-schedule-prepare`, `career-schedule-follow`, `career-schedule-unavailable`, `career-schedule-error` |
| Career: Coach, conversations, context, streaming, Stop, retry, attachments | `career-coach`, `career-conversations`, `career-coach-stream`, `career-coach-stopped`, `career-coach-error`, `coach-attachment` |
| Knowledge: facts, types, consent, sources, corrections, scope, forget | `career-facts`, `career-facts-empty`, `career-fact-correct`, `career-fact-source`, `career-undo` |
| Knowledge: STARR stories, linked facts, changed-fact review | `career-stories`, `career-story`, `career-story-editor` |
| Knowledge: preferences, roles/places, salary/currency/pay period, office days, notice, timezone | `career-preferences`, `career-preferences-error` |
| Offers: comparison, unknowns, original currency/period, question list | `career-offers`, `career-offer-picker`, `career-offers-currency`, `career-offers-empty`, `career-offer-questions` |
| Workspace: Fit, Apply | `ws-fit`, `ws-fit-empty`, `ws-fit-loading`, `ws-evidence`, `ws-apply`, `ws-question-options` |
| Workspace: Prepare and briefing | `ws-prepare`, `ws-prepare-empty`, `ws-briefing` |
| Workspace: Practise including voice | `ws-practise`, `ws-record-ready`, `ws-recording`, `ws-transcribing`, `ws-transcript`, `ws-playback`, `ws-feedback`, `ws-voice-settings`, `ws-transcribe-error`, `ws-voice-error`, `ws-no-provider` |
| Workspace: Debrief and remembering with scope | `ws-debrief`, `ws-debrief-review`, `ws-remember` |
| Workspace: Messages, reply and reviewed proposed changes | `ws-messages`, `ws-message-review`, `ws-message-applied` |
| Workspace: Saved, empty, read-only | `ws-saved`, `ws-saved-empty`, `ws-saved-version` |
| Workspace: Coach sheet with application context | `ws-coach`, `ws-coach-stream`, `ws-coach-stopped`, `ws-coach-error` |
| Cross-cutting empty/loading/error/offline/read-only/RTL | `app-empty`, `app-loading`, `app-error`, `app-offline`, `career-loading`, `career-error`, `career-offline`, `ws-loading`, `ws-error`, `ws-offline`, `ws-locked`, `career-rtl` |

README §5 Assistant infrastructure, document library, builder, letters, Settings and public utilities belong to DS3a/b/c. DS3d draws the Career/application Coach surfaces that consume that infrastructure. `provider-handoff`, `web-handoff`, `document-handoff`, and `letter-handoff` describe the destination and return path without implementing another part’s screens.

## DS2 gaps applicable to DS3d

DS2 reviewed three DS1 anchor screens (Documents, Builder Write, Builder Page), so it contains no Applications/Career-specific feature gaps. The shared findings that apply here have explicit homes:

| DS2 finding | DS3d home |
| --- | --- |
| Application count and Career unread missing from navigation | `app-list`, `career-today` and all non-workspace frames: Documents 8, Applications 5, Career 2; tablet sidebar includes the same signals |
| Sub-44 pt mode controls, chips, handles and grabbers | All frames: minimum control width/height 44 pt; 44 pt checkbox label; 44 pt sheet grabber; workspace tabs do not shrink |
| Non-token selected fills | `app-list`, `app-board`, `career-today`, `ws-fit`: existing accent-soft/accent-text tokens; no `color-mix` |
| Offline/save guidance where applicable | `app-offline`, `career-offline`, `ws-offline`, `app-notes-error`, `career-preferences-error`; application edits do not inherit the resume queue |
| Lock/read-only where applicable | `ws-locked`, `app-sent`, `ws-saved-version`; lock remains owned by linked document |
| Undo feedback after destructive edits | `career-facts` → Forget → Undo, `career-undo`, `ws-message-review` → Apply → `ws-message-applied` |

DS2’s document-to-application picker, unlink and linked-company labels remain DS3a ownership. This file supplies application detail and sent-document destinations, without claiming those library controls are implemented here. All other DS2 entries concern DS3a/b/c. Owner-settled phone undo/redo and unsupported rich-text marks are not reopened.

## Validation and evidence

- `agent-browser --session ds3d open file://…/career.html`: Chromium loaded the standalone file.
- Browser sweep via `agent-browser eval --stdin`: **138 indexed states × 2 themes × 3 device modes = 828 renders**. Checked logical frame sizes, nonempty frames, six note entries per frame, reachable destinations, content horizontal overflow, and visible interactive target boxes (checkbox labels included). **Zero failures; zero captured runtime errors.** Evidence: [browser-checks.json](../mockups/assets/DS3d/browser-checks.json).
- **17 public-control interaction assertions passed**: read/parse/review/save, required Company validation, selected-company identity, CSV mapping, reminder permission and denial fallback, record/stop/transcribe/review, application Coach scope and Stop, Forget/Undo, detent changes, tablet offer columns, read-only controls, RTL. Same JSON records each assertion.
- `agent-browser a11y --tags wcag2a,wcag2aa --selector '#device' --json`: representative tablet workspace passed in light and dark with **zero violations**. Each scan has one incomplete offscreen/clipping contrast review; this is not a full-screen-reader or all-screen accessibility certification. Evidence: [light](../mockups/assets/DS3d/accessibility-light.json), [dark](../mockups/assets/DS3d/accessibility-dark.json).
- `agent-browser set media light reduced-motion`: media query matched, d1 became 1 ms, waveform animation became `none`. Evidence: [reduced-motion.json](../mockups/assets/DS3d/reduced-motion.json).
- **15 device screenshots** saved under [assets/DS3d](../mockups/assets/DS3d/): Applications list/detail, tablet Board light/dark, CSV mapping, tablet workspace light/dark, Android recording, transcript review, Today, preparation schedule, Offers phone/tablet, Arabic sample, Undo toast. Visually inspected representative phone, tablet, dark, voice, sheet, offer and RTL renders. Fixed compressed workspace tabs, a short Fit target, and metadata contrast on accent cards.
- `pnpm exec oxlint --fix docs/plans/native-mobile-app/mockups/career.html`: no matching lintable files; Oxlint does not lint HTML. Root `pnpm lint:agent` passed, but does not validate embedded JavaScript. Browser execution and formatting cover this file’s inline script.
- `pnpm exec oxfmt docs/plans/native-mobile-app/mockups/career.html`: passed. Initial direct formatter attempt could not resolve the absent worktree dependencies; existing-checkout formatter worked, then pnpm restored already-locked workspace dependencies and normal local formatting/checks passed. No dependency manifest or lockfile edits.
- `pnpm format:check`: passed. `git diff --check`: passed.

No application build/typecheck, simulator/emulator, real notification/audio/file/share/clipboard/AI operation, network persistence, or device accessibility pass was run. This task delivers interactive HTML designs; native system integrations are illustrated, with prototype notices. Drag/long-press gestures are specified in notes and have visible button alternatives; they are not native gesture implementations. External Google Fonts match DS1 and fall back to local system fonts if unavailable. DS4 coverage/contrast review and owner G2b approval remain later gates.

## Complete screen index

- `app-list`
- `app-sort`
- `app-search-results`
- `app-search-empty`
- `app-actions`
- `app-move`
- `app-bulk`
- `app-bulk-move`
- `app-bulk-tag`
- `app-bulk-close`
- `app-bulk-delete`
- `app-bulk-result`
- `app-delete`
- `app-board`
- `app-calendar`
- `app-insights`
- `app-pipeline`
- `app-context-1`
- `app-context-2`
- `app-context-3`
- `app-context-4`
- `app-add`
- `app-paste`
- `app-parsing`
- `app-review`
- `app-add-error`
- `app-search`
- `app-add-provider`
- `app-posting`
- `app-detail`
- `app-edit`
- `app-tags`
- `app-sent`
- `app-submission`
- `app-contacts`
- `app-notes`
- `app-notes-error`
- `app-timeline`
- `app-timeline-edit`
- `app-timeline-delete`
- `app-attachments`
- `app-file-picker`
- `app-file-error`
- `app-close`
- `app-closed`
- `app-interview`
- `app-interview-new`
- `app-interview-error`
- `app-reminder`
- `app-permission`
- `app-permission-denied`
- `app-ics`
- `app-follow-up`
- `app-csv-menu`
- `app-csv-import`
- `app-csv-map`
- `app-csv-error`
- `app-csv-progress`
- `app-csv-done`
- `app-csv-export`
- `app-export-error`
- `ws-fit`
- `ws-fit-empty`
- `ws-fit-loading`
- `ws-evidence`
- `ws-apply`
- `ws-question-options`
- `ws-prepare`
- `ws-prepare-empty`
- `ws-briefing`
- `ws-practise`
- `ws-record-ready`
- `ws-recording`
- `ws-transcribing`
- `ws-transcript`
- `ws-playback`
- `ws-voice-settings`
- `ws-transcribe-error`
- `ws-voice-error`
- `ws-no-provider`
- `ws-feedback`
- `ws-debrief`
- `ws-debrief-review`
- `ws-remember`
- `ws-messages`
- `ws-message-review`
- `ws-saved`
- `ws-saved-empty`
- `ws-saved-version`
- `ws-coach`
- `ws-coach-stream`
- `ws-coach-stopped`
- `ws-coach-error`
- `ws-message-applied`
- `career-today`
- `career-today-empty`
- `career-schedule`
- `career-schedule-prepare`
- `career-schedule-follow`
- `career-schedule-unavailable`
- `career-schedule-error`
- `career-coach`
- `career-coach-stream`
- `career-coach-stopped`
- `career-coach-error`
- `career-conversations`
- `coach-attachment`
- `career-facts`
- `career-facts-empty`
- `career-fact-correct`
- `career-fact-source`
- `career-stories`
- `career-story`
- `career-story-editor`
- `career-preferences`
- `career-preferences-error`
- `career-offers`
- `career-offer-picker`
- `career-offers-currency`
- `career-offers-empty`
- `career-offer-questions`
- `app-empty`
- `app-loading`
- `app-error`
- `app-offline`
- `career-loading`
- `career-error`
- `career-offline`
- `ws-loading`
- `ws-error`
- `ws-offline`
- `ws-locked`
- `career-rtl`
- `career-undo`
- `provider-handoff`
- `web-handoff`
- `document-handoff`
- `letter-handoff`
