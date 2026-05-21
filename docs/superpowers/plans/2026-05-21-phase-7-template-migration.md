# Phase 7: Migrate 15 Built-in Templates to .rxt Archives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all 15 React PDF templates (`packages/pdf/src/templates/<name>/`) to `.rxt` zip archives seeded into the DB on startup, then remove `@react-pdf/renderer`.

**Architecture:** Each template has source files in `packages/pdf/src/templates/<name>/html/` (`template.json` + `index.html` + `sections/header.html`). A build script assembles each dir + shared macros into a `.rxt` archive. The seeder auto-discovers `*.rxt` files. All 15 templates share one `macros.html` injected by the build script — this handles all 13 section types. CSS custom properties from `buildInjectedStyles` drive colors, typography, and layout.

**Tech Stack:** Node.js `fs`/`path`, JSZip (already in `@reactive-resume/renderer`), Nunjucks, `pnpm build:rxt` script

---

## Template Layout Classification

| Template | Layout | Sidebar |
|---|---|---|
| onyx | full-width | — |
| bronzor | full-width | — |
| kakuna | full-width | — |
| lapras | full-width | — |
| meowth | full-width | — |
| rhyhorn | full-width | — |
| scizor | full-width | — |
| azurill | two-column | left |
| ditto | two-column | left |
| ditgar | two-column | left |
| gengar | two-column | left |
| glalie | two-column | left |
| pikachu | two-column | left |
| chikorita | two-column | right |
| leafish | two-column | right |

---

## File Map

### Infrastructure
| File | Action |
|---|---|
| `tooling/build-rxt.ts` | Create |
| `packages/pdf/package.json` | Modify — add `build:rxt` script |
| `packages/pdf/src/templates/shared-html/macros.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/summary.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/experience.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/education.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/projects.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/skills.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/languages.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/interests.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/awards.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/certifications.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/publications.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/volunteer.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/references.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/profiles.html` | Create |
| `packages/pdf/src/templates/shared-html/sections/default.html` | Create |
| `apps/server/src/startup/seed-templates.ts` | Modify |

### Per template (×15)
| File | Action |
|---|---|
| `packages/pdf/src/templates/<name>/html/template.json` | Create |
| `packages/pdf/src/templates/<name>/html/index.html` | Create |
| `packages/pdf/src/templates/<name>/html/sections/header.html` | Create |
| `packages/pdf/src/templates/<name>.rxt` | Build artifact |

---

## Task 1: Build tooling

**Files:**
- Create: `tooling/build-rxt.ts`
- Modify: `packages/pdf/package.json`

- [ ] **Step 1: Create `tooling/build-rxt.ts`**

```typescript
// tooling/build-rxt.ts
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const templatesDir = join(repoRoot, "packages/pdf/src/templates");
const sharedHtmlDir = join(templatesDir, "shared-html");
const sharedMacros = readFileSync(join(sharedHtmlDir, "macros.html"), "utf-8");

const collectSharedSections = (): Record<string, string> => {
  const sectionsDir = join(sharedHtmlDir, "sections");
  const result: Record<string, string> = {};
  for (const f of readdirSync(sectionsDir)) {
    result[`sections/${f}`] = readFileSync(join(sectionsDir, f), "utf-8");
  }
  return result;
};

const addDirToZip = (zip: JSZip, dir: string, base: string): void => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(base, full);
    if (statSync(full).isDirectory()) {
      addDirToZip(zip, full, base);
    } else {
      const ext = entry.slice(entry.lastIndexOf(".")).toLowerCase();
      const isBinary = [".woff2", ".woff", ".ttf", ".otf", ".png", ".jpg"].includes(ext);
      zip.file(rel, readFileSync(full, isBinary ? undefined : "utf-8") as string | Buffer);
    }
  }
};

async function buildAll(): Promise<void> {
  const sharedSections = collectSharedSections();
  const templateDirs = readdirSync(templatesDir).filter((d) => {
    const htmlDir = join(templatesDir, d, "html");
    return statSync(join(templatesDir, d)).isDirectory() && existsSync(htmlDir);
  });

  for (const name of templateDirs) {
    const htmlDir = join(templatesDir, name, "html");
    const outPath = join(templatesDir, `${name}.rxt`);

    const zip = new JSZip();

    // 1. Inject shared macros
    zip.file("macros.html", sharedMacros);

    // 2. Inject shared section files (don't overwrite template-specific ones)
    const templateSectionsDir = join(htmlDir, "sections");
    const existingFiles = new Set<string>();
    if (existsSync(templateSectionsDir)) {
      for (const f of readdirSync(templateSectionsDir)) {
        existingFiles.add(`sections/${f}`);
      }
    }
    for (const [path, content] of Object.entries(sharedSections)) {
      if (!existingFiles.has(path)) {
        zip.file(path, content);
      }
    }

    // 3. Add template-specific files
    addDirToZip(zip, htmlDir, htmlDir);

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const ws = createWriteStream(outPath);
    await new Promise<void>((resolve, reject) => {
      ws.on("finish", resolve);
      ws.on("error", reject);
      ws.write(buffer);
      ws.end();
    });

    console.log(`✓ ${name}.rxt (${(buffer.length / 1024).toFixed(1)} KB)`);
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add `build:rxt` to `packages/pdf/package.json`**

Open `packages/pdf/package.json`, find the `"scripts"` block and add:

```json
"build:rxt": "tsx ../../tooling/build-rxt.ts"
```

- [ ] **Step 3: Install `tsx` in tooling if not present**

```bash
grep -r '"tsx"' /Users/shqear/workspace/reactive-resume/package.json
```

`tsx` is already available in the workspace root devDependencies. If not, add it: `pnpm add -D tsx -w`.

- [ ] **Step 4: Verify the script can be run (before any templates exist)**

```bash
pnpm --filter @reactive-resume/pdf build:rxt
```

Expected: prints nothing (no template dirs with `html/` subdirs yet), exits 0.

- [ ] **Step 5: Commit**

```bash
git add tooling/build-rxt.ts packages/pdf/package.json
git commit -m "feat(pdf): add build:rxt tooling to zip template source dirs into .rxt archives"
```

---

## Task 2: Update seeder to auto-discover .rxt files

**Files:**
- Modify: `apps/server/src/startup/seed-templates.ts`

- [ ] **Step 1: Replace `seed-templates.ts` content**

```typescript
// apps/server/src/startup/seed-templates.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { templateService } from "@reactive-resume/api/features/templates";
import { parseTemplate } from "@reactive-resume/renderer";

const resolveTemplatesDir = (): string => {
  // Walk up from this file to the repo root, then into packages/pdf/src/templates
  let dir = fileURLToPath(new URL(".", import.meta.url));
  while (dir !== "/") {
    const candidate = join(dir, "packages/pdf/src/templates");
    try {
      readdirSync(candidate);
      return candidate;
    } catch {
      dir = join(dir, "..");
    }
  }
  throw new Error("Could not locate packages/pdf/src/templates from seed-templates.ts");
};

