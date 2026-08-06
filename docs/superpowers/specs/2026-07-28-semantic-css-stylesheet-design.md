# Semantic CSS Stylesheet Design

## Status

Draft for user review. The product behavior in this document has been approved conversationally; the written
architecture still requires review before implementation planning.

## Context

Reactive Resume renders its templates with React PDF rather than browser HTML. React PDF accepts style objects on a
known component tree and supports a broad CSS-like property set, but it does not provide a browser DOM or a general
selector engine.

The current customization system stores constrained rules in `metadata.styleRules`. Each rule targets all sections, a
section type, or a section ID and applies an intent to one semantic slot. That design is safe and portable, but its form
UI is cumbersome to reproduce or share, and its target model cannot reach headers, individual items or fields, page
regions, or template-specific visual parts.

Semantic CSS replaces the form with a familiar text language. It retains typed compilation and semantic targets rather
than promising that arbitrary browser CSS can run inside React PDF.

## Goals

- Provide one copy-pastable text stylesheet for all PDF-specific visual customization.
- Keep Design, Typography, Layout, Page, and Picture controls as base settings.
- Let the stylesheet override those base visuals wherever an exposed semantic PDF node permits it.
- Target all sections, groups of section types, one section, one item, one field, structural regions, header content,
  rich text, and documented template-specific parts.
- Support portable theme rules and optional resume-specific rules based on stable IDs.
- Support nearly all style properties that the pinned React PDF renderer can safely implement.
- Preserve invalid user text while rendering the last valid stylesheet.
- Produce identical behavior in browser preview, browser export, public PDF views, and server PDF export.
- Convert existing structured style rules without changing their rendered appearance.

## Non-goals

- The stylesheet does not edit resume content or mutate builder layout metadata.
- The stylesheet does not apply to DOCX or Markdown exports.
- It does not expose a browser DOM, JavaScript, arbitrary renderer objects, or executable expressions.
- It does not support animations, transitions, interactive pseudo-classes, CSS Grid, generated content, or browser-only
  properties.
- It does not load fonts, images, imports, or any other remote or embedded asset.
- Font-family selection remains owned by the Typography section.
- Picture source, upload, crop, and visibility data remain owned by the Picture section. The rendered picture node can
  still be sized, positioned, transformed, or hidden by the stylesheet.

## Product Model

The existing visual controls remain the base layer. Semantic CSS is the final author-controlled layer:

1. Builder visual settings and template defaults.
2. Template-specific computed styles.
3. Semantic CSS declarations.
4. Minimal crash-prevention invariants.

The stylesheet may visually hide, reorder, resize, or position existing output. These changes affect only PDF
presentation. They do not rewrite content, section ordering, page assignments, or other builder data.

## Persisted Data

Resume metadata gains a versioned stylesheet value:

```ts
type StylesheetSource = {
	languageVersion: number;
	text: string;
};

type SemanticStylesheet = {
	mode: "legacy" | "semantic";
	source: StylesheetSource;
	applied: StylesheetSource;
};

type StylesheetMutationState = {
	revision: number;
	stylesheet: SemanticStylesheet;
};
```

- `source.text` is the exact editable text and may be invalid.
- `applied.text` is the most recent valid text and is the only text used for rendering.
- Each value carries its own `languageVersion`, allowing an invalid source written for a future language version to
  preserve and render an older valid program.
- `mode` is the persisted rendering discriminator. A missing stylesheet is interpreted as `legacy`.
- `revision` is server-owned concurrency metadata, not resume content. It is stored in a dedicated database column and
  returned only in the stylesheet mutation envelope.

The compiled AST or intermediate representation is not persisted. Browser and server compilation is a pure operation
cached by language version, source hash, compiler build, semantic registry fingerprint, and PDF adapter fingerprint.
Caches are bounded and process-local; they are never treated as durable state.

Stylesheet state is owned by a dedicated authenticated mutation rather than the existing full-document autosave
mutation. It accepts an expected stylesheet revision and resume render-data version. The generic `resume.update` path
must preserve the database's stylesheet value instead of replacing it from submitted resume data. This preservation
behavior must deploy before clients can send Semantic CSS data.

