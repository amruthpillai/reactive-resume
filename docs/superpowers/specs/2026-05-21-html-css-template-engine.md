# Template Engine Spec

## Problem

The current template system is 15 React PDF components, each ~300 lines of fused layout logic, styling, and section rendering. Templates are code — not portable, not authorable without knowing React PDF internals, not exportable. User customization is limited to 3 colors + 1 font + sidebar width. Designs like company logos, badge images, multi-column skill grids, and table-style headers cannot be expressed.

## Goal

Replace the React PDF template system with a **Nunjucks-based HTML template engine** where:

1. Templates are portable self-contained `.rxt` archives — importable, exportable, shareable
2. Templates declare their own custom input fields using `<resume-slot>` tags in section files
3. Templates declare their own fonts (bundled WOFF2 or Google Fonts) in `template.json`
4. PDF generation uses Puppeteer + CSS Paged Media (server-side)
5. Builder preview renders the same HTML template live in an iframe

---

## Core Decisions

### Templates are portable `.rxt` archives

A template is a zip file with a `.rxt` extension containing:

```
template.rxt/
  template.json          ← required: metadata, fonts, sidebarPosition, tags
  index.html             ← required: page layout + section dispatch loop
  sections/
    experience.html      ← one file per section type
    education.html
    skills.html
    summary.html
    default.html         ← fallback for sections the template doesn't implement
  styles/
    main.css             ← optional: extracted styles (can inline in index.html)
  fonts/
    custom-400.woff2     ← optional: bundled font files (woff2 only)
    custom-700.woff2
```

The archive is the complete artifact. No build step. No Node.js knowledge required to author one. Import by uploading the file. Export by downloading it. A single `.rxt` file contains everything: layout, styles, section renderers, font files, and metadata.

### Nunjucks is the template engine

Nunjucks is Mozilla's JavaScript port of Jinja2. Chosen because:
- Identical syntax to Jinja2 (filters, loops, conditionals, macros, dynamic includes)
- Runs isomorphically in browser and Node.js — same template, same output everywhere
- Mature, well-maintained
- `| safe` filter handles HTML content fields (rich text descriptions)
- `{% include path ignore missing %}` supports dynamic section dispatch

The same `render(files, data)` call works in the browser (preview iframe) and on the server (Puppeteer PDF). No divergence.

### Sidebar position — template declaration vs user override

`sidebarPosition` in `template.json` declares what the template supports:

- `"left"` / `"right"` — fixed. Template is designed for one side. User cannot change it.
- `"none"` — no sidebar. Layout editor hides the sidebar column.
- `"either"` — template supports both sides. User gets a left/right toggle in the layout panel. User's choice stored in `metadata.layout.sidebarPosition`. Defaults to `"left"` when unset.

The system injects two CSS vars based on the effective sidebar position (template default or user override):

```css
/* sidebar on left */
--resume-sidebar-grid-areas:   "sidebar main";
--resume-sidebar-grid-columns: var(--resume-sidebar-width) 1fr;

/* sidebar on right */
--resume-sidebar-grid-areas:   "main sidebar";
--resume-sidebar-grid-columns: 1fr var(--resume-sidebar-width);
```

Templates use named grid areas — no direction logic needed in template CSS:

```css
.page    { display: grid; grid-template-areas: var(--resume-sidebar-grid-areas); grid-template-columns: var(--resume-sidebar-grid-columns); }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
```

These vars are injected for all templates with a sidebar (`"left"`, `"right"`, `"either"`). Fixed templates always receive the same value — using these vars is consistent practice regardless.

### Section dispatch via the layout system

Templates participate in the builder's drag-and-drop section ordering by reading `metadata.layout.pages`. Each page has `main[]` and `sidebar[]` arrays of section IDs. The template dispatches rendering via dynamic Nunjucks includes:

```html
{% for page in metadata.layout.pages %}
<div class="page">
  <div class="sidebar">
    {% for sectionId in page.sidebar %}
      {% include "sections/" + sectionId + ".html" ignore missing %}
    {% endfor %}
  </div>
  <div class="main">
    {% for sectionId in page.main %}
      {% include "sections/" + sectionId + ".html" ignore missing %}
    {% endfor %}
  </div>
</div>
{% endfor %}
```

