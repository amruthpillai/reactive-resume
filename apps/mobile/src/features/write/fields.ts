// The entry field schema per section type (contract for Write, Design and Check). Data only: the order and kind of
// each field an entry edits, as on web's entries.tsx. Render labels with `i18n._(field.label)`.
import type { MessageDescriptor } from "@lingui/core";
import type { CustomSectionType } from "@reactive-resume/schema/resume/data";
import { msg } from "@lingui/core/macro";

export type EntryFieldKind =
	/** A plain string field; `keyboard` picks the keyboard. */
	| "text"
	/** `dates` (structured) with start, end and Present; the legacy `period` text follows on save. */
	| "dates"
	/** `dates` used as one date (awards, certifications, publications); the legacy `date` text follows on save. */
	| "date"
	/** `website` ({ url, label, inlineLink }) with "Show link in title". */
	| "link"
	/** An HTML string edited as rich text. */
	| "richText"
	/** `keywords` string list. */
	| "keywords"
	/** `level` 0–5; 0 hides it. */
	| "level"
	/** `icon` and `iconColor`. */
	| "icon"
	/** Experience `roles`: position, dates and description each. */
	| "roles";

export type EntryField = {
	/** The entry property it writes (for `icon`: `icon` and `iconColor`; for `dates`/`date`: `dates`). */
	key: string;
	kind: EntryFieldKind;
	label: MessageDescriptor;
	/** Behind "More options", as on web. */
	more?: true;
	keyboard?: "phone";
};

const text = (key: string, label: MessageDescriptor, keyboard?: "phone"): EntryField =>
	keyboard ? { key, kind: "text", label, keyboard } : { key, kind: "text", label };
const dates: EntryField = { key: "dates", kind: "dates", label: msg`Dates` };
const date: EntryField = { key: "dates", kind: "date", label: msg`Date` };
const link: EntryField = { key: "website", kind: "link", label: msg`Link` };
const description: EntryField = { key: "description", kind: "richText", label: msg`Description` };
const keywords: EntryField = { key: "keywords", kind: "keywords", label: msg`Keywords` };
const level: EntryField = { key: "level", kind: "level", label: msg`Level`, more: true };
const icon: EntryField = { key: "icon", kind: "icon", label: msg`Icon`, more: true };

export const ENTRY_FIELDS: Record<CustomSectionType, readonly EntryField[]> = {
	experience: [
		text("position", msg`Position`),
		text("company", msg`Company`),
		text("location", msg`Location`),
		dates,
		link,
		description,
		{ key: "roles", kind: "roles", label: msg`Roles` },
	],
	education: [
		text("school", msg`School`),
		text("degree", msg`Degree`),
		text("area", msg`Area of study`),
		text("grade", msg`Grade`),
		text("location", msg`Location`),
		dates,
		link,
		description,
	],
	projects: [text("name", msg`Name`), dates, link, description],
	skills: [text("name", msg`Name`), text("proficiency", msg`Proficiency`), keywords, level, icon],
	languages: [text("language", msg`Language`), text("fluency", msg`Fluency`), level],
	interests: [text("name", msg`Name`), keywords, icon],
	awards: [text("title", msg`Title`), text("awarder", msg`Awarder`), date, link, description],
	certifications: [text("title", msg`Title`), text("issuer", msg`Issuer`), date, link, description],
	publications: [text("title", msg`Title`), text("publisher", msg`Publisher`), date, link, description],
	volunteer: [text("organization", msg`Organization`), text("location", msg`Location`), dates, link, description],
	references: [
		text("name", msg`Name`),
		text("position", msg`Position`),
		text("phone", msg`Phone`, "phone"),
		link,
		description,
	],
	profiles: [text("network", msg`Network`), text("username", msg`Username`), link, icon],
	summary: [{ key: "content", kind: "richText", label: msg`Text` }],
	// Letters are documents of their own; a resume that still carries one hands it over when it saves.
	"cover-letter": [],
};

export { PRIMARY_FIELD } from "./model";

/** Shown on a draft entry, keyed by its primary field. */
export const DRAFT_HINTS: Record<string, MessageDescriptor> = {
	company: msg`Appears on the page once it has a company.`,
	school: msg`Appears on the page once it has a school.`,
	name: msg`Appears on the page once it has a name.`,
	language: msg`Appears on the page once it has a language.`,
	title: msg`Appears on the page once it has a title.`,
	organization: msg`Appears on the page once it has an organization.`,
	network: msg`Appears on the page once it has a network.`,
};

export const SECTION_TITLES: Record<CustomSectionType, MessageDescriptor> = {
	summary: msg`Summary`,
	profiles: msg`Profiles`,
	experience: msg`Experience`,
	education: msg`Education`,
	projects: msg`Projects`,
	skills: msg`Skills`,
	languages: msg`Languages`,
	interests: msg`Interests`,
	awards: msg`Awards`,
	certifications: msg`Certifications`,
	publications: msg`Publications`,
	volunteer: msg`Volunteer`,
	references: msg`References`,
	"cover-letter": msg`Cover Letter`,
};

export const ADD_LABELS: Record<CustomSectionType, MessageDescriptor> = {
	summary: msg`Add text`,
	experience: msg`Add experience`,
	education: msg`Add education`,
	projects: msg`Add project`,
	skills: msg`Add skill`,
	languages: msg`Add language`,
	interests: msg`Add interest`,
	awards: msg`Add award`,
	certifications: msg`Add certification`,
	publications: msg`Add publication`,
	volunteer: msg`Add volunteering`,
	references: msg`Add reference`,
	profiles: msg`Add profile`,
	"cover-letter": msg`Add cover letter`,
};

/** Icon names from the app's icon map (src/ui/icon.tsx), as web's Add section menu uses them. */
export const SECTION_ICONS = {
	summary: "text-align-left",
	experience: "briefcase",
	education: "graduation-cap",
	projects: "graph",
	skills: "lightning",
	languages: "translate",
	interests: "bookmark-simple",
	awards: "check-circle",
	certifications: "list-checks",
	publications: "file-text",
	volunteer: "user-circle",
	references: "phone",
	profiles: "link-simple-horizontal",
	"cover-letter": "envelope-simple",
} as const satisfies Record<CustomSectionType, string>;
