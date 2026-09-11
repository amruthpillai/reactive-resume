import type { PdfCategory } from "./types";

/**
 * The whole scoring table, as one auditable object.
 *
 * - `blocker` rules put a hard ceiling on the overall score. A file with no text
 *   layer cannot score 82 no matter how tidy the rest of it is.
 * - `warning` rules deduct from their category once, however many times they fire.
 * - `tip` rules never touch any score. They are human-preference advice, and are
 *   reported as an unscored checklist.
 */
type PdfRuleReference =
	| { severity: "blocker"; category: PdfCategory; cap: number; meaning: string; action: string }
	| { severity: "warning"; category: PdfCategory; deduction: 5 | 10 | 15; meaning: string; action: string }
	| { severity: "tip"; category: PdfCategory; meaning: string; action: string };

export const PDF_ATS_RULE_CATALOG_V1 = {
	// -------------------------------------------------------------------------
	// Parseability — can software recover the words at all?
	// -------------------------------------------------------------------------
	NO_TEXT_LAYER: {
		severity: "blocker",
		category: "parseability",
		cap: 10,
		meaning: "The file carries no extractable text, so a parser recovers nothing from it.",
		action: "Export the resume as a text PDF rather than an image or a scan.",
	},
	IMAGE_ONLY_DOCUMENT: {
		severity: "blocker",
		category: "parseability",
		cap: 10,
		meaning: "The pages are images with little or no text behind them, which is what a scan looks like.",
		action: "Export from the original document instead of scanning or screenshotting it.",
	},
	GARBLED_TEXT: {
		severity: "blocker",
		category: "parseability",
		cap: 25,
		meaning: "The extracted text is largely unreadable, so the words a parser stores will not be your words.",
		action: "Re-export the file, embedding standard fonts, and open the result to confirm the text copies cleanly.",
	},
	TYPE3_FONT: {
		severity: "blocker",
		category: "parseability",
		cap: 25,
		meaning: "The file uses Type 3 fonts, which carry drawing instructions rather than characters.",
		action: "Re-export using a normal TrueType or OpenType font.",
	},
	INVALID_EMBEDDED_FONT: {
		severity: "blocker",
		category: "parseability",
		cap: 25,
		meaning: "An embedded font could not be read, so its glyphs may extract as the wrong characters.",
		action: "Re-export the file from the original document with fonts embedded properly.",
	},
	FILE_TOO_LARGE: {
		severity: "blocker",
		category: "parseability",
		cap: 40,
		meaning: "The file exceeds the upload limit many application systems enforce.",
		action: "Keep the file under 2.5 MB — usually by removing or downsampling images.",
	},
	ENCRYPTED_PDF: {
		severity: "blocker",
		category: "parseability",
		cap: 40,
		meaning: "The file is encrypted, so a parser may be unable to open it at all.",
		action: "Save an unprotected copy without a password or permissions restrictions.",
	},
	XFA_FORM: {
		severity: "blocker",
		category: "parseability",
		cap: 40,
		meaning: "The file is an XFA form. Most parsers read the static shell and miss the real content.",
		action: "Print or export the form to a flat PDF before sending it.",
	},
	PDF_PORTFOLIO: {
		severity: "warning",
		category: "parseability",
		deduction: 15,
		meaning: "The file is a PDF Portfolio: the visible page is a cover, and the content sits in attachments.",
		action: "Send the resume itself rather than a portfolio wrapper.",
	},
	REPLACEMENT_CHARACTERS: {
		severity: "warning",
		category: "parseability",
		deduction: 15,
		meaning: "Some characters extract as the replacement character, so those words are lost.",
		action: "Re-export with fonts embedded, and check that the text copies out cleanly.",
	},
	PRIVATE_USE_CHARACTERS: {
		severity: "warning",
		category: "parseability",
		deduction: 15,
		meaning: "Some glyphs map into the private-use area, which carries no agreed meaning outside this file.",
		action: "Replace icon fonts with plain text, and re-export.",
	},
	LIGATURE_CHARACTERS: {
		severity: "warning",
		category: "parseability",
		deduction: 10,
		meaning: "Ligature glyphs extract as single characters, so words such as 'workflow' can lose letters.",
		action: "Disable discretionary ligatures when exporting, or use a font that maps them back to letters.",
	},
	NON_EMBEDDED_FONTS: {
		severity: "warning",
		category: "parseability",
		deduction: 5,
		meaning: "A font is referenced but not embedded, so the reader substitutes one and character mapping can drift.",
		action: "Embed all fonts when exporting.",
	},
	INVISIBLE_TEXT: {
		severity: "warning",
		category: "parseability",
		deduction: 15,
		meaning: "The file contains text drawn invisibly. A reader sees nothing there, but a parser reads it.",
		action: "Remove hidden text. If it came from OCR, that is expected; otherwise it looks like keyword stuffing.",
	},
	WHITE_TEXT: {
		severity: "warning",
		category: "parseability",
		deduction: 15,
		meaning: "The file contains white-on-white text, a pattern recruiters treat as deliberate keyword stuffing.",
		action: "Delete the hidden text.",
	},
	LOW_TEXT_DENSITY: {
		severity: "warning",
		category: "parseability",
		deduction: 10,
		meaning: "Very little text was recovered for the number of pages, which suggests most content did not extract.",
		action: "Open the exported file and confirm you can select and copy every part of it.",
	},
	HIGH_IMAGE_COVERAGE: {
		severity: "warning",
		category: "parseability",
		deduction: 10,
		meaning: "Images cover most of the page, so any words inside them are invisible to a parser.",
		action: "Keep resume content as real text rather than as pictures of text.",
	},
	LOST_WORD_SPACING: {
		severity: "warning",
		category: "parseability",
		deduction: 10,
		meaning: "Words run together in the extracted text, so keyword search will not find them.",
		action: "Re-export from the original document rather than converting from another format.",
	},
	SPLIT_CHARACTER_SPACING: {
		severity: "warning",
		category: "parseability",
		deduction: 10,
		meaning: "Text is emitted one character at a time, which commonly breaks words apart on extraction.",
		action: "Avoid heavy letter-spacing effects, and re-export.",
	},
	VERTICAL_TEXT: {
		severity: "warning",
		category: "parseability",
		deduction: 10,
		meaning: "Some text is rotated. Rotated runs are frequently dropped or misplaced during extraction.",
		action: "Lay the text out horizontally.",
	},
	ROTATED_PAGES: {
		severity: "warning",
		category: "parseability",
		deduction: 5,
		meaning: "A page is rotated, which shifts where extracted text is thought to sit.",
		action: "Save the file with all pages upright.",
	},
	ACROFORM_FIELDS: {
		severity: "warning",
		category: "parseability",
		deduction: 10,
		meaning:
			"The file contains form fields. Text typed into a field can be missed by parsers that read page content only.",
		action: "Flatten the form before sending it.",
	},
	NON_STANDARD_PAGE_SIZE: {
		severity: "warning",
		category: "parseability",
		deduction: 5,
		meaning: "The page is not a common resume size, which can shift layout when the file is re-rendered.",
		action: "Use A4 or US Letter.",
	},
	UNTAGGED_PDF: {
		severity: "tip",
		category: "parseability",
		meaning: "The file has no accessibility tags. Tags give a parser an explicit reading order to follow.",
		action: "Export with tagged-PDF or accessibility options enabled where your tool offers them.",
	},
	MISSING_DOCUMENT_LANGUAGE: {
		severity: "tip",
		category: "parseability",
		meaning: "The file declares no language, which some tools use to pick tokenisation rules.",
		action: "Set the document language when exporting.",
	},
	LARGE_FILE_SIZE: {
		severity: "tip",
		category: "parseability",
		meaning: "The file is large for a resume, which slows uploads and occasionally trips size limits.",
		action: "Compress or remove large images.",
	},
	TRUNCATED_ANALYSIS: {
		severity: "tip",
		category: "parseability",
		meaning: "Only the first pages were analysed, so this report does not cover the whole file.",
		action: "Nothing to fix — the remaining pages were simply not checked.",
	},

	// -------------------------------------------------------------------------
	// Layout — does the geometry preserve reading order?
	// -------------------------------------------------------------------------
	MULTI_COLUMN_LAYOUT: {
		severity: "blocker",
		category: "layout",
		cap: 55,
		meaning: "The page is laid out in columns and the text extracts out of order, interleaving the columns.",
		action: "Use a single-column layout for anything a parser must read in sequence.",
	},
	READING_ORDER_INVERSION: {
		severity: "blocker",
		category: "layout",
		cap: 55,
		meaning:
			"The order text is stored in disagrees badly with the order it is read in, so extracted lines are scrambled.",
		action: "Re-export from a single-column layout, then copy the text out and check that it reads top to bottom.",
	},
	READING_ORDER_RISK: {
		severity: "warning",
		category: "layout",
		deduction: 15,
		meaning: "Stored order and reading order disagree in places, so some extracted lines may arrive out of sequence.",
		action: "Copy the text out of the exported file and read it through; fix whatever arrives in the wrong order.",
	},
	COLUMN_GUTTER: {
		severity: "warning",
		category: "layout",
		deduction: 15,
		meaning: "A full-height empty band splits the page, which is the shape parsers most often read out of order.",
		action: "Prefer a single column, or keep the side column to short, self-contained lists.",
	},
	TABLE_LIKE_LAYOUT: {
		severity: "warning",
		category: "layout",
		deduction: 10,
		meaning: "Content is arranged in a grid. Table cells extract in storage order, which is rarely reading order.",
		action: "Replace tables with plain paragraphs and lists.",
	},
	TEXT_IN_MARGIN_ZONE: {
		severity: "warning",
		category: "layout",
		deduction: 10,
		meaning: "Contact details sit in the header or footer strip, where some parsers discard them entirely.",
		action: "Move your email and phone number into the body of the page.",
	},
	TIGHT_LINE_SPACING: {
		severity: "warning",
		category: "layout",
		deduction: 5,
		meaning: "Lines are packed tightly enough that extraction can merge two lines into one.",
		action: "Increase line spacing.",
	},
	SMALL_BODY_TEXT: {
		severity: "warning",
		category: "layout",
		deduction: 10,
		meaning: "The body text is very small, which hurts both human readers and any re-rendered copy.",
		action: "Use at least 9pt for body text.",
	},
	MANY_DISTINCT_FONTS: {
		severity: "warning",
		category: "layout",
		deduction: 5,
		meaning: "The file uses many different fonts, which raises the chance one of them maps badly.",
		action: "Keep to two or three font families.",
	},
	NARROW_PAGE_MARGINS: {
		severity: "warning",
		category: "layout",
		deduction: 5,
		meaning: "Margins are narrow enough that content sits at the very edge of the page.",
		action: "Leave at least half an inch of margin.",
	},
	TEXT_OUTSIDE_PAGE: {
		severity: "warning",
		category: "layout",
		deduction: 10,
		meaning: "Some text falls outside the visible page box, so it prints and reads inconsistently.",
		action: "Move all content inside the page boundaries and re-export.",
	},
	NON_STANDARD_BULLET_GLYPHS: {
		severity: "warning",
		category: "layout",
		deduction: 5,
		meaning: "Bullets are drawn with unusual glyphs that can extract as stray characters mid-sentence.",
		action: "Use your editor's normal bullet list rather than a decorative character.",
	},
	REPEATED_HEADER_FOOTER: {
		severity: "tip",
		category: "layout",
		meaning: "The same line repeats at the top or bottom of every page, and will repeat in extracted text too.",
		action: "Keep repeated running heads short, or drop them.",
	},
	DENSE_PAGE: {
		severity: "tip",
		category: "layout",
		meaning: "The page is very densely packed, which makes it hard for a person to skim.",
		action: "Add whitespace between sections.",
	},

	// -------------------------------------------------------------------------
	// Sections — is the resume segmented the way a parser expects?
	// -------------------------------------------------------------------------
	NO_EXPERIENCE_SECTION: {
		severity: "blocker",
		category: "sections",
		cap: 60,
		meaning: "No work-experience section was found, and experience is the field most screening systems rank on.",
		action: "Add a section headed 'Experience' or 'Work Experience'.",
	},
	NO_RECOGNIZED_HEADINGS: {
		severity: "warning",
		category: "sections",
		deduction: 15,
		meaning: "No conventional section headings were found, so a parser has no way to segment the document.",
		action: "Use plain headings such as 'Experience', 'Education', and 'Skills'.",
	},
	FEW_SECTION_HEADINGS: {
		severity: "warning",
		category: "sections",
		deduction: 10,
		meaning: "Only one recognisable section heading was found, which leaves most of the resume unsegmented.",
		action: "Break the resume into the usual sections.",
	},
	NO_EDUCATION_SECTION: {
		severity: "warning",
		category: "sections",
		deduction: 10,
		meaning: "No education section was found. Many systems have a required education field.",
		action: "Add a section headed 'Education'.",
	},
	NO_SKILLS_SECTION: {
		severity: "warning",
		category: "sections",
		deduction: 10,
		meaning: "No skills section was found, and recruiters search skills far more than any other field.",
		action: "Add a section headed 'Skills' listing the tools and technologies you use.",
	},
	HEADINGS_NOT_DISTINGUISHED: {
		severity: "warning",
		category: "sections",
		deduction: 10,
		meaning: "Section headings are set in the same size and case as body text, so they are hard to detect.",
		action: "Make headings visibly larger, bolder, or capitalised.",
	},
	VERY_SHORT_DOCUMENT: {
		severity: "warning",
		category: "sections",
		deduction: 15,
		meaning: "Very few words were recovered for a resume, which usually means most content did not extract.",
		action: "Confirm the exported file contains everything you expect, and that all of it is selectable text.",
	},
	NO_BULLET_POINTS: {
		severity: "warning",
		category: "sections",
		deduction: 5,
		meaning: "No bullet lists were found. Solid paragraphs are harder to segment and harder to skim.",
		action: "Describe each role with short bullets.",
	},
	NO_ROLE_LINES: {
		severity: "warning",
		category: "sections",
		deduction: 10,
		meaning: "No lines look like a job title paired with an employer, which is the pattern parsers key roles on.",
		action: "Write each role as a clear title and company line, with the dates alongside.",
	},
	NO_SUMMARY_SECTION: {
		severity: "tip",
		category: "sections",
		meaning: "There is no summary or profile paragraph to orient a reader in the first few seconds.",
		action: "Add two or three lines at the top describing what you do.",
	},

	// -------------------------------------------------------------------------
	// Contact — will the system be able to reach you?
	// -------------------------------------------------------------------------
	NO_EMAIL: {
		severity: "blocker",
		category: "contact",
		cap: 50,
		meaning: "No email address was found. Email is the field most systems key a candidate record on.",
		action: "Put a plain email address near the top of the first page.",
	},
	NO_PHONE: {
		severity: "warning",
		category: "contact",
		deduction: 15,
		meaning: "No phone number was found, and some application forms require one before you can submit.",
		action: "Add a phone number with its country code.",
	},
	NO_NAME_LINE: {
		severity: "warning",
		category: "contact",
		deduction: 15,
		meaning: "The top of the first page does not look like a name, so the record may be filed without one.",
		action: "Start the resume with your name on its own line.",
	},
	CONTACT_NOT_ON_FIRST_PAGE: {
		severity: "warning",
		category: "contact",
		deduction: 10,
		meaning: "Contact details are not on the first page, where nearly every parser looks for them.",
		action: "Move your email and phone number to the top of page one.",
	},
	EMAIL_SPLIT_ACROSS_ITEMS: {
		severity: "warning",
		category: "contact",
		deduction: 15,
		meaning: "The email address appears broken across text runs, so it may extract as fragments.",
		action: "Write the address as one uninterrupted piece of text, with no special spacing.",
	},
	LINK_TEXT_URL_MISMATCH: {
		severity: "warning",
		category: "contact",
		deduction: 10,
		meaning: "A link points somewhere other than the address it displays, so the visible text is misleading.",
		action: "Make the visible text and the link destination match.",
	},
	MULTIPLE_EMAILS: {
		severity: "tip",
		category: "contact",
		meaning: "More than one email address appears, and a parser may pick the wrong one.",
		action: "Keep a single address on the resume.",
	},
	NO_PROFESSIONAL_LINK: {
		severity: "tip",
		category: "contact",
		meaning: "There is no link to a profile, portfolio, or repository for a reader to follow.",
		action: "Add one link that shows your work.",
	},
	BARE_URL_WITHOUT_PROTOCOL: {
		severity: "tip",
		category: "contact",
		meaning: "A web address is written without https://, so it may not be recognised as a link.",
		action: "Write the full address, including https://.",
	},
	PHONE_FORMAT_UNUSUAL: {
		severity: "tip",
		category: "contact",
		meaning: "The phone number is written in a shape some parsers will not recognise.",
		action: "Use a plain international form such as +1 555 010 1234.",
	},

	// -------------------------------------------------------------------------
	// Dates — can your timeline be reconstructed?
	// -------------------------------------------------------------------------
	NO_DATES_FOUND: {
		severity: "blocker",
		category: "dates",
		cap: 60,
		meaning: "No dates were found, so no system can place your roles on a timeline or compute years of experience.",
		action: "Add a period to every role, such as 'Jan 2020 - Present'.",
	},
	FEW_DATES: {
		severity: "warning",
		category: "dates",
		deduction: 15,
		meaning: "Very few dates were found for the amount of history on the page, so entries are missing periods.",
		action: "Give every role and qualification a date range.",
	},
	UNPARSEABLE_DATE_RANGE: {
		severity: "warning",
		category: "dates",
		deduction: 15,
		meaning: "A date range is written in a form most parsers cannot read.",
		action: "Use a recognised form such as 'Jan 2020 - Mar 2022' or '2020 - 2022'.",
	},
	REVERSED_DATE_RANGE: {
		severity: "warning",
		category: "dates",
		deduction: 15,
		meaning: "A date range ends before it starts.",
		action: "Swap the start and end dates.",
	},
	FUTURE_DATED_ENTRY: {
		severity: "warning",
		category: "dates",
		deduction: 10,
		meaning: "A date is in the future, which reads as a typo to a reviewer and to a parser.",
		action: "Correct the year, or write 'Present' for ongoing work.",
	},
	MIXED_DATE_FORMATS: {
		severity: "warning",
		category: "dates",
		deduction: 5,
		meaning: "Dates are written several different ways, and some parsers only recognise one of them.",
		action: "Pick one date format and use it everywhere.",
	},
	NO_CURRENT_ROLE_MARKER: {
		severity: "tip",
		category: "dates",
		meaning: "Nothing marks a role as ongoing, so a reader cannot tell what you are doing now.",
		action: "Write 'Present' as the end date of your current role.",
	},
	AMBIGUOUS_NUMERIC_DATE: {
		severity: "tip",
		category: "dates",
		meaning: "A numeric date such as 03/04/2022 reads differently in different regions.",
		action: "Spell the month, as in 'Mar 2022'.",
	},

	// -------------------------------------------------------------------------
	// Content — unscored advice. These never move any number in this report.
	// -------------------------------------------------------------------------
	NO_QUANTIFIED_IMPACT: {
		severity: "tip",
		category: "content",
		meaning: "Almost no bullet carries a number, so the scale of your work is left to the reader's imagination.",
		action: "Add figures where you have them: volumes, percentages, timeframes, team sizes.",
	},
	WEAK_ACTION_VERBS: {
		severity: "tip",
		category: "content",
		meaning: "Most bullets open with a passive or filler phrase rather than something you did.",
		action: "Start each bullet with a concrete verb: built, led, reduced, migrated.",
	},
	FIRST_PERSON_PRONOUNS: {
		severity: "tip",
		category: "content",
		meaning: "The resume uses first-person pronouns, which is unconventional in most markets.",
		action: "Drop 'I' and 'my' and start from the verb.",
	},
	LONG_BULLETS: {
		severity: "tip",
		category: "content",
		meaning: "Several bullets run long enough that a skim-reader will not finish them.",
		action: "Keep bullets to roughly two lines.",
	},
	HIGH_PAGE_COUNT: {
		severity: "tip",
		category: "content",
		meaning: "The resume is long. Length is not a defect, but every extra page competes for the same attention.",
		action: "Keep the pages that earn their place. There is no universal one-page rule.",
	},
	EMPLOYMENT_GAP: {
		severity: "tip",
		category: "content",
		meaning: "There is a gap between two dated roles. A gap is not a problem; an unexplained gap invites a guess.",
		action: "If you want to, add a one-line explanation. Many strong resumes simply leave it.",
	},
	ALL_CAPS_RUNS: {
		severity: "tip",
		category: "content",
		meaning: "Long stretches are set in capitals, which slows reading and can defeat case-sensitive search.",
		action: "Reserve capitals for short headings.",
	},
	REPEATED_PHRASES: {
		severity: "tip",
		category: "content",
		meaning: "The same phrase opens many bullets, which makes the whole section read as boilerplate.",
		action: "Vary how each bullet starts.",
	},
} as const satisfies Readonly<Record<string, PdfRuleReference>>;

export type PdfRuleCode = keyof typeof PDF_ATS_RULE_CATALOG_V1;

export const PDF_ATS_RULE_CODES = Object.keys(PDF_ATS_RULE_CATALOG_V1) as readonly PdfRuleCode[];

export const pdfRuleSeverity = (code: PdfRuleCode) => PDF_ATS_RULE_CATALOG_V1[code].severity;

export const pdfRuleCategory = (code: PdfRuleCode): PdfCategory => PDF_ATS_RULE_CATALOG_V1[code].category;

/** The ceiling a fired blocker puts on the overall score, or null for non-blockers. */
export function pdfRuleCap(code: PdfRuleCode): number | null {
	const rule = PDF_ATS_RULE_CATALOG_V1[code];
	return rule.severity === "blocker" ? rule.cap : null;
}

/** What a fired warning costs its category, or 0 for anything else. */
export function pdfRuleDeduction(code: PdfRuleCode): number {
	const rule = PDF_ATS_RULE_CATALOG_V1[code];
	return rule.severity === "warning" ? rule.deduction : 0;
}