`ignore missing` silently skips sections the template hasn't implemented. The builder's layout editor (drag sections between main/sidebar columns) drives `metadata.layout.pages` — the template re-renders automatically on each change.

### `<resume-slot>` is the custom input primitive

A `<resume-slot>` tag in a section file serves two purposes simultaneously:

1. **At import/parse time**: declares a custom input field shown in the builder UI when editing items of `item-type`
2. **At render time**: stripped from output — the template renders extension values explicitly via Nunjucks

```html
<!-- sections/experience.html -->
{% if item.extensions.additionalHtml %}
{{ item.extensions.additionalHtml | safe }}
{% endif %}
<resume-slot
  id="additionalHtml"
  item-type="experienceItem"
  type="rich-text"
  label="Additional section"
/>
```

The slot tag only declares the input. The template controls where and how the value renders.

### Custom input values live in `item.extensions`

Every item gets an `extensions: Record<string, unknown>` bag (added to `baseItemSchema`). Template-specific data lives there, keyed by `<resume-slot id>`. Core resume fields remain clean and portable across all templates.

```json
{
  "company": "Careem",
  "description": "...",
  "extensions": {
    "additionalHtml": "<p>Storage & Data Platform: ...</p>",
    "productLogos": ["https://.../food.png", "https://.../rides.png"]
  }
}
```

If the user switches templates, extensions from the previous template are ignored — not deleted, just unused.

### CSS Paged Media handles pagination

Templates use `@page` rules and `break-inside: avoid` in their CSS. No custom page splitter. Puppeteer's Chrome print engine implements this natively.

### DB is the runtime source of truth

All templates — built-in and user-imported — live in the `templates` DB table. The DB is the single source of truth at runtime. Built-in templates are seeded on server startup via upsert (keyed on `id`), so they stay in sync with deployed code. User-imported templates are inserted at import time. The template picker queries the DB uniformly — no distinction between built-in and imported at the API level.

Built-in `.rxt` files live in `packages/pdf/src/templates/` as committed seed sources. They are never read at request time — only during startup seeding.

### Security: sandboxed rendering for imported templates

Built-in system templates run in standard Nunjucks. User-imported templates run in Nunjucks sandbox mode:
- No access to `window`, `document`, `fetch`, or globals
- Only the resume data context is exposed
- `<script>` tags in template HTML are rejected at import time
- External font URLs allowed only from `fonts.googleapis.com`
- Bundled font files must be `.woff2` format
- `{% include %}` paths validated to resolve within the archive only (no traversal)

---

## Template File Format

### `template.json`

Required. Validated against a Zod schema at import time.

