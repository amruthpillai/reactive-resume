# ATS export evaluation

`evaluation.integration.test.ts` renders deterministic synthetic resume data through current
`ResumeDocument` and `buildDocx`, then measures extraction with installed PDF.js and DOCX XML.
`metrics.test.ts` locks raw distinct-token recall, order, duplicate, and semantic-grouping behavior,
including deliberate drop/duplicate regressions. Grouping compares eligible same-group expected
occurrences, preserving repeated values' authored field identity. Link metrics normalize expected
and extracted targets and report dropped or changed targets; hidden-leak checks scan paragraph text
and link-target channels, including hidden URLs.

Current DOCX output intentionally records its known missing `tel:` target as a measured loss; any
additional dropped or changed target fails integration assertions.

`extract.test.ts` supplies a positive XML numbering fixture covering paragraph order, `numId`, level,
format, marker, and link-target extraction, plus valid archives with optional entries omitted.

Run from repository root:

```sh
pnpm --filter @reactive-resume/tooling test
```

The integration test writes PDF/DOCX fixtures and raw-count reports to
`tooling/ats-export-evaluation/test-results/` (ignored test output). Results explicitly distinguish
local extraction measurements from vendor parser accuracy. Steps 1–2 add no ATS preset; a later
product decision can use measured deficiencies from `ats-export-report.md`.
