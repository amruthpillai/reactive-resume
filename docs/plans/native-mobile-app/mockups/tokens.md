# Mobile tokens (D4)

The React Native token table for `apps/mobile/src/ui/tokens.ts`. M1 copies it without changes.

- **Source of truth.** `packages/ui/src/styles/globals.css:19-205`. The web tokens are oklch. React Native gets the sRGB hex values below; they match the hex comments in `globals.css`. Alpha is the last two hex digits (`#RRGGBBAA`).
- **Scope.** Every colour in `app.html`, `builder.html`, `design.html` and `career.html` is a token from this file. There is no ad-hoc `color-mix` and no raw hex outside this table. If a screen needs a colour that is not here, ask the coordinator to add it here.
- **Theme.** `light` and `dark` follow the system setting unless the user picks one in Settings → Preferences → Appearance (System is the default). The resume page (`paper`) is white in both themes and never inverts.

## 1. Colours

| Token          | Light       | Dark        | Use                                                                    |
| -------------- | ----------- | ----------- | ---------------------------------------------------------------------- |
| `bg`           | `#F8F7F3`   | `#100F0C`   | App desk, screen background                                            |
| `surface`      | `#FEFDFC`   | `#171613`   | Panels, cards, tab bar, top bars                                       |
| `raised`       | `#FFFFFF`   | `#1F1E1A`   | Menus, sheets, dialogs, inputs, list groups                            |
| `sunken`       | `#F0EFEB`   | `#0B0A08`   | Wells, search field, segmented track, page canvas, skeleton base       |
| `line`         | `#DFDEDA`   | `#2C2B27`   | Dividers, card borders                                                 |
| `line2`        | `#C5C4BE`   | `#494843`   | Input borders, grabber, unchecked checkbox, skeleton highlight         |
| `ink`          | `#1C1B15`   | `#EFEEEB`   | Primary text, icons on surfaces                                        |
| `ink2`         | `#4F4D47`   | `#BCBAB5`   | Secondary text, inactive tab                                           |
| `ink3`         | `#6D6C65`   | `#979590`   | Meta, placeholder. The lightest colour allowed for text                |
| `accent`       | `#337344`   | `#6FC082`   | Primary action, current tab marker, focus ring, switch on              |
| `accentHover`  | `#206133`   | `#83D494`   | Pressed state of filled accent buttons                                 |
| `onAccent`     | `#F7FEF8`   | `#07150A`   | Text and icons on `accent`                                             |
| `accentSoft`   | `#DCF2DF`   | `#1A3520`   | Selected chip and row, "New" badge, proposals, Android active-tab pill |
| `accentText`   | `#195C2E`   | `#8FD89E`   | Accent text and text buttons on `bg`/`surface`/`raised`                |
| `danger`       | `#BA3630`   | `#D9544B`   | Filled destructive button                                              |
| `dangerSoft`   | `#FFE7E4`   | `#47211D`   | Error banner, failed-field background                                  |
| `dangerText`   | `#A92321`   | `#FDA297`   | Destructive menu items, error messages                                 |
| `warn`         | `#D29922`   | `#E4B750`   | Check issue marker, score ring "fair"                                  |
| `warnSoft`     | `#FCEDCD`   | `#3E2D10`   | Guest banner, session-expired banner, overflow caption                 |
| `warnText`     | `#81520A`   | `#EFCC83`   | Text on `warnSoft`                                                     |
| `infoSoft`     | `#E0F1FF`   | `#192F46`   | Offline banner, neutral guidance, assistant question                   |
| `infoText`     | `#1D5B92`   | `#9DC9F7`   | Text on `infoSoft`                                                     |
| `hover`        | `#1C1B150D` | `#FFFFFF0F` | Pointer hover (tablet trackpad only)                                   |
| `press`        | `#1C1B1517` | `#FFFFFF1A` | Pressed rows and icon buttons (iOS highlight; Android ripple colour)   |
| `scrim`        | `#17161152` | `#00000080` | Behind dialogs and alerts                                              |
| `scrimSheet`   | `#1716112E` | `#00000080` | Behind bottom sheets and menus                                         |
| `paper`        | `#FFFFFF`   | `#FFFFFF`   | The resume page. Never inverts                                         |
| `paperInk`     | `#1C1B15`   | `#1C1B15`   | Text the app draws on paper (live letter text on cards, public reflow) |
| `paperLine`    | `#DFDEDA`   | `#DFDEDA`   | Rules and pill borders the app draws on paper                          |
| `stageSaved`   | `#908C7F`   | `#908C7F`   | Application stage dot. Always next to the stage name                   |
| `stageApplied` | `#5590CC`   | `#5590CC`   | 〃                                                                     |
| `stageScreen`  | `#00A0A6`   | `#00A0A6`   | 〃 (web `--stage-screening`)                                           |
| `stageInterv`  | `#AF8433`   | `#AF8433`   | 〃 (web `--stage-interview`)                                           |
| `stageOffer`   | `#579F68`   | `#579F68`   | 〃                                                                     |
| `stageClosed`  | `#C67067`   | `#C67067`   | 〃                                                                     |

