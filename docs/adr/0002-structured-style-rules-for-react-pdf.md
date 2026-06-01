# Structured Style Rules for React PDF

Reactive Resume no longer renders final PDFs through browser HTML/CSS, so end-user custom CSS would create a misleading contract: React PDF accepts style objects on renderer components, not arbitrary browser selectors. Resume appearance customization is therefore modeled as structured Style Rules in resume metadata, targeting semantic section and rich-text slots that the PDF package translates into safe React PDF styles.

This preserves user-controlled section styling while keeping PDF rendering portable across preview, export, public resume views, templates, and server generation. Raw CSS, raw React PDF style objects, section-item targeting, and direct PDF-preview selection are intentionally out of v1; they can be revisited only if the product needs that power enough to accept the additional validation and layout-breakage risk.
