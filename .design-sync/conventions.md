# Reactive Resume UI — how to build with it

This is `@reactive-resume/ui`: a shadcn-style React component library built on **Base UI**
primitives and **Tailwind CSS v4**. Every component is real upstream code, bundled to the
`window.RRUI` global; the 39 cards are the primary components, but all their compound
sub-parts (e.g. `DialogContent`, `AccordionItem`, `SidebarMenuButton`) are also on `RRUI`.

## Setup & wrapping

- **No global provider is required.** All design tokens live on `:root` in `styles.css` (loaded
  for you), so components are styled out of the box. For dark mode, add `class="dark"` to a
  wrapping element — the same tokens flip to their dark values.
- **A few components need their own provider — wrap only where you use them:**
  - `Tooltip*` → wrap in `RRUI.TooltipProvider`.
  - `Sidebar*` → wrap in `RRUI.SidebarProvider`.
  - `MessageScroller*` → wrap in `RRUI.MessageScrollerProvider` and give it a bounded height.
  - Form fields → `RRUI.FormItem` provides the field context for `FormLabel`/`FormControl`/`FormMessage`.
- **Compose compound components** from their parts, e.g. `Dialog` = `DialogTrigger` + `DialogContent`
  (+ `DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`). Overlay parts (Dialog, Sheet,
  Popover, DropdownMenu, ContextMenu, Tooltip, HoverCard) render into a portal. Menu labels must sit
  inside a `*Group` (`DropdownMenuGroup`, `ContextMenuGroup`).
- Icons come from `@phosphor-icons/react` (the `*Icon` suffix, e.g. `PlusIcon`).

## Styling idiom — Tailwind utilities on semantic tokens

Components style themselves; for **your own** layout and surfaces, use Tailwind utility classes
bound to the design system's **semantic color tokens** (never raw hex — these adapt to light/dark):

| Purpose | Utilities |
|---|---|
| Surfaces | `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-sidebar` |
| Brand / actions | `bg-primary` + `text-primary-foreground`, `bg-secondary` + `text-secondary-foreground` |
| Accents / hover | `bg-accent` + `text-accent-foreground`, `hover:bg-muted` |
| Danger | `bg-destructive`, `text-destructive` |
| Text | `text-foreground` (primary), `text-muted-foreground` (secondary) |
| Borders / focus | `border`, `border-input`, `ring-ring`, `outline-ring` |
| Radius | `rounded-md`, `rounded-lg` (driven by `--radius`) |

Each token is also a CSS variable (`var(--primary)`, `var(--muted-foreground)`, `var(--border)`,
`var(--radius)`, `--font-body` = IBM Plex Sans) if you need it in inline styles.

## Where the truth lives

- **Styling:** `styles.css` and its `@import` closure (`_ds_bundle.css` = component styles; the
  token definitions on `:root`/`.dark`). Read these before inventing a class or color.
- **Per component:** `components/<group>/<Name>/<Name>.prompt.md` (usage) and `<Name>.d.ts` (props —
  variant/size unions where a named type exists; some fall back to a permissive shape).

## Idiomatic snippet

```jsx
// A confirm action, styled with the DS's own tokens for the surrounding layout.
<div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
  <p className="text-sm text-muted-foreground">Publish this resume to your public profile?</p>
  <div className="flex justify-end gap-2">
    <RRUI.Button variant="outline">Cancel</RRUI.Button>
    <RRUI.Button>Publish</RRUI.Button>
  </div>
</div>
```
