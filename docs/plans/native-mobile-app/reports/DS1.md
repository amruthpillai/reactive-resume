# DS1 report: two mobile design directions

Deliverable: `docs/plans/native-mobile-app/mockups/index.html`. It is one self-contained page. The only other files are the six template previews copied into `mockups/assets/`.

**Controls:**

- Direction A / B
- Light / Dark
- iPhone 393×852 / Android 412×915, with Material-style system bars and a back-gesture note under each frame

**What each screen shows:**

- **States.** Each screen has its own state switch:
  - Documents: Library, Multi-select
  - Write: Outline, Section menu, Entry editor
  - Page: Page, Line tapped / Entry selected
- **Interactive parts:**
  - type tabs and tag chips filter the library
  - press and hold a card to start selecting
  - the sheet in Direction A drags between three detents
  - lines on the page select
  - the zoom bar works
  - in B, Edit entry jumps to the Write frame with the entry open
- **Interaction notes** sit under every screen: gestures, detents, motion (d1/d2/d3 on `cubic-bezier(.2,.8,.2,1)`, reduced motion) and iOS versus Android.

## Rationale: Direction A, "Paper first"

1. A resume is judged as a page, so the builder opens on the page, and every edit happens with the page in view.
2. Write, Design and Check are three modes of one sheet with Peek / Half / Full detents. There is one surface to learn instead of four tabs.
3. Tapping a line on the page opens that entry in the sheet at Half. The page scrolls so the outlined line stays visible above the sheet. There is no intermediate Edit entry step.
4. The Documents grid gives the thumbnail most of the space, and the raised round "+" makes New the most obvious action.
5. Cost:
   - Page pinch and pan compete with the sheet drag.
   - While typing, the keyboard and Full sheet leave only a strip of page.
   - It diverges from the web phone layout and from `docs/guides/editing-on-mobile.mdx`.

## Rationale: Direction B, "Outline first"

1. It mirrors today's web phone layout: bottom tabs Write · Page · Design · Check, the editor bar, the "New" pill, full-screen entries. Users, guides and screenshots carry over.
2. Most phone sessions are typing. A full-screen entry gives fields, the rich-text toolbar and the keyboard the whole height, which also suits 200% Dynamic Type and RTL.
3. The outline in print order, with page markers, drag handles and section menus, is the densest overview of the resume on a small screen.
4. The page is one tab away and keeps its zoom and scroll. Tapping a line outlines it and offers Edit entry, as on the web.
5. Cost: the page is never visible while you write. Seeing an edit's effect takes a tab switch, and Edit entry is one tap more than in A.

## Recommendation

**Build B, and borrow one thing from A.**

**Why B:**

- §1.5 already maps the phone builder to Write/Page/Design/Check tabs "like web".
- Parity work, guides and tests line up with B.
- Text entry dominates on a phone, and B gives it the whole screen.

**What to borrow from A:** on the Page tab, a tapped line opens its entry in a Half sheet over the page instead of switching to Write.

- It reuses the same entry form component.
- The page stays in view for quick fixes.
- Expand to Full goes to the full-screen entry.

**Documents:** keep B's list rows as the phone default and keep the web's Grid / List view option. Grid is A's layout.

**Tablet:** the tablet layout (panel beside the page) already gives A's benefit, so A's idea is not lost.

## Open questions for the owner

1. **Direction:** A, B, or the B + A-page-sheet mix recommended above? (G2a)
2. **Raised "+":** A's 56 pt round button lifted above the bar, or B's web pill (34×26, labelled New)?
3. **Undo and redo on a phone:** neither direction has a home for them yet. The web relies on keyboard shortcuts and Undo toasts. Options:
   - undo/redo buttons in the editor bar
   - inside the document menu
   - shake to undo on iOS only
