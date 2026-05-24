---
title: "Template Authoring Guide"
description: "Build HTML/CSS .rxt templates for Reactive Resume with Nunjucks, shared section macros, and the current preview/export pipeline."
---

# Template Authoring Guide

This guide covers everything you need to build a `.rxt` template for Reactive Resume.

---

## What is a `.rxt` file?

A `.rxt` file is a ZIP archive with a `.rxt` extension. It contains the HTML, CSS, and optional font files that define how a resume looks.

The current template engine is HTML/CSS-based:
- the builder preview renders the template in an iframe and paginates it with Paged.js
- PDF export renders the same HTML on the server and prints it with Puppeteer

Preview and export use the same template source.

---

## Archive structure

```
my-template.rxt (ZIP)
├── template.json          ← required: metadata
├── index.html             ← required: main Nunjucks template
├── macros.html            ← injected by build:rxt (shared section macros)
├── sections/
│   ├── header.html        ← typically template-specific
│   ├── experience.html    ← override shared macro (optional)
│   ├── education.html     ← override shared macro (optional)
│   └── default.html       ← fallback for unknown section IDs (optional)
├── styles/
│   └── extra.css          ← additional stylesheets (optional)
└── fonts/
    └── MyFont-400.woff2   ← bundled font files (optional)
```

**Allowed paths:** `template.json`, `index.html`, `macros.html`, and anything under `sections/`, `styles/`, or `fonts/`. Any other path is rejected at parse time.

**Forbidden:** `<script>` tags anywhere in any `.html` file. Path traversal (`..`) is also rejected.

---

## `template.json`

