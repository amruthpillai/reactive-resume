# Europass research and visual proposal — Plan 33A

Status: **research complete; visual and naming approval pending**. No renderer, template ID, gallery entry,
schema change, or import/export integration is included. This proposal does not resolve issue #2689.

## Review package

- [Reference comparison](artifacts/reference-comparison.svg): analytical redraw of the selected official
  reference beside the mapped proposal. The redraw excludes branding and source-specific recruitment text.
- [One-page proposal](artifacts/one-page.svg): canonical static layout with exact synthetic field sources.
- Overflow proposal: [page 1](artifacts/overflow-1.svg), [page 2](artifacts/overflow-2.svg),
  [page 3](artifacts/overflow-3.svg). These are one document, not three template options.
- [Generated concept](artifacts/concept-one-page.png): supplementary visual exploration, not the field or
  geometry contract. The SVGs take precedence.
- [Field mapping and behavior](mapping.md), [synthetic fixture records](synthetic-fixtures.json), and
  [generation provenance](artifacts/PROVENANCE.md).

Open SVGs directly in a browser. They contain their text and geometry, require no application server,
and load no external images, fonts or scripts. A local sans-serif font is sufficient. The JSON contains
two complete ResumeData objects under `onePage` and `overflow`; neither is an official Europass file.

## Authority and repository revalidation

