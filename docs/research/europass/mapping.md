# Existing ResumeData to proposed visual fields

Read against `b85d285b69843612e9d7f0ab802248982e7bf0ea`. The source of truth is
[data.ts](../../../packages/schema/src/resume/data.ts), with existing defaults in
[default.ts](../../../packages/schema/src/resume/default.ts) and visibility behavior in
[shared filtering](../../../packages/pdf/src/templates/shared/filtering.ts).
This document proposes presentation; it adds no fields or renderer behavior.

Both fixture records were validated against the current Zod `resumeDataSchema`. The checked-in generated
`packages/schema/schema.json` rejects the current `picture.fit` field; it is stale relative to `data.ts` at
this revision. That unrelated generated-schema mismatch is recorded, not repaired in this research unit.

The canonical SVG text nodes carry `data-source` paths into the matching object in
[synthetic-fixtures.json](synthetic-fixtures.json). Wrapped text uses the same path on each line.
Section titles are shown in uppercase in these English drawings; source strings retain their original case.
`proposal.annotation` means review metadata, not ResumeData: synthetic watermark, continuation labels and
page numbers. The repeated running name still comes from `basics.name`.

## Header and shared fields

| Proposed display | Existing path | Rule / absence behavior |
| --- | --- | --- |
| Name and running name | `basics.name` | Preserve full name; do not split first/last names or reorder culturally. Wrap long names. Empty name renders no invented label. |
| Professional headline | `basics.headline` | Optional text, wraps within the detail width. It is not an official occupational code. |
| Contact location | `basics.location` | One free string; no parsing into country/address. Do not invent a full postal address. |
| Email and phone | `basics.email`, `basics.phone` | Omit empty values and separators. Phone is empty in both fixtures; no number is fabricated. Future renderer uses existing link handling. |
| Personal website | `basics.website.url`, `.label` | Nonempty URL uses label when provided, URL otherwise. Overflow displays “Research portfolio.” SVGs illustrate text only; hyperlink behavior needs implementation checks. |
| Other personal detail | `basics.customFields[].text`, `.link`, `.icon` | Display user-authored text/link in order. Overflow shows availability. No semantic inference from text. There is no per-field hidden flag; empty text yields no visual row. |
| Optional photo | `picture.url`, `.hidden`, `.fit`, `.size`, `.rotation`, `.aspectRatio`, border/shadow fields | Both fixtures have no URL and `hidden: true`; no frame is displayed. Future visible photo uses existing upload/picture contract and preserves cover/contain choice. Suggested reading-start header frame is not visually approved. Failed image handling needs future verification. |
| Section heading | `summary.title`, `sections.<type>.title`, `customSections[].title` | Use authored title; empty title uses existing localized fallback. Do not replace custom titles with fixed Europass labels. |
| Section presence/order | `metadata.layout.pages[].main`, `.sidebar`, `sections.*.hidden`, `customSections[].hidden`, `summary.hidden` | Respect authored page/column order and visibility. Missing-from-layout is distinct from hidden. Fixtures choose one authored full-width page; physical overflow is illustrated separately. |
| Date gutter | Item `.period` or `.date` | Verbatim free text, including role periods. Wrap to fixed gutter; keep undated details aligned. No automatic chronological sort. The fixture itself is authored newest-first. |
| Rich description | Item `.description`, summary `.content`, custom summary item `.content` | Preserve supported paragraphs, lists, emphasis and links. These drawings only exercise paragraphs/lists. No HTML tags printed; no arbitrary HTML discarded by proposed renderer. Unsupported-rich-text handling remains implementation work. |
| Item website | Item `.website.url`, `.label`, `.inlineLink` | Preserve URL target; label or raw URL as display text. Inline-link preference must remain honored in future renderer. Fixture links all use `inlineLink: false`. |
| Icons and colors | Section `.icon`; profile/skill/interest `.icon`, `.iconColor`; `metadata.page.hideIcons`, `.hideSectionIcons` | Default proposal is quiet/text-led. Fixture icons are absent or suppressed. Nondefault icon settings are not demonstrated and must be tested before implementation approval. |

## Built-in sections

Each `items[]` entry also has `id` and `hidden`; identifiers never print. A section with no visible valid
items is omitted with its heading and rule. The table lists every content field, including blank optional fields.