The stage colours are not redefined in dark mode on web either; they keep one value.

### 1.1 Named tints (replace DS1's `color-mix`)

Tints are translucent fills. Each one has a name and a fixed value; screens never mix colours themselves.

| Token              | Light       | Dark        | Use                                                                                                     | Replaces                                                   |
| ------------------ | ----------- | ----------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `pageSelectFill`   | `#3373441F` | `#3373441F` | Fill of a tapped line on the page (Page tab, "Edit entry"). Paired with a 2 pt `pageSelectLine` outline | DS1 `color-mix(in oklch, var(--accent) 10%, transparent)`  |
| `pageSelectLine`   | `#337344`   | `#337344`   | Outline of the tapped line on the page                                                                  | DS1 used `--accent`, which turns light green in dark mode  |
| `pageIssueFill`    | `#D2992238` | `#D2992238` | Fill behind a Check issue on the page; outline is `warn` (light value `#D29922`)                        | new                                                        |
| `pageProposalFill` | `#3373441F` | `#3373441F` | Fill behind a proposed edit on the page; drawn with a 2 pt dashed `pageSelectLine` underline            | new                                                        |
| `selectedFill`     | `#DCF2DF`   | `#1A3520`   | Selected list row, selected card background, active tablet sidebar row. Alias of `accentSoft`           | new name only                                              |
| —                  | —           | —           | Retired. Direction A's floating bar is gone (owner chose B), so no translucent chrome tint is needed    | DS1 `color-mix(in oklch, var(--surface) 92%, transparent)` |

Section headings in the public reflow use the resume's own accent colour from its design settings. That colour is resume data, not a token; the mockups show the sample resume's `#337344`.

**Page overlays use the light values in both themes.** The page is white in both themes, so an outline or fill drawn on it must contrast with white, not with the dark desk. The dark `accent` (`#6FC082`) on white is only 2.2:1, which fails the 3:1 rule for UI parts; `#337344` on white is 5.6:1.

## 2. Type

Fonts are loaded with `expo-font`.

- **UI:** Hanken Grotesk 400, 500, 600 and 700. Family names `HankenGrotesk-Regular`, `-Medium`, `-SemiBold`, `-Bold`.
- **Display:** Newsreader 400, 500 and 600 (optical size 6–72). Family names `Newsreader-Regular`, `-Medium`, `-SemiBold`.
- **Mono:** system monospace (`Menlo` on iOS, `monospace` on Android). Used for API keys, URLs, JSON and custom CSS.

Sizes are in pt (iOS points, Android dp/sp). Line height is absolute.

| Token       | Font             | Size | Line | Weight | Tracking | Use                                                                     |
| ----------- | ---------------- | ---- | ---- | ------ | -------- | ----------------------------------------------------------------------- |
| `largeIOS`  | Newsreader       | 34   | 41   | 500    | −0.3     | iOS large title (Documents, Settings). Collapses into `title` on scroll |
| `largeAnd`  | Newsreader       | 28   | 34   | 500    | 0        | Android large top app bar title                                         |
| `display`   | Newsreader       | 28   | 34   | 500    | −0.2     | Hero headings: sign-in, first-run empty state, ATS score                |
| `heading`   | Newsreader       | 22   | 28   | 500    | 0        | Sheet titles, section headings, empty-state titles                      |
| `title`     | Hanken Grotesk   | 17   | 22   | 600    | 0        | Navigation bar title, dialog title                                      |
| `bodyLarge` | Hanken Grotesk   | 16   | 22   | 400    | 0        | Inputs, rich text, list row titles in Settings                          |
| `body`      | Hanken Grotesk   | 15   | 21   | 400    | 0        | Default text, menu items, document names (600)                          |
| `label`     | Hanken Grotesk   | 15   | 20   | 600    | 0        | Buttons, text buttons, segmented controls                               |
| `callout`   | Hanken Grotesk   | 13   | 18   | 400    | 0        | Meta lines, helper text, field labels (600)                             |
| `caption`   | Hanken Grotesk   | 12   | 16   | 500    | 0        | Group headers, counts, save status                                      |
| `micro`     | Hanken Grotesk   | 11   | 13   | 600    | 0.1      | Tab labels, badges. `maxFontSizeMultiplier` 1.6                         |
| `mono`      | system monospace | 13   | 18   | 400    | 0        | Keys, URLs, JSON, CSS                                                   |
| `pageThumb` | Newsreader       | —    | —    | 400    | 0        | Live letter text on letter cards; scales with the card (3.3% of width)  |