Compilation and PDF preflight never run while holding a database lock. The mutation reads an immutable resume snapshot,
compiles and preflights against that snapshot, then performs a short transaction that compare-and-swaps both the
stylesheet revision and resume render-data version. If either changed, it returns a conflict without writing; the client
rebases its unsaved source onto the new snapshot and retries. This prevents promotion against content or base settings
that differ from those preflighted.

The server defines separate state transitions. A source can replace `applied` only after compilation and a bounded PDF
render preflight against the current resume succeed:

- **Edit source:** ignore client-applied text. Store the candidate in `source`. In semantic mode, also store it in
  `applied` only when compilation and preflight succeed; otherwise preserve the row's current `applied`. In legacy mode,
  edits remain an inactive draft.
- **Activate converted source:** require successful compilation, set `mode` to `semantic`, and store the candidate in
  both source values after preflight. This requires an explicit **Activate Semantic CSS** action. Merely opening,
  editing, or autosaving a legacy draft does not activate it.
- **Editor undo or redo:** independently compile the historical applied value carried by the local history entry, then
  preflight it and atomically restore the historical source/applied pair. Reject the transition if the applied value is
  invalid.
- **Import:** compile imported source. If it is invalid, independently validate the imported applied value and retain it
  only after preflight; otherwise use an empty supported applied source.
- **Duplicate:** copy the server-owned stylesheet content while initializing a fresh concurrency revision for the new
  resume.
- **Restore version:** restore the server-owned source/applied pair from the selected snapshot after validating the
  applied value with its versioned compiler and preflight.

Every successful transition increments `revision` and returns the canonical state plus diagnostics. Worker jobs and
network requests carry the local edit generation and expected revision. The client serializes stylesheet mutations:
only one request is in flight, and later edits replace one queued candidate. Every acknowledgement advances the local
revision; its source/applied payload updates editor state only when its generation is still current. The queued candidate
then submits with the acknowledged revision. Warnings do not block application.

Concurrency revisions are excluded from JSON export and version snapshots. Import and duplicate initialize a fresh
revision; version restore increments the current resume's revision rather than restoring historical concurrency
metadata.

## Compiler Architecture

The compiler is a universal, environment-neutral package used by the web app, API, and PDF renderer:

```text
source
  -> CSS tokenizer/parser
  -> syntax AST
  -> restricted-language validation
  -> selector and value compilation
  -> versioned StyleProgram + diagnostics
```

`StyleProgram` contains normalized selectors, declaration values, source locations, specificity, media conditions, and
structural directives. It contains no React or React PDF values. A PDF adapter translates resolved declarations into
React PDF styles and primitive props.

The parser should use a standards-compatible CSS parser rather than a hand-written partial tokenizer. Semantic CSS
validation sits on top of that parser and rejects unsupported CSS constructs explicitly.

Compilation and selector matching must remain deterministic. Diagnostics include severity, code, message, and exact
source range.

Source compilation reports syntax and language-contract diagnostics without needing a resume. A separate semantic
analysis pass evaluates a compiled program against the current resume's virtual tree and reports context-dependent
warnings such as valid selectors that match no node. Both passes use shared diagnostic types and codes.

Language versions are positive integers. A compiler implementation for a released version is immutable. Unsupported
source versions are preserved as opaque editable text but cannot replace `applied`; rendering continues with the
supported applied version or base styles when no supported applied value exists.

Every compiler version referenced by persisted `applied` data remains available. A compiler can be retired only after a
transactional migration recompiles and preflights every affected applied stylesheet with a newer version and no stored
resume references the old version.

## Virtual Semantic Tree

Selectors match a versioned, immutable virtual resume tree, not React component names:

```text
resume
  page
    region
      header
        picture
        name
        headline
        contact-list
          contact-item
      section
        section-heading
        section-items
          item
            item-header
            field
            link
            icon
            level
            rich-text
              paragraph
              list
                list-item
                  list-marker
```

