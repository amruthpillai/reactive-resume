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

## Initial validation and evidence

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

## DS4 fix round

All **46 GAP findings plus the field-border finding are FIXED**, following the coordinator’s supplied fallback for borders. No disputes, ownership changes, dependency changes or pushes. Copy without a web source is owner-approved; source-backed labels and distinctions were retained where available.

| Finding | Disposition | Screen / action | Resolution |
| --- | --- | --- | --- |
| app-list: no-reply follow-up nudge, Open/Dismiss | **FIXED** | `app-list` | Nudge links to Lumen; Dismiss removes it. |
| app-list: collapse/expand stage groups | **FIXED** | `app-list`, `app-list-collapsed` | Stage header buttons toggle aria-expanded and row visibility. |
| app-list: Sent icons and None warning | **FIXED** | `app-list` | Labeled resume/letter icons; None uses warning token. |
| app-board: Show N more in stage | **FIXED** | `app-board` | Saved column pages another card and updates remaining count. |
| app-calendar: empty agenda and View application | **FIXED** | `app-calendar`, `app-calendar-empty` | Agenda links to detail; empty state offers Schedule interview. |
| app-review: Save job / Record application without preparing | **FIXED** | `app-review`, `app-review-record` | Existing Save job retained; stage changes CTA to Record application. Both save without tailoring. |
| app-search: searching, no results, failure | **FIXED** | `app-search-loading`, `app-search-none`, `app-search-failed` | Query remains visible; retry/paste recovery. |
| app-detail: Write a letter when none linked | **FIXED** | `app-detail-no-letter` | Native letter-editor handoff from no-letter document state. |
| app-detail: current-stage duration and quick next stage | **FIXED** | `app-detail` | Duration sits below stepper; Move to Offer action. |
| app-submission: attached resume/letter sent checkboxes | **FIXED** | `app-submission` | Independent file selections precede Confirm applied. |
| app-follow-up: Clear | **FIXED** | `app-follow-up` | Clear returns with removal feedback. |
| app-contacts: invalid email and empty list | **FIXED** | `app-contacts-error`, `app-contacts-empty` | Exact error copy, native email validity, Add contact recovery. |
| app-csv-progress: import failure | **FIXED** | `app-csv-failed` | Import failed. Check the CSV and try again; review/retry links. |
| app-csv-map: invalid/missing-name contact notice | **FIXED** | `app-csv-map` | Contact columns map explicitly; skipped contact does not block its application. |
| ws-fit: Against your requirements | **FIXED** | `ws-fit` | Met, Not met and Unknown checks have text labels. |
| ws-fit: Posting/Inferred and Knowledge Undo | **FIXED** | `ws-fit`, `ws-fit-evidence-saved` | Origin badges beside status; saving evidence has functional six-second Undo. |
| ws-apply: submitted banner, Use these answers, caps/limits | **FIXED** | `ws-apply-submitted`, `ws-apply-cap`, `ws-apply-limit` | Submitted answers read-only; copy back to working answers. Add disables at 30; over-limit alert disables submission. |
| ws-apply: Draft/Tighten diff, Accept/Skip, Backed by | **FIXED** | `ws-apply-proposal`, `ws-apply` | Both actions open word diff; Accept replaces answer, Skip preserves original; fact chip opens provenance. |
| ws-prepare: scheduled interview without plan | **FIXED** | `ws-prepare-unplanned` | Plan my preparation with sharing notice. |
| ws-prepare: post-interview debrief prompt | **FIXED** | `ws-prepare-after` | How did it go? opens Start a debrief. |
| ws-prepare: tickable rows and minute progress | **FIXED** | `ws-prepare` | Checkbox changes recompute done of total minutes. |
| ws-briefing: actual contents versus imminent checklist | **FIXED** | `ws-briefing`, `ws-prepare-soon` | Briefing sheet contains focus/opening/stories/Keep it honest; ten-minute checklist now inline and tickable. |
| ws-record-ready: choose audio file and format/size | **FIXED** | `ws-record-ready`, `ws-audio-file` | WebM/MP4/MP3/WAV/Ogg ≤2 MB; selected file goes to transcription. |
| ws-recording: empty/oversize, unsupported/start failure, limit | **FIXED** | `ws-record-failed`, `ws-record-unavailable`, `ws-record-start-error`, `ws-record-limit` | Distinct recovery with file/typed alternatives and two-minute limit toast. |
| ws-practise: specific story, unavailable/error, Recalled, prior attempt | **FIXED** | `ws-practise-story`, `ws-practise-story-unavailable`, `ws-practise-story-error`, `ws-practise-recalled`, `ws-practise-attempt` | Story identity, origin badge and read-only historical answer/feedback. |
| ws-debrief-review: week progress, empty, Practice priority | **FIXED** | `ws-debrief-review`, `ws-debrief-week-empty` | Tickable weekly plan updates done count; explicit priority and first-review empty state. |
| ws-no-provider: Fit/Apply/Prepare/Debrief/Messages | **FIXED** | `ws-fit-no-provider`, `ws-apply-no-provider`, `ws-prepare-no-provider`, `ws-debrief-no-provider`, `ws-messages-no-provider` | Correct active tab, manual fields/briefing and provider setup path; no generation promised. |
| ws-coach: new/delete Undo/attach/inline provider | **FIXED** | `ws-coach-new`, `ws-coach-conversations`, `ws-coach-attachments`, `ws-coach-provider` | Application conversations stay in sheet; deletion hides item with Undo; inline key/model validation. |
| ws-error: wrong-tab/missing saved versions | **FIXED** | `ws-version-wrong-tab`, `ws-version-missing` | Correct error and Saved/Back to current recovery. |
| ws-saved: expandable summary and delete Undo | **FIXED** | `ws-saved` | Native details/summary expands; delete hides item; Undo restores it. |
| workspace tabs: countdown and unread badges | **FIXED** | `ws-fit and all workspace states` | Prepare 23 h and Messages 2 unread shown as named token badges. |
| career-today: follow-up Review draft and discovery Review | **FIXED** | `career-today`, `career-follow-up-draft`, `career-discovery-review` | Separate needs-you destinations for both item types. |
| career-today: Show N read and tracked-role 10-second Undo | **FIXED** | `career-today-read`, `career-role-tracked` | Read items reopen; live tracked confirmation remains undoable after six seconds and expires at ten. |
| career-schedule: Discard changes guard | **FIXED** | `career-schedule-discard; all schedule forms` | Live guard overlays dirty form; Keep editing preserves input; Discard performs pending navigation; Escape keeps editing. |
| career-schedule-error: query/DST/interview/application/removed provider | **FIXED** | `career-schedule-query`, `career-schedule-dst`, `career-schedule-interview`, `career-schedule-application`, `career-schedule-connection` | Exact validation/blocked notices, disabled Save where blocked, default-connection fallback explained. |
| career-coach: empty and starter prompts | **FIXED** | `career-coach-empty` | Three source-backed starter prompts seed composer. |
| career-coach: Ask-first Remember/Not now | **FIXED** | `career-coach-memory` | Explicit retention choice before remembering. |
| career-coach: automatic remembered notice with Undo | **FIXED** | `career-coach-remembered` | Inline notice and Undo toast; action returns to conversation. |
| career-coach: Sources, Copy each answer, Saved a story | **FIXED** | `career-coach-sources; completed Coach responses` | Source links and View story; Copy added to shared completed-answer component. |
| career-coach: server/no-provider/Knowledge/conversation errors | **FIXED** | `career-coach-unavailable`, `career-coach-provider`, `career-coach-knowledge-error`, `career-coach-conversation-error` | Server configuration copy retained; inline provider; retry or explicit Knowledge-off fallback. |
| career-conversations: Rename | **FIXED** | `career-conversation-rename` | Required name updates the displayed conversation title. |
| coach-attachment: multiple removable chips | **FIXED** | `coach-attachment`, `ws-coach-attachments` | Each attachment has its own 44 pt remove target. |
| career-facts: filtered empty and Show all types | **FIXED** | `career-facts-filtered` | Search/type remain visible with Show all types recovery. |
| career-fact-source: widen to all applications | **FIXED** | `career-fact-source` | Replaced opposite action; widening updates fact scope shown in list/source. |
| career-stories: empty and missing story | **FIXED** | `career-stories-empty`, `career-story-missing` | No stories yet / Story not found with create/return recovery. |
| career-offers: term differences, urgent deadline, single offer | **FIXED** | `career-offers`, `career-offer-urgent`, `career-offer-single` | Salary difference attached to term, unknowns stay unknown, deadline warns below 48 h, second-offer CTA. |
| Field borders: WCAG 1.4.11 finding | **FIXED** | `All input/select/textarea fields` | Existing line-2 applied consistently. No stronger line token available in this worktree or mobile/native-app token table (absent). Explicit coordinator fallback; no claim that line-2 alone certifies 3:1 non-text contrast. |

