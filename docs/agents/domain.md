# Domain Docs

How engineering skills consume this repository’s domain documentation.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at repository root. It points to context-specific `CONTEXT.md` files. Read each context relevant to current work.
- **`docs/adr/`** for system-wide decisions touching current area.
- Context-scoped ADR directories referenced by `CONTEXT-MAP.md`.

If any file does not exist, proceed silently. Do not flag absence or suggest creating it upfront. `/domain-modeling` creates domain documents lazily when terminology or decisions become settled.

## File structure

This repository uses a multi-context layout:

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                    ← system-wide decisions
├── apps/
│   └── <context>/
│       └── CONTEXT.md
└── packages/
    └── <context>/
        ├── CONTEXT.md
        └── docs/adr/            ← context-specific decisions
```

`CONTEXT-MAP.md` is authoritative for context boundaries. Not every app or package needs a `CONTEXT.md`; create one only when it represents a meaningful domain context.

## Use glossary vocabulary

When output names a domain concept—in issue titles, refactor proposals, hypotheses, or test names—use terms defined in relevant `CONTEXT.md`. Do not drift to explicitly avoided synonyms.

Missing terminology signals either language foreign to project or genuine domain-model gap. Reconsider first; otherwise note gap for `/domain-modeling`.

## Flag ADR conflicts

If output contradicts existing ADR, surface conflict explicitly instead of silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
