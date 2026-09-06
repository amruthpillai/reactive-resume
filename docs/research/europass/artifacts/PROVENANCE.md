# Visual artifact provenance

Created 2026-09-06 for Plan 33A. All biographical content, organizations, qualifications and achievements are
synthetic. `example.invalid` links are intentionally nonresolving test data. No personal files, CVs, account
data or real portrait were used.

## Canonical static artifacts

`one-page.svg` and `overflow-1.svg` through `overflow-3.svg` are editable static drawings with text traced
to [fixture](../synthetic-fixtures.json) paths using `data-source`. They are research artifacts, not a resume
renderer or template implementation. SVG source is the reproducible artifact; raster previews are optional.

`reference-comparison.svg` juxtaposes an original analytical schematic with the one-page SVG. The schematic
describes the selected [official EEAS reference](https://www.eeas.europa.eu/sites/default/files/documents/2025/Europass-cv-en%20template_0.pdf),
© European Union, accessed 2026-09-06. It is not a screenshot or faithful reproduction, omits the mark and
recruitment-specific content, and labels the legacy provenance. Original reference remains on its official host.

The static drawings use sans-serif text and editable geometry. Browser rendering may select a different
installed font. They are intentionally independent of the app, and include no network resource dependencies.
An isolated PyMuPDF environment was used to rasterize the drawings for visual inspection. No raster screenshot
is evidence of Reactive Resume's PDF behavior.

To regenerate a raster from the canonical SVG without application dependencies:

```sh
uv run --with pymupdf python - <<'PY'
from pathlib import Path
import pymupdf

source = Path("docs/research/europass/artifacts/one-page.svg")
image = pymupdf.open("svg", source.read_bytes())
pdf = pymupdf.open("pdf", image.convert_to_pdf())
pdf[0].get_pixmap(matrix=pymupdf.Matrix(2, 2)).save("one-page-review.png")
PY
```

## Supplementary image generation

`concept-one-page.png` was generated with the built-in image generation tool. No CLI/API fallback was used.
The selected output was copied into this repository; review does not require the tool's private output folder.
It is a visual exploration only. Its name is positioned farther right, rules span both columns, some typography
and spacing differ, and it adds minor presentational punctuation/“area” wording. These differences are not
approved specification changes. The mapped SVGs and fixture take precedence over generated pixels.

Exact prompt:

```text
Use case: productivity-visual. Asset type: static CV design proposal, one portrait A4 page, straight-on flat white document, no desk or mockup shadows. Independent unbranded European chronological CV concept, not an official document. Exact synthetic content only. Header at upper right of broad content column: Alex Marin in large dark blue sans serif, below it Research coordinator; below: Brussels, Belgium | alex.marin@example.invalid. Narrow reading-start column for dates and section labels (about 27 percent), broad content column 73 percent, thin blue horizontal section rules. Airy white page, charcoal 10.5pt-equivalent body, dark blue uppercase section headings. No photograph and no placeholder box. Sections exact text: ABOUT ME: Research coordinator building clear public-service guidance. WORK EXPERIENCE: date 2023 – Present, title Research coordinator, organisation Civic Atlas Lab, Brussels, Belgium. Two bullets: Coordinated multilingual guidance reviews. Published accessible research summaries. EDUCATION AND TRAINING: date 2019 – 2022, title BA Social Research, organisation Northbridge Institute, area Public policy. LANGUAGE SKILLS: English — Native; French — B2 (self-assessed). SKILLS: Research — Advanced; Interviews, synthesis, documentation. PROJECTS: date 2025, title Open Guidance Map; Mapped public learning resources. OTHER ACTIVITIES: Community workshops and peer mentoring. Footer small: SYNTHETIC DESIGN PROPOSAL · NOT APPROVED, with 1 / 1 at right. No logos, EU flag, stars, Europass wordmark, compliance claims, nationality, date of birth, QR codes, extra personal facts, ratings or CEFR matrix. All text legible. This is concept direction only; deterministic separate artifacts will govern exact mapping.
```

This image was inspected for recognizable text, missing sections, branding and private-data leakage. All seven
intended sections are present and no official mark or portrait appears. No image-generation claim is used as
evidence about official guidance, reuse rights, application behavior or field support.
