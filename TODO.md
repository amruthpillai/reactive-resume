1. Feature: Implement a new custom section type: `summary`

This custom section type is simply a section item that displays a block of rich text content, without the need for a title or any other fields. The dialog to create or update this section should only comprise of a single field `content`, which should be a RichInput component. The section should be displayed in a similar fashion to most other sections which have a `description` field, to use the sanitized HTML output and pipe it to a `div` through the `__dangerouslySetInnerHTML` prop. When displayed on a resume, the section item should not display the title of the section either (so there is no heading or <h6> tag), it must only display the content. A custom section of type `summary` may contain multiple section items. Each section item should have it's own `baseItemSchema` and `content` field.

2. Feature: Rich Input Editor can be made full-screen, to allow the user to write the content in a more comfortable way.

There should be a floating button on the bottom right of the editor, which when clicked, will make the editor full-screen. The button should have an icon of a fullscreen icon (e.g. <ArrowsOutSimpleIcon />). When the editor is in full-screen mode, the button should be replaced with a button to exit full-screen (e.g. <ArrowsInSimpleIcon />), or clicking outside the editor should also exit full-screen mode.

The full-screen mode can be achieved by overlaying a Dialog over the entire page, with the editor (including the toolber on top) as the only content inside the Dialog. The Dialog should be styled to cover the entire screen (with a bit of margin or empty space on the edges of the viewport (95svw, 95svh), and the editor should be styled to fill the entire Dialog, with no internal padding. The Dialog should have a close button in the bottom right corner, which when clicked, will exit full-screen mode.

3. Feature: Introduce a new custom section type: `cover-letter`

This custom section type should consist of the following fields:
- `recipients`: an array of objects, each with the following fields:
  - `id`: a unique identifier for the recipient
  - `content`: a RichInput component for the recipient's full address (name, company, address, email, etc.)
- `recipientId`: the id of the recipient to use for the cover letter, must be one of the ids in the `recipients` array.
- `body`: a RichInput component for the body of the cover letter.

The dialog to create or update this section should comprise of a form that displays a list of the `recipients`, and a RichInput component for the `body` field. The list of the recipients must look like vertical cards with no gap in between (similar to the accordion, but with borders and rounded corners on the outer most edges).

Each "card" must be clickable, and when clicked, will select the recipient and update the `recipientId` field. When hovering over a card, the bottom of the card (a footer) should appear (sliding down from top) to reveal four buttons: a button to reorder the recipient (use the custom drag listener `useDragControls` from motion/react), a button to edit the recipient, a button to duplicate the recipient (should clone the content, but replace with a new id), and a button to delete the recipient.

These cards must be associated with a label on top, which displays the title `Recipients`. On the other end of this label (use justify-between) should be a button (size=sm) to "+ Add a new recipient", which when clicked, should display a popover with a form to create a new recipient. The form should simply display the RichInput component for the `content` field, and a button to save the changes, which would create a new recipient and close the popover.

Inside the `content` field of a new recipient, there should be placeholder text to guide the user on what to type in the field, an example would be `John Doe,\nSenior Software Engineer,\nAcme Corp,\n123 Main St, Anytown, USA,\njohn.doe@acme.com`.

The `body` field should be a RichInput component that is styled to fill the entire width of the dialog, and the `recipients` list should be scrollable if there are more than one recipient (max height of 360px).

The user should be able to toggle between the recipients by simply clicking on the recipient's card. When the recipient is active, a white <CheckCircleIcon weight="fill" /> should appear on the top right side of the card.

The section should be displayed on a resume in a similar fashion to most other sections which have a `description` field, to use the sanitized HTML output and pipe it to a `div` through the `__dangerouslySetInnerHTML` prop. When displayed on a resume, the section should not display the title of the section either (so there is no heading or <h6> tag), it must only display the content.
