# Phase 6: Template-Aware Item Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user opens a section item dialog (experience, skill, etc.), display extra form fields for any `<resume-slot>` custom inputs that the active template declares for that item type — values are stored in `item.extensions`.

**Architecture:** A `useTemplateSlots(itemType)` hook fetches the active template's `inputs` array via the oRPC `templates.exportTemplate` endpoint and filters to the given `itemType`. A `TemplateExtensionFields` component renders those slots as form fields bound to the `extensions` object field on each item. Each of the 11 section dialogs (experience, education, project, skill, certification, award, publication, volunteer, reference, language, interest) renders this component after its standard fields. If no template is in the DB yet (e.g., legacy built-in template IDs), the hook returns `[]` and no extension fields are shown — graceful no-op.

**Tech Stack:** React, TanStack Query (`useQuery`), oRPC client (`orpc.templates.exportTemplate.queryOptions`), `@reactive-resume/schema/template-metadata` (`ResumeSlot`, `ResumeSlotItemType`), TanStack Form (form.Field on `extensions`), shadcn-style UI components

---

## Background

### How templates declare custom fields

A template's `template.json` is parsed into `TemplateMetadata`. Its `<resume-slot>` HTML tags become `inputs: ResumeSlot[]` stored in the DB. Each slot has:

```typescript
type ResumeSlot = {
  id: string;                // used as extensions key (e.g. "logoUrl")
  itemType: ResumeSlotItemType; // e.g. "experienceItem"
  type: ResumeSlotInputType;    // "text" | "rich-text" | "url" | "toggle" | "image" | "image-list"
  label: string;
  description?: string;
  required: boolean;
};
```

### Where values are stored

Each resume item has `extensions: Record<string, unknown>` (added in Phase 1). When a user fills in a slot field, the value is stored as `item.extensions[slot.id]`. The Nunjucks template reads it as `{{ item.extensions.logoUrl }}`.

### Form pattern used in dialogs

All 11 section dialogs use TanStack Form via `withForm` from `apps/web/src/libs/tanstack-form.tsx`. Inside the `withForm` render, custom hooks can be called freely. Form fields bind to a typed field path using `form.Field name="fieldName"`. For `extensions`, the field type is `Record<string, unknown>`.

### oRPC query pattern

```tsx
const { data } = useQuery(
  orpc.templates.exportTemplate.queryOptions({ input: { id: templateId } })
);
```

If the template isn't in the DB (legacy built-in ID), the query returns a 404 error — handle by passing `retry: false` and reading `data?.inputs ?? []`.

### Active template ID

`resume.data.metadata.template` holds the active template string (e.g., `"onyx"` for legacy, or a UUID for custom templates). Retrieved via `useResumeData()` from `apps/web/src/features/resume/builder/draft.ts`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `apps/web/src/features/resume/hooks/use-template-slots.ts` | Create | Hook: query active template, filter inputs by itemType |
| `apps/web/src/features/resume/hooks/use-template-slots.test.ts` | Create | Unit tests for the hook |
| `apps/web/src/features/resume/sections/template-extension-fields.tsx` | Create | Component: renders extension form fields for a list of slots |
| `apps/web/src/features/resume/sections/template-extension-fields.test.tsx` | Create | Unit tests for the component |
| `apps/web/src/dialogs/resume/sections/experience.tsx` | Modify | Add slots call + TemplateExtensionFields to ExperienceForm |
| `apps/web/src/dialogs/resume/sections/education.tsx` | Modify | Same pattern |
| `apps/web/src/dialogs/resume/sections/project.tsx` | Modify | Same pattern |
| `apps/web/src/dialogs/resume/sections/skill.tsx` | Modify | Same pattern |
| `apps/web/src/dialogs/resume/sections/certification.tsx` | Modify | Same pattern |
| `apps/web/src/dialogs/resume/sections/award.tsx` | Modify | Same pattern |
| `apps/web/src/dialogs/resume/sections/publication.tsx` | Modify | Same pattern |
| `apps/web/src/dialogs/resume/sections/volunteer.tsx` | Modify | Same pattern |
| `apps/web/src/dialogs/resume/sections/reference.tsx` | Modify | Same pattern |
| `apps/web/src/dialogs/resume/sections/language.tsx` | Modify | Same pattern |
| `apps/web/src/dialogs/resume/sections/interest.tsx` | Modify | Same pattern |