| Proposed section | Paths under `sections.<type>.items[]` | Presentation / fixture coverage |
| --- | --- | --- |
| Profiles | `profiles`: `network`, `username`, `website`, `icon`, `iconColor` | Network, user name, website label. Present only in overflow. Keep within section, do not duplicate in header. |
| Work experience | `experience`: `position`, `company`, `location`, `period`, `description`, `website`, `roles[]` | Position then organization/location, period in gutter. Overflow retains overall title/tenure and both individual roles. |
| Individual experience role | `experience.roles[]`: `id`, `position`, `period`, `description` | Role heading, independent period, description. No role hidden flag exists. Existing shared filtering excludes blank-position roles; parent visibility still applies. |
| Education and training | `education`: `degree`, `school`, `area`, `grade`, `location`, `period`, `description`, `website` | Qualification then institution, subject, supplied grade and location. Overflow includes all optional text fields except website. Grade is not an EQF level. |
| Projects | `projects`: `name`, `period`, `description`, `website` | Named project, date gutter, rich narrative. Overflow adds a long multi-paragraph project and an undated project with raw long URL. |
| Language skills | `languages`: `language`, `fluency`, `level` | Show language and supplied fluency verbatim. English/Native and French/B2 (self-assessed) are synthetic user-entered strings. No conversion from `level` to fluency or CEFR. |
| Skills | `skills`: `name`, `proficiency`, `level`, `keywords`, `icon`, `iconColor` | Show name, proficiency, comma-separated keywords. Keyword strings/order retained. Levels are intentionally hidden via existing `metadata.design.level.type: hidden`; no proficiency inferred. |
| Awards | `awards`: `title`, `awarder`, `date`, `description`, `website` | Title, awarder, supplied date, description. Overflow only. |
| Certifications | `certifications`: `title`, `issuer`, `date`, `description`, `website` | Title, issuer and supplied date; empty description/link omitted. Overflow only. No accreditation claim. |
| Publications | `publications`: `title`, `publisher`, `date`, `description`, `website` | Title, publisher and supplied date. Overflow only. No DOI field invented. |
| Volunteering | `volunteer`: `organization`, `location`, `period`, `description`, `website` | Organization, place, period and description. There is no dedicated role-title field; do not infer one. Overflow only. |
| Interests | `interests`: `name`, `keywords`, `icon`, `iconColor` | Name and keyword text, with configured icon behavior. Overflow only. |
| References | `references`: `name`, `position`, `phone`, `description`, `website` | Existing user-authored “Available upon request” string in overflow; no contact is invented. There is no structured reference-email field. |
| About me | `summary.content`, `.title`, `.hidden` | Existing summary supports optional narrative. Present in both records. This is separate from experience descriptions. |

## Custom sections, omitted and unsupported fields

| Concern | Existing representation | Decision |
| --- | --- | --- |
| Custom typed sections | `customSections[]`: `id`, `type`, shared section fields, `items[]` matching type | Same mapping as the matching built-in type. Preserve own title and authored layout ID. All 12 built-in types are structurally available as custom types; this fixture demonstrates a custom summary, not every custom variant. |
| Other activities | Custom `type: summary`, `items[].content` | Both records display community workshops and peer mentoring. No fabricated employer or dates. |
| Cover letter | Custom `type: cover-letter`, `items[].recipient`, `.content` | Supported by current model but outside this CV visual proposal; fixtures contain none. A future template must preserve existing cover-letter behavior or explicitly gate selection; silently dropping a visible cover letter is not acceptable. |
| Structured nationality, birth date/place, sex/gender, full address components, second phone/fax, driving licence | No dedicated typed fields in `basics` | Omitted from examples, not required. A user can author free text in `customFields`, but that is not a typed equivalent or automatic mapping. Never infer from names, photos, location or language. |
| Mother-tongue boolean or multiple structured native languages | `languages[].fluency` is free text only | No separate mother-tongue group inferred from “Native.” Keep supplied text alongside language. |
| Five CEFR dimensions: listening, reading, spoken interaction, spoken production, writing | No fields | Omit official reference matrix. A scalar `level` or single fluency text cannot populate it faithfully. |
| Language certificate linked to particular language/dimension | General certifications exist, no structured association | Keep as separate certification if user authored one. Do not guess association. |
| EQF/NQF/ISCED level, qualification IDs, occupation codes, business sector | No dedicated typed fields | Omit unless user explicitly wrote free text in existing description/area/custom content. No equivalence inferred from degree or grade. |
| Attachments, signed declaration, consent block, official Europass identifiers, XML payload, verification QR | No corresponding proposed CV field | Omitted. Existing website links do not establish attached documents, signatures or official interoperability. |
| Official branding/copyright footer | Not ResumeData | Omitted; reuse permission not established. Source attribution belongs in research note, not masquerading as official CV provenance. |
| Notes | `metadata.notes` | Never print. Overflow contains `PRIVATE_NOTES_SENTINEL` to make accidental disclosure detectable. |