```json
{
  "id": "khaled",
  "name": "Khaled",
  "author": "Khaled AbuShqear",
  "description": "Two-column layout with company logos and badge certifications",
  "sidebarPosition": "left",
  "tags": ["Two-column", "Technical", "Infrastructure"],
  "fonts": [
    {
      "family": "Playfair Display",
      "weights": [400, 700],
      "source": "bundled",
      "files": {
        "400": "fonts/playfair-400.woff2",
        "700": "fonts/playfair-700.woff2"
      }
    },
    {
      "family": "Inter",
      "weights": [400, 600],
      "source": "google"
    }
  ],
  "typography": [
    { "id": "name",    "label": "Your name",        "defaultFont": "Playfair Display", "defaultSize": 28, "defaultWeight": 700 },
    { "id": "heading", "label": "Section headings",  "defaultFont": "Playfair Display", "defaultSize": 12, "defaultWeight": 700 },
    { "id": "body",    "label": "Body text",          "defaultFont": "Inter",            "defaultSize": 10, "defaultWeight": 400 },
    { "id": "caption", "label": "Dates & locations",  "defaultFont": "Inter",            "defaultSize": 8.5,"defaultWeight": 400 }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique slug. Built-in templates match `templateSchema` enum. User-imported: any unique slug. |
| `name` | Yes | Display name shown in template picker. |
| `author` | No | Author name or URL. |
| `description` | No | Short description shown in template picker hover card. |
| `sidebarPosition` | Yes | `"left"`, `"right"`, `"none"`, or `"either"`. Drives the layout editor column arrangement. `"either"` means the template supports both sides and exposes a left/right toggle to the user in the builder. |
| `tags` | No | Array of display tags shown in template picker hover card. |
| `fonts` | No | Array of font declarations. See font system below. |
| `typography` | No | Array of typography slot declarations. See typography slots below. |

### `index.html`

Required. Contains the page structure, CSS, and the section dispatch loop. Full example:

```html
<!DOCTYPE html>
<html lang="{{ metadata.page.locale }}">
<head>
  <meta charset="UTF-8" />

  <!--
    System injects two <style> blocks before </head>:
    1. <style id="resume-fonts">    — @font-face declarations from template's fonts array
                                      + <link> tags for Google Fonts
    2. <style id="resume-css-vars"> — CSS custom properties from resume metadata + typography slots
                                      + @page { size: ...; margin: 0; } from metadata.page.format

    Always available:
      --resume-primary, --resume-foreground, --resume-background
      --resume-page-padding-x (= metadata.page.marginX), --resume-page-padding-y (= metadata.page.marginY)
      --resume-sidebar-width, --resume-section-gap, --resume-column-gap
      --resume-sidebar-grid-areas, --resume-sidebar-grid-columns  (omitted when sidebarPosition is "none")

    Per typography slot (always includes "body" and "heading"; additional slots from template.json):
      --resume-font-{id}, --resume-size-{id}, --resume-weight-{id}, --resume-line-height-{id}

    Do NOT declare @page here — the system injects it based on metadata.page.format.
  -->

  <style>
    body {
      font-family: var(--resume-font-body);
      font-size: var(--resume-size-body);
      line-height: var(--resume-line-height-body);
      color: var(--resume-foreground);
      background: var(--resume-background);
    }

    .page {
      display: grid;
      grid-template-areas: var(--resume-sidebar-grid-areas);
      grid-template-columns: var(--resume-sidebar-grid-columns);
      column-gap: var(--resume-column-gap);
      padding: var(--resume-page-padding-y) var(--resume-page-padding-x);
      break-after: page;
    }

    .sidebar { grid-area: sidebar; }
    .main    { grid-area: main; }

    /* ... rest of layout styles */
  </style>
</head>
<body>

  {% for page in metadata.layout.pages %}
  <div class="page{% if page.fullWidth %} page--full-width{% endif %}">

    {% if not page.fullWidth %}
    <div class="sidebar">
      {% for sectionId in page.sidebar %}
        {% include "sections/" + sectionId + ".html" ignore missing %}
      {% endfor %}
    </div>
    {% endif %}

    <div class="main">
      {% for sectionId in page.main %}
        {% include "sections/" + sectionId + ".html" ignore missing %}
      {% endfor %}
    </div>

  </div>
  {% endfor %}