export async function seedTemplates(): Promise<void> {
  let templatesDir: string;
  try {
    templatesDir = resolveTemplatesDir();
  } catch (e) {
    console.warn("[Seed Templates] Could not find templates directory:", e);
    return;
  }

  const rxtFiles = readdirSync(templatesDir).filter((f) => f.endsWith(".rxt"));

  if (rxtFiles.length === 0) {
    console.info("[Seed Templates] No .rxt files found — run `pnpm --filter @reactive-resume/pdf build:rxt` to build them.");
    return;
  }

  console.info(`[Seed Templates] Seeding ${rxtFiles.length} built-in template(s)...`);

  for (const file of rxtFiles) {
    const id = file.slice(0, -".rxt".length);
    try {
      const zipBuffer = readFileSync(join(templatesDir, file));
      const parsed = await parseTemplate(zipBuffer);

      await templateService.upsert({
        id,
        name: parsed.metadata.name,
        tags: parsed.metadata.tags,
        files: parsed.files,
        metadata: parsed.metadata,
        inputs: parsed.inputs,
        ...(parsed.metadata.description !== undefined ? { description: parsed.metadata.description } : {}),
        ...(parsed.metadata.author !== undefined ? { author: parsed.metadata.author } : {}),
      });

      console.info(`[Seed Templates] ✓ ${id}`);
    } catch (error) {
      console.error(`[Seed Templates] ✗ ${id}`, error);
    }
  }

  console.info("[Seed Templates] Done.");
}
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm --filter web typecheck 2>&1 | head -20
pnpm --filter @reactive-resume/api typecheck 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/startup/seed-templates.ts
git commit -m "feat(server): auto-discover and seed .rxt template archives from packages/pdf/src/templates/"
```

---

## Task 3: Shared Nunjucks macros + section stubs

**Files:**
- Create: `packages/pdf/src/templates/shared-html/macros.html`
- Create: `packages/pdf/src/templates/shared-html/sections/*.html` (15 files)

- [ ] **Step 1: Create `packages/pdf/src/templates/shared-html/macros.html`**

```nunjucks
{#
  macros.html — shared Nunjucks macros for all section types.
  Injected into every .rxt archive by build-rxt.ts.
  CSS classes are defined per-template in index.html.
#}

{# ── Helpers ── #}

{% macro renderWebsiteLink(website) %}
{% if website and not website.inlineLink and website.url %}
<a href="{{ website.url }}" class="item-website">{{ website.label or website.url }}</a>
{% endif %}
{% endmacro %}

{% macro renderItemTitle(title, website) %}
{% if website and website.inlineLink and website.url %}<a href="{{ website.url }}" class="item-title-link"><strong class="item-title">{{ title }}</strong></a>
{% else %}<strong class="item-title">{{ title }}</strong>
{% endif %}
{% endmacro %}

{% macro renderLevelDots(level) %}
{% if level and level > 0 %}
<div class="level-dots">
{% for i in range(5) %}
<span class="level-dot{% if i < level %} filled{% endif %}"></span>
{% endfor %}
</div>
{% endif %}
{% endmacro %}

{# ── Section wrapper ── #}

{% macro sectionWrap(title, extraClass) %}
<section class="resume-section {{ extraClass }}">
  {% if title %}<h2 class="section-title">{{ title }}</h2>{% endif %}
  {{ caller() }}
</section>
{% endmacro %}

{# ── Summary ── #}

{% macro renderSummarySection(section) %}
{% if section and not section.hidden and section.content %}
<section class="resume-section summary-section">
  {% if section.title %}<h2 class="section-title">{{ section.title }}</h2>{% endif %}
  <div class="rich-text">{{ section.content | safe }}</div>
</section>
{% endif %}
{% endmacro %}

{# ── Profiles ── #}

{% macro renderProfilesSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section profiles-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item profile-item">
      <div class="item-header">
        <strong>{{ item.network }}</strong>
      </div>
      {% if item.website.url %}<a href="{{ item.website.url }}" class="item-website">{{ item.username }}</a>{% else %}<span>{{ item.username }}</span>{% endif %}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Experience ── #}

{% macro renderExperienceSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section experience-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item experience-item">
      <div class="item-header">
        <div class="split-row">
          {{ renderItemTitle(item.company, item.website) }}
          {% if item.location and item.roles | length == 0 %}<span class="align-right">{{ item.location }}</span>{% else %}<span class="align-right">{{ item.period }}</span>{% endif %}
        </div>
        {% if item.roles | length == 0 and item.position %}
        <div class="split-row">
          <span>{{ item.position }}</span>
          {% if item.location and not (item.location == item.period) %}<span class="align-right">{{ item.period }}</span>{% endif %}
        </div>
        {% endif %}
        {% if item.roles | length > 0 %}<div><span class="small">{{ item.period }}</span></div>{% endif %}
      </div>
      {% for role in item.roles %}
      <div class="experience-role">
        <div class="split-row">
          <span>{{ role.position }}</span>
          <span class="align-right small">{{ role.period }}</span>
        </div>
        {% if role.description %}<div class="rich-text">{{ role.description | safe }}</div>{% endif %}
      </div>
      {% endfor %}
      {% if item.roles | length == 0 and item.description %}
      <div class="rich-text">{{ item.description | safe }}</div>
      {% endif %}
      {{ renderWebsiteLink(item.website) }}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Education ── #}

{% macro renderEducationSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section education-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item education-item">
      <div class="item-header">
        <div class="split-row">
          {{ renderItemTitle(item.school, item.website) }}
          {% set degreeGrade = [item.degree, item.grade] | join(" • ") if (item.degree or item.grade) else "" %}
          {% if degreeGrade %}<span class="align-right">{{ degreeGrade }}</span>{% endif %}
        </div>
        {% if item.area or item.period %}
        <div class="split-row">
          {% if item.area %}<span>{{ item.area }}</span>{% endif %}
          {% set locPeriod = [item.location, item.period] | join(" • ") if (item.location or item.period) else "" %}
          {% if locPeriod %}<span class="align-right">{{ locPeriod }}</span>{% endif %}
        </div>
        {% endif %}
      </div>
      {% if item.description %}<div class="rich-text">{{ item.description | safe }}</div>{% endif %}
      {{ renderWebsiteLink(item.website) }}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Projects ── #}

{% macro renderProjectsSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section projects-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item project-item">
      <div class="item-header">
        <div class="split-row">
          {{ renderItemTitle(item.name, item.website) }}
          <span class="align-right">{{ item.period }}</span>
        </div>
      </div>
      {% if item.description %}<div class="rich-text">{{ item.description | safe }}</div>{% endif %}
      {{ renderWebsiteLink(item.website) }}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Skills ── #}

{% macro renderSkillsSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section skills-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item skill-item">
      <div class="item-header">
        <strong>{{ item.name }}</strong>
      </div>
      {% if item.proficiency %}<div class="small">{{ item.proficiency }}</div>{% endif %}
      {{ renderLevelDots(item.level) }}
      {% if item.keywords | length > 0 %}<div class="small keywords">{{ item.keywords | join(", ") }}</div>{% endif %}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Languages ── #}

{% macro renderLanguagesSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section languages-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item language-item">
      <div class="item-header">
        <strong>{{ item.language }}</strong>
        {% if item.fluency %}<div>{{ item.fluency }}</div>{% endif %}
      </div>
      {{ renderLevelDots(item.level) }}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Interests ── #}

{% macro renderInterestsSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section interests-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item interest-item">
      <div class="item-header"><strong>{{ item.name }}</strong></div>
      {% if item.keywords | length > 0 %}<div class="small keywords">{{ item.keywords | join(", ") }}</div>{% endif %}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Awards ── #}

{% macro renderAwardsSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section awards-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item award-item">
      <div class="item-header">
        <div class="split-row">
          {{ renderItemTitle(item.title, item.website) }}
          <span class="align-right">{{ item.date }}</span>
        </div>
        {% if item.awarder %}<div>{{ item.awarder }}</div>{% endif %}
      </div>
      {% if item.description %}<div class="rich-text">{{ item.description | safe }}</div>{% endif %}
      {{ renderWebsiteLink(item.website) }}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Certifications ── #}

{% macro renderCertificationsSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section certifications-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item certification-item">
      <div class="item-header">
        <div class="split-row">
          {{ renderItemTitle(item.title, item.website) }}
          <span class="align-right">{{ item.date }}</span>
        </div>
        {% if item.issuer %}<div>{{ item.issuer }}</div>{% endif %}
      </div>
      {% if item.description %}<div class="rich-text">{{ item.description | safe }}</div>{% endif %}
      {{ renderWebsiteLink(item.website) }}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Publications ── #}

{% macro renderPublicationsSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section publications-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item publication-item">
      <div class="item-header">
        <div class="split-row">
          {{ renderItemTitle(item.title, item.website) }}
          <span class="align-right">{{ item.date }}</span>
        </div>
        {% if item.publisher %}<div>{{ item.publisher }}</div>{% endif %}
      </div>
      {% if item.description %}<div class="rich-text">{{ item.description | safe }}</div>{% endif %}
      {{ renderWebsiteLink(item.website) }}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Volunteer ── #}

{% macro renderVolunteerSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section volunteer-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item volunteer-item">
      <div class="item-header">
        <div class="split-row">
          {{ renderItemTitle(item.organization, item.website) }}
          <span class="align-right">{{ item.period }}</span>
        </div>
        {% if item.location %}<div class="small">{{ item.location }}</div>{% endif %}
      </div>
      {% if item.description %}<div class="rich-text">{{ item.description | safe }}</div>{% endif %}
      {{ renderWebsiteLink(item.website) }}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── References ── #}

{% macro renderReferencesSection(section) %}
{% if section and not section.hidden %}
{% set items = section.items | selectVisible %}
{% if items | length > 0 %}
<section class="resume-section references-section">
  <h2 class="section-title">{{ section.title }}</h2>
  <div class="section-items" style="--section-columns: {{ section.columns | default(1) }}">
    {% for item in items %}
    <div class="section-item reference-item">
      <div class="item-header">
        {{ renderItemTitle(item.name, item.website) }}
        {% if item.position %}<div>{{ item.position }}</div>{% endif %}
        {% if item.phone %}<div class="small">{{ item.phone }}</div>{% endif %}
      </div>
      {% if item.description %}<div class="rich-text">{{ item.description | safe }}</div>{% endif %}
      {{ renderWebsiteLink(item.website) }}
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}
{% endif %}
{% endmacro %}

{# ── Custom section dispatch (used by sections/default.html for UUID section IDs) ── #}

{% macro renderCustomSection(section) %}
{% if section %}
  {% if section.type == "experience" %}{{ renderExperienceSection(section) }}
  {% elif section.type == "education" %}{{ renderEducationSection(section) }}
  {% elif section.type == "projects" %}{{ renderProjectsSection(section) }}
  {% elif section.type == "skills" %}{{ renderSkillsSection(section) }}
  {% elif section.type == "languages" %}{{ renderLanguagesSection(section) }}
  {% elif section.type == "interests" %}{{ renderInterestsSection(section) }}
  {% elif section.type == "awards" %}{{ renderAwardsSection(section) }}
  {% elif section.type == "certifications" %}{{ renderCertificationsSection(section) }}
  {% elif section.type == "publications" %}{{ renderPublicationsSection(section) }}
  {% elif section.type == "volunteer" %}{{ renderVolunteerSection(section) }}
  {% elif section.type == "references" %}{{ renderReferencesSection(section) }}
  {% elif section.type == "profiles" %}{{ renderProfilesSection(section) }}
  {% elif section.type == "summary" and section.items %}
    {% if section.items | length > 0 %}{{ renderSummarySection({ title: section.title, hidden: section.hidden, content: section.items[0].content }) }}{% endif %}
  {% endif %}
{% endif %}
{% endmacro %}
```

- [ ] **Step 2: Create shared section stubs**

Each file is a thin macro call. Create these 15 files:

`packages/pdf/src/templates/shared-html/sections/summary.html`:
```nunjucks
{% from "macros.html" import renderSummarySection %}
{{ renderSummarySection(summary) }}
```

`packages/pdf/src/templates/shared-html/sections/experience.html`:
```nunjucks
{% from "macros.html" import renderExperienceSection %}
{% set section = sectionById[sectionId] %}
{{ renderExperienceSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/education.html`:
```nunjucks
{% from "macros.html" import renderEducationSection %}
{% set section = sectionById[sectionId] %}
{{ renderEducationSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/projects.html`:
```nunjucks
{% from "macros.html" import renderProjectsSection %}
{% set section = sectionById[sectionId] %}
{{ renderProjectsSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/skills.html`:
```nunjucks
{% from "macros.html" import renderSkillsSection %}
{% set section = sectionById[sectionId] %}
{{ renderSkillsSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/languages.html`:
```nunjucks
{% from "macros.html" import renderLanguagesSection %}
{% set section = sectionById[sectionId] %}
{{ renderLanguagesSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/interests.html`:
```nunjucks
{% from "macros.html" import renderInterestsSection %}
{% set section = sectionById[sectionId] %}
{{ renderInterestsSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/awards.html`:
```nunjucks
{% from "macros.html" import renderAwardsSection %}
{% set section = sectionById[sectionId] %}
{{ renderAwardsSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/certifications.html`:
```nunjucks
{% from "macros.html" import renderCertificationsSection %}
{% set section = sectionById[sectionId] %}
{{ renderCertificationsSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/publications.html`:
```nunjucks
{% from "macros.html" import renderPublicationsSection %}
{% set section = sectionById[sectionId] %}
{{ renderPublicationsSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/volunteer.html`:
```nunjucks
{% from "macros.html" import renderVolunteerSection %}
{% set section = sectionById[sectionId] %}
{{ renderVolunteerSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/references.html`:
```nunjucks
{% from "macros.html" import renderReferencesSection %}
{% set section = sectionById[sectionId] %}
{{ renderReferencesSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/profiles.html`:
```nunjucks
{% from "macros.html" import renderProfilesSection %}
{% set section = sectionById[sectionId] %}
{{ renderProfilesSection(section) }}
```

`packages/pdf/src/templates/shared-html/sections/default.html`:
```nunjucks
{% from "macros.html" import renderCustomSection %}
{% set section = sectionById[sectionId] %}
{{ renderCustomSection(section) }}
```

- [ ] **Step 3: Commit**

```bash
git add packages/pdf/src/templates/shared-html/
git commit -m "feat(pdf): add shared Nunjucks macros and section stubs for all 13 section types"
```

---

## Task 4: Onyx template (full-width reference implementation)

**Files:**
- Create: `packages/pdf/src/templates/onyx/html/template.json`
- Create: `packages/pdf/src/templates/onyx/html/index.html`
- Create: `packages/pdf/src/templates/onyx/html/sections/header.html`

- [ ] **Step 1: Create `template.json`**

```json
{
  "id": "onyx",
  "name": "Onyx",
  "sidebarPosition": "none",
  "tags": ["Simple", "Professional"],
  "fonts": [],
  "typography": []
}
```

- [ ] **Step 2: Create `sections/header.html`**

```nunjucks
<header class="resume-header">
  {% if not picture.hidden and picture.url %}
  <img src="{{ picture.url }}" class="header-picture" alt="" />
  {% endif %}
  <div class="header-content">
    <div class="header-identity">
      <h1 class="header-name">{{ basics.name }}</h1>
      {% if basics.headline %}<p class="header-headline">{{ basics.headline }}</p>{% endif %}
    </div>
    <div class="contact-list">
      {% if basics.email %}<a href="mailto:{{ basics.email }}" class="contact-item"><span>{{ basics.email }}</span></a>{% endif %}
      {% if basics.phone %}<a href="tel:{{ basics.phone }}" class="contact-item"><span>{{ basics.phone }}</span></a>{% endif %}
      {% if basics.location %}<span class="contact-item">{{ basics.location }}</span>{% endif %}
      {% if basics.website.url %}<a href="{{ basics.website.url }}" class="contact-item">{{ basics.website.label or basics.website.url }}</a>{% endif %}
      {% for field in basics.customFields %}
      <span class="contact-item">{{ field.name }}: {{ field.value }}</span>
      {% endfor %}
    </div>
  </div>
</header>
```

- [ ] **Step 3: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--resume-font-body, "IBM Plex Serif", serif);
  font-size: var(--resume-size-body, 10pt);
  font-weight: var(--resume-weight-body, 400);
  line-height: var(--resume-line-height-body, 1.5);
  color: var(--resume-foreground, #000);
  background: var(--resume-background, #fff);
  padding: var(--resume-page-padding-y, 12pt) var(--resume-page-padding-x, 14pt);
}

a { color: inherit; text-decoration: none; }
strong, b { font-weight: var(--resume-weight-heading, 600); }

/* ── Header ── */
.resume-header {
  display: flex;
  align-items: center;
  gap: var(--resume-column-gap, 4pt);
  border-bottom: 1.5pt solid var(--resume-primary, #c00);
  padding-bottom: var(--resume-page-padding-y);
  margin-bottom: var(--resume-section-gap, 6pt);
}
.header-picture {
  width: 64px; height: 64px;
  object-fit: cover; border-radius: 50%; flex-shrink: 0;
}
.header-content { flex: 1; display: flex; flex-direction: column; gap: 4pt; }
.header-identity { display: flex; flex-direction: column; gap: 2pt; }
.header-name {
  font-family: var(--resume-font-heading, inherit);
  font-size: calc(var(--resume-size-heading, 14pt) * 1.5);
  font-weight: var(--resume-weight-heading, 600);
  line-height: 1.2;
}
.header-headline { font-size: var(--resume-size-body); opacity: 0.85; }
.contact-list {
  display: flex; flex-wrap: wrap;
  gap: 2pt var(--resume-column-gap, 4pt);
}
.contact-item {
  display: flex; align-items: center; gap: 3pt;
  font-size: var(--resume-size-body);
}

/* ── Page layout ── */
.page-sections {
  display: flex; flex-direction: column;
  gap: var(--resume-section-gap, 6pt);
}

/* ── Sections ── */
.resume-section { display: flex; flex-direction: column; gap: 3pt; }
.section-title {
  font-family: var(--resume-font-heading, inherit);
  font-size: var(--resume-size-heading, 14pt);
  font-weight: var(--resume-weight-heading, 600);
  color: var(--resume-foreground);
  border-bottom: 1pt solid var(--resume-primary, #c00);
  padding-bottom: 1pt;
  margin-bottom: 2pt;
}

/* ── Section items grid ── */
.section-items {
  display: grid;
  grid-template-columns: repeat(var(--section-columns, 1), 1fr);
  gap: calc(var(--resume-section-gap) * 0.5) var(--resume-column-gap, 4pt);
}

/* ── Item ── */
.section-item {
  display: flex; flex-direction: column;
  gap: calc(var(--resume-section-gap) * 0.15);
}
.item-header { display: flex; flex-direction: column; gap: 1pt; }
.item-title { font-weight: var(--resume-weight-heading, 600); }
.item-title-link { text-decoration: underline; }

/* ── Split row ── */
.split-row {
  display: flex; justify-content: space-between;
  align-items: flex-start; gap: 4pt; flex-wrap: wrap;
}
.align-right { text-align: right; flex-shrink: 1; min-width: 0; }

/* ── Misc ── */
.small { font-size: 0.875em; }
.item-website { font-size: 0.875em; text-decoration: underline; }
.keywords { color: var(--resume-foreground); opacity: 0.75; }

/* ── Rich text ── */
.rich-text p { margin-bottom: 0.2em; }
.rich-text p:last-child { margin-bottom: 0; }
.rich-text ul, .rich-text ol { padding-left: 1.25em; }
.rich-text li { margin-bottom: 0.1em; }

/* ── Level dots ── */
.level-dots { display: flex; gap: 3pt; align-items: center; margin-top: 1pt; }
.level-dot {
  width: 0.55em; height: 0.55em; border-radius: 50%;
  border: 1pt solid var(--resume-primary, #c00);
}
.level-dot.filled { background: var(--resume-primary, #c00); }

/* ── Experience roles ── */
.experience-role { display: flex; flex-direction: column; gap: 1pt; padding-left: 6pt; }
</style>
</head>
<body>
{% include "sections/header.html" %}
{% for page in metadata.layout.pages %}
<div class="page-sections">
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

- [ ] **Step 4: Build the .rxt archive**

```bash
pnpm --filter @reactive-resume/pdf build:rxt
```

Expected: `✓ onyx.rxt (X KB)` printed.

- [ ] **Step 5: Verify the archive parses correctly**

```typescript
// Run as a quick ad-hoc test in packages/renderer:
// pnpm --filter @reactive-resume/renderer test -- src/parse-template.test.ts
// — OR — manually verify with this node script:
```

```bash
node --input-type=module <<'EOF'
import { readFileSync } from "node:fs";
import { parseTemplate } from "./packages/renderer/src/index.ts";
const buf = readFileSync("./packages/pdf/src/templates/onyx.rxt");
const t = await parseTemplate(buf);
console.log("id:", t.metadata.id, "files:", Object.keys(t.files).length, "inputs:", t.inputs.length);
EOF
```

Expected: `id: onyx files: 16 inputs: 0` (or similar — count of files including shared stubs).

- [ ] **Step 6: Commit**

```bash
git add packages/pdf/src/templates/onyx/ packages/pdf/src/templates/onyx.rxt
git commit -m "feat(pdf): add onyx .rxt template — full-width reference implementation"
```

---

## Task 5: Remaining full-width single-column templates (bronzor, kakuna, lapras, meowth, rhyhorn, scizor)

These six templates all share the same full-width layout (`sidebarPosition: "none"`). Each needs `template.json`, `sections/header.html`, and `index.html`. The `index.html` for all six is the same as **onyx** (Task 4 Step 3) with one change: the `.section-title` CSS and header CSS reflects each template's visual style.

**Create all six in one task.**

- [ ] **Step 1: Create bronzor source files**

`packages/pdf/src/templates/bronzor/html/template.json`:
```json
{
  "id": "bronzor",
  "name": "Bronzor",
  "sidebarPosition": "none",
  "tags": ["Clean", "Minimal"],
  "fonts": [],
  "typography": []
}
```

`packages/pdf/src/templates/bronzor/html/sections/header.html`:
```nunjucks
<header class="resume-header">
  {% if not picture.hidden and picture.url %}
  <img src="{{ picture.url }}" class="header-picture" alt="" />
  {% endif %}
  <div class="header-identity">
    <h1 class="header-name">{{ basics.name }}</h1>
    {% if basics.headline %}<p class="header-headline">{{ basics.headline }}</p>{% endif %}
  </div>
  <div class="contact-list">
    {% if basics.email %}<a href="mailto:{{ basics.email }}" class="contact-item">{{ basics.email }}</a>{% endif %}
    {% if basics.phone %}<a href="tel:{{ basics.phone }}" class="contact-item">{{ basics.phone }}</a>{% endif %}
    {% if basics.location %}<span class="contact-item">{{ basics.location }}</span>{% endif %}
    {% if basics.website.url %}<a href="{{ basics.website.url }}" class="contact-item">{{ basics.website.label or basics.website.url }}</a>{% endif %}
    {% for field in basics.customFields %}
    <span class="contact-item">{{ field.name }}: {{ field.value }}</span>
    {% endfor %}
  </div>
</header>
```

`packages/pdf/src/templates/bronzor/html/index.html` — copy onyx's `index.html` exactly, then change the `.resume-header` block to:
```css
/* ── Header (bronzor: centered) ── */
.resume-header {
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  gap: 3pt;
  padding-bottom: var(--resume-page-padding-y);
  margin-bottom: var(--resume-section-gap);
}
.header-name {
  font-family: var(--resume-font-heading, inherit);
  font-size: calc(var(--resume-size-heading, 14pt) * 1.5);
  font-weight: var(--resume-weight-heading, 600);
  line-height: 1.2;
}
.header-headline { opacity: 0.85; }
.header-picture {
  width: 64px; height: 64px;
  object-fit: cover; border-radius: 50%;
}
.contact-list {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 2pt calc(var(--resume-column-gap) * 1.5);
}
.contact-item { display: flex; align-items: center; gap: 3pt; }

/* ── Sections (bronzor: title column left, content right) ── */
.resume-section {
  display: grid;
  grid-template-columns: var(--resume-sidebar-width, 35%) 1fr;
  column-gap: var(--resume-column-gap);
  border-top: 1pt solid var(--resume-primary);
  padding-top: calc(var(--resume-section-gap) * 0.5);
  align-items: start;
}
.section-title {
  font-family: var(--resume-font-heading, inherit);
  font-size: calc(var(--resume-size-heading) * 0.75);
  font-weight: var(--resume-weight-heading, 600);
  color: var(--resume-primary);
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}
.section-items { grid-column: 2; }
```

- [ ] **Step 2: Create kakuna source files**

`packages/pdf/src/templates/kakuna/html/template.json`:
```json
{
  "id": "kakuna",
  "name": "Kakuna",
  "sidebarPosition": "none",
  "tags": ["Modern", "Clean"],
  "fonts": [],
  "typography": []
}
```

`packages/pdf/src/templates/kakuna/html/sections/header.html` — same as onyx header.

`packages/pdf/src/templates/kakuna/html/index.html` — copy onyx's index.html, change header CSS to:
```css
/* ── Header (kakuna: name left, contact right) ── */
.resume-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--resume-column-gap);
  padding-bottom: var(--resume-page-padding-y);
  margin-bottom: var(--resume-section-gap);
  border-bottom: 2pt solid var(--resume-primary);
}
.header-name {
  font-family: var(--resume-font-heading, inherit);
  font-size: calc(var(--resume-size-heading, 14pt) * 1.5);
  font-weight: var(--resume-weight-heading, 600);
  line-height: 1.2;
}
.header-headline { opacity: 0.85; font-style: italic; }
.header-picture {
  width: 64px; height: 64px;
  object-fit: cover; border-radius: 4pt;
}
.contact-list {
  display: flex; flex-direction: column;
  align-items: flex-end; gap: 2pt;
}
.contact-item { font-size: var(--resume-size-body); }
/* section title: small caps style */
.section-title {
  font-size: var(--resume-size-heading);
  font-weight: var(--resume-weight-heading);
  color: var(--resume-primary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 1pt solid var(--resume-primary);
  padding-bottom: 1pt;
  margin-bottom: 3pt;
}
```

- [ ] **Step 3: Create lapras source files**

`packages/pdf/src/templates/lapras/html/template.json`:
```json
{
  "id": "lapras",
  "name": "Lapras",
  "sidebarPosition": "none",
  "tags": ["Classic", "Professional"],
  "fonts": [],
  "typography": []
}
```

`packages/pdf/src/templates/lapras/html/sections/header.html` — same as onyx header.

`packages/pdf/src/templates/lapras/html/index.html` — copy onyx's index.html, change header CSS to:
```css
/* ── Header (lapras: name centered, full-width banner) ── */
.resume-header {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 3pt;
  background: var(--resume-primary);
  color: var(--resume-background);
  margin: calc(-1 * var(--resume-page-padding-y)) calc(-1 * var(--resume-page-padding-x));
  padding: var(--resume-page-padding-y) var(--resume-page-padding-x);
  margin-bottom: var(--resume-section-gap);
}
.resume-header a { color: inherit; }
.header-picture {
  width: 80px; height: 80px;
  object-fit: cover; border-radius: 50%;
  border: 2pt solid var(--resume-background);
}
.header-name {
  font-family: var(--resume-font-heading, inherit);
  font-size: calc(var(--resume-size-heading, 14pt) * 1.5);
  font-weight: var(--resume-weight-heading, 600);
  line-height: 1.2;
}
.contact-list {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 2pt var(--resume-column-gap);
}
```

- [ ] **Step 4: Create meowth source files**

`packages/pdf/src/templates/meowth/html/template.json`:
```json
{
  "id": "meowth",
  "name": "Meowth",
  "sidebarPosition": "none",
  "tags": ["Modern", "Accent"],
  "fonts": [],
  "typography": []
}
```

`packages/pdf/src/templates/meowth/html/sections/header.html` — same as onyx header.

`packages/pdf/src/templates/meowth/html/index.html` — copy onyx's index.html, change `.section-title` CSS to:
```css
.section-title {
  font-family: var(--resume-font-heading, inherit);
  font-size: var(--resume-size-heading);
  font-weight: var(--resume-weight-heading);
  color: var(--resume-primary);
  border-bottom: 2pt solid var(--resume-primary);
  padding-bottom: 2pt;
  margin-bottom: 3pt;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

- [ ] **Step 5: Create rhyhorn source files**

`packages/pdf/src/templates/rhyhorn/html/template.json`:
```json
{
  "id": "rhyhorn",
  "name": "Rhyhorn",
  "sidebarPosition": "none",
  "tags": ["Bold", "Two-tone"],
  "fonts": [],
  "typography": []
}
```

`packages/pdf/src/templates/rhyhorn/html/sections/header.html`:
```nunjucks
<header class="resume-header">
  <div class="header-name-block">
    {% if not picture.hidden and picture.url %}
    <img src="{{ picture.url }}" class="header-picture" alt="" />
    {% endif %}
    <div>
      <h1 class="header-name">{{ basics.name }}</h1>
      {% if basics.headline %}<p class="header-headline">{{ basics.headline }}</p>{% endif %}
    </div>
  </div>
  <div class="contact-list">
    {% if basics.email %}<a href="mailto:{{ basics.email }}" class="contact-item">{{ basics.email }}</a>{% endif %}
    {% if basics.phone %}<a href="tel:{{ basics.phone }}" class="contact-item">{{ basics.phone }}</a>{% endif %}
    {% if basics.location %}<span class="contact-item">{{ basics.location }}</span>{% endif %}
    {% if basics.website.url %}<a href="{{ basics.website.url }}" class="contact-item">{{ basics.website.label or basics.website.url }}</a>{% endif %}
    {% for field in basics.customFields %}
    <span class="contact-item">{{ field.name }}: {{ field.value }}</span>
    {% endfor %}
  </div>
</header>
```

`packages/pdf/src/templates/rhyhorn/html/index.html` — copy onyx's index.html, change header CSS to:
```css
/* ── Header (rhyhorn: primary-bg banner, contact below) ── */
.resume-header {
  background: var(--resume-primary);
  color: var(--resume-background);
  margin: calc(-1 * var(--resume-page-padding-y)) calc(-1 * var(--resume-page-padding-x));
  padding: var(--resume-page-padding-y) var(--resume-page-padding-x);
  margin-bottom: var(--resume-section-gap);
  display: flex; flex-direction: column; gap: 4pt;
}
.resume-header a { color: inherit; }
.header-name-block { display: flex; align-items: center; gap: var(--resume-column-gap); }
.header-picture {
  width: 64px; height: 64px; object-fit: cover;
  border-radius: 50%; border: 2pt solid var(--resume-background);
  flex-shrink: 0;
}
.header-name {
  font-family: var(--resume-font-heading, inherit);
  font-size: calc(var(--resume-size-heading, 14pt) * 1.5);
  font-weight: var(--resume-weight-heading, 600);
  line-height: 1.2;
}
.contact-list {
  display: flex; flex-wrap: wrap;
  gap: 2pt var(--resume-column-gap);
  font-size: var(--resume-size-body);
}
```

- [ ] **Step 6: Create scizor source files**

`packages/pdf/src/templates/scizor/html/template.json`:
```json
{
  "id": "scizor",
  "name": "Scizor",
  "sidebarPosition": "none",
  "tags": ["Minimal", "Timeline"],
  "fonts": [],
  "typography": []
}
```

`packages/pdf/src/templates/scizor/html/sections/header.html` — same as onyx header.

`packages/pdf/src/templates/scizor/html/index.html` — copy onyx's index.html with this addition to the CSS:
```css
/* ── Scizor: left timeline accent line on sections ── */
.resume-section {
  padding-left: 8pt;
  border-left: 2pt solid var(--resume-primary);
}
.section-title {
  font-family: var(--resume-font-heading, inherit);
  font-size: var(--resume-size-heading);
  font-weight: var(--resume-weight-heading);
  color: var(--resume-primary);
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 3pt;
}
```

- [ ] **Step 7: Build all six**

```bash
pnpm --filter @reactive-resume/pdf build:rxt
```

Expected: 7 lines printed (onyx + 6 new).

- [ ] **Step 8: Commit**

```bash
git add packages/pdf/src/templates/bronzor/ packages/pdf/src/templates/bronzor.rxt
git add packages/pdf/src/templates/kakuna/ packages/pdf/src/templates/kakuna.rxt
git add packages/pdf/src/templates/lapras/ packages/pdf/src/templates/lapras.rxt
git add packages/pdf/src/templates/meowth/ packages/pdf/src/templates/meowth.rxt
git add packages/pdf/src/templates/rhyhorn/ packages/pdf/src/templates/rhyhorn.rxt
git add packages/pdf/src/templates/scizor/ packages/pdf/src/templates/scizor.rxt
git commit -m "feat(pdf): add bronzor, kakuna, lapras, meowth, rhyhorn, scizor .rxt templates (full-width)"
```

---

## Task 6: Two-column left-sidebar templates (azurill, ditto, ditgar, gengar, glalie, pikachu)

These six use CSS grid with sidebar on the **left**. `sidebarPosition: "left"` — the CSS vars injected by `buildInjectedStyles` provide `--resume-sidebar-grid-areas: "sidebar main"` and `--resume-sidebar-grid-columns: var(--resume-sidebar-width) 1fr`.

The `index.html` for all six uses this shared two-column layout structure. Only the header and accent CSS differ.

**Reference `index.html` for all left-sidebar templates** (the `<style>` block to use in all six):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
/* ── Base (same as onyx) ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--resume-font-body, "IBM Plex Serif", serif);
  font-size: var(--resume-size-body, 10pt);
  font-weight: var(--resume-weight-body, 400);
  line-height: var(--resume-line-height-body, 1.5);
  color: var(--resume-foreground, #000);
  background: var(--resume-background, #fff);
}
a { color: inherit; text-decoration: none; }
strong, b { font-weight: var(--resume-weight-heading, 600); }

/* ── Page: no padding on body; each column handles its own ── */
.page-layout {
  display: grid;
  grid-template-areas: var(--resume-sidebar-grid-areas, "sidebar main");
  grid-template-columns: var(--resume-sidebar-grid-columns, var(--resume-sidebar-width, 35%) 1fr);
  min-height: 100vh;
}
.sidebar-column {
  grid-area: sidebar;
  background: var(--resume-primary, #c00);
  color: var(--resume-background, #fff);
  padding: var(--resume-page-padding-y, 12pt) var(--resume-page-padding-x, 14pt);
  display: flex; flex-direction: column; gap: var(--resume-section-gap, 6pt);
}
.sidebar-column a { color: inherit; }
.main-column {
  grid-area: main;
  padding: var(--resume-page-padding-y, 12pt) var(--resume-page-padding-x, 14pt);
  display: flex; flex-direction: column; gap: var(--resume-section-gap, 6pt);
}

/* ── Sections ── */
.resume-section { display: flex; flex-direction: column; gap: 3pt; }
.section-title {
  font-family: var(--resume-font-heading, inherit);
  font-size: var(--resume-size-heading, 14pt);
  font-weight: var(--resume-weight-heading, 600);
  border-bottom: 1pt solid currentColor;
  padding-bottom: 1pt;
  margin-bottom: 2pt;
}
/* Sidebar sections: title in background color */
.sidebar-column .section-title { color: var(--resume-background, #fff); opacity: 0.9; }
/* Main sections: title in primary */
.main-column .section-title { color: var(--resume-primary, #c00); }

/* ── Section items ── */
.section-items {
  display: grid;
  grid-template-columns: repeat(var(--section-columns, 1), 1fr);
  gap: calc(var(--resume-section-gap) * 0.5) var(--resume-column-gap, 4pt);
}
.section-item { display: flex; flex-direction: column; gap: 1pt; }
.item-header { display: flex; flex-direction: column; gap: 1pt; }
.item-title { font-weight: var(--resume-weight-heading, 600); }
.item-title-link { text-decoration: underline; }
.split-row {
  display: flex; justify-content: space-between;
  align-items: flex-start; gap: 4pt; flex-wrap: wrap;
}
.align-right { text-align: right; flex-shrink: 1; min-width: 0; }
.small { font-size: 0.875em; }
.item-website { font-size: 0.875em; text-decoration: underline; }
.keywords { opacity: 0.75; }
.rich-text p { margin-bottom: 0.2em; }
.rich-text p:last-child { margin-bottom: 0; }
.rich-text ul, .rich-text ol { padding-left: 1.25em; }
.rich-text li { margin-bottom: 0.1em; }
.level-dots { display: flex; gap: 3pt; align-items: center; margin-top: 1pt; }
.level-dot {
  width: 0.55em; height: 0.55em; border-radius: 50%;
  border: 1pt solid var(--resume-background, #fff);
}
.level-dot.filled { background: var(--resume-background, #fff); }
.main-column .level-dot { border-color: var(--resume-primary, #c00); }
.main-column .level-dot.filled { background: var(--resume-primary, #c00); }
.experience-role { display: flex; flex-direction: column; gap: 1pt; padding-left: 6pt; }

/* ── TEMPLATE-SPECIFIC HEADER CSS (overridden per template below) ── */
.resume-header {
  grid-column: 1 / -1;
  display: flex; align-items: center; gap: var(--resume-column-gap);
  padding: var(--resume-page-padding-y) var(--resume-page-padding-x);
  background: var(--resume-primary);
  color: var(--resume-background);
}
.resume-header a { color: inherit; }
.header-picture {
  width: 64px; height: 64px; object-fit: cover;
  border-radius: 50%; border: 2pt solid var(--resume-background);
  flex-shrink: 0;
}
.header-identity { flex: 1; display: flex; flex-direction: column; gap: 2pt; }
.header-name {
  font-family: var(--resume-font-heading, inherit);
  font-size: calc(var(--resume-size-heading, 14pt) * 1.5);
  font-weight: var(--resume-weight-heading, 600);
  line-height: 1.2;
}
.header-headline { opacity: 0.9; }
.contact-list { display: flex; flex-wrap: wrap; gap: 2pt var(--resume-column-gap); }
.contact-item { display: flex; align-items: center; gap: 3pt; font-size: var(--resume-size-body); }
</style>
</head>
<body>
<div class="page-layout">
  {% include "sections/header.html" %}
  {% for page in metadata.layout.pages %}
  {% if not page.fullWidth %}
  <div class="sidebar-column">
    {% for sectionId in page.sidebar %}
      {% include "sections/" + sectionId + ".html" ignore missing %}
    {% endfor %}
  </div>
  <div class="main-column">
    {% for sectionId in page.main %}
      {% include "sections/" + sectionId + ".html" ignore missing %}
    {% endfor %}
  </div>
  {% else %}
  <div class="main-column" style="grid-column: 1 / -1;">
    {% for sectionId in page.main %}
      {% include "sections/" + sectionId + ".html" ignore missing %}
    {% endfor %}
  </div>
  {% endif %}
  {% endfor %}
</div>
</body>
</html>
```

**Note:** The `.resume-header` has `grid-column: 1 / -1` implied by the `<div class="page-layout">` — it sits outside the loop so it spans full width only if placed before the column divs. Better structure: put the header inside `.main-column` on page 0, or use a wrapper. See per-template variations below.

- [ ] **Step 1: Create glalie (primary-color sidebar, header inside sidebar)**

`packages/pdf/src/templates/glalie/html/template.json`:
```json
{
  "id": "glalie",
  "name": "Glalie",
  "sidebarPosition": "left",
  "tags": ["Two-column", "Bold"],
  "fonts": [],
  "typography": []
}
```

`packages/pdf/src/templates/glalie/html/sections/header.html`:
```nunjucks
{# Glalie header sits inside the sidebar column on page 0 — rendered via index.html logic #}
<div class="header-identity">
  {% if not picture.hidden and picture.url %}
  <img src="{{ picture.url }}" class="header-picture" alt="" />
  {% endif %}
  <h1 class="header-name">{{ basics.name }}</h1>
  {% if basics.headline %}<p class="header-headline">{{ basics.headline }}</p>{% endif %}
  <div class="contact-list">
    {% if basics.email %}<a href="mailto:{{ basics.email }}" class="contact-item">{{ basics.email }}</a>{% endif %}
    {% if basics.phone %}<a href="tel:{{ basics.phone }}" class="contact-item">{{ basics.phone }}</a>{% endif %}
    {% if basics.location %}<span class="contact-item">{{ basics.location }}</span>{% endif %}
    {% if basics.website.url %}<a href="{{ basics.website.url }}" class="contact-item">{{ basics.website.label or basics.website.url }}</a>{% endif %}
    {% for field in basics.customFields %}
    <span class="contact-item">{{ field.name }}: {{ field.value }}</span>
    {% endfor %}
  </div>
</div>
```

`packages/pdf/src/templates/glalie/html/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--resume-font-body, "IBM Plex Serif", serif);
  font-size: var(--resume-size-body, 10pt);
  font-weight: var(--resume-weight-body, 400);
  line-height: var(--resume-line-height-body, 1.5);
  color: var(--resume-foreground, #000);
  background: var(--resume-background, #fff);
}
a { color: inherit; text-decoration: none; }
strong, b { font-weight: var(--resume-weight-heading, 600); }

.page-layout {
  display: grid;
  grid-template-areas: var(--resume-sidebar-grid-areas, "sidebar main");
  grid-template-columns: var(--resume-sidebar-grid-columns, var(--resume-sidebar-width, 35%) 1fr);
  min-height: 100vh;
}
.sidebar-column {
  grid-area: sidebar;
  background: var(--resume-primary, #c00);
  color: var(--resume-background, #fff);
  padding: var(--resume-page-padding-y, 12pt) var(--resume-page-padding-x, 14pt);
  display: flex; flex-direction: column;
  gap: var(--resume-section-gap, 6pt);
}
.sidebar-column a { color: inherit; }
.main-column {
  grid-area: main;
  padding: var(--resume-page-padding-y, 12pt) var(--resume-page-padding-x, 14pt);
  display: flex; flex-direction: column;
  gap: var(--resume-section-gap, 6pt);
}
/* Header (inside sidebar) */
.header-picture {
  width: 80px; height: 80px; object-fit: cover;
  border-radius: 50%; border: 2pt solid var(--resume-background);
  margin-bottom: 4pt;
}
.header-identity { display: flex; flex-direction: column; gap: 3pt; }
.header-name {
  font-family: var(--resume-font-heading, inherit);
  font-size: calc(var(--resume-size-heading, 14pt) * 1.3);
  font-weight: var(--resume-weight-heading, 600);
  line-height: 1.2;
}
.header-headline { opacity: 0.9; font-size: var(--resume-size-body); }
.contact-list { display: flex; flex-direction: column; gap: 2pt; font-size: calc(var(--resume-size-body) * 0.9); }
.contact-item { display: flex; align-items: center; gap: 3pt; }
/* Sections */
.resume-section { display: flex; flex-direction: column; gap: 3pt; }
.section-title {
  font-family: var(--resume-font-heading, inherit);
  font-size: var(--resume-size-heading, 14pt);
  font-weight: var(--resume-weight-heading, 600);
  border-bottom: 1pt solid currentColor;
  padding-bottom: 1pt; margin-bottom: 2pt;
}
.sidebar-column .section-title { color: var(--resume-background, #fff); opacity: 0.9; }
.main-column .section-title { color: var(--resume-primary, #c00); }
.section-items {
  display: grid;
  grid-template-columns: repeat(var(--section-columns, 1), 1fr);
  gap: calc(var(--resume-section-gap) * 0.5) var(--resume-column-gap, 4pt);
}
.section-item { display: flex; flex-direction: column; gap: 1pt; }
.item-header { display: flex; flex-direction: column; gap: 1pt; }
.item-title { font-weight: var(--resume-weight-heading, 600); }
.item-title-link { text-decoration: underline; }
.split-row {
  display: flex; justify-content: space-between;
  align-items: flex-start; gap: 4pt; flex-wrap: wrap;
}
.align-right { text-align: right; flex-shrink: 1; min-width: 0; }
.small { font-size: 0.875em; }
.item-website { font-size: 0.875em; text-decoration: underline; }
.keywords { opacity: 0.75; }
.rich-text p { margin-bottom: 0.2em; }
.rich-text p:last-child { margin-bottom: 0; }
.rich-text ul, .rich-text ol { padding-left: 1.25em; }
.rich-text li { margin-bottom: 0.1em; }
.level-dots { display: flex; gap: 3pt; align-items: center; margin-top: 1pt; }
.level-dot {
  width: 0.55em; height: 0.55em; border-radius: 50%;
  border: 1pt solid var(--resume-background, #fff);
}
.level-dot.filled { background: var(--resume-background, #fff); }
.main-column .level-dot { border-color: var(--resume-primary, #c00); }
.main-column .level-dot.filled { background: var(--resume-primary, #c00); }
.experience-role { padding-left: 6pt; }
</style>
</head>
<body>
<div class="page-layout">
{% for page in metadata.layout.pages %}
  {% if not page.fullWidth %}
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
  {% else %}
  <div class="main-column" style="grid-column: 1 / -1;">
    {% if loop.first %}{% include "sections/header.html" %}{% endif %}
    {% for sectionId in page.main %}
      {% include "sections/" + sectionId + ".html" ignore missing %}
    {% endfor %}
  </div>
  {% endif %}
{% endfor %}
</div>
</body>
</html>
```

- [ ] **Step 2: Create azurill, ditto, ditgar, gengar, pikachu**

All five use **the same `index.html` as glalie** (copy it). Only `template.json` and header content differ slightly.

`packages/pdf/src/templates/azurill/html/template.json`:
```json
{"id":"azurill","name":"Azurill","sidebarPosition":"left","tags":["Two-column","Light"],"fonts":[],"typography":[]}
```

`packages/pdf/src/templates/ditto/html/template.json`:
```json
{"id":"ditto","name":"Ditto","sidebarPosition":"left","tags":["Two-column","Neutral"],"fonts":[],"typography":[]}
```

`packages/pdf/src/templates/ditgar/html/template.json`:
```json
{"id":"ditgar","name":"Ditgar","sidebarPosition":"left","tags":["Two-column","Bold"],"fonts":[],"typography":[]}
```

`packages/pdf/src/templates/gengar/html/template.json`:
```json
{"id":"gengar","name":"Gengar","sidebarPosition":"left","tags":["Two-column","Dark"],"fonts":[],"typography":[]}
```

`packages/pdf/src/templates/pikachu/html/template.json`:
```json
{"id":"pikachu","name":"Pikachu","sidebarPosition":"left","tags":["Two-column","Vibrant"],"fonts":[],"typography":[]}
```

For all five, create `sections/header.html` — **same content as glalie's header.html**.

For all five, create `index.html` — **copy glalie's index.html exactly**.

- [ ] **Step 3: Build**

```bash
pnpm --filter @reactive-resume/pdf build:rxt
```

Expected: 13 lines printed (7 existing + 6 new).

- [ ] **Step 4: Commit**

```bash
git add packages/pdf/src/templates/glalie/ packages/pdf/src/templates/glalie.rxt
git add packages/pdf/src/templates/azurill/ packages/pdf/src/templates/azurill.rxt
git add packages/pdf/src/templates/ditto/ packages/pdf/src/templates/ditto.rxt
git add packages/pdf/src/templates/ditgar/ packages/pdf/src/templates/ditgar.rxt
git add packages/pdf/src/templates/gengar/ packages/pdf/src/templates/gengar.rxt
git add packages/pdf/src/templates/pikachu/ packages/pdf/src/templates/pikachu.rxt
git commit -m "feat(pdf): add azurill, ditto, ditgar, gengar, glalie, pikachu .rxt templates (left sidebar)"
```

---

## Task 7: Two-column right-sidebar templates (chikorita, leafish)

Same two-column structure as Task 6 but with sidebar on the **right**. When a template declares `sidebarPosition: "right"`, `buildInjectedStyles` injects `--resume-sidebar-grid-areas: "main sidebar"` and `--resume-sidebar-grid-columns: 1fr var(--resume-sidebar-width)`.

- [ ] **Step 1: Create chikorita**

`packages/pdf/src/templates/chikorita/html/template.json`:
```json
{
  "id": "chikorita",
  "name": "Chikorita",
  "sidebarPosition": "right",
  "tags": ["Two-column", "Right sidebar"],
  "fonts": [],
  "typography": []
}
```

`packages/pdf/src/templates/chikorita/html/sections/header.html`:
```nunjucks
{# Chikorita: full-width header spanning both columns, then main left + sidebar right #}
<div class="resume-header">
  {% if not picture.hidden and picture.url %}
  <img src="{{ picture.url }}" class="header-picture" alt="" />
  {% endif %}
  <div class="header-identity">
    <h1 class="header-name">{{ basics.name }}</h1>
    {% if basics.headline %}<p class="header-headline">{{ basics.headline }}</p>{% endif %}
  </div>
  <div class="contact-list">
    {% if basics.email %}<a href="mailto:{{ basics.email }}" class="contact-item">{{ basics.email }}</a>{% endif %}
    {% if basics.phone %}<a href="tel:{{ basics.phone }}" class="contact-item">{{ basics.phone }}</a>{% endif %}
    {% if basics.location %}<span class="contact-item">{{ basics.location }}</span>{% endif %}
    {% if basics.website.url %}<a href="{{ basics.website.url }}" class="contact-item">{{ basics.website.label or basics.website.url }}</a>{% endif %}
    {% for field in basics.customFields %}
    <span class="contact-item">{{ field.name }}: {{ field.value }}</span>
    {% endfor %}
  </div>
</div>
```

`packages/pdf/src/templates/chikorita/html/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--resume-font-body, "IBM Plex Serif", serif);
  font-size: var(--resume-size-body, 10pt);
  line-height: var(--resume-line-height-body, 1.5);
  color: var(--resume-foreground, #000);
  background: var(--resume-background, #fff);
}
a { color: inherit; text-decoration: none; }
strong, b { font-weight: var(--resume-weight-heading, 600); }

/* Full-width header */
.resume-header {
  display: flex; align-items: center; gap: var(--resume-column-gap);
  padding: var(--resume-page-padding-y) var(--resume-page-padding-x);
  border-bottom: 2pt solid var(--resume-primary);
}
.header-picture {
  width: 64px; height: 64px; object-fit: cover;
  border-radius: 50%; flex-shrink: 0;
}
.header-identity { flex: 1; }
.header-name {
  font-family: var(--resume-font-heading, inherit);
  font-size: calc(var(--resume-size-heading, 14pt) * 1.5);
  font-weight: var(--resume-weight-heading, 600);
  line-height: 1.2;
}
.header-headline { opacity: 0.85; }
.contact-list { display: flex; flex-direction: column; align-items: flex-end; gap: 1pt; }
.contact-item { font-size: calc(var(--resume-size-body) * 0.9); }

/* Two-column body */
.page-layout {
  display: grid;
  grid-template-areas: var(--resume-sidebar-grid-areas, "main sidebar");
  grid-template-columns: var(--resume-sidebar-grid-columns, 1fr var(--resume-sidebar-width, 35%));
}
.main-column {
  grid-area: main;
  padding: var(--resume-page-padding-y) var(--resume-page-padding-x);
  display: flex; flex-direction: column; gap: var(--resume-section-gap, 6pt);
}
.sidebar-column {
  grid-area: sidebar;
  background: var(--resume-primary);
  color: var(--resume-background);
  padding: var(--resume-page-padding-y) var(--resume-page-padding-x);
  display: flex; flex-direction: column; gap: var(--resume-section-gap, 6pt);
}
.sidebar-column a { color: inherit; }

/* Sections */
.resume-section { display: flex; flex-direction: column; gap: 3pt; }
.section-title {
  font-family: var(--resume-font-heading, inherit);
  font-size: var(--resume-size-heading, 14pt);
  font-weight: var(--resume-weight-heading, 600);
  border-bottom: 1pt solid currentColor;
  padding-bottom: 1pt; margin-bottom: 2pt;
}
.main-column .section-title { color: var(--resume-primary); }
.sidebar-column .section-title { color: var(--resume-background); opacity: 0.9; }
.section-items {
  display: grid;
  grid-template-columns: repeat(var(--section-columns, 1), 1fr);
  gap: calc(var(--resume-section-gap) * 0.5) var(--resume-column-gap, 4pt);
}
.section-item { display: flex; flex-direction: column; gap: 1pt; }
.item-header { display: flex; flex-direction: column; gap: 1pt; }
.item-title { font-weight: var(--resume-weight-heading, 600); }
.item-title-link { text-decoration: underline; }
.split-row {
  display: flex; justify-content: space-between;
  align-items: flex-start; gap: 4pt; flex-wrap: wrap;
}
.align-right { text-align: right; flex-shrink: 1; min-width: 0; }
.small { font-size: 0.875em; }
.item-website { font-size: 0.875em; text-decoration: underline; }
.keywords { opacity: 0.75; }
.rich-text p { margin-bottom: 0.2em; }
.rich-text p:last-child { margin-bottom: 0; }
.rich-text ul, .rich-text ol { padding-left: 1.25em; }
.rich-text li { margin-bottom: 0.1em; }
.level-dots { display: flex; gap: 3pt; align-items: center; margin-top: 1pt; }
.level-dot {
  width: 0.55em; height: 0.55em; border-radius: 50%;
  border: 1pt solid var(--resume-primary);
}
.level-dot.filled { background: var(--resume-primary); }
.sidebar-column .level-dot { border-color: var(--resume-background); }
.sidebar-column .level-dot.filled { background: var(--resume-background); }
.experience-role { padding-left: 6pt; }
</style>
</head>
<body>
{% include "sections/header.html" %}
<div class="page-layout">
{% for page in metadata.layout.pages %}
  {% if not page.fullWidth %}
  <div class="main-column">
    {% for sectionId in page.main %}
      {% include "sections/" + sectionId + ".html" ignore missing %}
    {% endfor %}
  </div>
  <div class="sidebar-column">
    {% for sectionId in page.sidebar %}
      {% include "sections/" + sectionId + ".html" ignore missing %}
    {% endfor %}
  </div>
  {% else %}
  <div class="main-column" style="grid-column: 1 / -1;">
    {% for sectionId in page.main %}
      {% include "sections/" + sectionId + ".html" ignore missing %}
    {% endfor %}
  </div>
  {% endif %}
{% endfor %}
</div>
</body>
</html>
```

- [ ] **Step 2: Create leafish**

`packages/pdf/src/templates/leafish/html/template.json`:
```json
{
  "id": "leafish",
  "name": "Leafish",
  "sidebarPosition": "right",
  "tags": ["Two-column", "Right sidebar"],
  "fonts": [],
  "typography": []
}
```

`packages/pdf/src/templates/leafish/html/sections/header.html` — same as chikorita header.

`packages/pdf/src/templates/leafish/html/index.html` — copy chikorita's index.html, change `.resume-header` to:
```css
.resume-header {
  display: flex; align-items: center; gap: var(--resume-column-gap);
  padding: var(--resume-page-padding-y) var(--resume-page-padding-x);
  background: var(--resume-primary);
  color: var(--resume-background);
}
.resume-header a { color: inherit; }
.header-picture { border: 2pt solid var(--resume-background); }
.main-column .section-title { color: var(--resume-primary); }
.sidebar-column { background: var(--resume-foreground); }
.sidebar-column .section-title { color: var(--resume-primary); }
```

- [ ] **Step 3: Build**

```bash
pnpm --filter @reactive-resume/pdf build:rxt
```

Expected: 15 lines printed.

- [ ] **Step 4: Commit**

```bash
git add packages/pdf/src/templates/chikorita/ packages/pdf/src/templates/chikorita.rxt
git add packages/pdf/src/templates/leafish/ packages/pdf/src/templates/leafish.rxt
git commit -m "feat(pdf): add chikorita, leafish .rxt templates (right sidebar) — all 15 templates migrated"
```

---

## Task 8: Integration smoke test — seeder seeds all 15

- [ ] **Step 1: Start Postgres**

```bash
sudo docker compose -f compose.dev.yml up -d postgres
```

- [ ] **Step 2: Start the dev server and watch the startup log**

```bash
dotenvx run -f .env.local -- pnpm dev 2>&1 | grep -E "Seed Templates|✓|✗" | head -30
```

Expected output:
```
[Seed Templates] Seeding 15 built-in template(s)...
[Seed Templates] ✓ azurill
[Seed Templates] ✓ bronzor
[Seed Templates] ✓ chikorita
...
[Seed Templates] ✓ scizor
[Seed Templates] Done.
```

No `✗` lines.

- [ ] **Step 3: Query the DB to confirm 15 rows**

```bash
dotenvx run -f .env.local -- node --input-type=module <<'EOF'
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { template } from "./packages/db/src/schema/index.ts";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });
const rows = await db.select({ id: template.id, name: template.name }).from(template);
console.log(rows.map(r => r.id).join(", "));
await pool.end();
EOF
```

Expected: all 15 template IDs printed.

- [ ] **Step 4: Commit (if any fix was needed during smoke test)**

```bash
git add -A
git commit -m "fix(pdf): smoke test fixes for seeder / .rxt archives"
```

---

## Task 9: Remove React PDF re-export from server.ts

The `packages/pdf/src/server.ts` currently re-exports `createResumePdfFile` from `server.tsx`. Once all 15 templates are in the DB, the active PDF endpoint uses `generatePdfFromTemplate` (Puppeteer) and the React PDF fallback is no longer needed.

- [ ] **Step 1: Check that `createResumePdfFile` is no longer imported anywhere outside packages/pdf**

```bash
grep -r "createResumePdfFile" /Users/shqear/workspace/reactive-resume --include="*.ts" --include="*.tsx" -l | grep -v "packages/pdf"
```

If the grep returns results, those callers need to be migrated to `generatePdfFromTemplate` before proceeding.

- [ ] **Step 2: Remove the re-export from `packages/pdf/src/server.ts`**

Remove this line from `packages/pdf/src/server.ts`:
```typescript
// Remove:
export { createResumePdfFile } from "./server.tsx";
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @reactive-resume/pdf typecheck
pnpm --filter @reactive-resume/api typecheck
pnpm --filter web typecheck
```

Fix any type errors that emerge.

- [ ] **Step 4: Commit**

```bash
git add packages/pdf/src/server.ts
git commit -m "feat(pdf): remove React PDF createResumePdfFile re-export — Puppeteer is the sole PDF generator"
```

---

## Self-Review

**Spec coverage check:**
- ✅ All 15 templates get `.rxt` archives
- ✅ Startup seeder auto-discovers and upserts them
- ✅ Build tooling (`build:rxt`) zips source + shared macros per template
- ✅ Shared macros cover all 13 section types + custom section dispatch
- ✅ Two layout patterns implemented: full-width (7 templates) and two-column (8 templates)
- ✅ React PDF re-export removed

**Open items (deferred to Phase 8):**
- Visual fidelity improvement — the HTML templates use clean CSS but are not pixel-perfect matches to the React PDF output. Phase 8 can refine per-template CSS.
- `@react-pdf/renderer` dependency removal from `packages/pdf/package.json` — only safe after confirming no production code path reaches `server.tsx`. Check with `grep -r "@react-pdf/renderer"` and remove the dep when the import count reaches 0.
- Preview images — the DB schema has a `previewImage` column. Phase 7 doesn't generate preview PNGs; they can be Puppeteer screenshots added in Phase 8.
