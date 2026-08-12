import type { AtsSeverity } from "./types";

type AtsRuleReference = {
	severity: AtsSeverity;
	meaning: string;
	action: string;
};

export const ATS_RULE_CATALOG_V1 = {
	MISSING_NAME: {
		severity: "error",
		meaning: "The resume has no name, so a parser has nothing to file the application under.",
		action: "Fill in your full name under Basics.",
	},
	MISSING_EMAIL: {
		severity: "error",
		meaning: "The resume has no email address, which is the field most parsers key a candidate record on.",
		action: "Add an email address under Basics.",
	},
	MALFORMED_EMAIL: {
		severity: "error",
		meaning: "The email address is not in a shape a parser will recognize.",
		action: "Use a plain address such as name@example.com, with no surrounding text.",
	},
	MISSING_PHONE: {
		severity: "warning",
		meaning: "The resume has no phone number, which some applicant systems require before submission.",
		action: "Add a phone number under Basics.",
	},
	MISSING_LOCATION: {
		severity: "info",
		meaning: "The resume has no location, which many systems use to match against a role's region.",
		action: "Add at least a city and country under Basics.",
	},
	MALFORMED_URL: {
		severity: "warning",
		meaning: "A link is missing its protocol or is not a valid URL, so it may be dropped or mis-parsed.",
		action: "Write the full address including https://.",
	},
	PICTURE_PRESENT: {
		severity: "info",
		meaning: "The resume includes a photo. Some parsers mishandle images, and some regions advise against them.",
		action: "Hide the picture if you are applying where photos are not customary.",
	},

	EMPTY_PERIOD: {
		severity: "warning",
		meaning: "A dated entry has no period, so a parser cannot place it on your timeline.",
		action: "Add a period such as 'Jan 2020 - Present'.",
	},
	UNPARSEABLE_PERIOD: {
		severity: "error",
		meaning: "A period is written in a format most parsers cannot read.",
		action: "Use a recognized form such as 'Jan 2020 - Mar 2022', '2020 - 2022', or '03/2020 - Present'.",
	},
	UNPARSEABLE_DATE: {
		severity: "warning",
		meaning: "A single date is written in a format most parsers cannot read.",
		action: "Use a recognized form such as 'March 2022' or '2022'.",
	},
	REVERSED_PERIOD: {
		severity: "error",
		meaning: "A period ends before it starts.",
		action: "Swap the start and end dates.",
	},
	FUTURE_DATED_PERIOD: {
		severity: "warning",
		meaning: "A period starts in the future, which reads as a typo to a reviewer and to a parser.",
		action: "Correct the year, or use 'Present' for ongoing work.",
	},

	SECTION_MISSING_FROM_LAYOUT: {
		severity: "error",
		meaning: "A section has visible content but is not placed on any page, so it never renders or exports.",
		action: "Place the section on a page from the Layout panel, or hide it if it is intentionally unused.",
	},
	EMPTY_RENDERED_SECTION: {
		severity: "warning",
		meaning: "A section is placed on a page but has no visible items, so it renders as a bare heading.",
		action: "Add an item to the section, or hide it.",
	},
	NO_VISIBLE_EXPERIENCE: {
		severity: "warning",
		meaning: "The resume shows no work experience, which most screening systems rank on.",
		action: "Add at least one experience entry, or use projects and volunteer work to show equivalent history.",
	},
	MISSING_EXPERIENCE_DESCRIPTION: {
		severity: "warning",
		meaning: "An experience entry has no description, so it contributes no keywords for matching.",
		action: "Describe what you did in that role.",
	},
	NON_STANDARD_SECTION_TITLE: {
		severity: "info",
		meaning: "A section heading is not one of the conventional names parsers look for when segmenting a resume.",
		action: "Prefer a conventional heading such as 'Work Experience' or 'Education'.",
	},

	MULTI_COLUMN_PROSE_SECTION: {
		severity: "warning",
		meaning: "A prose-heavy section is split across columns, which commonly scrambles extracted reading order.",
		action: "Set the section to a single column.",
	},
	PROSE_SECTION_IN_SIDEBAR: {
		severity: "warning",
		meaning: "A prose-heavy section sits in the narrow sidebar, where extraction interleaves it with the main column.",
		action: "Move the section into the main column and keep the sidebar for short lists.",
	},

	SMALL_BODY_FONT: {
		severity: "warning",
		meaning: "The body font is small enough that scanned or re-rendered copies lose accuracy.",
		action: "Use a body size of at least 9pt.",
	},
	TIGHT_LINE_HEIGHT: {
		severity: "warning",
		meaning: "Lines are packed tightly enough that extraction can merge them into a single run of text.",
		action: "Use a line height of at least 1.15.",
	},
	TIGHT_PAGE_MARGINS: {
		severity: "warning",
		meaning: "Page margins are narrow enough that content can fall outside the reliably extracted area.",
		action: "Increase the page margins.",
	},
} as const satisfies Readonly<Record<string, AtsRuleReference>>;

export type AtsRuleCode = keyof typeof ATS_RULE_CATALOG_V1;

export const ATS_RULE_CODES = Object.keys(ATS_RULE_CATALOG_V1) as readonly AtsRuleCode[];

export const atsRuleSeverity = (code: AtsRuleCode): AtsSeverity => ATS_RULE_CATALOG_V1[code].severity;