**Dynamic Type and font scale.** Every text style scales (`allowFontScaling` stays on). Layouts are drawn to survive 200% (Builder Write is drawn at 200% in `builder.html`). Only `micro` caps its multiplier, so tab labels and badges stay inside their 44 pt targets; the tab bar switches to icons over labels in a taller bar instead of truncating.

## 3. Spacing

A 4 pt grid. Use the token, not the number.

| Token | pt  | Use                                                         |
| ----- | --- | ----------------------------------------------------------- |
| `s0`  | 2   | Icon-to-label inside badges, tab icon to label              |
| `s1`  | 4   | Tight gaps, chip row gap                                    |
| `s2`  | 8   | Gap between related controls, list row icon gap             |
| `s3`  | 12  | Card padding, gap between cards in a row                    |
| `s4`  | 16  | Screen side padding on phone, form field gap, sheet padding |
| `s5`  | 20  | Between groups in a form                                    |
| `s6`  | 24  | Between sections, tablet content padding                    |
| `s8`  | 32  | Empty-state vertical rhythm                                 |
| `s10` | 40  | Top padding of empty and sign-in screens                    |
| `s12` | 48  | Tablet content side padding at 1180 pt                      |

### 3.1 Sizes

| Token         | pt                | Use                                                                                                        |
| ------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `hit`         | 44                | Minimum touch target, both platforms. Smaller visuals extend their hit area with `hitSlop`                 |
| `row`         | 52                | Settings and menu rows with one line; 64 with a second line                                                |
| `input`       | 46                | Text field height                                                                                          |
| `button`      | 48                | Primary button height (full-width buttons in forms and sheets)                                             |
| `chip`        | 32                | Chip visual height; `hitSlop` 6 above and below reaches 44                                                 |
| `tabBar`      | 52                | Phone tab bar height, plus the bottom safe area                                                            |
| `topBar`      | 44                | iOS navigation bar (plus 52 for the large title); Android top app bar is 64                                |
| `editorBar`   | 56                | Builder top bar (web `--editor-bar`)                                                                       |
| `newPill`     | 34×26             | The raised "+" pill in the tab bar; the whole tab cell is the 44 pt target                                 |
| `grabber`     | 36×5              | Sheet grabber visual (Android 32×4); the whole 22 pt sheet-head strip plus the header row is the drag area |
| `sidebar`     | 240               | Tablet app sidebar (web `--app-sidebar`)                                                                   |
| `panel`       | 400               | Tablet builder panel and assistant panel (web `--editor-panel`, `--assistant`)                             |
| `formSheet`   | 540               | Tablet form-sheet width for phone-sized flows (New, Tags, Copy for a job, Settings detail)                 |
| `sheetShare`  | 440               | Tablet Share & export (web `--sheet-share`)                                                                |
| `sheetDetail` | 480               | Tablet application detail (web `--sheet-detail`)                                                           |
| `icon`        | 16 / 20 / 22 / 24 | Phosphor sizes: inline meta 16, list rows 20, toolbars 22, tab bar and nav bar 24                          |

## 4. Radii

| Token     | pt  | Use                                                         |
| --------- | --- | ----------------------------------------------------------- |
| `rSm`     | 6   | Chips (non-pill), small buttons, document thumbnails        |
| `rMd`     | 8   | Controls, segmented items, Android menu                     |
| `rLg`     | 10  | Inputs, list items, entry cards                             |
| `rXl`     | 12  | Cards, iOS menus, search field (iOS), banners, list groups  |
| `r2xl`    | 16  | Dialogs, tablet form sheets                                 |
| `r3xl`    | 18  | iOS bottom sheets (top corners)                             |
| `r4xl`    | 24  | Large hero tiles                                            |
| `rSheetA` | 28  | Android bottom sheets (Material 3) and Android search field |
| `rPill`   | 999 | Pills: chips, badges, the New pill, switches                |

## 5. Shadows

React Native 0.88 with the New Architecture supports the CSS-style `boxShadow` prop on both platforms, with several layers. Use it first. The legacy columns are the fallback for Android below API 28 (minSdk is 24), where `boxShadow` is ignored and only `elevation` draws.

