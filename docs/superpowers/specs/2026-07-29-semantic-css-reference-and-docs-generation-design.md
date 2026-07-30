# Semantic CSS Author Reference and Unified Documentation Generation

**Date:** 2026-07-29
**Status:** Approved

## Summary

Reactive Resume will provide one canonical, author-facing Semantic CSS reference at:

`https://docs.rxresu.me/guides/semantic-css-reference`

The existing `docs/guides/semantic-css-reference.mdx` page will be expanded rather than duplicated. It will combine
hand-written explanations and copy-paste examples with generated tables sourced from the runtime registries and PDF
template manifests.

The Custom Styles editor will include a compact, accessible help hint linking directly to that page.

A new root command, `pnpm docs:gen`, will replace `pnpm docs:semantic-css` and regenerate:

1. Semantic CSS reference tables.
2. The resume-builder skill schema reference.
3. The complete JSON Schema embedded in the public schema guide.
4. The checked-in OpenAPI specification.

## Audience and goals

The reference is for resume authors who write Semantic CSS in the builder. It must let an author:

- Discover what selectors, properties, values, and directives exist.
- Understand which semantic nodes and template parts can be targeted.
- Copy working examples for common customizations.
- Diagnose invalid or ineffective styles.
- Understand portability, last-valid behavior, resource limits, and unsupported syntax.

The page is a language reference, not contributor documentation. Compiler architecture, AST implementation details,
internal adapter names, and package ownership stay out of the public page.

## Canonical page structure

The reference is organized for lookup rather than linear reading.

### 1. Semantic CSS in one minute

- The `@version 1;` directive.
- One complete, portable stylesheet.
- The relationship between editable source, applied source, preview, and export.

### 2. Selector grammar

- Universal, semantic type, ID, and attribute selectors.
- Supported attribute operators.
- Descendant, child, adjacent-sibling, and general-sibling combinators.
- Selector lists.
- Supported functional and structural pseudo-classes.
- Case-sensitivity behavior.
- Explicitly unsupported selector syntax.
- Paired valid and invalid examples.

### 3. Semantic element catalog

- Generated parent and child relationships.
- Generated attributes and roles.
- Known attribute value domains.
- Portable section-type selectors versus resume-specific IDs.
- Rich-text structure, including distinct list-item row and list-item content semantics.

### 4. Cascade and values

- Specificity, source order, selector-list specificity, inheritance, and `!important`.
- Semantic CSS behavior for `initial`, `inherit`, `unset`, and `revert`.
- Author custom properties, nested `var()` fallbacks, unresolved variables, and cycles.
- Reserved read-only `--resume-*` system variables.
- Numbers, lengths, units, colors, functions, and shorthands.

### 5. Property reference

- Generated property table grouped by category.
- Applicability by semantic node.
- Inheritance.
- Accepted units and constrained keywords where authoritative metadata exists.
- Examples for text, spacing, borders, flex layout, images, transforms, and structural properties.

The generated table must not present a loose registry hint as an exhaustive value grammar. Value syntax that is
implemented by parser or cascade logic remains hand-written unless it has authoritative shared metadata.

### 6. PDF behavior

- Page sizing.
- Hiding and stable sibling ordering.
- Pagination, fixed content, minimum presence ahead, orphans, and widows.
- Media-query grammar, evaluation order, and page-dimension behavior.
- React PDF-specific layout limitations that affect authors.

### 7. Template-specific selectors

- A generated matrix for all 15 templates.
- Exact template-part names.
- Selector forms.
- Owner or placement conditions.
- Allowed semantic children.
- Portability warnings and guarded selector examples.

The matrix is generated from actual template manifests, not an independently maintained list.

### 8. Diagnostics and limits

- Stable compiler and preflight diagnostic codes.
- Severity.
- Meaning and likely corrective action.
- Source, selector, declaration, node, page, size, timeout, and memory limits.
- Last-valid preview and export behavior after an invalid edit.

### 9. Copy-paste recipes

- Restyle section headings.
- Target a section type.
- Target one section, item, or field.
- Style sidebar content by placement.
- Customize rich-text lists.
- Change authored page dimensions.
- Prevent awkward page breaks.
- Customize optional template decoration.
- Apply dimension-dependent PDF styles with `@media`.

### 10. Unsupported capabilities and portability checklist

- Unsupported selector, at-rule, layout, asset, font, script, interaction, and network capabilities.
- Guidance for keeping a stylesheet portable across templates.

## Generated documentation architecture

### Command

The root package exposes:

```bash
pnpm docs:gen
```

The existing `docs:semantic-css` command is replaced by `docs:gen`, leaving one canonical documentation-generation
entrypoint.

### Semantic CSS reference data

Generated Semantic CSS sections consume existing authoritative sources:

- Supported versions and compile limits.
- Semantic element registry.
- Property registry.
- Read-only system-variable registry.
- PDF template manifests.
- Shared compiler and preflight diagnostic catalogs.

The generator emits deterministic, marker-delimited sections into
`docs/guides/semantic-css-reference.mdx`.

