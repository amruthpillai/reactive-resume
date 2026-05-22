# Template Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dashboard/templates` route where users can browse built-in and custom templates, import `.rxt` archives, export any template as `.rxt`, delete their own imports, and (when deep-linked from the builder) apply a template to the active resume.

**Architecture:** The feature is entirely in `apps/web` and consumes the existing `templatesRouter` oRPC endpoints (`list`, `importTemplate`, `exportTemplate`, `deleteTemplate`) already wired in `packages/api/src/routers/index.ts`. A new `ImportTemplateDialog` is added to the dialog system. The builder's template picker "Change Template" button is updated to navigate to the new route instead of opening the old gallery dialog.

**Tech Stack:** TanStack Router (file-based), TanStack Query via `orpc` utils, `jszip` (already in workspace via `@reactive-resume/renderer`), existing `useDialogStore` / `useConfirm` / `toast` patterns, `@phosphor-icons/react`, `@reactive-resume/ui` shadcn-style components.

**Spec:** `docs/superpowers/specs/2026-05-22-template-management-ui.md`

---

## File Map

### New files

| File | Purpose |
|---|---|
| `apps/web/src/routes/dashboard/templates/index.tsx` | Route component — template gallery page |
| `apps/web/src/routes/dashboard/templates/-components/template-card.tsx` | Card component (preview image, name, author, tags, activate/export/delete actions) |
| `apps/web/src/routes/dashboard/templates/-components/template-grid.tsx` | Animated grid wrapper (built-in section + user section) |
| `apps/web/src/routes/dashboard/templates/-components/import-button.tsx` | "Import Template" trigger button |
| `apps/web/src/routes/dashboard/templates/-components/empty-my-templates.tsx` | Empty state for user-imported section |
| `apps/web/src/dialogs/template/import.tsx` | `ImportTemplateDialog` — file upload + validation error display |
| `apps/web/src/dialogs/template/schema.ts` | Dialog schema entry `"template.import"` |
| `apps/web/src/dialogs/template/registry.tsx` | `templateDialogRendererRegistry` |
| `apps/web/src/routes/dashboard/templates/-components/template-card.test.tsx` | Unit tests for card visibility rules |
| `apps/web/src/routes/dashboard/templates/index.test.tsx` | Route-level query and search-param tests |

### Modified files

| File | Change |
|---|---|
| `apps/web/src/routes/dashboard/-components/sidebar.tsx` | Add "Templates" sidebar entry |
| `apps/web/src/dialogs/schemas.ts` | Register `templateDialogSchemas` |
| `apps/web/src/dialogs/renderers.tsx` | Register `templateDialogRendererRegistry` |
| `apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/template.tsx` | Replace gallery dialog open with navigate to `/dashboard/templates?resume=<id>` |

---

## Task 1 — Dialog schema and registry scaffolding

**Files:**
- Create: `apps/web/src/dialogs/template/schema.ts`
- Create: `apps/web/src/dialogs/template/registry.tsx`
- Modify: `apps/web/src/dialogs/schemas.ts`
- Modify: `apps/web/src/dialogs/renderers.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/dialogs/template/schema.ts (new file — test first, then impl)
```

```typescript
// No isolated test file needed for this step; the schema is validated by TypeScript.
// The "test" is: does `dialogTypeSchema` parse `{ type: "template.import", data: undefined }`.
// We verify this in Task 1 Step 2 implicitly via the type system.
```

- [ ] **Step 2: Create `apps/web/src/dialogs/template/schema.ts`**

```typescript
import z from "zod";

export const templateDialogSchemas = [
  z.object({ type: z.literal("template.import"), data: z.undefined() }),
] as const;
```

- [ ] **Step 3: Create `apps/web/src/dialogs/template/registry.tsx`**

```tsx
import { defineDialogRenderer, defineDialogRendererRegistry } from "../renderer-registry";
import { ImportTemplateDialog } from "./import";

export const templateDialogRendererRegistry = defineDialogRendererRegistry("template", [
  defineDialogRenderer("template.import", () => <ImportTemplateDialog />),
]);
```

