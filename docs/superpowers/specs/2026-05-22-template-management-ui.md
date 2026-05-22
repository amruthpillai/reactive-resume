# Template Management UI — Spec

**Date:** 2026-05-22

---

## 1. Where the UI lives

### Decision: dedicated dashboard route + builder deep-link

The template management UI lives at `/dashboard/templates` — a new top-level section in the dashboard sidebar alongside "Resumes" and "Agents".

**Rationale:**
- Template management is a cross-resume concern. A user imports a `.rxt` once and then applies it to many resumes. Burying it inside a single-resume builder modal creates the wrong mental model.
- The existing builder "Template" section in the right sidebar remains unchanged for _switching_ the active template. It gains a secondary "Manage Templates" link that navigates to `/dashboard/templates` (opening in the same tab with a `?resume=<id>` search param so the builder's template picker can deep-link back after selection — see §5).
- The gallery dialog (`resume.template.gallery`) inside the builder is _replaced_ by a redirect to `/dashboard/templates?resume=<resumeId>`. The new page renders in a single-column layout that is identical to the full templates page but highlights the "activate" action more prominently when `?resume=<id>` is present.

---

## 2. Template gallery

### Layout

`/dashboard/templates` renders inside the standard `DashboardSidebar` shell (same as Resumes). Content area has two sections stacked vertically:

1. **Built-in templates** — grid of cards, always shown, never empty.
2. **My templates** — grid of cards showing only user-imported templates; shows empty state when none exist.

Both sections use the same `TemplateManagementCard` component (see §2.2).

### Template card

Each card shows:
- Preview image (from `previewImage` base64 field on the DB row, falls back to `/templates/jpg/<id>.jpg` for built-in templates where that static file exists, otherwise a grey placeholder).
- Template name (bold).
- Author (`by <author>`) if present; omitted otherwise.
- Up to 3 tag badges; overflow shown as `+N more` badge.
- **Sidebar position indicator:** small icon in the top-right corner of the preview image — `LeftSidebar`, `RightSidebar`, or nothing for `none`.
- **Built-in badge:** a small "Built-in" badge in the card footer for templates where `userId` is `null`.
- **Active indicator:** if `?resume=<id>` is in the URL and this template matches the resume's current `metadata.template`, the card shows a ring highlight + "Active" overlay.
- **Delete button:** visible only for user-imported cards (kebab menu or a `TrashIcon` button in card footer). Not rendered for built-in templates.

### Section header

Each section (`Built-in`, `My Templates`) has a `<h2>` heading and a count badge.

---

## 3. Import flow

A persistent **"Import Template"** button at the top of the page (next to the section heading, or in a top bar) opens an `ImportTemplateDialog`. This is a `DialogContent` in the existing `DialogManager` system.

### Import dialog

1. A single file upload dropzone (`accept=".rxt"`) with drag-and-drop and click-to-select. Shows selected filename once chosen.
2. A **"Import"** submit button (disabled until a file is selected).
3. On submit:
   - Read file as `ArrayBuffer`, convert to base64.
   - Call `orpc.templates.importTemplate.mutate({ zipBase64 })`.
   - **Pending state:** button shows spinner + "Importing..." text.
   - **Success:** dialog closes, `toast.success("Template imported successfully.")`, gallery refetches (invalidate `orpc.templates.list` query key).
   - **Error — validation failure (400/BAD_REQUEST):** the dialog stays open; a red `<Alert>` appears below the dropzone showing the parser's error message (passed through from the 6-layer parser in `packages/renderer`). The user can swap the file and retry.
   - **Error — other:** `toast.error` with a generic message, dialog closes.

---

## 4. Export flow

Each template card (built-in and user-imported alike) has an **"Export"** action in its dropdown/context menu (and as a secondary action button if space allows).

**Mechanism:**
- Call `orpc.templates.exportTemplate` with the template `id`.
- The response contains the full `files` JSONB map. Client-side, re-pack that into a `.rxt` zip using `jszip` (already in the browser bundle from the renderer package), then trigger a `<a download>` click.
- The suggested filename is `<template-id>.rxt`.
- Show `toast.loading("Exporting…")` while building, `toast.success` on completion.

---

## 5. Delete flow

**Trigger:** "Delete" menu item in the dropdown on user-imported cards only. Built-in cards have no delete option anywhere.

**Confirmation:** The app uses a `useConfirm` hook pattern (already in `packages/ui/src/hooks/use-confirm.tsx`). The delete action calls `confirm("Delete template?", "This cannot be undone.")` first.

**On confirm:**
- Call `orpc.templates.deleteTemplate.mutate({ id })`.
- Optimistic removal from the `My Templates` grid is not required; the grid refreshes on success via query invalidation.
- `toast.success("Template deleted.")`.
- If the template being deleted is the currently active template on the open resume (known from `?resume=<id>`), show a `toast.warning` explaining the resume still references the deleted template ID.

**Error:** If the API returns `NOT_FOUND` (template not owned), show `toast.error("You can only delete your own templates.")`.

---

## 6. Template activation

Available only when the page is opened with `?resume=<resumeId>` in the URL.

- Each card shows an **"Apply to Resume"** button (visible on hover, or always visible at the bottom of the card in activation mode).
- Clicking calls `useUpdateResumeData` (from `@/features/resume/builder/draft`) to set `draft.metadata.template = templateId`.
  - **Important:** the hook is available only inside the builder route tree. On the standalone `/dashboard/templates` page, the activation route uses `client.resume.patch` directly (the oRPC mutation client, not the builder store).
- After success: `toast.success("Template applied.")`, and if `?resume=<id>` was in the URL, navigate back to `/builder/<resumeId>`.

**Without `?resume=<id>`:** The "Apply" action is hidden. Cards are browse-only.

---

## 7. Empty states

**My Templates — no imported templates yet:**
```
[Upload icon]
You haven't imported any custom templates yet.
[Import Template button]
```

---

## 8. Error states

| Scenario | Behavior |
|---|---|
| `orpc.templates.list` fails | Error boundary renders `<Alert variant="destructive">Could not load templates. Please refresh.</Alert>` |
| Import 400 from parser | Inline `<Alert>` in dialog with parser error message |
| Import unknown error | `toast.error`, dialog closes |
| Export fails | `toast.error("Failed to export template.")` |
| Delete NOT_FOUND | `toast.error("You can only delete your own templates.")` |
| Delete unknown error | `toast.error("Failed to delete template.")` |

---

## 9. Navigation

- Dashboard sidebar: new "Templates" entry with a `FilmStripIcon` (or similar) icon, placed between "Resumes" and "Agents".
- Builder right sidebar "Template" section: existing thumbnail + name display unchanged. The "Change Template" button (`SwapIcon`) now navigates to `/dashboard/templates?resume=<resumeId>` instead of opening the gallery dialog (the dialog route for `resume.template.gallery` can be kept for backwards compat but the primary path is the route).
- `/dashboard/templates?resume=<id>` shows an info banner: "Selecting a template will apply it to your resume and return you to the builder."

---

## 10. Out of scope for this feature

- Editing template files in-browser (authoring).
- Previewing a template with the user's actual resume data before activating.
- Template versioning or update checking.
- Preview image generation — uses the base64 `previewImage` field from the DB if present; otherwise a static fallback image.
