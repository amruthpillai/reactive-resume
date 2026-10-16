# DS2: Gap review of DS1 (Codex)

Review of both directions against the web source. The owner chose Direction B at G2a. Gaps marked A-only no longer apply. Undo/redo stays out on phone (owner: skip). Rich-text marks with no toolbar home are an accepted loss (§0).

## Gaps

- GAP: Sort choices and switching Grid/List within either direction — `apps/web/src/features/documents/documents-page.tsx:173` — open Sort and view menu.
- GAP: Search scope covering tags and linked applications; clear-search/filter recovery — `apps/web/src/features/documents/documents-page.tsx:222` — search results and empty-results state.
- GAP: Linked application company on document cards/rows — `apps/web/src/features/documents/document-card.tsx:219` — document metadata.
- GAP: Card actions Open, Copy public link, Rename, Duplicate, Copy for a job, Link to application, Tags, Lock/Unlock and Move to Trash are toast-only — `apps/web/src/features/documents/document-actions.tsx:248` — card/row options menu.
- GAP: Single-document and bulk tag editing — `apps/web/src/features/documents/document-actions.tsx:345` — Tags dialog/sheet.
- GAP: Application linking, application picker and Unlink — `apps/web/src/features/documents/document-actions.tsx:443` — letter options → Link to application.
- GAP: Bulk Make public, Make private, Lock editing and Unlock — `apps/web/src/features/documents/documents-page.tsx:494` — selection toolbar → Sharing.
- GAP: Partial-success/locked-document feedback and Undo after moving documents to Trash — `apps/web/src/features/documents/document-actions.tsx:159` — selection-action feedback.
- GAP: Trash contents, days remaining, Restore, permanent-delete confirmation and empty state — `apps/web/src/features/documents/trash-page.tsx:13` — existing Trash destination.
- GAP: New document sheet, including sample resume and new cover letter — `apps/web/src/features/documents/new-document-dialog.tsx:243` — raised New control; currently toast-only.
- GAP: Import picker covering Reactive Resume JSON, JSON Resume, LinkedIn ZIP, PDF and DOCX; AI-provider requirements — `apps/web/src/features/documents/new-document-dialog.tsx:53` — New → Import.
- GAP: Import progress, cancellation, success review and failure recovery — `apps/web/src/features/documents/new-document-dialog.tsx:328` — Import sheet states.
- GAP: Copy-for-job source resume, application and document-name fields — `apps/web/src/features/documents/new-document-dialog.tsx:569` — New/options → Copy for a job.
- GAP: First-run import, Start blank and Try a sample — `apps/web/src/features/documents/documents-page.tsx:338` — empty library.
- GAP: Library loading skeleton and load-error retry — `apps/web/src/features/documents/documents-page.tsx:132` — Documents loading/error states.
- GAP: Guest-account warning and account-preservation actions — `apps/web/src/features/auth/components/guest-banner.tsx:8` — above library.
- GAP: Global search across documents, conversations and actions — `apps/web/src/routes/dashboard/-components/app-shell.tsx:135` — separate Search or run entry point.
- GAP: Document/application counts and Career unread indicator offered by web navigation — `apps/web/src/routes/dashboard/-components/app-shell.tsx:33` — app navigation badges.
- GAP: Newly created/imported document indicator — `apps/web/src/features/documents/document-card.tsx:189` — document badge.
- GAP: Complete Basics form: email, phone, website and validation; A only exposes partial fields through Page selection — `apps/web/src/features/resume/editor/write/basics-card.tsx:87` — expanded Basics.
- GAP: Custom contact fields, icons, optional links, reorder and removal — `apps/web/src/features/resume/editor/write/basics-card.tsx:163` — Basics → Add field.
- GAP: Picture upload/URL, crop, remove, visibility, fit, size, aspect ratio, rounding, border and shadow — `apps/web/src/features/resume/editor/write/picture-settings.tsx:675` — Basics → picture settings.
- GAP: B Summary editor and its guidance; A exposes Summary through Page selection — `apps/web/src/features/resume/editor/write/summary-editor.tsx:7` — expanded Summary.
- GAP: Languages and Interests have no shown outline rows or Add section choices — `apps/web/src/features/resume/editor/write/add-section.tsx:35` — Add section.
- GAP: Education, Projects, Languages, Interests, Awards, Certifications, Publications, Volunteer and References field sets — `apps/web/src/features/resume/editor/write/entries.tsx:326` — corresponding entry editors.
- GAP: B Profiles/Skills editors; A’s selected-page forms omit their additional controls — `apps/web/src/features/resume/editor/write/entries.tsx:348` — corresponding entry editors.
- GAP: Editing selected entry preserves its identity: A Write and B entry navigation always render Cascade Studios; tested B Pixel Forge selection opens Cascade — `apps/web/src/features/resume/editor/write/entry-card.tsx:98` — selected entry form.
- GAP: Multiple Experience roles, role dates/descriptions, reordering and removal — `apps/web/src/features/resume/editor/write/entries.tsx:201` — Experience → Add role.
- GAP: Entry links and Show link in title — `apps/web/src/features/resume/editor/write/fields.tsx:126` — entry form → Link.
- GAP: Level controls, entry icons and icon colours — `apps/web/src/features/resume/editor/write/entries.tsx:136` — More options.
- GAP: Single-date fields, Present control, date-parsing review and reversed-range errors — `apps/web/src/features/resume/editor/write/dates-field.tsx:96` — date field states.
- GAP: Add section picker and custom-section type selection — `apps/web/src/features/resume/editor/write/add-section.tsx:107` — existing Add section button.
- GAP: Hidden sections group and restoring hidden content — `apps/web/src/features/resume/editor/write/outline.tsx:116` — below print-order outline.
- GAP: Main/sidebar distinction within print order — `apps/web/src/features/resume/editor/write/outline.tsx:99` — outline dividers.
- GAP: Section icon picker — `apps/web/src/features/resume/editor/write/section-row.tsx:299` — section menu → Icon.
- GAP: Accessible Move up/Move down alternative to dragging — `apps/web/src/features/resume/editor/write/section-row.tsx:283` — section menu.
- GAP: Columns 1–6 and Skills inline-column option — `apps/web/src/features/resume/editor/write/section-row.tsx:319` — Columns submenu.
- GAP: Skills keyword layout Inline/Bulleted list — `apps/web/src/features/resume/editor/write/section-row.tsx:343` — Skills section menu.
- GAP: Built-in/custom destructive-action distinction: mockup Experience incorrectly offers Delete section alongside Clear section — `apps/web/src/features/resume/editor/write/section-row.tsx:389` — contextual section menu.
- GAP: Entry Duplicate, Hide/Show on page, Move to section/page/new page and Delete menu — `apps/web/src/features/resume/editor/write/entry-card.tsx:267` — Entry options.
- GAP: Draft/Hidden badges and missing-primary-field guidance — `apps/web/src/features/resume/editor/write/entry-card.tsx:86` — entry cards and open forms.
- GAP: Section “to check” and proposed-edit counts — `apps/web/src/features/resume/editor/write/section-row.tsx:129` — section headers.
- GAP: Improve actions, request, suggestion, Replace/Keep mine, stale-result and retry states — `apps/web/src/features/resume/editor/write/improve.tsx:38` — existing Improve button.
- GAP: Additional web formatting has no toolbar home: headings, alignment, highlight/colour, strikethrough, code, indent/outdent, horizontal line and clear formatting — `apps/web/src/features/resume/editor/write/rich-text-editor.tsx:414` — formatting overflow. §0 permits unsupported native marks to be dropped; those are accepted limitations.
- GAP: Blank-resume section suggestions and Import it action — `apps/web/src/features/resume/editor/write/add-section.tsx:151` — empty Write outline.
- GAP: Locked/read-only state and Unlock action — `apps/web/src/features/resume/editor/write/write-panel.tsx:117` — Write banner and disabled controls.
- GAP: Imported-content review summary and dismissal — `apps/web/src/features/resume/editor/write/write-panel.tsx:75` — Write import banner.
- GAP: Saving, Offline, Not saved and Retry states — `apps/web/src/features/resume/editor/save-status.tsx:11` — existing save-status position.
- GAP: Offline editing guidance — `apps/web/src/features/resume/editor/save-status.tsx:57` — builder banner.
- GAP: Undo/redo and Undo feedback after destructive edits — `apps/web/src/features/resume/builder/draft.ts:571` — builder controls and action toasts.
- GAP: Live remote-update notification and deferred-update state — `apps/web/src/features/resume/builder/draft.ts:198` — builder status/toast.
- GAP: Second and subsequent rendered pages, page labels and page count; B has no page-count display — `apps/web/src/routes/builder/$resumeId/-components/page-canvas.tsx:109` — scrolling canvas/zoom bar.
- GAP: Overflow line estimate, overflow boundary and Fit to N pages — `apps/web/src/routes/builder/$resumeId/-components/page-canvas.tsx:205` — page captions.
- GAP: Preview loading, initial failure/retry, stale-preview failure and lost-character warning — `apps/web/src/features/resume/preview/preview.browser.tsx:175` — canvas status states.
- GAP: Check issue pins, previous/next issue controls and contextual fix card — `apps/web/src/features/resume/editor/check/page-layer.tsx:262` — Page in Check mode.
- GAP: Person/parser view toggle and parser output — `apps/web/src/features/resume/editor/check/page-layer.tsx:226` — Page in Check mode.
- GAP: Proposed-edit markings and pending-edit caption — `apps/web/src/routes/builder/$resumeId/-components/page-canvas.tsx:60` — page overlay/caption.
- GAP: Template preview/apply state — `apps/web/src/routes/builder/$resumeId/-components/page-canvas.tsx:179` — page during Design preview.
- GAP: Design controls remain placeholders: templates, type, density, accent, paper/language/margins and Advanced settings/reset — `apps/web/src/routes/builder/$resumeId/-components/design-panel.tsx:119` — existing Design destination.
- GAP: Check score, Issues, Job match and Writing review remain placeholders — `apps/web/src/features/resume/editor/check/check-panel.tsx:40` — existing Check destination.
- GAP: Document menu and its Rename, Duplicate, Lock/Unlock, Notes, Details, Print and Trash contents — `apps/web/src/routes/builder/$resumeId/-components/document-menu.tsx:124` — document-name menu; currently toast-only.
- GAP: Public-sharing badge in builder bar — `apps/web/src/routes/builder/$resumeId/-components/editor-bar.tsx:120` — Share control.
- GAP: Public-link toggle/address validation, copy/share, visitor downloads, password, QR and statistics remain undrawn — `apps/web/src/features/resume/share/link-tab.tsx:34` — Share & export → Link.
- GAP: PDF/DOCX/ODT/MD/JSON choice, filename, linked-letter export and generation/retry states remain undrawn — `apps/web/src/features/resume/share/download-tab.tsx:250` — Share & export → Download; A’s only PDF path.
- GAP: Version list, naming/renaming/deletion, read-only preview, Restore and Back to now remain undrawn — `apps/web/src/features/resume/share/history-tab.tsx:100` — Share & export → History and Page.
- GAP: Assistant content and proposed-edit review remain undrawn — `apps/web/src/routes/builder/$resumeId/-components/editor-shell.tsx:78` — existing Assistant destination.
- GAP: Reconnect conflict sheet with Keep mine / Use theirs / Keep both — `docs/plans/native-mobile-app/README.md:180` — builder conflict state. Required mobile behaviour; existing web UI provides no equivalent sheet.

## Other findings

- Colours that are not tokens: the selected-page fill `color-mix(in oklch, var(--accent) 10%, transparent)` and A's floating-bar `color-mix(in oklch, var(--surface) 92%, transparent)`. DS3 must map them to tokens or add them to tokens.md explicitly.
- Touch targets under 44 pt: reorder handles, sheet grabbers, mode buttons, the "All" chip. "Fit to one page" passes, because of a pseudo-element extension.
- No glossary deviations confirmed.