Template-owned chrome is exposed as `template-part` nodes. Every part name must be registered, documented, and stable.
Examples include `timeline-line`, `timeline-dot`, `featured-summary`, `sidebar-background`, and
`item-header-border`.

Each node carries only documented semantic attributes, including the applicable subset of:

- `id`: stable section or item ID.
- `type`: canonical section type.
- `name`: field, contact, or template-part name.
- `template`: selected template on the root.
- `placement`: `main` or `sidebar`.
- `region`: `header`, `main`, `sidebar`, `featured`, or another registered region.
- `page-number`: one-based layout page number.
- `role`: one or more stable roles such as `primary-text`, `secondary-text`, or `structured-link`.

Custom classes are not supported because resume data has no class-authoring surface. Groups are expressed through
selector lists, attributes, `:is()`, and `:where()`.

All shared primitives and all 15 templates must register their semantic nodes before Semantic CSS becomes the default.
Known semantic nodes that are absent from the current template are valid no-ops and produce warnings.

The normative node contract is:

```ts
type SemanticNode = {
	key: string;
	kind: SemanticNodeKind;
	id?: string;
	attributes: Readonly<Record<string, string>>;
	roles: readonly string[];
	children: readonly SemanticNode[];
};
```

Each template builds one authoritative descriptor tree from `ResumeData`, template configuration, normalized rich-text
content, and the typed semantic registries. Selector matching, context-dependent diagnostics, inheritance, structural
resolution, and React rendering all consume that same tree. React components must not create unregistered semantic
children independently.

The registries normatively define allowed parentage, cardinality, field names, role names, stable keys, and
template-part placement. Experience roles, custom fields, rich-text nodes, featured summaries, and template-specific
header structures are explicitly represented rather than inferred from React children.

## Selector Language

Semantic CSS supports:

- Type selectors and the universal selector.
- ID and attribute selectors.
- Selector lists separated by commas.
- Descendant, child, adjacent-sibling, and general-sibling combinators.
- `:is()`, `:where()`, and `:not()`.
- Static structural pseudo-classes such as `:first-child`, `:last-child`, `:only-child`, `:nth-child()`, and
  `:nth-of-type()`.

Interactive or browser-state pseudo-classes are errors.

`SemanticNode.id` is reflected to both `#id` and `[id="…"]`. `roles` is reflected as a space-separated `role`
attribute and matched with `[role~="token"]`. Other entries in `attributes` are exposed by their registered names.
Presence, `=`, `~=`, `|=`, `^=`, `$=`, and `*=` attribute operators are supported. Semantic element, attribute, role,
and registered keyword names are lowercase and ASCII case-sensitive. Values and IDs are case-sensitive. Selectors use
standard CSS escaping; quoted `[id="…"]` is the recommended syntax for UUIDs that would require identifier escapes.

Examples:

```css
:root {
  --accent: #2563eb;
  --compact-gap: 4pt;
}

section:is([type="experience"], [type="education"]) {
  margin-bottom: 8pt;
}

section#experience > section-heading {
  color: var(--accent);
  text-transform: uppercase;
}

region[placement="sidebar"] section,
section#skills {
  background-color: rgba(20, 30, 40, 0.08);
}

item[id="f27be2d2-13a9-4f16-8248-c8735a27dd1c"] field[name="period"] {
  opacity: 0.7;
}

resume[template="azurill"] template-part[name="timeline-dot"] {
  background-color: var(--accent);
}
```

Portable styles should prefer section types, roles, placements, regions, and template attributes. Exact section and item
IDs are available when a rule intentionally belongs to one resume.

## Cascade and Inheritance

Semantic CSS follows familiar author-style cascade rules:

- `!important` declarations outrank normal declarations.
- Specificity compares IDs, then attributes and pseudo-classes, then element names.
- `:where()` contributes zero specificity.
- Equal specificity is resolved by source order.
- Custom properties cascade and inherit.
- Cyclic or unresolved variables are errors unless a valid fallback exists.