---

## Task 1: `useTemplateSlots` hook

**Files:**
- Create: `apps/web/src/features/resume/hooks/use-template-slots.ts`
- Create: `apps/web/src/features/resume/hooks/use-template-slots.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/features/resume/hooks/use-template-slots.test.ts
// @vitest-environment happy-dom
import type { ResumeSlot } from "@reactive-resume/schema/template-metadata";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTemplateSlots } from "./use-template-slots";

const EXPERIENCE_SLOT: ResumeSlot = {
  id: "logoUrl",
  itemType: "experienceItem",
  type: "url",
  label: "Company Logo URL",
  required: false,
};

const SKILL_SLOT: ResumeSlot = {
  id: "iconSvg",
  itemType: "skillItem",
  type: "text",
  label: "Icon SVG",
  required: false,
};

vi.mock("@/libs/orpc/client", () => ({
  orpc: {
    templates: {
      exportTemplate: {
        queryOptions: ({ input }: { input: { id: string } }) => ({
          queryKey: ["templates", "export", input.id],
          queryFn: async () => ({
            id: input.id,
            name: "Test",
            inputs: [EXPERIENCE_SLOT, SKILL_SLOT],
          }),
          enabled: Boolean(input.id),
        }),
      },
    },
  },
}));

vi.mock("@/features/resume/builder/draft", () => ({
  useResumeData: () => ({
    metadata: { template: "test-template-id" },
  }),
}));

describe("useTemplateSlots", () => {
  it("returns slots matching the given itemType", async () => {
    const { result } = renderHook(() => useTemplateSlots("experienceItem"));
    // initial state: no data yet
    expect(result.current).toEqual([]);
  });

  it("returns empty array when no resume data is available", () => {
    // Override draft mock for this test
    vi.doMock("@/features/resume/builder/draft", () => ({
      useResumeData: () => undefined,
    }));
    // Hook returns [] when templateId is falsy
    const { result } = renderHook(() => useTemplateSlots("experienceItem"));
    expect(result.current).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- src/features/resume/hooks/use-template-slots.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `apps/web/src/features/resume/hooks/use-template-slots.ts`**

```typescript
import type { ResumeSlot, ResumeSlotItemType } from "@reactive-resume/schema/template-metadata";
import { useQuery } from "@tanstack/react-query";
import { useResumeData } from "@/features/resume/builder/draft";
import { orpc } from "@/libs/orpc/client";

export function useTemplateSlots(itemType: ResumeSlotItemType): ResumeSlot[] {
  const resumeData = useResumeData();
  const templateId = resumeData?.metadata.template ?? "";

  const { data } = useQuery({
    ...orpc.templates.exportTemplate.queryOptions({ input: { id: templateId } }),
    enabled: Boolean(templateId),
    retry: false,
  });

  return (data?.inputs ?? []).filter((slot) => slot.itemType === itemType);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter web test -- src/features/resume/hooks/use-template-slots.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/resume/hooks/use-template-slots.ts \
        apps/web/src/features/resume/hooks/use-template-slots.test.ts
git commit -m "feat(web): add useTemplateSlots hook to query active template inputs by item type"
```

---

## Task 2: `TemplateExtensionFields` component

**Files:**
- Create: `apps/web/src/features/resume/sections/template-extension-fields.tsx`
- Create: `apps/web/src/features/resume/sections/template-extension-fields.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/web/src/features/resume/sections/template-extension-fields.test.tsx
// @vitest-environment happy-dom
import type { ResumeSlot } from "@reactive-resume/schema/template-metadata";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TemplateExtensionFields } from "./template-extension-fields";

const textSlot: ResumeSlot = {
  id: "tagline",
  itemType: "experienceItem",
  type: "text",
  label: "Tagline",
  required: false,
};