</body>
</html>
```

### Section files (`sections/*.html`)

One file per section type. Each file has access to the full Nunjucks data context. Section files may contain `<resume-slot>` tags.

```html
<!-- sections/experience.html -->
{% if sections.experience.items | selectVisible | length > 0 %}
<section>
  <h2 class="section-heading">{{ sections.experience.title }}</h2>

  {% for item in sections.experience.items | selectVisible %}
  <div class="experience-item" style="break-inside: avoid;">

    <div class="company-col">
      <strong>{{ item.company }}</strong>
      <span>{{ item.period }}</span>
    </div>

    <div class="content-col">
      {% if item.roles | length > 0 %}
        {% for role in item.roles %}
        <div class="role">
          <strong>{{ role.position }}</strong>
          {{ role.description | safe }}
        </div>
        {% endfor %}
      {% else %}
        {{ item.description | safe }}
      {% endif %}

      {% if item.extensions.additionalHtml %}
        {{ item.extensions.additionalHtml | safe }}
      {% endif %}
      <resume-slot
        id="additionalHtml"
        item-type="experienceItem"
        type="rich-text"
        label="Additional section"
      />

    </div>
  </div>
  {% endfor %}
</section>
{% endif %}
```

---

## `<resume-slot>` Specification

### Attributes

| Attribute | Required | Description |
|---|---|---|
| `id` | Yes | Field identifier. Used as the key in `item.extensions`. Unique within an `item-type`. |
| `item-type` | Yes | Which item type this input belongs to. |
| `type` | Yes | Input type. See table below. |
| `label` | Yes | Display label shown in the builder UI form. |
| `description` | No | Optional helper text shown below the input. |
| `required` | No | `"true"` if the field must be filled. Defaults to `"false"`. |

### Input types

| Type | Builder UI | Stored as |
|---|---|---|
| `rich-text` | Rich text editor (HTML) | `string` (HTML) |
| `text` | Plain text input | `string` |
| `image` | Image upload / URL input | `string` (URL) |
| `image-list` | Multiple image upload / URL list | `string[]` (URLs) |
| `url` | URL input with optional label | `{ url: string, label: string }` |
| `toggle` | Checkbox | `boolean` |

### Render behaviour

`<resume-slot>` tags are **stripped from output HTML** at render time. The template is responsible for rendering extension values via Nunjucks. The slot tag only declares the input.

---

## Font System

### Declaration in `template.json`

```json
"fonts": [
  {
    "family": "Playfair Display",
    "weights": [400, 700],
    "source": "bundled",
    "files": {
      "400": "fonts/playfair-400.woff2",
      "700": "fonts/playfair-700.woff2"
    }
  },
  {
    "family": "Inter",
    "weights": [400, 600],
    "source": "google"
  }
]
```

| Field | Required | Description |
|---|---|---|
| `family` | Yes | Font family name as used in CSS `font-family`. |
| `weights` | Yes | Array of numeric font weights declared. |
| `source` | Yes | `"bundled"` or `"google"`. |
| `files` | If bundled | Map of weight → relative path within the archive. |

### Storage

Bundled font files are stored in the DB files JSONB map alongside the template HTML (base64-encoded). On import, each declared font file is validated to exist in the archive.

### Loading per environment

| Environment | `source: "google"` | `source: "bundled"` |
|---|---|---|
| Builder preview (iframe) | `<link>` to `fonts.googleapis.com` injected by system | `@font-face` with blob URL from archive file contents |
| Puppeteer PDF | `<link>` to `fonts.googleapis.com` | `@font-face` pointing to `/api/templates/:id/fonts/:filename` (localhost) |

### Font picker integration

When a template is active, the font picker shows two groups:

```
Template fonts
  ├── Playfair Display  (bundled)
  └── Inter             (google)

System fonts
  ├── IBM Plex Serif
  ├── Roboto
  └── ... (global list)
```

Template fonts appear at the top. User can pick any font from either group. `--resume-font-body` and `--resume-font-heading` CSS vars apply to the selected fonts regardless of source.

### Injected blocks

The system prepends two `<style>` blocks before `</head>` in `index.html` before rendering:

```html
<!-- Block 1: @font-face declarations from template's fonts array -->
<style id="resume-fonts">
  @font-face {
    font-family: "Playfair Display";
    font-weight: 400;
    src: url("http://localhost:3001/api/templates/khaled/fonts/playfair-400.woff2") format("woff2");
  }
  @font-face {
    font-family: "Playfair Display";
    font-weight: 700;
    src: url("http://localhost:3001/api/templates/khaled/fonts/playfair-700.woff2") format("woff2");
  }
</style>

<!-- Block 2: @page rule + CSS custom properties from resume metadata + typography slots -->
<style id="resume-css-vars">
  @page {
    size: A4; /* "a4" → A4, "letter" → letter, "free-form" → auto */
    margin: 0;
  }

  :root {
    /* Page design */
    --resume-primary: rgba(220,38,38,1);
    --resume-foreground: rgba(0,0,0,1);
    --resume-background: rgba(255,255,255,1);
    --resume-page-padding-x: 24pt;
    --resume-page-padding-y: 24pt;
    --resume-sidebar-width: 33%;
    --resume-sidebar-grid-areas:   "sidebar main";
    --resume-sidebar-grid-columns: var(--resume-sidebar-width) 1fr;
    --resume-section-gap: 16pt;
    --resume-column-gap: 12pt;

    /* Typography slots — one set of vars per declared slot */
    --resume-font-name:        "Playfair Display";
    --resume-size-name:        28pt;
    --resume-weight-name:      700;
    --resume-line-height-name: 1.2;

    --resume-font-heading:        "Playfair Display";
    --resume-size-heading:        12pt;
    --resume-weight-heading:      700;
    --resume-line-height-heading: 1.3;

    --resume-font-body:        "Inter";
    --resume-size-body:        10pt;
    --resume-weight-body:      400;
    --resume-line-height-body: 1.5;

    --resume-font-caption:        "Inter";
    --resume-size-caption:        8.5pt;
    --resume-weight-caption:      400;
    --resume-line-height-caption: 1.4;
  }