Only properties marked inheritable in the property registry inherit through the semantic tree. Box and layout
properties never inherit implicitly. The language supports `inherit`, `initial`, `unset`, and `revert`; `revert`
removes the winning Semantic CSS declaration at that node and exposes its builder/template base value. If the property
is inheritable and the semantic parent has a computed Semantic CSS value, normal inheritance can still supply that
parent value. `initial` uses the property registry's initial value, `inherit` uses the semantic parent's computed value,
and `unset` chooses `inherit` for inheritable properties and `initial` otherwise. `revert-layer` is unsupported.

Declarations are resolved after template styles. Existing cosmetic safety defaults such as text shrinking must move
below the stylesheet in precedence. Only constraints required to prevent renderer failure may remain above user
declarations, and each such constraint must be documented.

Resolution uses one immutable source-tree snapshot:

1. Match all selectors against original parentage and sibling order.
2. Calculate selector specificity according to CSS rules: `:is()` and `:not()` take their most specific argument,
   while `:where()` has zero specificity.
3. Cascade declarations and custom properties, then calculate inherited values.
4. Resolve structural declarations once.
5. Omit `display: none` subtrees and stable-sort remaining siblings by `order`, using original sibling order for ties.
6. Render the resolved tree.

Hidden and reordered nodes never change which selectors match, positional pseudo-classes, sibling combinators, or
inheritance. Structural declarations cannot trigger a second selector pass.

## Properties, Values, and Units

The property registry exposes the applicable React PDF surface under familiar kebab-case names:

- Flexbox layout, including gaps and `order`.
- Width, height, minimum and maximum dimensions.
- Relative and absolute positioning, overflow, stacking, and display.
- Color, background color, and opacity.
- Text size, weight, style, line height, spacing, alignment, decoration, transform, indentation, overflow, and line
  limits.
- Margins, padding, borders, radii, and supported transforms.
- Supported image sizing and object-fit behavior on the existing picture node.

`font-family` is rejected. Asset-bearing properties and functions such as `background-image`, `src`, and `url()` are
rejected.

Common shorthands such as `margin`, `padding`, `border`, `gap`, `flex`, and `transform` compile into normalized values.
Supported units are `pt`, `in`, `mm`, `cm`, `%`, `vw`, `vh`, `em`, and `rem`. Unitless PDF dimensions are interpreted
as points. `px` is accepted for familiarity and converted from 96 DPI to 72-DPI PDF points.

`rem` resolves against the root body font size from Typography. For `font-size`, `em` resolves against the semantic
parent's computed font size. For all other properties, it resolves against the target node's computed font size.
Relative-unit cycles are errors.

Media queries use standard syntax and support page width, page height, and orientation:

```css
@media (max-width: 500pt) {
  region[placement="sidebar"] {
    width: 30%;
  }
}
```

Page and pagination behavior uses standard properties where possible and namespaced extensions where React PDF exposes
primitive props rather than style properties:

```css
section[type="experience"] {
  break-inside: avoid;
  -resume-min-presence-ahead: 24pt;
}

page {
  size: A4;
}

header {
  -resume-fixed: true;
}
```

Supported structural declarations include:

- `display: none` to omit a semantic node.
- `order` to reorder siblings before React rendering.
- `break-before: page`.
- `break-inside: avoid`.
- `orphans` and `widows`.
- `-resume-fixed`.
- `-resume-min-presence-ahead`.
- `size` on page nodes.

Structural declarations are resolved while preparing semantic child descriptors, before the React component tree is
created. CSS cannot move a node to a different parent; absolute positioning can only change its visual placement.

`page-number` identifies the one-based authored `metadata.layout.pages` entry. React PDF may wrap one authored page into
multiple physical subpages; those physical subpages are not independently selectable. They inherit the authored page
context, and fixed nodes repeat on physical subpages created from that authored page.

Page sizing is evaluated in a non-circular phase. Non-media `size` declarations resolve first against builder defaults.
Media conditions then evaluate against that final authored page size. `size` inside `@media` is an error.