The stronger border-token check was read-only: `mockups/tokens.md` does not exist on this branch or in `mobile/native-app`. Fields use `var(--line-2)` from the existing Desk & Paper source; a browser assertion checks the computed border against that token. This follows the coordinator’s explicit fallback and does not certify WCAG 1.4.11 for that token pair.

Updated evidence:

- **202 states × 6 device/theme combinations = 1,212 renders**, including target sizes, summary controls, frame dimensions, content overflow and destinations. **Zero failures and runtime errors.** All **17 original interaction checks** still pass. [DS4d-browser-checks.json](../mockups/assets/DS3d/DS4d-browser-checks.json).
- **37 additional public-control interaction checks passed**: group collapse, paging, sent indicators, Record application CTA, file selection, email error, evidence Undo, proposal Accept/Skip, 30-question enforcement, minute/week progress, saved summaries/delete/Undo, application conversations, attachment chips, inline key validation, dirty-form preservation, starter prompts, Knowledge-off recovery, rename, fact scope, badges, term comparison, urgent deadline, border token. [DS4d-interactions.json](../mockups/assets/DS3d/DS4d-interactions.json).
- **Foreground timing check:** tracked-role Undo still available after 6.3 seconds and expired after 10.4 seconds. [DS4d-track-undo.json](../mockups/assets/DS3d/DS4d-track-undo.json).
- **Eight settled-frame accessibility scans** (Applications list, proposal, provider sheet, urgent offer; light and dark): zero violations after correcting a descendant selector that incorrectly applied label colour/width to a nested deadline warning. Each retains an incomplete offscreen/clipping contrast item. These scans do not prove non-text field-border contrast or device assistive-technology behaviour. [DS4d-accessibility.json](../mockups/assets/DS3d/DS4d-accessibility.json).
- **15 new screenshots** prefixed `DS4d-` in [assets/DS3d](../mockups/assets/DS3d/). Captures wait for finite transitions to finish; checked list/nudge, proposal, provider sheet and urgent offer visually.
- `node --check` on extracted inline script passed. `pnpm exec oxlint --fix` reports no lintable HTML files. `pnpm exec oxfmt`, `pnpm lint:agent`, `pnpm format:check` and `git diff --check` passed.