</style>
```

Templates use `var(--resume-*)` exclusively — no hardcoded colors, font names, or sizes.

---

## Typography Slots

### What they are

Typography slots let a template declare independent font/size/weight controls for distinct typographic roles (name, section headings, body text, captions, etc.). Each slot gets its own picker in the builder UI. The user's choices are stored per-slot in `metadata.typography.slots`.

Two slots always exist whether declared or not: `body` and `heading`. These map to the existing `metadata.typography.body` and `metadata.typography.heading` fields. Templates declare additional slots as needed.

### Declaration in `template.json`

```json
"typography": [
  { "id": "name",    "label": "Your name",       "defaultFont": "Playfair Display", "defaultSize": 28,  "defaultWeight": 700 },
  { "id": "heading", "label": "Section headings","defaultFont": "Playfair Display", "defaultSize": 12,  "defaultWeight": 700 },
  { "id": "body",    "label": "Body text",        "defaultFont": "Inter",            "defaultSize": 10,  "defaultWeight": 400 },
  { "id": "caption", "label": "Dates & locations","defaultFont": "Inter",            "defaultSize": 8.5, "defaultWeight": 400 }
]
```

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Slot identifier. Used as key in CSS var names and `metadata.typography.slots`. |
| `label` | Yes | Display label shown in the builder typography panel. |
| `defaultFont` | No | Default font family. Falls back to `body` font if omitted. |
| `defaultSize` | No | Default size in pt. Falls back to `body` size if omitted. |
| `defaultWeight` | No | Default font weight. Falls back to `body` weight if omitted. |
| `defaultLineHeight` | No | Default line height. Falls back to `body` line height if omitted. |

### CSS variables

Each slot generates four CSS vars:

```
--resume-font-{id}
--resume-size-{id}
--resume-weight-{id}
--resume-line-height-{id}
```

Example for the slots above:

```css
--resume-font-name:        "Playfair Display";
--resume-size-name:        28pt;
--resume-weight-name:      700;
--resume-line-height-name: 1.2;

--resume-font-heading:        "Playfair Display";
--resume-size-heading:        12pt;
--resume-weight-heading:      700;
--resume-line-height-heading: 1.3;

--resume-font-body:        "Inter";
--resume-size-body:        10pt;
--resume-weight-body:      400;
--resume-line-height-body: 1.5;