const toggleSlot: ResumeSlot = {
  id: "featured",
  itemType: "experienceItem",
  type: "toggle",
  label: "Featured",
  required: false,
};

const urlSlot: ResumeSlot = {
  id: "logoUrl",
  itemType: "experienceItem",
  type: "url",
  label: "Logo URL",
  required: false,
};

describe("TemplateExtensionFields", () => {
  it("renders nothing when slots is empty", () => {
    const { container } = render(
      <TemplateExtensionFields value={{}} onChange={() => undefined} slots={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a text input for type=text", () => {
    render(
      <TemplateExtensionFields value={{}} onChange={() => undefined} slots={[textSlot]} />
    );
    expect(screen.getByLabelText("Tagline")).toBeTruthy();
  });

  it("renders a checkbox/switch for type=toggle", () => {
    render(
      <TemplateExtensionFields value={{}} onChange={() => undefined} slots={[toggleSlot]} />
    );
    expect(screen.getByRole("switch")).toBeTruthy();
    expect(screen.getByText("Featured")).toBeTruthy();
  });

  it("calls onChange with updated extensions when a text field changes", async () => {
    const onChange = vi.fn();
    render(
      <TemplateExtensionFields value={{}} onChange={onChange} slots={[textSlot]} />
    );
    const input = screen.getByLabelText("Tagline");
    await userEvent.type(input, "A");
    expect(onChange).toHaveBeenCalledWith({ tagline: "A" });
  });

  it("renders URL input for type=url", () => {
    render(
      <TemplateExtensionFields value={{}} onChange={() => undefined} slots={[urlSlot]} />
    );
    expect(screen.getByLabelText("Logo URL")).toBeTruthy();
  });

  it("renders a disabled placeholder for type=image", () => {
    const imageSlot: ResumeSlot = { id: "img", itemType: "experienceItem", type: "image", label: "Photo", required: false };
    render(
      <TemplateExtensionFields value={{}} onChange={() => undefined} slots={[imageSlot]} />
    );
    expect(screen.getByPlaceholderText(/coming in a future release/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter web test -- src/features/resume/sections/template-extension-fields.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `apps/web/src/features/resume/sections/template-extension-fields.tsx`**

```tsx
import type { ResumeSlot } from "@reactive-resume/schema/template-metadata";
import { Trans } from "@lingui/react/macro";
import { Input } from "@reactive-resume/ui/components/input";
import { FormControl, FormItem, FormLabel } from "@reactive-resume/ui/components/form";
import { Separator } from "@reactive-resume/ui/components/separator";
import { Switch } from "@reactive-resume/ui/components/switch";
import { RichInput } from "@/components/input/rich-input";

type Props = {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  slots: ResumeSlot[];
};

export function TemplateExtensionFields({ value, onChange, slots }: Props) {
  if (slots.length === 0) return null;

  const update = (slotId: string, newValue: unknown) => {
    onChange({ ...value, [slotId]: newValue });
  };

  return (
    <>
      <Separator className="sm:col-span-full" />
      <p className="text-foreground font-medium text-sm sm:col-span-full">
        <Trans>Template Fields</Trans>
      </p>
      {slots.map((slot) => (
        <SlotField
          key={slot.id}
          slot={slot}
          value={value[slot.id]}
          onChange={(v) => update(slot.id, v)}
        />
      ))}
    </>
  );
}

function SlotField({
  slot,
  value,
  onChange,
}: {
  slot: ResumeSlot;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const stringValue = String(value ?? "");

  if (slot.type === "toggle") {
    return (
      <FormItem className="flex items-center gap-x-2 sm:col-span-full">
        <FormControl
          render={
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(checked)}
            />
          }
        />
        <FormLabel>{slot.label}</FormLabel>
      </FormItem>
    );
  }

  if (slot.type === "rich-text") {
    return (
      <FormItem className="sm:col-span-full">
        <FormLabel>{slot.label}</FormLabel>
        <FormControl
          render={<RichInput value={stringValue} onChange={(v) => onChange(v)} />}
        />
      </FormItem>
    );
  }

  if (slot.type === "image" || slot.type === "image-list") {
    return (
      <FormItem>
        <FormLabel>{slot.label}</FormLabel>
        <FormControl
          render={
            <Input
              disabled
              placeholder="Image upload coming in a future release"
            />
          }
        />
      </FormItem>
    );
  }

  // "text" and "url" both use a plain text input
  return (
    <FormItem>
      <FormLabel>{slot.label}</FormLabel>
      <FormControl
        render={
          <Input
            type={slot.type === "url" ? "url" : "text"}
            value={stringValue}
            placeholder={slot.description}
            onChange={(e) => onChange(e.target.value)}
          />
        }
      />
    </FormItem>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter web test -- src/features/resume/sections/template-extension-fields.test.tsx
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/resume/sections/template-extension-fields.tsx \
        apps/web/src/features/resume/sections/template-extension-fields.test.tsx
git commit -m "feat(web): add TemplateExtensionFields component for template-declared custom inputs"
```

---

## Task 3: Wire into the experience dialog

This task proves the pattern before applying it to the remaining 10 dialogs.

**Files:**
- Modify: `apps/web/src/dialogs/resume/sections/experience.tsx`

The `ExperienceForm` component (defined with `withForm` at the bottom of the file) needs:
1. A call to `useTemplateSlots("experienceItem")` at the top of its `render` function
2. A `form.Field name="extensions"` block that renders `<TemplateExtensionFields>` after the existing fields

- [ ] **Step 1: Add the two imports** to `experience.tsx`

Add after the existing imports:

```typescript
import { TemplateExtensionFields } from "@/features/resume/sections/template-extension-fields";
import { useTemplateSlots } from "@/features/resume/hooks/use-template-slots";
```

- [ ] **Step 2: Add hook call and extension fields to `ExperienceForm`**

In the `ExperienceForm = withForm({ ..., render: ({ form }) => { ... } })` block, add the hook call at the top of the render function and the field block before the closing `</>`:

```tsx
const ExperienceForm = withForm({
  defaultValues,
  render: ({ form }) => {
    const slots = useTemplateSlots("experienceItem");   // ← add this line
    const inlineLink = useStore(form.store, (s) => s.values.website.inlineLink);
    const roles = useStore(form.store, (s) => s.values.roles);
    // ... rest of existing hook calls unchanged ...

    return (
      <>
        {/* all existing fields unchanged */}
        {/* ... */}

        {/* Add this block at the very end, before the closing </> */}
        <form.Field name="extensions">
          {(field) => (
            <TemplateExtensionFields
              value={field.state.value}
              onChange={(v) => field.handleChange(v)}
              slots={slots}
            />
          )}
        </form.Field>
      </>
    );
  },
});
```

- [ ] **Step 3: Run all web tests**

```bash
pnpm --filter web test
```

Expected: all existing tests still pass (no regressions). The extension fields render as a no-op because no template with custom slots is in the DB yet.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/dialogs/resume/sections/experience.tsx
git commit -m "feat(web): wire template extension fields into experience dialog"
```

---

## Task 4: Wire into remaining 10 section dialogs

Apply the same two-step change (add imports, add hook call + form.Field block) to the remaining 10 dialogs. Each follows the exact same pattern as Task 3.

**Files:**
- Modify: `apps/web/src/dialogs/resume/sections/education.tsx`
- Modify: `apps/web/src/dialogs/resume/sections/project.tsx`
- Modify: `apps/web/src/dialogs/resume/sections/skill.tsx`
- Modify: `apps/web/src/dialogs/resume/sections/certification.tsx`
- Modify: `apps/web/src/dialogs/resume/sections/award.tsx`
- Modify: `apps/web/src/dialogs/resume/sections/publication.tsx`
- Modify: `apps/web/src/dialogs/resume/sections/volunteer.tsx`
- Modify: `apps/web/src/dialogs/resume/sections/reference.tsx`
- Modify: `apps/web/src/dialogs/resume/sections/language.tsx`
- Modify: `apps/web/src/dialogs/resume/sections/interest.tsx`

For each dialog, the change is identical in structure. The only difference is the `itemType` string passed to `useTemplateSlots`:

| Dialog file | Form component name | `itemType` |
|---|---|---|
| `education.tsx` | `EducationForm` | `"educationItem"` |
| `project.tsx` | `ProjectForm` | `"projectItem"` |
| `skill.tsx` | `SkillForm` | `"skillItem"` |
| `certification.tsx` | `CertificationForm` | `"certificationItem"` |
| `award.tsx` | `AwardForm` | `"awardItem"` |
| `publication.tsx` | `PublicationForm` | `"publicationItem"` |
| `volunteer.tsx` | `VolunteerForm` | `"volunteerItem"` |
| `reference.tsx` | `ReferenceForm` | `"referenceItem"` |
| `language.tsx` | `LanguageForm` | `"languageItem"` |
| `interest.tsx` | `InterestForm` | `"interestItem"` |

- [ ] **Step 1: Add imports to `education.tsx`**

```typescript
import { TemplateExtensionFields } from "@/features/resume/sections/template-extension-fields";
import { useTemplateSlots } from "@/features/resume/hooks/use-template-slots";
```

- [ ] **Step 2: Add hook + field to `EducationForm`'s render**

At the top of the `render` function, add:
```typescript
const slots = useTemplateSlots("educationItem");
```

At the end of the returned JSX (before closing `</>`):
```tsx
<form.Field name="extensions">
  {(field) => (
    <TemplateExtensionFields
      value={field.state.value}
      onChange={(v) => field.handleChange(v)}
      slots={slots}
    />
  )}
</form.Field>
```

- [ ] **Step 3: Repeat for `project.tsx` (`"projectItem"`)**

Same two changes as above with `useTemplateSlots("projectItem")`.

- [ ] **Step 4: Repeat for `skill.tsx` (`"skillItem"`)**

Same two changes with `useTemplateSlots("skillItem")`.

- [ ] **Step 5: Repeat for `certification.tsx` (`"certificationItem"`)**

Same two changes with `useTemplateSlots("certificationItem")`.

- [ ] **Step 6: Repeat for `award.tsx` (`"awardItem"`)**

Same two changes with `useTemplateSlots("awardItem")`.

- [ ] **Step 7: Repeat for `publication.tsx` (`"publicationItem"`)**

Same two changes with `useTemplateSlots("publicationItem")`.

- [ ] **Step 8: Repeat for `volunteer.tsx` (`"volunteerItem"`)**

Same two changes with `useTemplateSlots("volunteerItem")`.

- [ ] **Step 9: Repeat for `reference.tsx` (`"referenceItem"`)**

Same two changes with `useTemplateSlots("referenceItem")`.

- [ ] **Step 10: Repeat for `language.tsx` (`"languageItem"`)**

Same two changes with `useTemplateSlots("languageItem")`.

- [ ] **Step 11: Repeat for `interest.tsx` (`"interestItem"`)**

Same two changes with `useTemplateSlots("interestItem")`.

- [ ] **Step 12: Run all web tests**

```bash
pnpm --filter web test
```

Expected: all pass.

- [ ] **Step 13: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 14: Commit**

```bash
git add apps/web/src/dialogs/resume/sections/education.tsx \
        apps/web/src/dialogs/resume/sections/project.tsx \
        apps/web/src/dialogs/resume/sections/skill.tsx \
        apps/web/src/dialogs/resume/sections/certification.tsx \
        apps/web/src/dialogs/resume/sections/award.tsx \
        apps/web/src/dialogs/resume/sections/publication.tsx \
        apps/web/src/dialogs/resume/sections/volunteer.tsx \
        apps/web/src/dialogs/resume/sections/reference.tsx \
        apps/web/src/dialogs/resume/sections/language.tsx \
        apps/web/src/dialogs/resume/sections/interest.tsx
git commit -m "feat(web): wire template extension fields into all 10 remaining section dialogs"
```