Native audio, permissions, provider calls, notifications, sharing, durable storage and device screen readers remain untested prototype integrations. No work outside DS3d ownership. G2b remains the owner’s approval gate.

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
- `app-list-collapsed`
- `app-calendar-empty`
- `app-add`
- `app-paste`
- `app-parsing`
- `app-review`
- `app-add-error`
- `app-search`
- `app-add-provider`
- `app-review-record`
- `app-search-loading`
- `app-search-none`
- `app-search-failed`
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
- `app-detail-no-letter`
- `app-contacts-empty`
- `app-contacts-error`
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
- `app-csv-failed`
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
- `ws-fit-evidence-saved`
- `ws-apply-submitted`
- `ws-apply-cap`
- `ws-apply-limit`
- `ws-apply-proposal`
- `ws-prepare-unplanned`
- `ws-prepare-after`
- `ws-prepare-soon`
- `ws-audio-file`
- `ws-record-failed`
- `ws-record-unavailable`
- `ws-record-start-error`
- `ws-record-limit`
- `ws-practise-story`
- `ws-practise-story-unavailable`
- `ws-practise-story-error`
- `ws-practise-recalled`
- `ws-practise-attempt`
- `ws-debrief-week-empty`
- `ws-fit-no-provider`
- `ws-apply-no-provider`
- `ws-prepare-no-provider`
- `ws-debrief-no-provider`
- `ws-messages-no-provider`
- `ws-coach-new`
- `ws-coach-conversations`
- `ws-coach-attachments`
- `ws-coach-provider`
- `ws-version-wrong-tab`
- `ws-version-missing`
- `career-today`
- `career-today-empty`
- `career-follow-up-draft`
- `career-discovery-review`
- `career-today-read`
- `career-role-tracked`
- `career-schedule`
- `career-schedule-prepare`
- `career-schedule-follow`
- `career-schedule-unavailable`
- `career-schedule-error`
- `career-schedule-discard`
- `career-schedule-query`
- `career-schedule-dst`
- `career-schedule-interview`
- `career-schedule-application`
- `career-schedule-connection`
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
- `career-coach-empty`
- `career-coach-memory`
- `career-coach-remembered`
- `career-coach-sources`
- `career-coach-unavailable`
- `career-coach-provider`
- `career-coach-knowledge-error`
- `career-coach-conversation-error`
- `career-conversation-rename`
- `career-facts-filtered`
- `career-stories-empty`
- `career-story-missing`
- `career-offers`
- `career-offer-picker`
- `career-offers-currency`
- `career-offers-empty`
- `career-offer-questions`
- `career-offer-single`
- `career-offer-urgent`
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