4. **Download PDF in Direction A:** the floating bar fits four buttons. Is Download PDF acceptable only inside Share & export (Download tab)?
5. **Trash:** I placed Trash as a row at the end of the library. The web shows it in the sidebar only when it is not empty. Is that placement acceptable?
6. **Letter cards:** they show the letter's opening lines as live text, because there is no template preview image for letters. Is that acceptable, or should letter cards wait for real on-device first-page renders?

## Web capabilities on these three screens with no home in the mockups yet

Shown only as a toast or a bare button, or not drawn at all.

**Documents**

- Sort and View menu (Last edited, Created, Name; Grid, List): there is a button but no menu.
- Card and row options menu: Open, Rename, Duplicate, Copy for a job…, Tags…, Link to application…, Copy public link, Lock editing / Unlock, Move to Trash, Delete now… (in Trash).
- Inside the multi-select Sharing menu: Make public, Make private, Lock editing, Unlock.
- Nav counts and badges: the Documents count, the open Applications count and Career unread are not shown on the tab bar.
- Command palette ("Search or run…"; §1.5 `search.tsx`): it has no entry point. The search field only searches documents.
- Linked application on a card, and search by linked application.
- Empty-library state: "Let's start with what you have", with Start blank, Try a sample and Choose a file.
- The guest banner.
- The New document sheet contents: Import a resume, Copy a resume for a job, Start blank, New cover letter instead, and import progress.

**Builder · Write**

- Basics editing: fields, Add field, links. Picture upload with crop and its settings.
- The Summary editor.
- Add section and Custom section creation ("What goes in it?").
- The Hidden sections group, and the look of a hidden section.
- Section menu items not drawn:
  - Icon…
  - Columns submenu
  - Keyword layout / Bulleted list / Inline
  - Move up / Move down, which is the accessible alternative to dragging
- Entry options menu: Duplicate, Hide from page, Move to…, Delete.
- Roles (Add role, several roles per Experience entry).
- The Link field with "Show link in title"; More options.
- The Improve flow: Improve selected line, Make it shorter, Stronger verb, Add a result, Ask, Replace, Keep mine.
- Further rich-text controls behind "More formatting":
  - headings and text style
  - highlight and text colour
  - alignment
  - indent and outdent
  - code and strikethrough
  - horizontal line
  - clear formatting
- Banners and save states (planned for D2):
  - "Locked. Unlock to edit."
  - "Imported from …" review
  - the offline banner
  - Saving…, "Offline · saved on this device", "Not saved · Retry"
- Date parsing hints and the "end is before the start" error.
- Undo and redo (see question 3).

**Builder · Page**

- The Check issue stepper on the page: Issue 1 of 3, Previous issue, Next issue, and the fix card.
- Page 2 onwards. The template previews are single pages, so only page 1 is drawn. Also "Fit to {n} pages", and the free-form format label.
- Template preview on the page ("Previewing … · click to apply"). This belongs to Design.
- Document menu: Rename…, Details, Notes, Duplicate, Lock editing, Print, Move to Trash. Print needs a decision: system print on iOS and Android.
- History, which is reachable only through Share & export, as on the web phone layout.
- The "Public" badge on Share when the resume's link is on.
- Assistant: only the button is drawn.

## Notes

- The brief asks for the `artifact-design` skill. It is not installed in this environment, so I loaded `frontend-design` instead. Nothing was published.
- **Fonts and colours:**
  - Only Hanken Grotesk and Newsreader are used, from Google Fonts.
  - Every colour is a Desk & Paper token. Keyboards, status bars and bezels are drawn with neutral tokens as stand-ins for system UI.
  - Paper is white in both themes.
- **Sizes:** touch targets are at least 44 pt. Chips are 32 pt pills inside 44 pt hit areas. Input text is 16 pt.
- **Content:**
  - The page imagery is the real Onyx template preview.
  - The preview's header name (Marcus Chen) and the sample's experience entries (Cascade Studios, Pixel Forge Interactive) both come from that image and from `sample.ts`.
  - Document names use the glossary's fictional companies.
- The page lines that can be tapped are hand-measured hit areas on the Onyx preview.