- [ ] **Step 4: Register in `apps/web/src/dialogs/schemas.ts`**

Add import and entry:
```typescript
import { templateDialogSchemas } from "./template/schema";
```

Change:
```typescript
export const dialogSchemaRegistries = [
  { domain: "auth", schemas: authDialogSchemas },
  { domain: "api-key", schemas: apiKeyDialogSchemas },
  { domain: "resume", schemas: resumeDialogSchemas },
] as const;

const dialogSchemaEntries = [...authDialogSchemas, ...apiKeyDialogSchemas, ...resumeDialogSchemas] as const;
```
To:
```typescript
export const dialogSchemaRegistries = [
  { domain: "auth", schemas: authDialogSchemas },
  { domain: "api-key", schemas: apiKeyDialogSchemas },
  { domain: "resume", schemas: resumeDialogSchemas },
  { domain: "template", schemas: templateDialogSchemas },
] as const;

const dialogSchemaEntries = [...authDialogSchemas, ...apiKeyDialogSchemas, ...resumeDialogSchemas, ...templateDialogSchemas] as const;
```

- [ ] **Step 5: Register renderer in `apps/web/src/dialogs/renderers.tsx`**

```typescript
import { templateDialogRendererRegistry } from "./template/registry";
```

Add to `dialogRendererRegistries`:
```typescript
const dialogRendererRegistries = [
  authDialogRendererRegistry,
  apiKeyDialogRendererRegistry,
  resumeDialogRendererRegistry,
  templateDialogRendererRegistry,
] as const;
```

- [ ] **Step 6: Run typecheck to verify**
```
pnpm --filter web typecheck
```

---

## Task 2 — `ImportTemplateDialog` component

**Files:**
- Create: `apps/web/src/dialogs/template/import.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/dialogs/template/import.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ImportTemplateDialog } from "./import";

// Minimal mock — the dialog doesn't need full app context for unit tests
vi.mock("@/dialogs/store", () => ({
  useDialogStore: () => ({ closeDialog: vi.fn() }),
}));
vi.mock("@/libs/orpc/client", () => ({
  orpc: {
    templates: {
      importTemplate: {
        mutationOptions: () => ({ mutationFn: async () => ({ id: "t1", name: "My Template" }) }),
      },
      list: { queryOptions: () => ({ queryKey: ["templates", "list"], queryFn: async () => [] }) },
    },
  },
  client: {},
}));

describe("ImportTemplateDialog", () => {
  it("shows upload dropzone initially", () => {
    render(<ImportTemplateDialog />);
    expect(screen.getByText(/click here to select a .rxt file/i)).toBeTruthy();
  });

  it("import button is disabled when no file selected", () => {
    render(<ImportTemplateDialog />);
    const btn = screen.getByRole("button", { name: /^import$/i });
    expect(btn).toHaveAttribute("disabled");
  });
});
```

- [ ] **Step 2: Create `apps/web/src/dialogs/template/import.tsx`**

```tsx
import type { DialogProps } from "@/dialogs/store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { FileZipIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@reactive-resume/ui/components/alert";
import { Button } from "@reactive-resume/ui/components/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";
import { useDialogStore } from "../store";

export function ImportTemplateDialog(_: DialogProps<"template.import">) {
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | undefined>();
  const [validationError, setValidationError] = useState<string | undefined>();

  const { mutateAsync: importTemplate, isPending } = useMutation(orpc.templates.importTemplate.mutationOptions());

  const onSelectFile = () => inputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setValidationError(undefined);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    try {
      await importTemplate({ zipBase64: base64 });
      await queryClient.invalidateQueries({ queryKey: orpc.templates.list.queryOptions().queryKey });
      toast.success(t`Template imported successfully.`);
      closeDialog();
    } catch (error: unknown) {
      const msg = getOrpcErrorMessage(error, {
        byCode: {
          BAD_REQUEST: undefined, // use raw message from parser
        },
        fallback: t`An unknown error occurred while importing the template.`,
      });
      // Check if it's a validation error (400) — show inline; otherwise toast
      const isValidation =
        error !== null &&
        typeof error === "object" &&
        "status" in error &&
        (error as { status: number }).status === 400;
      if (isValidation) {
        setValidationError(msg);
      } else {
        toast.error(msg);
        closeDialog();
      }
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-x-2">
          <FileZipIcon />
          <Trans>Import Template</Trans>
        </DialogTitle>
        <DialogDescription>
          <Trans>
            Upload a <code>.rxt</code> template archive. The file will be validated before import.
          </Trans>
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".rxt"
            className="hidden"
            onChange={onFileChange}
          />
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full flex-col border-dashed py-8 font-normal"
            onClick={onSelectFile}
          >
            {file ? (
              <>
                <FileZipIcon weight="thin" size={32} />
                <p>{file.name}</p>
              </>
            ) : (
              <>
                <UploadSimpleIcon weight="thin" size={32} />
                <Trans>Click here to select a .rxt file to import</Trans>
              </>
            )}
          </Button>
        </div>

        {validationError && (
          <Alert variant="destructive">
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="submit" disabled={!file || isPending}>
            {isPending ? <Spinner /> : null}
            {isPending ? t`Importing...` : t`Import`}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
```