Access/revalidation date: **2026-09-06**. Research base: `b85d285b69843612e9d7f0ab802248982e7bf0ea`.
Planning authority: commit `a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`,
[Plan 33](https://github.com/amruthpillai/reactive-resume/blob/a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d/plans/33-europass-template.md)
and its recorded decisions. Approval covers this research/proposal unit; concrete visual approval remains open.

Read-only `gh issue view 2689` confirmed the [issue](https://github.com/amruthpillai/reactive-resume/issues/2689)
is open, last updated 2026-08-16. Its request for a built-in option is relevant; assertions about compulsory
formats are not adopted. The linked community converter remains third-party work, not an import contract.

The complete open-PR list returned four PRs: [#3455](https://github.com/amruthpillai/reactive-resume/pull/3455)
(planning), [#3456](https://github.com/amruthpillai/reactive-resume/pull/3456) (execution ledger),
[#3467](https://github.com/amruthpillai/reactive-resume/pull/3467) (authored-page guidance), and
[#3468](https://github.com/amruthpillai/reactive-resume/pull/3468) (stylesheet diagnostics).
None proposed a Europass renderer. Pagination guidance is adjacent work; no shared source is changed here.

The schema still has 15 template IDs and no Europass ID. The plan's targeted drift check from `7a98f6662`
found only changes to an unrelated rich-text table integration test. Current ResumeData and shared filtering
were read directly; no `.codegraph/` directory was present. Intent inventory returned
“No intent-enabled packages found,” so no matching local package skill was available to load.

## Official evidence register

All sources below were accessed on **2026-09-06**. Only EU/Europass first-party material informs external
claims. Copyright attribution for summarized Europass information: **© European Union**. The independent
synthetic examples and diagrams are adaptations for discussion, not official Europass output.

| ID | Source | Supported finding and limit |
| --- | --- | --- |
| S1 | [Create your Europass CV](https://europass.europa.eu/en/create-europass-cv) | Current guidance offers a choice of designs and selected profile content. It recommends clear, tailored descriptions and reverse chronology. Its photograph advice is guidance, not evidence of a universal required field. No single fixed layout is specified here. |
| S2 | [Europass FAQ, page 1](https://europass.europa.eu/en/faq?page=1) | CV sections can be added, removed, moved and renamed; several templates exist. Current saving guidance specifies Europass PDF. Information reuse is allowed with source acknowledgement. This is not proof of a logo licence or compatibility of third-party PDFs with the editor. |
| S3 | [Europass FAQ, page 2](https://europass.europa.eu/en/faq?page=2) | The profile FAQ says name and surname are mandatory and users choose other sections. Initial web extraction failed; a direct HTTPS fetch subsequently verified the live page text. This concerns the profile, not a separately tested CV-editor validation contract. |
| S4 | [EEAS-hosted Europass CV form](https://www.eeas.europa.eu/sites/default/files/documents/2025/Europass-cv-en%20template_0.pdf) | Stable public two-page blank form, inspected as PDF and raster. It contains a legacy © European Union 2002–2018 footer and recruitment-specific text. Its 2025 URL does not make its design a current universal specification. Headings are optional in this form. This is the selected visual reference. |
| S5 | [Europass terms of use](https://europass.europa.eu/en/node/2161) | Terms govern platform use and prohibit misleading content and intellectual-property violations. No explicit third-party template-branding permission was found in this page. |
| S6 | [European Commission legal notice](https://commission.europa.eu/legal-notice_en) | The general policy permits reuse of covered EU-owned website content with credit and indication of changes, but excludes protected names, logos and other industrial-property material. It is not a blanket licence for every asset hosted by another EU institution. |

### Reference selection and current guidance

S4 provides an inspectable visual anchor: a narrow label/date area at reading start, wider detail area,
blue headings and rules, employment and education entries, a language matrix, and running page metadata.
The comparison redraw records these observations; measurements in the proposal are our design decisions.
We do not redistribute the original PDF or its mark. Reviewers can open the first-party PDF through S4.

S1/S2 are the current behavioral guidance. They support flexible content and multiple layouts; they do not
establish S4 as today's sole layout. The proposed document therefore takes the chronology structure from
S4 while adapting it to existing data and the current guidance. No official live-editor CV was exported
or uploaded, and no account or personal data was used.

An EEA search result for historic CV instructions redirected to the agency's general About page when
opened. That result is not used as evidence. Historic XML documentation also surfaced but is not used to
promise current export formats or interoperability. No secondary-source claims were adopted.

## Material visual and reuse decisions

Recommended working title: **European chronology**. Do not register a product ID yet. “Europass” is the
research topic; use as a public template name remains an explicit maintainer decision with an unresolved
rights basis. The design contains no Europass wordmark, EU flag, emblem, endorsement, official copyright
footer, or interoperability badge. General website information reuse does not settle branding rights.

The proposed default is A4, white background, dark blue `#1e5580`, charcoal `#20262b`, 36 pt side margins,
a 128 pt label/date area and 16 pt gap, with details beginning at x = 180 pt. Body text is 10.5 pt sans-serif,
headings are 10 pt bold, and the name is 23 pt. The line and color choices are proposals, not official tokens.
The static one-page drawing uses more deliberate section spacing than the dense overflow study.

Deviations requiring approval:

1. An independent unbranded design, with neutral provisional name, instead of an exact official clone.
2. A chronology gutter for dates and headings, coordinated with Plan 24 rather than introducing a new
   date-column schema here. Empty date cells keep alignment; periods are never parsed or normalized.
3. Plain language/fluency text instead of the five-dimensional language grid. Numeric levels are not CEFR
   evidence. Skill ratings are hidden by the fixture's existing design setting.
4. No compulsory photo or personal attributes. Photo-free examples reserve no blank frame. Optional photo
   placement and mixed-script examples still need a separate visual pass before renderer approval.
5. Existing section titles and custom sections remain available. The concept does not force a fixed set of
   official headings or discard additional resume sections.
6. Continuation pages retain only a small name/running header and page number, with content flowing below.
   The synthetic approval watermark is an artifact annotation, not proposed resume output.

## Unresolved claims and handoff gate

- Permission to ship the Europass name, logo, exact branded template or official-looking footer is **not
  established**. No such permission is inferred from S2 or S6. If maintainers require branding or an exact
  clone, resolve rights and reference choice before any implementation.
- The chosen legacy structure is documented, but whether it satisfies the request for a current built-in
  Europass option needs maintainer review of these actual artifacts. A current editor design would be a
  different reference-selection task, not a silent replacement.
- Mandatory CV-editor fields, exact language availability, and export embedding details were not validated
  interactively. Official pages vary in language counts; this proposal makes no count or import promise.
- Structured CEFR dimensions, mother-tongue flags and qualification-framework levels are absent from
  current ResumeData. They are omissions, not guessed values. See the complete mapping.
- Renderer pagination, links, fonts, RTL shaping, tagged accessibility and machine extraction are untested
  for this proposal. Static artifacts are not evidence that a future PDF renderer implements those behaviors.
- This task stops at the planned concrete-design gate. Approval must identify the canonical SVG set,
  public naming/branding choice and accepted data omissions; it cannot be inferred from general plan approval.

Follow-up implementation remains conditional. It would require the plan's schema, semantic manifest,
gallery, renderer, pagination, extraction, localization, typecheck, build and boundary checks after the
maintainer approves the design. No implementation, push, PR creation, issue comment or issue closure occurred here.