Values must be finite. Very large, negative, or overlap-prone values produce warnings rather than cosmetic clamping.
Hard technical limits exist only to prevent crashes, pathological allocations, or denial of service.

## Editor Experience

The Custom Styles right-sidebar section becomes a monospaced stylesheet editor. It also offers an expanded mode with
more editing space while retaining the live preview.

Editor capabilities include:

- CSS syntax highlighting.
- Line and column diagnostics with error and warning severity.
- Selector, attribute, property, keyword, and variable completion.
- Hover documentation generated from semantic and property registries.
- Color previews.
- Search and replace.
- Explicit formatting.
- Standard copy and paste.
- A clear applied state.

The editor preserves source text and formatting exactly unless the user explicitly formats it.

Compilation runs after a short debounce in a web worker. The status must distinguish:

- `Applied`.
- Applied with warnings.
- Errors, with an explicit message that preview and export use the last valid version.

The editor maintains source state separately from full-resume autosave. It runs a browser render preflight for a
compiled candidate and sends serialized, debounced, revisioned stylesheet mutations. It always consumes response
revisions, but replaces visible source/applied state only for the current edit generation. Existing coalesced undo and
redo behavior includes both stylesheet values and uses the explicit restore transition, so undo restores matching text
and rendered output.

## Diagnostics

Errors prevent a new source from becoming applied:

- Invalid CSS syntax.
- Unknown semantic element or attribute.
- Unknown or unsupported property.
- Invalid value, unit, selector, pseudo-class, at-rule, or variable cycle.
- Disallowed font or asset access.
- Exceeded source, rule, nesting, or selector-complexity limit.

Warnings do not prevent application:

- A known selector matches no node in the current resume or template.
- A property is valid but ineffective on the selected semantic node.
- An extreme value is likely to cause overlap, clipping, or unreadable output.

The server returns compiler diagnostics for save responses. Browser diagnostics remain immediate and use the same
compiler, semantic analyzer, and diagnostic codes.

Editable source, source locations, comments, and diagnostics are owner-only data. Public resume responses exclude both
stylesheet source values. They contain a fully resolved projection:

```ts
type PublicStyleProjection = {
	formatVersion: 1;
	languageVersion: number;
	semanticTreeVersion: number;
	registryFingerprint: string;
	adapterFingerprint: string;
	renderDataHash: string;
	nodes: Readonly<Record<string, ResolvedPdfNodeStyle>>;
};
```

The server builds this projection from the applied program and authoritative semantic tree. It contains final
declarations and structural props keyed by stable node key, with variables already resolved and comments, variable
names, selectors, source spans, and diagnostics removed. The public browser accepts it only when all versions,
fingerprints, and render-data hash match.

`renderDataHash` is SHA-256 over a domain-separated, RFC 8785 JSON Canonicalization Scheme serialization of the complete
public render input and resolved node projection. The domain includes the projection format version. It excludes
owner-only metadata and both stylesheet source values. The browser recomputes the hash before accepting the projection.
On mismatch it requests a fresh projection or falls back to the server-rendered PDF. That fallback uses the existing
public-resume visibility/password policy and public rendering rate limits; it is not an authorization bypass. Server PDF
export compiles the database's applied value directly.

## Legacy Migration

`metadata.styleRules` remains readable during compatibility rollout.

If a resume has legacy rules but no active Semantic CSS value:

1. Existing PDF rendering continues to use legacy rules.
2. Opening Custom Styles deterministically converts the rules into Semantic CSS.
3. The generated source preserves target specificity and array order.
4. Camel-case intent properties become kebab-case CSS declarations.
5. Numeric dimensions become explicit point values.
6. Rule labels become comments.
7. Disabled rules become clearly labeled commented blocks.
8. Draft autosave keeps legacy rendering active.
9. The user compares the converted preview and explicitly selects **Activate Semantic CSS**; active stylesheet
   rendering then takes precedence.

Legacy target and slot mappings compile to equivalent semantic selectors and roles. For example:

```css
/* Experience heading */
section[type="experience"] > section-heading {
  font-size: 20pt;
}
```

Conversion is behavioral rather than a blind property rename. It evaluates each rule through the legacy resolver,
including specificity, numeric clamps, link-decoration ordering, bold/template precedence, icon-size translation, and
known template exceptions. The serializer emits the effective stylesheet deltas needed to preserve the current
resume's rendered appearance. It retains portable original scopes where behavior is equivalent and emits
resume-specific role or ID exceptions where legacy composition requires them.

Labels, IDs, attribute values, comments, strings, and comment terminators are escaped through one CSS serializer. Legacy
declarations that had no rendered effect remain non-applying and are explained in generated comments rather than
silently gaining new behavior.

Visual parity is guaranteed at activation for the current resume data, template, and builder base settings. Subsequent
template or base-setting changes follow Semantic CSS behavior; they are not guaranteed to reproduce how the retired
legacy resolver would have reacted.

Legacy rules remain as read-only rollback data during the flagged compatibility phase. Old Reactive Resume JSON imports
continue to parse them. New exports include the complete versioned stylesheet value. Copying from the editor copies only
the editable `source`.

No bulk database migration is required.

The server-owned stylesheet revision requires a normal DDL migration that adds a revision column with a zero default.
The statement above means no bulk backfill or rewrite of existing resume JSONB rows is required.

## Security and Resource Limits

Semantic CSS is declarative and cannot execute code or fetch resources.

The compiler enforces bounded:

- Source length.
- Rule and declaration count.
- Selector length and combinator count.
- Functional pseudo-class nesting.
- Variable expansion depth.
- Media-query nesting.

Compiler caches are bounded by count and total memory. Browser compilation runs in a worker. Server compilation uses the
same limits before rendering or persistence. Unsupported language versions are rejected explicitly rather than silently
interpreted by a newer grammar.

The renderer-versioned property registry defines every property's value grammar, shorthand expansion, inheritance,
allowed primitive kinds, relative-unit behavior, and hard technical bounds. Validation runs again after variable and
shorthand expansion, so banned asset functions cannot be hidden inside either construct.

PDF generation additionally enforces maximum authored page dimensions, maximum output pages, render timeout, and memory
budgets. Candidate promotion performs this bounded render preflight before replacing `applied`. A preflight failure
saves the editable source, preserves the previous applied value, and returns a controlled diagnostic. Later renderer
failures caused by subsequent content changes return a controlled preview/export error but do not silently mutate
stylesheet history.

## Documentation Registry

Semantic element names, attributes, template-part names, properties, values, inheritance behavior, and supported node
types come from typed registries. The editor completion data, user documentation, compiler validation, and template
coverage tests are generated from these registries.

This makes undocumented template internals unreachable and prevents documentation from drifting away from runtime
behavior.

## Testing Strategy

### Compiler

- Golden lexer and parser fixtures for valid and invalid source.
- Selector matching, specificity, source order, `!important`, inheritance, variables, resets, shorthands, units, and
  media queries.
- Structural directive resolution.
- Exact source-range diagnostics.
- Property-registry exhaustiveness against supported PDF adapter types.
- Fuzz and resource-limit tests proving malformed text cannot crash or hang compilation.

### Schema and persistence

- Revision compare-and-swap rejects stale concurrent saves.
- Preflight occurs outside database locks, followed by a short CAS on both stylesheet revision and resume render-data
  version.
- Serialized mutations consume stale acknowledgements for revision advancement without replacing newer editor state.
- Out-of-order worker results cannot replace newer editor state.
- Valid source edits replace both stylesheet values.
- Invalid source edits are stored while the current applied value is preserved.
- Compile-valid but render-failing source is stored without replacing the current applied value.
- Editor undo/redo restores historical invalid source with its historical valid applied value.
- Generic full-resume updates preserve the server-owned stylesheet.
- Clients cannot forge `applied` through normal edit transitions.
- Imports with invalid source retain text and independently validate the imported applied value.
- Duplicate and version restore preserve valid source/applied pairs.
- Public DTOs redact source, comments, diagnostics, and source locations.
- Public projections reject registry, tree, adapter, or render-data-hash mismatches and use the defined fallback.
- Public render hashes use the canonical, domain-separated contract, and fallback rendering preserves public/password
  authorization and rate limiting.