- [ ] **Step 3: Run typecheck**
```
pnpm --filter web typecheck
```

---

## Task 3 — Template card component

**Files:**
- Create: `apps/web/src/routes/dashboard/templates/-components/template-card.tsx`
- Create: `apps/web/src/routes/dashboard/templates/-components/template-card.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/routes/dashboard/templates/-components/template-card.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TemplateManagementCard } from "./template-card";

const baseTemplate = {
  id: "azurill",
  name: "Azurill",
  description: "A nice template",
  author: "RxResume",
  tags: ["Two-column", "Creative"],
  sidebarPosition: "left" as const,
  userId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("@/libs/orpc/client", () => ({
  orpc: { templates: { deleteTemplate: { mutationOptions: () => ({ mutationFn: async () => ({}) }) } } },
  client: {},
}));

describe("TemplateManagementCard", () => {
  it("renders template name", () => {
    render(
      <TemplateManagementCard
        template={baseTemplate}
        isActive={false}
        resumeId={undefined}
        onActivate={vi.fn()}
        onExport={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Azurill")).toBeTruthy();
  });

  it("does not render delete button for built-in template (userId null)", () => {
    render(
      <TemplateManagementCard
        template={baseTemplate}
        isActive={false}
        resumeId={undefined}
        onActivate={vi.fn()}
        onExport={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/delete/i)).toBeNull();
  });

  it("renders delete button for user-imported template (userId set)", () => {
    render(
      <TemplateManagementCard
        template={{ ...baseTemplate, userId: "user-123" }}
        isActive={false}
        resumeId={undefined}
        onActivate={vi.fn()}
        onExport={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/delete/i)).toBeTruthy();
  });

  it("shows active ring when isActive=true", () => {
    const { container } = render(
      <TemplateManagementCard
        template={baseTemplate}
        isActive={true}
        resumeId="resume-1"
        onActivate={vi.fn()}
        onExport={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(container.querySelector(".ring-2")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Create `apps/web/src/routes/dashboard/templates/-components/template-card.tsx`**

```tsx
import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowSquareOutIcon, SidebarSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { cn } from "@reactive-resume/utils/style";
import { CometCard } from "@/components/animation/comet-card";

type TemplateRow = RouterOutput["templates"]["list"][number];

