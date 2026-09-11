# Semantic CSS Complete Rename Design

## Goal

Use **Semantic CSS** as the feature's only name. Remove the former acronym and its prefixes before the feature is merged
so authors, contributors, diagnostics, and documentation all use one vocabulary.

## Naming Contract

The rename applies to every tracked source, test, fixture, generated marker, guide, plan, and specification in this
branch. Git history is not rewritten.

| Context | Canonical form |
| --- | --- |
| Product and language name | Semantic CSS |
| TypeScript symbol form | `SemanticCss*` |
| Constant prefix | `SEMANTIC_CSS_*` |
| Slug and cache form | `semantic-css-*` |
| Version directive | `@version 1;` |
| System variables | `--resume-*` |
| Renderer properties | `-resume-*` |
| Empty source constant | `EMPTY_SEMANTIC_CSS_SOURCE` |
| Documentation markers | `SEMANTIC-CSS-*` |

Existing neutral names remain unchanged, including `stylesheet`, `mode: "semantic"`, `languageVersion`, semantic node
names, API routes, database columns, and the `/applying-custom-styles` documentation URL.

## Language Syntax

New stylesheets and formatted output start with:

```css
@version 1;
```

Resolved builder values use the `--resume-*` namespace:

```css
:root {
	--accent: var(--resume-primary-color);
}
```

Renderer-specific properties use the `-resume-*` namespace:

```css
section {
	-resume-min-presence-ahead: 24pt;
}
```

The compiler accepts only the new syntax. There are no deprecated aliases, conversion paths, or compatibility warnings
because the feature has not shipped.

## Product and Documentation

All visible editor labels, help text, errors, diagnostics, logs intended for operators, tests that assert visible copy,
and the Applying Custom Styles guide say **Semantic CSS**. The guide and examples teach only `@version`,
`--resume-*`, and `-resume-*`.

The guide remains manually authored. `pnpm docs:gen` continues to regenerate only the Resume schema references and
OpenAPI specification; example compilation tests continue to validate the guide's marked Semantic CSS examples.

## Internal Code

Public package exports and internal identifiers use `SemanticCss` or `SEMANTIC_CSS` when the language name is required.
Identifiers already scoped by a stylesheet module may retain a neutral `Stylesheet*` name instead of repeating
`SemanticCss`.

The compiler build/cache identifier changes so cached output produced under the old grammar cannot be reused. No data
migration is added.

## Verification

The implementation is complete when:

1. A case-insensitive tracked-file search finds no occurrence of the former four-letter acronym.
2. A tracked-file search finds none of the former directive, variable, or renderer-property prefixes.
3. Compiler tests prove `@version 1;` is required and the old directive is rejected as unsupported.
4. Registry and rendering tests cover the renamed system variables and renderer properties.
5. The public guide's marked examples compile.
6. Focused package tests, typechecks, documentation generation, Knip, Biome, and the existing E2E workflow pass.
7. No local Chrome run is required; browser verification remains CI-owned.