```json
{
  "id": "my-template",
  "name": "My Template",
  "author": "Your Name",
  "description": "A short description shown in the template picker.",
  "sidebarPosition": "none",
  "tags": ["Modern", "Clean"],
  "fonts": [],
  "typography": []
}
```

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | ✅ | Lowercase, URL-safe. Must be unique across all templates. |
| `name` | `string` | ✅ | Display name shown in the UI. |
| `author` | `string` | — | Your name or handle. |
| `description` | `string` | — | One sentence shown in the template picker. |
| `sidebarPosition` | `"none" \| "left" \| "right" \| "either"` | ✅ | Controls CSS var injection and sidebar rendering. Use `"either"` to let the user choose. |
| `tags` | `string[]` | — | Free-form tags for filtering (e.g. `["Clean", "Two-column"]`). |
| `fonts` | `FontDeclaration[]` | — | Declare Google or bundled fonts. See [Fonts](#fonts). |
| `typography` | `TypographySlot[]` | — | Declare extra typography slots beyond body/heading. See [Typography slots](#typography-slots). |

---

## `index.html`

The entry point. Rendered with Nunjucks. Receives the full resume context and the injected CSS vars.

### Minimal full-width example

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
{{ metadata.css | safe }}
<style>
/* your template CSS here */
</style>
</head>
<body>
{% include "sections/header.html" %}
{% for page in metadata.layout.pages %}
<div class="page">
  {% for sectionId in page.main %}
    {% include "sections/" + sectionId + ".html" ignore missing %}
  {% endfor %}
</div>
{% endfor %}
</body>
</html>
```

`{{ metadata.css | safe }}` outputs the injected `<style>` block containing shared CSS custom properties and paged-media rules. Always place it inside `<head>`.

### Two-column layout example

```html
<body>
{% for page in metadata.layout.pages %}
  {% if not page.fullWidth %}
  <div class="page-layout">
    <div class="sidebar-column">
      {% if loop.first %}{% include "sections/header.html" %}{% endif %}
      {% for sectionId in page.sidebar %}
        {% include "sections/" + sectionId + ".html" ignore missing %}
      {% endfor %}
    </div>
    <div class="main-column">
      {% for sectionId in page.main %}
        {% include "sections/" + sectionId + ".html" ignore missing %}
      {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="page-layout">
    <div class="main-column" style="grid-column: 1 / -1;">
      {% if loop.first %}{% include "sections/header.html" %}{% endif %}
      {% for sectionId in page.main %}
        {% include "sections/" + sectionId + ".html" ignore missing %}
      {% endfor %}
    </div>
  </div>
  {% endif %}
{% endfor %}
</body>
```

The `ignore missing` directive silently skips section includes that don't have a matching file. The `sections/default.html` file (injected by `build:rxt`) handles unknown section IDs via the `renderCustomSection` macro.

---

## Nunjucks context

Every template receives the full resume data as context. Top-level keys:

| Key | Type | Description |
|---|---|---|
| `basics` | object | `name`, `headline`, `email`, `phone`, `location`, `website`, `customFields[]` |
| `picture` | object | `url`, `hidden`, `size`, `rotation`, `aspectRatio`, `borderRadius`, `borderColor` |
| `summary` | object | `title`, `content` (HTML string), `hidden` |
| `sections` | object | Map of standard section ID → section object (legacy; prefer `sectionById`) |
| `sectionById` | object | Map of **all** section IDs (standard + custom UUIDs) → section object |
| `metadata` | object | `layout`, `page`, `design`, `typography`, `css` (injected styles string) |

### Section object shape

```
{
  title: string,
  columns: number,   // 1–4, used for the CSS grid
  hidden: boolean,
  items: Item[]      // shape depends on section type
}
```

### `metadata.layout.pages`

An array of page objects. Each page has:

```
{
  main: string[],     // section IDs for the main column
  sidebar: string[],  // section IDs for the sidebar (empty for full-width)
  fullWidth: boolean  // true when the page has no sidebar
}
```

Iterate with `{% for page in metadata.layout.pages %}`.

### `basics.website`

```
{ url: string, label: string, inlineLink: boolean }
```

### `basics.customFields`

```
[{ id, icon, text, link }]
```

---

## CSS custom properties

`buildInjectedStyles` injects these into `:root` before your template's own CSS runs. Use them instead of hard-coding values so users can customise via the builder.

| Variable | Source | Description |
|---|---|---|
| `--resume-primary` | Design → Primary color | Accent color (headers, borders, sidebar bg) |
| `--resume-foreground` | Design → Text color | Body text color |
| `--resume-background` | Design → Background color | Page background |
| `--resume-page-padding-x` | Page → Margin X | Horizontal padding (`pt` unit) |
| `--resume-page-padding-y` | Page → Margin Y | Vertical padding (`pt` unit) |
| `--resume-sidebar-width` | Layout → Sidebar width | Sidebar column width as `%` |
| `--resume-sidebar-grid-areas` | `sidebarPosition` + user choice | CSS `grid-template-areas` string (`"sidebar main"` or `"main sidebar"`) |
| `--resume-sidebar-grid-columns` | `sidebarPosition` + user choice | CSS `grid-template-columns` value |
| `--resume-section-gap` | Page → Gap Y | Gap between sections (`pt`) |
| `--resume-column-gap` | Page → Gap X | Gap between columns (`pt`) |
| `--resume-font-body` | Typography → Body font | Body font family |
| `--resume-size-body` | Typography → Body size | Body font size (`pt`) |
| `--resume-weight-body` | Typography → Body weight | Body font weight |
| `--resume-line-height-body` | Typography → Body line height | Body line height |
| `--resume-font-heading` | Typography → Heading font | Heading font family |
| `--resume-size-heading` | Typography → Heading size | Heading font size (`pt`) |
| `--resume-weight-heading` | Typography → Heading weight | Heading font weight |
| `--resume-line-height-heading` | Typography → Heading line height | Heading line height |

For **two-column layouts**, wire the grid like this:

```css
.page-layout {
  display: grid;
  grid-template-areas: var(--resume-sidebar-grid-areas, "sidebar main");
  grid-template-columns: var(--resume-sidebar-grid-columns, var(--resume-sidebar-width) 1fr);
}
.sidebar-column { grid-area: sidebar; }
.main-column    { grid-area: main; }
```

---

## Shared macros

`build:rxt` injects `macros.html` at the archive root. It contains ready-to-use Nunjucks macros for all 13 standard section types. Section stub files (`sections/experience.html` etc.) are also injected and simply call into these macros — you don't need to write them unless you want a custom layout for a specific section.

### Available macros

| Macro | Renders |
|---|---|
| `renderSummarySection(summary)` | Summary (uses the top-level `summary` variable, not `sectionById`) |
| `renderExperienceSection(section)` | Work experience items |
| `renderEducationSection(section)` | Education items |
| `renderProjectsSection(section)` | Project items |
| `renderSkillsSection(section)` | Skills with level dots |
| `renderLanguagesSection(section)` | Languages with level dots |
| `renderInterestsSection(section)` | Interests / hobbies |
| `renderAwardsSection(section)` | Awards |
| `renderCertificationsSection(section)` | Certifications |
| `renderPublicationsSection(section)` | Publications |
| `renderVolunteerSection(section)` | Volunteer experience |
| `renderReferencesSection(section)` | References |
| `renderProfilesSection(section)` | Social / profile links |
| `renderCustomSection(section)` | Dispatches to the right macro based on `section.type` |

### Helper macros

| Macro | Renders |
|---|---|
| `renderWebsiteLink(website)` | `<a>` tag, only when `website.inlineLink` is false |
| `renderItemTitle(title, website)` | `<strong>` or `<a><strong>` depending on `website.inlineLink` |
| `renderLevelDots(level)` | 5 dot indicators, filled up to `level` |

### Using macros in a custom section file

```nunjucks
{# sections/experience.html — example of a custom layout using the macro #}
{% from "macros.html" import renderExperienceSection %}
{% set section = sectionById[sectionId] %}
{{ renderExperienceSection(section) }}
```

The loop variable `sectionId` (from `{% for sectionId in page.main %}` in `index.html`) is available inside included files automatically.

### CSS classes emitted by macros

The macros emit consistent CSS class names you can style in your `index.html`:

```
.resume-section        — wrapper around every section
.section-title         — <h2> section heading
.section-items         — CSS grid container (respects --section-columns)
.section-item          — individual item wrapper
.item-header           — item title row(s)
.item-title            — bold item name
.item-title-link       — item name when it's an inline link
.item-website          — standalone website link below the item
.split-row             — flex row: left content + right-aligned text
.align-right           — right-aligned text in a split row
.rich-text             — wraps HTML content fields
.level-dots            — container for skill/language level dots
.level-dot             — single dot (add `.filled` for filled state)
.small                 — smaller font size (0.875em)
.keywords              — comma-separated keyword list
.experience-role       — indented sub-role within an experience item
```

---

## Custom section inputs (`<resume-slot>`)

Add `<resume-slot>` tags to any section file to declare extra fields that the builder exposes to the user. These are the "template extension fields" shown at the bottom of each item dialog.

```html
<resume-slot
  id="github-url"
  item-type="projectItem"
  type="url"
  label="GitHub Repository"
  description="Link to the source code"
  required="false"
></resume-slot>
```

### Attributes

| Attribute | Values | Description |
|---|---|---|
| `id` | any string | Field identifier. Stored in `item.extensions[id]`. |
| `item-type` | See below | Which item dialog shows this field. |
| `type` | See below | Input widget type. |
| `label` | string | Label shown in the builder UI. |
| `description` | string | Optional helper text below the field. |
| `required` | `"true"` / `"false"` | Whether the builder marks the field as required. |

**`item-type` values:** `experienceItem`, `educationItem`, `projectItem`, `skillItem`, `certificationItem`, `awardItem`, `publicationItem`, `volunteerItem`, `referenceItem`, `languageItem`, `interestItem`

**`type` values:** `rich-text`, `text`, `image`, `image-list`, `url`, `toggle`

### Reading slot values in your template

Extension values are stored in `item.extensions`:

```nunjucks
{% if item.extensions["github-url"] %}
<a href="{{ item.extensions['github-url'] }}" class="item-website">Source</a>
{% endif %}
```

---

## Fonts

### Google Fonts (no bundling needed)

```json
{
  "fonts": [
    {
      "family": "IBM Plex Serif",
      "weights": [400, 600],
      "source": "google"
    }
  ]
}
```

The engine injects `@font-face` rules for the selected Google font weights automatically. In your CSS, reference the font by family name via the CSS vars:

```css
body {
  font-family: var(--resume-font-body, "IBM Plex Serif", serif);
}
```

### Bundled fonts (offline, self-hosted)

```json
{
  "fonts": [
    {
      "family": "MyFont",
      "weights": [400, 700],
      "source": "bundled",
      "files": {
        "400": "fonts/MyFont-Regular.woff2",
        "700": "fonts/MyFont-Bold.woff2"
      }
    }
  ]
}
```

Font files must be inside the `fonts/` directory in the archive. The engine injects `@font-face` rules pointing at `/api/templates/{id}/fonts/{path}` automatically.

---

## Typography slots

Declare extra typography slots (beyond `body` and `heading`) to let users customise specific text styles in the builder:

```json
{
  "typography": [
    {
      "id": "label",
      "label": "Section label",
      "defaultFont": "IBM Plex Mono",
      "defaultSize": 8,
      "defaultWeight": 400,
      "defaultLineHeight": 1.3
    }
  ]
}
```

Each slot gets injected as `--resume-font-label`, `--resume-size-label`, `--resume-weight-label`, `--resume-line-height-label`. Reference them in CSS:

```css
.section-label {
  font-family: var(--resume-font-label);
  font-size: var(--resume-size-label);
}
```

---

## Building

Template source lives in `packages/pdf/src/templates/<name>/html/`. Run:

```bash
pnpm build:rxt
```

This:
1. Reads `packages/pdf/src/templates/shared-html/macros.html`
2. Reads all shared section stubs from `shared-html/sections/`
3. For each `<name>/html/` directory: zips shared files + template-specific files into `<name>.rxt`
4. Template-specific `sections/` files override the shared ones

The output `.rxt` files are committed to git alongside their source dirs.

If you are editing a built-in template, rebuild alone is not enough for the builder to pick up the change. The running app reads seeded template archives, not raw source files.

After changing a built-in template:
1. Run `pnpm build:rxt`
2. Restart the dev server so built-in templates are reseeded from the rebuilt `.rxt` files
3. Refresh the builder preview

---

## Validation

`parseTemplate` runs six checks on every archive (import-time and at startup seeding):

| Layer | What it checks |
|---|---|
| 1 – Structural | `template.json` and `index.html` present; no `..` path traversal; only `sections/`, `styles/`, `fonts/` subdirs |
| 2 – Schema | `template.json` validates against `templateMetadataSchema`; all declared bundled font files exist in archive; all `<resume-slot>` attributes are valid |
| 3 – Syntactic | Every `.html` file compiles as valid Nunjucks |
| 4 – Security | No `<script>` tags in any HTML file |
| 5 – Runtime | Dry-run render with mock resume data completes without throwing |
| 6 – Warnings | Non-blocking: missing section files (when no `sections/default.html`), sidebar declared but not rendered |

To test your template manually before running `build:rxt`:

```bash
node --input-type=module <<'EOF'
import { readFileSync } from "node:fs";
import { parseTemplate } from "./packages/renderer/src/index.ts";
const buf = readFileSync("./packages/pdf/src/templates/my-template.rxt");
const t = await parseTemplate(buf);
console.log("✓ id:", t.metadata.id, "| files:", Object.keys(t.files).length, "| warnings:", t.warnings.length);
if (t.warnings.length) console.warn(t.warnings);
EOF
```

---

## Full minimal example

```
packages/pdf/src/templates/minimal/html/
├── template.json
├── index.html
└── sections/
    └── header.html
```

**`template.json`:**
```json
{
  "id": "minimal",
  "name": "Minimal",
  "author": "You",
  "sidebarPosition": "none",
  "tags": ["Clean", "Simple"],
  "fonts": [{ "family": "Inter", "weights": [400, 600], "source": "google" }],
  "typography": []
}
```

**`sections/header.html`:**
```nunjucks
<header class="resume-header">
  <h1 class="header-name">{{ basics.name }}</h1>
  {% if basics.headline %}<p class="header-headline">{{ basics.headline }}</p>{% endif %}
  <div class="contact-list">
    {% if basics.email %}<a href="mailto:{{ basics.email }}">{{ basics.email }}</a>{% endif %}
    {% if basics.phone %}<span>{{ basics.phone }}</span>{% endif %}
    {% if basics.location %}<span>{{ basics.location }}</span>{% endif %}
  </div>
</header>
```

**`index.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
{{ metadata.css | safe }}
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--resume-font-body, "Inter", sans-serif);
  font-size: var(--resume-size-body, 10pt);
  color: var(--resume-foreground, #111);
  background: var(--resume-background, #fff);
  padding: var(--resume-page-padding-y) var(--resume-page-padding-x);
}
a { color: inherit; text-decoration: none; }
.resume-header { margin-bottom: var(--resume-section-gap); }
.header-name {
  font-family: var(--resume-font-heading, "Inter", sans-serif);
  font-size: calc(var(--resume-size-heading, 14pt) * 1.4);
  font-weight: var(--resume-weight-heading, 600);
}
.contact-list { display: flex; flex-wrap: wrap; gap: 4pt 12pt; margin-top: 3pt; }
.section-title {
  font-family: var(--resume-font-heading, inherit);
  font-size: var(--resume-size-heading, 14pt);
  font-weight: var(--resume-weight-heading, 600);
  color: var(--resume-primary, #c00);
  border-bottom: 1pt solid var(--resume-primary, #c00);
  margin-bottom: 3pt; padding-bottom: 1pt;
}
.page { display: flex; flex-direction: column; gap: var(--resume-section-gap, 6pt); }
.split-row { display: flex; justify-content: space-between; gap: 4pt; }
.align-right { text-align: right; }
.rich-text p { margin-bottom: 0.2em; }
.rich-text ul { padding-left: 1.25em; }
.section-items { display: grid; grid-template-columns: repeat(var(--section-columns, 1), 1fr); gap: 4pt 8pt; }
.section-item { display: flex; flex-direction: column; gap: 2pt; }
.item-title { font-weight: var(--resume-weight-heading, 600); }
.level-dots { display: flex; gap: 3pt; }
.level-dot { width: 0.55em; height: 0.55em; border-radius: 50%; border: 1pt solid var(--resume-primary, #c00); }
.level-dot.filled { background: var(--resume-primary, #c00); }
.small { font-size: 0.875em; }
</style>
</head>
<body>
{% include "sections/header.html" %}
{% for page in metadata.layout.pages %}
<div class="page">
  {% for sectionId in page.main %}
    {% include "sections/" + sectionId + ".html" ignore missing %}
  {% endfor %}
  {% if not page.fullWidth %}
    {% for sectionId in page.sidebar %}
      {% include "sections/" + sectionId + ".html" ignore missing %}
    {% endfor %}
  {% endif %}
</div>
{% endfor %}
</body>
</html>
```

Build and verify:
```bash
pnpm build:rxt
# ✓ minimal.rxt (X KB)
```

The template appears in the builder on next server startup.