Generated factual sections include:

- Semantic elements, parents, attributes, roles, and known value domains.
- Property category, applicability, inheritance, units, and constrained keywords.
- System variables.
- Per-template template parts.
- Diagnostics.
- Compile and preflight limits.

Manual prose remains outside generated markers.

### Resume JSON Schema

The generator computes the canonical Resume JSON Schema once from `resumeDataSchema` using Zod's JSON Schema
conversion.

That canonical schema drives two outputs:

1. `skills/resume-builder/references/schema.md`
   - A compact, AI-friendly Markdown reference.
   - Field hierarchy, types, required fields, constraints, and representative shapes.
   - Derived from the canonical JSON Schema rather than maintained separately.

2. `docs/guides/json-resume-schema.mdx`
   - The complete canonical JSON Schema inside a generated, marker-delimited JSON block.
   - Human-written explanation remains outside the generated block.

### OpenAPI specification

OpenAPI generation is exposed through one reusable, pure generator owned by `apps/server/src/openapi`.

- The runtime `/api/openapi/spec.json` handler calls it with `env.APP_URL`.
- A sibling server documentation-generation script calls it with `https://rxresu.me` and writes `docs/spec.json`.
- The root `docs:gen` command orchestrates the tooling generator and this server-owned OpenAPI generator.
- The checked-in output is `docs/spec.json`.
- The API version comes from the current application version.

This removes drift between runtime OpenAPI output and the checked-in documentation artifact, including stale versions
and localhost server URLs.

### Determinism and failure behavior

Generation must:

- Produce stable ordering and formatting.
- Require every expected marker.
- Fail on duplicate or missing markers.
- Fail on inconsistent template-manifest coverage.
- Avoid silently leaving a partially updated reference that appears authoritative.

The generator computes all output text before writing any target. It does not add a general transaction framework.

## Custom Styles help hint

The Semantic CSS editor's shared chrome displays this hint directly above the code editor:

> **Not sure what to write?** Browse the Semantic CSS language reference.

The link:

- Targets `https://docs.rxresu.me/guides/semantic-css-reference`.
- Opens in a new tab.
- Uses `rel="noopener noreferrer"`.
- Uses the existing `BookOpenIcon`, marked as decorative.
- Has translated visible text.
- Includes translated screen-reader text indicating that it opens in a new tab.
- Appears in both the standard desktop editor and the mobile focus sheet because both use the same editor chrome.

The implementation stays local to the stylesheet editor. It does not introduce a shared component or central URL
registry for one link.

## Documentation navigation

`docs/docs.json` lists `guides/semantic-css-reference` immediately after `guides/using-custom-styles`.

The public route is:

`https://docs.rxresu.me/guides/semantic-css-reference`

## Verification

### Generator verification

- `pnpm docs:gen` regenerates all four artifact groups.
- A non-mutating test generates into temporary files and compares them byte-for-byte with committed outputs.
- Generated output is deterministic across repeated runs.
- Every runtime template part appears in the generated template matrix.
- Cross-registry checks reject inconsistent template-part parent or child coverage.
- The generated OpenAPI document matches the shared runtime generator for the documentation URL and current version.
- Both schema Markdown targets are derived from the same canonical Resume JSON Schema.

### Example verification

- Complete copy-paste examples marked as valid compile successfully.
- Selected intentionally invalid examples produce their documented diagnostic.
- Small illustrative fragments that are not complete stylesheets are not forced through a full compiler test.

### UI verification

The stylesheet editor test verifies:

- Accessible link name.
- Exact public URL.
- New-tab target.
- `noopener noreferrer`.
- Presence in the standard editor.
- Presence in the mobile focus sheet.

### Focused gates

- Tooling tests and typecheck.
- Resume/schema tests and typechecks affected by exported metadata.
- PDF manifest/reference consistency tests and typecheck.
- API/server OpenAPI tests and typechecks.
- Web editor tests and typecheck.
- Workspace boundary check.
- Focused formatting and Markdown validation.

Chrome verification is not required.

## Out of scope

- Contributor/compiler architecture documentation.
- A second Semantic CSS reference route.
- Splitting the reference across multiple pages.
- Interactive documentation playgrounds.
- New editor completion or hover features.
- New Semantic CSS syntax or rendering behavior, except for correcting factual registry inconsistencies required to generate an
  accurate reference.
- General documentation URL centralization.

## Acceptance criteria

- The canonical reference documents every author-facing Semantic CSS selector, semantic element, property, variable, directive,
  value family, template part, diagnostic family, limit, and unsupported syntax category.
- The reference contains copy-paste examples for common author goals.
- Generated facts come from authoritative runtime metadata and have staleness coverage.
- `pnpm docs:gen` refreshes the Semantic CSS tables, both Resume JSON Schema references, and `docs/spec.json`.
- Runtime and checked-in OpenAPI output share one generator.
- The reference is visible in documentation navigation.
- The Custom Styles editor links to the exact public reference route on desktop and mobile.
- No unrelated product behavior or documentation architecture is introduced.