--resume-font-caption:        "Inter";
--resume-size-caption:        8.5pt;
--resume-weight-caption:      400;
--resume-line-height-caption: 1.4;
```

Templates use these vars in CSS:

```css
.name            { font-family: var(--resume-font-name); font-size: var(--resume-size-name); font-weight: var(--resume-weight-name); }
.section-heading { font-family: var(--resume-font-heading); font-size: var(--resume-size-heading); }
body             { font-family: var(--resume-font-body); font-size: var(--resume-size-body); }
.date, .location { font-family: var(--resume-font-caption); font-size: var(--resume-size-caption); }
```

### User choice storage

User choices per slot are stored in `metadata.typography.slots` (new field on the resume metadata schema):

```typescript
metadata.typography.slots: Record<string, {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
}>
```

When the user changes a slot's font in the builder, the value is written to `metadata.typography.slots[slotId].fontFamily`. At render time, user choices override slot defaults. When the user switches templates, slot values for IDs that don't exist in the new template are ignored — not deleted.

### Builder UI

The typography panel renders one font+size+weight row per declared slot (labeled). Each font picker shows template fonts (top group) + system fonts (bottom group). Built-in `body` and `heading` slots are always shown.

---

## Validation Pipeline

Run in sequence on import. Errors block import. Warnings surface in the builder UI.

### Layer 1 — Structural

- `template.json` exists
- `index.html` exists
- No path traversal in filenames (no `../` components)

### Layer 2 — Schema

- `template.json` parses as valid JSON and passes `templateMetadataSchema` (Zod)
- All `<resume-slot>` tags across all `.html` files pass `resumeSlotSchema` (Zod)
- Each `source: "bundled"` font entry has all declared weight files present in the archive

### Layer 3 — Syntactic

- Each `.html` file in the archive compiles as valid Nunjucks (`env.parse(content)`)
- Errors include file name and line number

### Layer 4 — Semantic

- All `{% include %}` paths in `index.html` and section files resolve to files that exist in the archive (unless the include uses `ignore missing`)
- No `{% include %}` path escapes the archive root
- **Sidebar contract warning**: if `sidebarPosition` is not `"none"` (`"left"`, `"right"`, or `"either"`), scan all `.html` files for any reference to `page.sidebar`. If none found, emit a warning — the layout editor will let users drag sections into the sidebar but they will not render

### Layer 5 — Runtime

- Dry-run render with mock resume data (one visible item per section, all fields filled)
- Render must complete without throwing

### Layer 6 — Security (user-imported templates only)

- `<script>` tags rejected
- External URLs in `@font-face src:` allowed only from `fonts.googleapis.com`
- Bundled font files must be `.woff2` format (magic bytes validated)
- Nunjucks sandbox mode enabled for render

### Validation response

```json
{
  "valid": false,
  "errors": [
    { "type": "missing-file", "file": "template.json" },
    { "type": "syntax-error", "file": "sections/experience.html", "line": 42, "message": "unexpected token" },
    { "type": "include-missing", "referencedIn": "index.html", "path": "sections/custom.html" },
    { "type": "slot-invalid", "file": "sections/experience.html", "id": "field", "message": "Unknown item-type: fooItem" },
    { "type": "font-file-missing", "family": "Playfair Display", "weight": 700, "path": "fonts/playfair-700.woff2" }
  ],
  "warnings": [
    { "type": "section-not-implemented", "sectionId": "certifications" },
    { "type": "section-not-implemented", "sectionId": "awards" },
    { "type": "sidebar-not-rendered", "message": "sidebarPosition is \"left\" but no file references page.sidebar — sidebar sections will not appear in output" }
  ]
}
```

---

## Nunjucks Data Context

The following variables are available in every template file (both `index.html` and all `sections/*.html`):

```
basics
  .name, .headline, .email, .phone, .location
  .website.url, .website.label
  .customFields[].id, .text, .link, .icon

picture
  .url, .hidden, .size, .borderRadius, ...

summary                           ← top-level, NOT inside sections
  .title, .columns, .hidden
  .content                        ← HTML string, use | safe

sections                          ← standard sections only, keyed by section type name
  .experience.title, .experience.columns, .experience.items[]
    .company, .position, .location, .period
    .website.url, .website.label
    .description          ← HTML string, use | safe
    .roles[].position, .period, .description
    .extensions           ← template-specific custom data
    .hidden
  .education.title, .education.items[]
    .school, .degree, .area, .grade, .period, .location
    .extensions, .hidden
  .skills.title, .skills.items[]
    .name, .level, .keywords[]
    .extensions, .hidden
  .certifications.title, .certifications.items[]
    .title, .issuer, .date
    .extensions, .hidden
  ... (profiles, projects, languages, interests, awards, publications, volunteer, references follow the same pattern)

customSections[]                  ← user-created sections with arbitrary IDs
  .id, .title, .type, .columns
  .items[]

sectionById                       ← merged lookup: all sections keyed by ID (standard + custom)
  [sectionId]                     ← works for "experience", "education", … AND for custom UUIDs

metadata
  .layout.pages[]
    .main[]                   ← section IDs in main column (standard type names OR custom section UUIDs)
    .sidebar[]                ← section IDs in sidebar column
    .fullWidth                ← boolean
  .layout.sidebarWidth        ← number (percentage, e.g. 35)
  .layout.sidebarPosition     ← "left" | "right" | undefined (user override, only set when template declares "either")
  .page.format                ← "a4" | "letter" | "free-form"
  .page.locale                ← BCP-47 tag, e.g. "en-US"
  .page.marginX               ← horizontal margin in pt
  .page.marginY               ← vertical margin in pt
  .page.gapX                  ← horizontal gap between columns in pt
  .page.gapY                  ← vertical gap between sections in pt
  .design.colors.primary, .text, .background
  .typography.body.fontFamily, .fontSize, .lineHeight
  .typography.heading.fontFamily, .fontSize
  .typography.slots           ← Record<slotId, { fontFamily?, fontSize?, fontWeight?, lineHeight? }>
```

### Custom section dispatch

Section IDs in `page.main[]` and `page.sidebar[]` include both standard section type names (e.g. `"experience"`) and custom section UUIDs (e.g. `"c7a1b3f2-..."`). The standard dispatch pattern `{% include "sections/" + sectionId + ".html" ignore missing %}` resolves correctly for standard sections, but fails silently for custom section UUIDs since no matching file exists.

To support custom sections, the `FileMapLoader` automatically falls back to `sections/default.html` when a requested `sections/*.html` path is not in the archive. This means `sections/default.html` acts as the generic fallback for any section the template hasn't specifically implemented — including all custom sections.

Within `sections/default.html`, the `sectionId` loop variable is available, and the render context provides both `sections[sectionId]` (standard sections) and a merged lookup. The simplest approach for `sections/default.html`:

```html
<!-- sections/default.html — rendered for any unimplemented or custom section -->
{% set section = sectionById[sectionId] %}
{% if section and section.items | selectVisible | length > 0 %}
<section>
  <h2 class="section-heading">{{ section.title }}</h2>
  {% for item in section.items | selectVisible %}
  <div class="item" style="break-inside: avoid;">
    {{ item.description | safe }}
  </div>
  {% endfor %}
</section>
{% endif %}
```

`sectionById` is built by `render()` at call time: it merges `sections` (standard, keyed by type name) with custom sections (keyed by their UUID `id`). Using `sections[sectionId]` directly would return `undefined` for any custom section UUID.

The `FileMapLoader` fallback only triggers for `sections/*.html` paths — other includes behave normally.

### Built-in filters

| Filter | Description | Example |
|---|---|---|
| `safe` | Marks HTML string as safe for output | `{{ item.description \| safe }}` |
| `selectVisible` | Filters out items where `hidden == true` | `{% for item in section.items \| selectVisible %}` |
| `levelDots(n)` | Renders n/5 filled dot indicators as HTML | `{{ item.level \| levelDots }}` |
| `formatDate` | Formats a date string for the resume locale | `{{ item.date \| formatDate }}` |

---

## Schema Changes

### `baseItemSchema` — add `extensions`

```typescript
extensions: z.record(z.unknown()).catch({})
```

All item types inherit this. Core fields are unchanged.

### `typographySchema` — add `slots`

```typescript
// packages/schema/src/resume/data.ts — typographySchema
export const typographySlotValueSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize:   z.number().optional(),
  fontWeight: z.number().int().optional(),
  lineHeight: z.number().optional(),
});

export const typographySchema = z.object({
  body:    typographyItemSchema,  // existing
  heading: typographyItemSchema,  // existing
  slots: z.record(typographySlotValueSchema).catch({}),
});
```

`slots` is keyed by slot `id` from `template.json`. Stores user overrides per typography slot. When the user switches templates, entries for IDs not declared by the new template are ignored — not deleted.

### `layoutSchema` — add `sidebarPosition`

```typescript
// packages/schema/src/resume/data.ts — layoutSchema
export const layoutSchema = z.object({
  sidebarWidth: ...,   // existing
  pages:        ...,   // existing
  sidebarPosition: z.enum(["left", "right"]).optional(),
});
```

User's sidebar direction override. Only meaningful when the active template declares `sidebarPosition: "either"`. Absent when the template fixes the position. The system defaults to `"left"` at render time when unset.

---

## Import / Export

### Import flow

1. User uploads `.rxt` file via builder UI
2. Server unzips and runs the 6-layer validation pipeline
3. On validation pass:
   - `template.json` parsed → `metadata` + `inputs` (from all `<resume-slot>` tags)
   - All files stored in `templates.files` JSONB map (`{ "index.html": "...", "sections/experience.html": "...", "fonts/playfair-400.woff2": "<base64>" }`)
   - Preview image generated via Puppeteer screenshot with mock data → stored in `templates.previewImage`
4. Template appears in user's template picker immediately

### Export flow

1. User clicks Export on any template
2. Server reconstructs the `.rxt` zip from the `templates.files` JSONB map
3. Returns with `Content-Disposition: attachment; filename="<id>.rxt"`
4. Works identically for built-in and user-imported templates

### Portability guarantee

A valid `.rxt` file is fully self-contained: layout, styles, section renderers, font files, and custom input declarations. Moving a template between Reactive Resume instances requires only the `.rxt` file.

---

## DB Schema (`templates` table)

```typescript
{
  id:           text (primary key — template slug)
  name:         text
  files:        jsonb  // { "filename": "content", "fonts/x.woff2": "<base64>" }
  metadata:     jsonb  // parsed TemplateMetadata (id, name, sidebarPosition, tags, fonts)
  inputs:       jsonb  // parsed ResumeSlot[] from all <resume-slot> tags
  previewImage: text   // base64 PNG screenshot
  isBuiltin:    boolean
  userId:       uuid | null  // null for built-ins
  createdAt:    timestamp
  updatedAt:    timestamp
}
```

---

## Package Boundaries

| Package | Role |
|---|---|
| `packages/schema` | `extensions` on `baseItemSchema`. `resumeSlotSchema`, `templateMetadataSchema`, `fontDeclarationSchema`, `parsedTemplateSchema` (Zod). |
| `packages/renderer` | Nunjucks environment + custom loader (resolves includes from in-memory file map; falls back to `sections/default.html` for missing section files). `render(files, data) → string`. `parseTemplate(zipBuffer) → ParsedTemplate`. CSS vars + font-face + `@page` injection. Custom filters. |
| `packages/pdf` | Built-in template `.rxt` seed files. Puppeteer PDF adapter. Font file serving. |
| `apps/server` | Template import/export API. Startup seeding (`seed-templates.ts`). Puppeteer process management. `/api/templates/:id/fonts/:filename` static route. |
| `apps/web` | Builder iframe preview. Font picker (template fonts group + system fonts). Template-aware item editor (`<resume-slot>`-derived form fields). Template picker UI. |

---

## Out of Scope

- Template marketplace / public sharing (future)
- Live Nunjucks syntax validation in a browser-based template editor (future)
- Template upgrade migrations (future)
- Removing the old React PDF rendering path before all 15 templates are migrated

---

## Phases

| Phase | Scope |
|---|---|
| 1 | Schema: `extensions` on `baseItemSchema`, `resumeSlotSchema`, `fontDeclarationSchema`, `templateMetadataSchema`, `parsedTemplateSchema` |
| 2 | `packages/renderer`: Nunjucks environment + zip loader, `render(files, data)`, `parseTemplate(zipBuffer)`, custom filters, CSS vars + font-face injection |
| 3 | `packages/pdf` + `apps/server`: Puppeteer PDF generation, font file serving endpoint |
| 4 | `apps/web`: Builder preview migrates to iframe |
| 5 | DB schema + startup seeding + import/export API + font picker integration + preview image generation |
| 6 | `apps/web`: Template-aware item editor (custom input fields from `<resume-slot>`) |
| 7 | `packages/pdf`: Migrate all 15 built-in templates to `.rxt` archives |
| 8 | New template: Khaled's resume design + authoring guide finalized |

---

## Documentation

### Authoring guide (`docs/templates/authoring-guide.md`)

User-facing reference covering: archive structure, `template.json` fields, Nunjucks data context, available filters, `<resume-slot>` syntax, CSS custom properties, font declaration, section dispatch pattern, and a worked example (Khaled's template from Phase 8).

### In-app

A "How to write a template" link in the import dialog points to the hosted authoring guide. No new UI primitives required.