## Visibility, empty content and layout controls

Existing filtering is the behavioral baseline: skip hidden sections/items, title-backed entries without their
required primary title, and blank-position experience roles. Those primary fields are `network`, `company`,
`school`, `name` (projects/skills/interests/references), `language`, `title` (awards/certifications/publications)
and `organization`. A missing optional field alone must not hide an otherwise valid item.

Summary visibility currently checks nonempty trimmed content, not semantic emptiness of HTML. Do not claim
that `<p></p>` is already filtered correctly; future proposal tests must include it and settle any desired
change separately. The fixtures use populated summaries and empty item arrays, not malformed imported data.

Overflow includes a hidden experience item, a hidden custom section and private notes. Their `HIDDEN_*` and
`PRIVATE_NOTES_*` tokens must not occur in any visual artifact. One-page empty sections do not render headings.
Separators and rules belong to visible content only. Blank date cells stay blank, never show “Present” or a dash.

`columns`, `keepTogether`, `startOnNewPage`, `skills.layout`, authored pages/full-width/sidebar settings,
typography, colors, page format/margins/gaps, hyphenation and style rules already exist. The fixture explicitly
chooses a full-width A4 page, single-column sections, ordinary flow and no style rules. It retains the valid
existing `metadata.template: onyx` only to remain schema-compatible: importing this fixture currently selects
Onyx, **not this proposal**. No new template ID, date-width option or stylesheet behavior is encoded.

## Pagination and long text proposal

One-page and overflow SVGs are manual, deterministic illustrations. They do not exercise `packages/pdf`.
The three overflow drawings illustrate one authored page flowing onto physical pages, not editable per-page
overflow settings. No fixed page count or exact future line break is promised.

Dates wrap inside a 128 pt reading-start gutter; detail starts remain aligned. Keep entry title with its first
detail line, and section heading with its first item. Allow a long entry to continue across pages without
truncation or repeated body text. In the study, the education description continues on page 2 as a complete
two-line paragraph; a continuation label is review metadata. Page 3 carries remaining sections without shrinking
font size to force two pages. Repeated running names/page numbers are intentional, not duplicated body content.

Long names, headings, free-text dates, paragraphs and URLs must wrap; do not ellipsize, parse or normalize them.
The overflow contains an accented long name, wrapped role dates and undated project. Long unbroken URL glyphs
need break opportunities while retaining the original link target. Future renderer tests must add a single
entry longer than a page, bullets across breaks, manual page starts, nondefault columns and keep-together
settings. These cases are specified here but not established by the static study.

## Localization, RTL, photo and accessibility review limits

Use `metadata.page.locale` for existing translated fallback headings; preserve user-authored text, date strings
and titles. Do not translate content or uppercase text in languages where that harms meaning or shaping.
The proposal's uppercase English labels are a visual choice, not a localization algorithm. Font selection and
fallback should stay with existing PDF font registration, not be bundled into this research.

RTL proposal: put label/date gutter at reading start (right), mirror alignment and optional photo placement,
keep email/URL/phone runs in their natural direction, and preserve logical source order. Current model has no
new direction field here; reuse the existing locale/direction contract after validating it. Arabic/Hebrew shaping,
mixed-direction punctuation, CJK glyphs and translated long headings need their own rendered fixtures before
implementation approval. The Latin-script drawings do not prove RTL or full localization coverage.

No synthetic portrait was needed for the photo-free design. Before implementing the optional-photo variation,
review a visible-photo artifact using nonprivate synthetic imagery, both cover and contain, and long names
beside the frame. No stock/person photo or user upload was used in this package.

Keep semantic section labels and logical extraction order even if visual arrangement changes. Tagged PDF,
screen-reader behavior, contrast under user colors and link semantics require Plan 31 coordination and real
export checks. Plain SVG text readability does not establish document accessibility conformance.