- Backend-first rolling deployment preserves stylesheet fields when old clients submit full resume data.
- Undo, redo, JSON import, JSON export, duplication, and version restore preserve stylesheet state.
- Legacy conversion preserves effective output across precedence quirks, clamps, template exceptions, and supported
  intent properties.

### PDF rendering

- Shared semantic primitives receive correct ancestry and attributes.
- Header, picture, contacts, pages, regions, sections, items, fields, rich text, and template parts resolve styles.
- Structural hiding and ordering occur before rendering.
- Positional selectors and inheritance remain based on the immutable source tree after hiding and ordering.
- Authored-page selectors, wrapped physical subpages, fixed nodes, page size, and media queries follow the defined phase
  model.
- Browser and server adapters resolve identical programs.
- Every template smoke-renders with a comprehensive stylesheet.
- Every registered node and template part has resolved-style coverage.
- All 15 templates have visual regression coverage; focused fixtures cover every unique template feature.
- Preview and exported PDF use the same applied stylesheet value.

### Web editor

- Diagnostics, completions, formatting, search, copy and paste, color previews, autosave, and expanded mode.
- Invalid edits preserve source and last-valid preview.
- Correcting invalid text applies it without losing formatting.
- Out-of-order compilation and save responses are discarded.
- Stale save acknowledgements still advance the mutation revision before the queued edit is sent.
- Revision conflicts rebase the editor without dropping unsaved source.
- Known-but-absent selectors produce warnings.
- Legacy conversion is deterministic and user-visible.

### End-to-end acceptance

One portable stylesheet is pasted into resumes using different templates. The test verifies group selectors, one
section-specific rule, one item-specific rule, a header rule, a rich-text rule, a template-part rule, a media query, and
a pagination directive. It then introduces an error, confirms that preview and export remain on the last valid version,
corrects the error, and confirms that preview and export update together.

## Rollout

1. Deploy the dormant compiler and registries, tolerant schema handling, public projection/redaction,
   generic-update field preservation, and the dedicated revisioned stylesheet mutation to the entire backend fleet.
   No client can activate Semantic CSS during this stage.
2. Introduce the legacy converter behind a disabled authoring feature flag.
3. Instrument shared PDF primitives and structural child preparation.
4. Instrument header and template-specific parts across all 15 templates.
5. Add the editor and revision/conflict behavior.
6. Run legacy and Semantic CSS rendering paths side by side in tests, without double-applying them.
7. Enable Semantic CSS for opted-in resumes while retaining legacy rollback data and monitoring compile failures,
   revision conflicts, render latency, memory, output pages, and fallback usage.
8. Enable it by default after mixed-client compatibility, public-redaction, template coverage, visual regression,
   resource-limit, and end-to-end gates pass.

The authoring flag controls editor availability and whether a rollout cohort creates new resumes in semantic mode.
Before default enablement, resumes outside that cohort start in legacy mode; after default enablement they start in
semantic mode with empty version-1 source values. Rendering always honors a persisted semantic mode even if authoring is
later disabled. A stylesheet is never applied on top of legacy rules; an active stylesheet takes sole precedence for
custom PDF styling.

## Success Criteria

- Users can copy one text block between resumes and reproduce portable PDF styling.
- Every documented semantic node and template part can be targeted consistently.
- One section or item can be targeted by stable ID without making portable selectors resume-specific.
- Invalid text is never lost and never breaks preview or export.
- Preview, public rendering, browser export, and server export agree.
- Existing custom styles retain visual parity after deterministic conversion.
- The system accepts no executable code, font choice, asset reference, or network-fetching construct.
- All 15 templates pass semantic coverage and PDF smoke tests.
