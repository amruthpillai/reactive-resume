# Plan 24 Step 1 — date layout characterization

Generation revision: `58ee4eead7843105da20f8a177e7d250b24c3a87` (pre-remediation characterization merge).
Comparison ref: `368858a56fc9c3152b540c39829908e2c3ea04c5` (`origin/main` at review).
Branch: `codex/issue-3155-date-layout-characterization`.

JSON and PNG files are executable baselines. Raw PDFs are intentionally omitted because renderer metadata is nondeterministic.

The durable fixture is [`date-layout.test.tsx`](../../src/templates/shared/date-layout.test.tsx). It renders the same unchanged resume data through Chikorita and Ditto in LTR and RTL modes, extracts PDF text coordinates, rasterizes each PDF page, and records default evidence for all 15 templates.

Remediation details: [`REMEDIATION.md`](REMEDIATION.md).

## Matrix coverage

- Standard date-bearing sections: Awards (`date`), Certifications (`date`), Education (`period`), Experience (`period` and two nested role periods), Projects (`period`), Publications (`date`), and Volunteer (`period`).
- Custom equivalents: all seven supported types, including a custom experience role and a custom publication with an empty date.
- Edge values: long localized German date, blank location, blank period, mixed dated/undated entries, and RTL locale (`ar-SA`).
- #2841 controls: `hideLinkUnderline` resolves independently to `underline`/`none`; all seven level design types are represented in the semantic tree; default and explicit level display sizes resolve independently.

## Current output evidence

The Chikorita LTR JSON records current default coordinates such as:

- Long Experience date: `x=381.24`, `width=186.04`.
- Chikorita Experience location: `x=452.35`, `y=706.39`; its date is `y=690.64`, so current PDF coordinates place location before date in the existing split header.
- Parent role dates: `x=488.00` and `x=486.54`.
- Education period combined with location: `x=416.99`, `width=150.29`.
- Project period: `x=465.16`.
- Award date: `x=475.41`.
- Certification date: `x=484.71`.
- Volunteer period: `x=450.91`.

These are observations of current disabled/default output, not proposed geometry. All-template JSON records page counts, text-item counts, raster SHA-256 values, coordinates, and any missing marker. Meowth omits the location-only marker in the blank-period Experience case; this is recorded as default behavior rather than normalized in the fixture.

## Issue disposition and gate

**#3155:** Q4, Q5, Q7, and Q8 are reflected in the fixture contract: optional dedicated date column, logical-start placement, all free-text date sections/custom equivalents, and all templates with default layout preserved. Current output confirms dates are trailing/inline in the existing layout; it does not establish the future dedicated-column geometry.

**#2841:** Date/location ordering remains a separate layout concern. Existing `hideLinkUnderline` and level design/size controls are present and independently verified; no duplicate schema/UI/runtime controls were added. Historical Chikorita v4 pixel parity remains unverified because no reproducible v4 reference was available.

**STOP — exact missing visual-geometry gate:** Q6 approves user-controlled per-section width and wrapping but does not specify width units, minimum/maximum bounds, or initial/default width geometry. Narrow-width behavior can be characterized, but implementation must wait for those numeric/geometry inputs; this step intentionally adds no date-column schema, UI, or renderer behavior.