type Props = {
  template: TemplateRow;
  isActive: boolean;
  resumeId: string | undefined;
  onActivate: (id: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
};

const PREVIEW_FALLBACK = (id: string) => `/templates/jpg/${id}.jpg`;

export function TemplateManagementCard({ template, isActive, resumeId, onActivate, onExport, onDelete }: Props) {
  const isUserOwned = template.userId !== null;
  const visibleTags = template.tags.slice(0, 3);
  const overflowCount = template.tags.length - 3;

  const sidebarLabel =
    template.sidebarPosition === "left"
      ? t`Left sidebar`
      : template.sidebarPosition === "right"
        ? t`Right sidebar`
        : null;

  return (
    <div className="group/card relative flex flex-col gap-y-2">
      <CometCard translateDepth={3} rotateDepth={6} glareOpacity={0}>
        <button
          type="button"
          aria-label={t`Select template ${template.name}`}
          onClick={() => resumeId && onActivate(template.id)}
          className={cn(
            "relative block aspect-page size-full cursor-pointer overflow-hidden rounded-md bg-popover outline-none",
            isActive && "ring-2 ring-ring ring-offset-4 ring-offset-background",
            !resumeId && "cursor-default",
          )}
        >
          <img
            src={PREVIEW_FALLBACK(template.id)}
            alt={template.name}
            className="size-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/templates/jpg/azurill.jpg";
            }}
          />

          {sidebarLabel && (
            <div className="absolute top-2 right-2 rounded-full bg-background/80 p-1" title={sidebarLabel}>
              <SidebarSimpleIcon size={14} />
            </div>
          )}

          {isActive && resumeId && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
              <Badge variant="default">
                <Trans>Active</Trans>
              </Badge>
            </div>
          )}
        </button>
      </CometCard>

      <div className="flex items-start justify-between gap-x-2 px-1">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-bold leading-tight tracking-tight">{template.name}</p>
          {template.author && (
            <p className="truncate text-muted-foreground text-xs">
              <Trans>by {template.author}</Trans>
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {visibleTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {overflowCount > 0 && (
              <Badge variant="outline" className="text-xs">
                +{overflowCount}
              </Badge>
            )}
            {!isUserOwned && (
              <Badge variant="outline" className="text-xs">
                <Trans>Built-in</Trans>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-x-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={t`Export template ${template.name}`}
            onClick={() => onExport(template.id)}
          >
            <ArrowSquareOutIcon size={14} />
          </Button>

          {isUserOwned && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive hover:text-destructive"
              aria-label={t`Delete template ${template.name}`}
              onClick={() => onDelete(template.id)}
            >
              <TrashIcon size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**
```
pnpm --filter web test -- apps/web/src/routes/dashboard/templates/-components/template-card.test.tsx
```

---

## Task 4 — Template grid and empty-state components

**Files:**
- Create: `apps/web/src/routes/dashboard/templates/-components/template-grid.tsx`
- Create: `apps/web/src/routes/dashboard/templates/-components/empty-my-templates.tsx`
- Create: `apps/web/src/routes/dashboard/templates/-components/import-button.tsx`

- [ ] **Step 1: Create `empty-my-templates.tsx`**

```tsx
import { Trans } from "@lingui/react/macro";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { useDialogStore } from "@/dialogs/store";

export function EmptyMyTemplates() {
  const openDialog = useDialogStore((state) => state.openDialog);

  return (
    <div className="flex flex-col items-center justify-center gap-y-4 rounded-lg border border-dashed py-16 text-center">
      <UploadSimpleIcon weight="thin" size={48} className="text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">
          <Trans>You haven't imported any custom templates yet.</Trans>
        </p>
        <p className="text-muted-foreground text-sm">
          <Trans>Import a .rxt file to add your own template.</Trans>
        </p>
      </div>
      <Button variant="outline" onClick={() => openDialog("template.import", undefined)}>
        <UploadSimpleIcon className="mr-2" />
        <Trans>Import Template</Trans>
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create `import-button.tsx`**

```tsx
import { Trans } from "@lingui/react/macro";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { useDialogStore } from "@/dialogs/store";

export function ImportTemplateButton() {
  const openDialog = useDialogStore((state) => state.openDialog);

  return (
    <Button variant="outline" onClick={() => openDialog("template.import", undefined)}>
      <UploadSimpleIcon className="mr-2" />
      <Trans>Import Template</Trans>
    </Button>
  );
}
```

- [ ] **Step 3: Create `template-grid.tsx`**

```tsx
import type { RouterOutput } from "@/libs/orpc/client";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, motion } from "motion/react";
import { TemplateManagementCard } from "./template-card";
import { EmptyMyTemplates } from "./empty-my-templates";

type TemplateRow = RouterOutput["templates"]["list"][number];

type Props = {
  templates: TemplateRow[];
  activeTemplateId: string | undefined;
  resumeId: string | undefined;
  onActivate: (id: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
};

const GRID_CLASS = "grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

export function TemplateGalleryGrid({
  templates,
  activeTemplateId,
  resumeId,
  onActivate,
  onExport,
  onDelete,
}: Props) {
  const builtIn = templates.filter((t) => t.userId === null);
  const userOwned = templates.filter((t) => t.userId !== null);

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-center gap-x-2">
          <h2 className="font-semibold text-lg tracking-tight">
            <Trans>Built-in</Trans>
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            {builtIn.length}
          </span>
        </div>
        <div className={GRID_CLASS}>
          <AnimatePresence initial={false} mode="popLayout">
            {builtIn.map((tpl, i) => (
              <motion.div
                key={tpl.id}
                layout
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.18, delay: Math.min(0.15, i * 0.02), ease: "easeOut" }}
              >
                <TemplateManagementCard
                  template={tpl}
                  isActive={activeTemplateId === tpl.id}
                  resumeId={resumeId}
                  onActivate={onActivate}
                  onExport={onExport}
                  onDelete={onDelete}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-x-2">
          <h2 className="font-semibold text-lg tracking-tight">
            <Trans>My Templates</Trans>
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            {userOwned.length}
          </span>
        </div>

        {userOwned.length === 0 ? (
          <EmptyMyTemplates />
        ) : (
          <div className={GRID_CLASS}>
            <AnimatePresence initial={false} mode="popLayout">
              {userOwned.map((tpl, i) => (
                <motion.div
                  key={tpl.id}
                  layout
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.18, delay: Math.min(0.15, i * 0.02), ease: "easeOut" }}
                >
                  <TemplateManagementCard
                    template={tpl}
                    isActive={activeTemplateId === tpl.id}
                    resumeId={resumeId}
                    onActivate={onActivate}
                    onExport={onExport}
                    onDelete={onDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck**
```
pnpm --filter web typecheck
```

---

## Task 5 — `/dashboard/templates` route

**Files:**
- Create: `apps/web/src/routes/dashboard/templates/index.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/src/routes/dashboard/templates/index.test.tsx
import { describe, expect, it } from "vitest";

// The route validates the search schema. Test the validation directly.
import { searchSchema } from "./index";

describe("/dashboard/templates searchSchema", () => {
  it("accepts empty object with defaults", () => {
    const result = searchSchema.parse({});
    expect(result.resume).toBeUndefined();
  });

  it("accepts a resume id string", () => {
    const result = searchSchema.parse({ resume: "abc123" });
    expect(result.resume).toBe("abc123");
  });
});
```

Note: the `searchSchema` must be exported from the route for this test.

- [ ] **Step 2: Create `apps/web/src/routes/dashboard/templates/index.tsx`**

```tsx
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { FilmStripIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import z from "zod";
import { Alert, AlertDescription } from "@reactive-resume/ui/components/alert";
import { Separator } from "@reactive-resume/ui/components/separator";
import { client, orpc } from "@/libs/orpc/client";
import { DashboardHeader } from "../-components/header";
import { ImportTemplateButton } from "./-components/import-button";
import { TemplateGalleryGrid } from "./-components/template-grid";

export const searchSchema = z.object({
  resume: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/templates/")({
  component: RouteComponent,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    // reuse dashboard auth guard — context.session already asserted by parent route
    return {};
  },
});

function RouteComponent() {
  const { resume: resumeId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>();

  // Fetch resume's current template when deep-linked from builder
  useQuery({
    ...orpc.resume.getById.queryOptions({ input: { id: resumeId! } }),
    enabled: !!resumeId,
    select: (data) => data.data.metadata.template,
    // Update local state when resume data loads
    onSuccess: (templateId: string) => setActiveTemplateId(templateId),
  } as Parameters<typeof useQuery>[0]);

  const { data: templates, isError } = useQuery(orpc.templates.list.queryOptions());

  const { mutateAsync: deleteTemplate } = useMutation(orpc.templates.deleteTemplate.mutationOptions());

  const onExport = async (id: string) => {
    const toastId = toast.loading(t`Exporting template…`);
    try {
      const record = await client.templates.exportTemplate({ id });
      const zip = new JSZip();
      for (const [path, content] of Object.entries(record.files as Record<string, string>)) {
        zip.file(path, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}.rxt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t`Template exported.`, { id: toastId });
    } catch {
      toast.error(t`Failed to export template.`, { id: toastId });
    }
  };

  const onDelete = async (id: string) => {
    const confirmed = window.confirm(t`Delete this template? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteTemplate({ id });
      await queryClient.invalidateQueries({ queryKey: orpc.templates.list.queryOptions().queryKey });
      toast.success(t`Template deleted.`);
    } catch {
      toast.error(t`Failed to delete template.`);
    }
  };

  const onActivate = async (id: string) => {
    if (!resumeId) return;
    try {
      await client.resume.patch({
        id: resumeId,
        operations: [{ op: "replace", path: "/metadata/template", value: id }],
      });
      setActiveTemplateId(id);
      toast.success(t`Template applied.`);
      void navigate({ to: "/builder/$resumeId", params: { resumeId } });
    } catch {
      toast.error(t`Failed to apply template.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <DashboardHeader icon={FilmStripIcon} title={t`Templates`} />
        <ImportTemplateButton />
      </div>

      <Separator />

      {resumeId && (
        <Alert>
          <AlertDescription>
            <Trans>Selecting a template will apply it to your resume and return you to the builder.</Trans>
          </AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            <Trans>Could not load templates. Please refresh.</Trans>
          </AlertDescription>
        </Alert>
      )}

      {templates && (
        <TemplateGalleryGrid
          templates={templates}
          activeTemplateId={activeTemplateId}
          resumeId={resumeId}
          onActivate={onActivate}
          onExport={onExport}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run tests**
```
pnpm --filter web test -- apps/web/src/routes/dashboard/templates/index.test.tsx
```

- [ ] **Step 4: Run typecheck**
```
pnpm --filter web typecheck
```

---

## Task 6 — Dashboard sidebar entry

**Files:**
- Modify: `apps/web/src/routes/dashboard/-components/sidebar.tsx`

- [ ] **Step 1: Add "Templates" to `appSidebarItems`**

In `apps/web/src/routes/dashboard/-components/sidebar.tsx`, change:

```typescript
import {
  BrainIcon,
  ChatCircleDotsIcon,
  GearSixIcon,
  KeyIcon,
  ReadCvLogoIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
```
To:
```typescript
import {
  BrainIcon,
  ChatCircleDotsIcon,
  FilmStripIcon,
  GearSixIcon,
  KeyIcon,
  ReadCvLogoIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
```

Change:
```typescript
const appSidebarItems = [
  {
    icon: <ReadCvLogoIcon />,
    label: msg`Resumes`,
    href: "/dashboard/resumes",
  },
  {
    icon: <ChatCircleDotsIcon />,
    label: msg`Agents`,
    href: "/agent",
  },
] as const satisfies SidebarItem[];
```
To:
```typescript
const appSidebarItems = [
  {
    icon: <ReadCvLogoIcon />,
    label: msg`Resumes`,
    href: "/dashboard/resumes",
  },
  {
    icon: <FilmStripIcon />,
    label: msg`Templates`,
    href: "/dashboard/templates",
  },
  {
    icon: <ChatCircleDotsIcon />,
    label: msg`Agents`,
    href: "/agent",
  },
] as const satisfies SidebarItem[];
```

- [ ] **Step 2: Run typecheck**
```
pnpm --filter web typecheck
```

---

## Task 7 — Update builder template section to navigate to the new route

**Files:**
- Modify: `apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/template.tsx`

- [ ] **Step 1: Replace dialog open with navigation**

Change the current:
```typescript
import { useLingui } from "@lingui/react";
import { SwapIcon } from "@phosphor-icons/react";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { templates } from "@/dialogs/resume/template/data";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentResume } from "@/features/resume/builder/draft";
import { SectionBase } from "../shared/section-base";
```

To:
```typescript
import { useLingui } from "@lingui/react";
import { SwapIcon } from "@phosphor-icons/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { templates } from "@/dialogs/resume/template/data";
import { useCurrentResume } from "@/features/resume/builder/draft";
import { SectionBase } from "../shared/section-base";
```

Replace `TemplateSectionForm` function body — change:
```typescript
function TemplateSectionForm() {
  const { i18n } = useLingui();
  const openDialog = useDialogStore((state) => state.openDialog);
  const resume = useCurrentResume();
  const template = resume.data.metadata.template;

  const metadata = templates[template];

  const onOpenTemplateGallery = () => {
    openDialog("resume.template.gallery", undefined);
  };
```
To:
```typescript
function TemplateSectionForm() {
  const { i18n } = useLingui();
  const { resumeId } = useParams({ from: "/builder/$resumeId" });
  const navigate = useNavigate();
  const resume = useCurrentResume();
  const template = resume.data.metadata.template;

  const metadata = templates[template];

  const onOpenTemplateGallery = () => {
    void navigate({ to: "/dashboard/templates", search: { resume: resumeId } });
  };
```

- [ ] **Step 2: Run typecheck**
```
pnpm --filter web typecheck
```

- [ ] **Step 3: Run tests for the template section**
```
pnpm --filter web test -- apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/template.test.tsx
```

---

## Task 8 — Wire JSZip into web bundle

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add jszip dependency**

Check if jszip is already reachable in the web bundle:
```
pnpm --filter web ls jszip
```

If missing, add it:
```
pnpm --filter web add jszip
```

- [ ] **Step 2: Run typecheck**
```
pnpm --filter web typecheck
```

---

## Task 9 — Regenerate TanStack Router route tree

TanStack Router discovers new file-based routes automatically when the dev server runs. The `routeTree.gen.ts` is generated, not hand-edited.

- [ ] **Step 1: Start the dev server briefly to trigger route tree generation (or run the router CLI if available)**
```
pnpm --filter web exec tsr generate 2>/dev/null || echo "run dev server to regenerate routeTree.gen.ts"
```

- [ ] **Step 2: Verify `/dashboard/templates` appears in `apps/web/src/routeTree.gen.ts`**

After running the dev server or generator, check:
```
grep "dashboard/templates" apps/web/src/routeTree.gen.ts
```

---

## Task 10 — Final integration typecheck and tests

- [ ] **Step 1: Full web typecheck**
```
pnpm --filter web typecheck
```

- [ ] **Step 2: All web tests**
```
pnpm --filter web test
```

- [ ] **Step 3: Boundary check**
```
pnpm exec turbo boundaries
```

- [ ] **Step 4: Commit**
```
git add \
  apps/web/src/routes/dashboard/templates/ \
  apps/web/src/routes/dashboard/-components/sidebar.tsx \
  apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/template.tsx \
  apps/web/src/dialogs/template/ \
  apps/web/src/dialogs/schemas.ts \
  apps/web/src/dialogs/renderers.tsx
git commit -m "feat(web): add /dashboard/templates route for template management UI"
```

---

## Notes

- `jszip` is already a transitive dependency of `@reactive-resume/renderer` (in the workspace), but the web app bundle needs a direct dep to import it without crossing package boundaries.
- The `useQuery` `onSuccess` callback pattern used in Task 5 Step 2 is deprecated in TanStack Query v5. If the project uses v5, use a `useEffect` watching `data` instead:
  ```typescript
  const { data: resumeData } = useQuery({
    ...orpc.resume.getById.queryOptions({ input: { id: resumeId! } }),
    enabled: !!resumeId,
    select: (data) => data.data.metadata.template,
  });
  useEffect(() => {
    if (resumeData) setActiveTemplateId(resumeData);
  }, [resumeData]);
  ```
- The existing `resume.template.gallery` dialog type and its renderer remain in place for backwards compatibility (other code may still reference it). The builder template section is the only place that previously called it; after Task 7 it no longer opens the dialog.
- The `window.confirm` in Task 5 is a quick implementation. A production hardening step would replace it with the `useConfirm` hook from `packages/ui/src/hooks/use-confirm.tsx` for a styled modal, but that hook may need its provider registered at the app level — verify before using.