| Token   | `boxShadow` (light)                                | `boxShadow` (dark)                                 | iOS legacy (`shadowColor`, offset, opacity, radius) | Android `elevation` |
| ------- | -------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------- | ------------------- |
| `e1`    | `0 1px 2px #17161112`                              | `0 1px 2px #00000066`                              | `#171611`, (0, 1), 0.07 / dark `#000` 0.4, 1        | 1                   |
| `e2`    | `0 1px 2px #1716110F, 0 10px 28px -8px #1716112E`  | `0 1px 2px #00000066, 0 12px 32px -8px #0000008C`  | `#171611`, (0, 6), 0.14 / dark 0.5, 12              | 4                   |
| `e3`    | `0 2px 6px #17161114, 0 28px 64px -16px #1716114D` | `0 2px 6px #00000066, 0 28px 64px -12px #000000B3` | `#171611`, (0, 16), 0.22 / dark 0.6, 28             | 12                  |
| `ePage` | `0 1px 2px #17161114, 0 12px 36px -12px #17161140` | `0 1px 2px #00000066, 0 12px 36px -12px #00000099` | `#171611`, (0, 6), 0.18 / dark 0.5, 14              | 3                   |

- `e1`: cards in a list, the selected segment, chips that float over the page.
- `e2`: menus on tablet, the zoom bar, toasts on tablet.
- `e3`: bottom sheets, dialogs, phone menus, the "Edit entry" bar, toasts on phone.
- `ePage`: the resume page and document thumbnails.
- Android menus and sheets use their Material elevation; tonal surface tint is off (we draw `raised`).

## 6. Motion

| Token        | Value                              | Use                                                                    |
| ------------ | ---------------------------------- | ---------------------------------------------------------------------- |
| `d1`         | 120 ms                             | Quick: press feedback, toggles, checkbox, chip select, outline draw-in |
| `d2`         | 200 ms                             | Standard: menus, expand and collapse, cross-fades, toasts, banners     |
| `d3`         | 320 ms                             | Emphasized: sheets, full-screen pushes and modals, shared-element open |
| `ease`       | `Easing.bezier(0.2, 0.8, 0.2, 1)`  | Default curve for everything entering or changing                      |
| `easeMove`   | `Easing.bezier(0.77, 0, 0.175, 1)` | On-screen movement: sliding tab indicator, reorder settling            |
| `easeDrawer` | `Easing.bezier(0.32, 0.72, 0, 1)`  | A sheet settling after a drag release (web `--ease-drawer`)            |

- **Navigation.** Stack pushes use the platform transition (iOS slide, Android fade-through) with duration `d3`. Do not replace them with custom curves.
- **Reduced motion.** When `AccessibilityInfo.isReduceMotionEnabled()` (iOS Reduce Motion, Android "Remove animations") is on: `d1`, `d2` and `d3` become 0 for movement; changes that would slide or scale become a cross-fade of `d1`. Sheets appear at their detent without travel. Skeleton shimmer stops and shows a static `sunken` block. Progress bars and spinners keep moving, because they carry information.
- **Haptics.** Selection haptic on segmented and detent changes; light impact on long-press to select; success / warning notification haptics on import done and destructive confirm. No haptics with reduced motion off is fine; haptics are separate from motion.

## 7. Platform mapping summary

| Thing         | iOS                                                    | Android                                                                 |
| ------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| Back          | `caret-left` 24 + previous title, edge swipe           | `arrow-left` 24, system back gesture                                    |
| Large title   | `largeIOS`, collapses on scroll                        | `largeAnd` in a large top app bar, collapses to 22                      |
| Lists         | Inset grouped, `raised` groups with `rXl` on `bg`      | Full-width rows on `bg`, `line` dividers, group headers in `accentText` |
| Bottom sheets | `r3xl` corners, grabber 36×5                           | `rSheetA` corners, handle 32×4                                          |
| Menus         | `raised`, `rXl`, `e3`, 44 pt rows                      | `raised`, `rMd`, `e3`, 48 pt rows, no inner padding                     |
| Alerts        | Centred alert, `r2xl`, stacked or side-by-side buttons | Material dialog, `rSheetA`, right-aligned text buttons                  |
| Toasts        | Centred pill above the tab bar, `ink` on `bg` reversed | Snackbar, full width minus 16, left-aligned, action at end              |
| Switch        | 51×31 pill, `accent` on                                | Material 3 switch 52×32, `accent` track on, `onAccent` thumb            |
| Active tab    | `accent` 28×3 marker above the icon, filled icon       | `accentSoft` 56×30 pill behind the filled icon                          |
| Search field  | `sunken`, `rXl`, 44 tall                               | `sunken`, `rSheetA`, 48 tall                                            |
| Pressed       | `press` highlight                                      | Ripple in `press`                                                       |
| Status bar    | Follows theme                                          | Edge-to-edge, follows theme                                             |
