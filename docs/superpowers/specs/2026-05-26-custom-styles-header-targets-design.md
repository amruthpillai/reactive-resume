# Custom Styles Header Targets Design

## Context

Reactive Resume now stores user-defined custom styling as structured style rules in `metadata.styleRules`. The current rule system targets semantic section content and rich-text slots, then resolves those rules in `packages/pdf` through the shared section-style context.

The resume header is not currently part of that section-style context. Profile pictures, `basics.name`, `basics.headline`, and contact items are rendered directly inside each template header. That means users can style normal sections but cannot target the highest-visibility identity and contact content.

## Goals

- Make the profile picture targetable by Custom Styles.
- Make the resume title and subtitle targetable by Custom Styles.
- Make contact items targetable as a grouped v1 surface.
- Keep the feature inside the existing `metadata.styleRules` model.
- Preserve existing template header layouts and template-owned base styles.
- Keep contact styling grouped in v1 instead of targeting email, phone, location, website, or custom fields separately.

## Non-Goals

- Do not add per-contact-type targeting in v1.
- Do not expose picture source, upload, crop, or visibility settings through style rules.
- Do not redesign template headers or normalize every header into one layout.
- Do not add a second metadata object for header-specific custom styles.
- Do not make `sectionItem` targeting part of this work.

## Approved Approach

Extend the existing structured Style Rules system with a new header target and header-specific slots.

Add a new target scope:

- `header`

Add header slots:

- `picture`
- `title`
- `subtitle`
- `contactList`
- `contactItem`
- `contactText`
- `contactLink`
- `contactIcon`

The header target applies only to the resume header/basic-info area. Global rules can also apply to matching header slots, which lets users define broad defaults such as "all contact text red." Header-targeted rules override global header-slot rules.

## UI Behavior

The Custom Styles panel should add `Header` to the target scope selector.

Slot availability should depend on target scope:

- `Header`: show only header slots.
- `Section type` and `Specific section`: show section and rich-text slots only.
- `All sections`: show all semantic slot groups, including the header group, because global rules apply anywhere the selected slot exists.

Header labels should be user-facing and concrete:

- `Picture`
- `Title`
- `Subtitle`
- `Contact list`
- `Contact item`
- `Contact text`
- `Contact link`
- `Contact icon`

Applied rule labels should remain readable, for example `Header: Contact text` or `All sections: Contact text`.

## Rendering Design

Keep section rendering as-is with `SectionStyleProvider`.

Add a header/basic-info resolver path next to the section-style path. The resolver should use the same style intent translation and safety constraints as section slots, but it should resolve against header context instead of section context.

Template header elements should compose styles in this order:

1. Template defaults.
2. Global rules for the selected header slot.
3. Header-targeted rules for the selected header slot.
4. Renderer safety styles where applicable.

Each template keeps its current layout and structure. The integration only layers resolved custom styles onto existing elements:

- `picture`: the profile `Image`.
- `title`: `basics.name`.
- `subtitle`: `basics.headline`.
- `contactList`: the contact list container.
- `contactItem`: each contact item wrapper or row.
- `contactText`: text inside contact items.
- `contactLink`: linked contact wrappers such as email, phone, website, and linked custom fields.
- `contactIcon`: icons inside contact items.

Grouped contact styling means email, phone, location, website, and custom fields share the same contact slots. Templates with special wrapper structures, such as Rhyhorn separators, should keep those wrappers and apply the closest matching grouped slot.

## Data Flow

1. The web UI writes header rules into `resume.data.metadata.styleRules`.
2. The schema validates `header` targets and header slots.
3. PDF rendering resolves header slots through the shared style-rule resolver.
4. Template headers compose resolved styles with their existing styles.
5. Preview, export, and public PDF paths receive the behavior automatically because they all render from resume metadata.

## Testing

Add focused coverage in three layers:

- Schema tests:
  - Accept `header` targets.
  - Accept header slots.
  - Reject unsupported slots and unsupported raw layout properties.
  - Preserve grouped contact style rules in `metadata.styleRules`.
- PDF resolver tests:
  - Resolve global header-slot rules.
  - Resolve header-targeted rules.
  - Let header-targeted rules override global header-slot rules.
  - Ignore disabled header rules.
  - Keep section rules from applying to header slots.
- Web UI tests:
  - `Header` appears as a target scope.
  - Header target limits slot options to header slots.
  - Header rules can be created, updated, toggled, displayed, managed, and deleted.
  - Applied rules display readable labels such as `Header: Contact text`.

Template rendering tests should focus on the common resolver/contact behavior and one or two representative templates rather than snapshotting every template header. The implementation still needs to wire the new slots into each template header.

## Open Decisions

No open decisions remain. Contact styling is grouped for v1, and the approved target model is a new `header` scope plus header-specific slots inside the existing `metadata.styleRules` system.
