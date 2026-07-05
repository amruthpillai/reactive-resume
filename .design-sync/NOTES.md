# design-sync notes — @reactive-resume/ui

Syncs to Claude Design project **Reactive Resume** (`3c0f6556-050a-41e5-9886-c3f1ea950517`).

## Repo shape / build

- `@reactive-resume/ui` is **source-consumed** (pnpm workspace, no `dist`, exports point at `src/components/*.tsx`). Runs in the converter's **synth-entry mode** (no `--entry`).
- `buildCmd` = `node .design-sync/build-css.mjs`. That one script does three things, all required before every converter run:
  1. Creates the workspace **self-symlink** `packages/ui/node_modules/@reactive-resume/ui -> ../../../ui` (pnpm doesn't self-install it; the converter resolves the DS as `node_modules/<pkg>` and esbuild needs it for `@reactive-resume/ui/components/*` self-imports).
  2. Emits real **`.d.ts`** to `packages/ui/dist/types` via `tsc -p packages/ui/tsconfig.emit.json`. Without this, synth-entry mode gives weak `{[key]: unknown}` prop contracts; with it the converter's `findTypesRoot` picks up `dist/types` and every component gets real props (variant/size unions, inherited Base UI props).
  3. Compiles Tailwind v4 `globals.css` → self-contained `packages/ui/.ds-compiled.css` (`cfg.cssEntry`): inlines the IBM Plex Sans latin variable woff2 as a data-URI and strips all other `@font-face` (extra scripts + the Phosphor icon web font, which previews don't use — components render Phosphor as inline React SVGs). This is why previews are fully styled with tokens + brand font and there are zero dangling font URLs.
- CSS entry scans `.design-sync/tw-entry.css` which `@import`s globals.css and adds `@source "./previews/*.tsx"` so utility classes used in authored previews are compiled. **Preview layout wrappers use inline styles** anyway (so subagents needn't recompile the shared CSS); only component-level utility classes need the recompile.

## Card scope

- The package exports **202 symbols** (39 primary components + 163 compound sub-parts). User chose **~40 primary cards**: `cfg.componentSrcMap` nulls the 163 sub-parts. All 202 stay importable from `window.RRUI` (the bundle exports everything regardless of the card list), so previews compose sub-parts (`RRUI.DialogContent`, etc.) freely.
- Multi-primary files represented by one card: `combobox.tsx`→ComboboxRoot, `form.tsx`→FormItem, `resizable.tsx`→ResizableGroup, `sonner.tsx`→Toaster.

## Preview authoring conventions (calibrated on Button / Alert / Dialog)

- Import naturally: `import { Button } from "@reactive-resume/ui/components/button"` — converter rule 2 redirects any exported-component module to `window.RRUI`, and sub-parts resolve too.
- Icons: `@phosphor-icons/react` with the `*Icon` suffix (e.g. `PlusIcon`, `TrashIcon`, `WarningIcon`). Bundles into the preview.
- Base UI compose pattern: `render={<Button variant="outline" />}` on `*.Trigger` / `*.Close` etc.
- Layout wrappers: inline `style={{ display:"flex", gap, padding }}` — not Tailwind (keeps fan-out from needing CSS recompiles).
- **Overlays** (Dialog, and expect the same for AlertDialog/Sheet/Popover/HoverCard/DropdownMenu/ContextMenu/Tooltip/Command-dialog): render open via `defaultOpen`, and set `cfg.overrides.<Name> = {cardMode:"single", primaryStory:"<export>", viewport:"WxH"}`. Use viewport width ≥ 640 so `sm:` breakpoint styles (e.g. horizontal dialog footer) engage — Dialog uses `760x440`.
- Realistic resume-app content (resumes, sections, publish/export/share), never foo/bar.

## Component composition notes (from the authoring wave)

- **Real `.d.ts` contracts require the barrel** (see build step 2 + `publishConfig.types`). Base UI prop names differ from Radix/native: Switch `defaultChecked`+`size`; Toggle `defaultPressed`+`variant`+`size`; Slider `defaultValue` array (`[n]` single / `[a,b]` range). Use uncontrolled `default*` props in previews to avoid controlled-without-onChange warnings.
- **BrandIcon renders the app's own logo/icon** (`variant="logo"|"icon"`), NOT a social/brand-slug icon. It `<img src>`s `/logo/*.svg` + `/icon/*.svg`, which the preview server (serving `ds-bundle/`) 404s. The BrandIcon preview inlines the real `apps/web/public/{logo,icon}/light.svg` as base64 `src` overrides (component spreads `{...props}` after its own `src`, so the override wins).
- **Overlays** handled by the orchestrator with `cfg.overrides` (cardMode single + primaryStory Open + viewport): Dialog, AlertDialog, Sheet, Popover, Tooltip, HoverCard, DropdownMenu, ContextMenu, ComboboxRoot. Command renders **inline** (cmdk, no overlay); Sidebar uses `collapsible="none"` to render inline (default offcanvas is fixed-positioned); Toaster fires a `duration:Infinity` toast on mount.
- **Providers composed in-preview** (no cfg.provider): Tooltip→TooltipProvider, Sidebar→SidebarProvider, MessageScroller→MessageScrollerProvider (+ explicit container height — Root is `size-full min-h-0` and collapses otherwise), FormItem carries its own context.
- **Accordion** opens statically via `defaultValue={[...itemValues]}` (the `--accordion-panel-height` warn is a non-issue — panels measure fine). **Tabs** via `defaultValue`. **ScrollArea/ResizableGroup/InputGroup** need an inline container height/width. **Separator** vertical needs an explicit height.
- Chat/attachment components (Attachment, Bubble, Message, MessageScroller, Marker) are all used only in `apps/web/src/routes/agent/-components/agent-chat.tsx` — the canonical composition source.

## Build/verify gotchas (learned the hard way)

- **A full `package-build` takes ~3-4 minutes** — not a hang. `@phosphor-icons/react` is a giant barrel, so each icon-importing preview costs ~10-20s of esbuild parse, and 30+ authored previews compile serially. Always run it in a real background task (not a 120s-capped foreground shell) and wait for completion.
- **Do NOT add a barrel `index.d.ts` + `publishConfig.types`** to get rich props for inline-param-typed components: it makes ts-morph resolve all 200+ inline Base UI param types and hangs the build for many minutes. Tried and reverted. Result: components with a named `<Name>Props` source type (Button) get real props; the rest get honest `{[key]: unknown}`.
- **Base UI menu Labels must be inside a Group**: `DropdownMenuLabel`/`ContextMenuLabel` throw `MenuGroupContext is missing` unless wrapped in `DropdownMenuGroup`/`ContextMenuGroup`. Same likely for other `*Label`/`*GroupLabel` menu parts.
- **`[RENDER_THIN]` (height 0px) is benign for fixed-position overlays** (Dialog, AlertDialog, Sheet): the content is `position:fixed` so it measures 0 in normal flow, but `rootEmpty:false` and the screenshot is correct. Confirmed via review sheets — not a failure.
- **`[GRID_OVERFLOW]` wide** → `cfg.overrides.<Name> = {cardMode:"column"}` applied to: Accordion, Attachment, Bubble, FormItem, InputGroup, Marker, Message, ResizableGroup, Tabs, Textarea. Toaster (portal escape) → `{cardMode:"single", primaryStory:"Notification"}`.

## Known render warns (triaged, not failures)

- `[TOKENS_MISSING]`: `--active-tab-{top,left,height,width}` (Base UI tab indicator sets these at runtime), `--accordion-panel-height` (Base UI accordion runtime), `--tw` (Tailwind internal), plus app-level `--resume-preview-page-gap` / `--page-primary-color` (defined by apps/web, not this package). All expected absent from the shipped stylesheet — components set them at runtime. Do not chase.
- `--font-heading` is referenced (DialogTitle `font-heading`) but not defined in the UI package tokens (app-level). Falls back to `--font-body` (IBM Plex). Cosmetic only.
- Unauthored primitives render near-empty floor cards (`[RENDER_BLANK]` for empty Button/Input/etc.) — resolved once authored.

## Re-sync risks

- `packages/ui/dist/types`, `packages/ui/.ds-compiled.css`, `packages/ui/.ds-tw-raw.css`, and the self-symlink are all gitignored build artifacts regenerated by `buildCmd` — always run `node .design-sync/build-css.mjs` before the converter/driver.
- The inlined IBM Plex font path in `build-css.mjs` is pinned to `@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2`; if that dep moves, the font inline breaks (previews fall back to system sans).
- `tsconfig.emit.json` is committed; if the package adds a real build later, prefer pointing the converter at that dist and drop the emit step.
