// Ported from apps/web/src/features/applications/ics.ts. Pure: no React Native imports, so Node can run it.

export type CalendarEvent = {
	uid: string;
	title: string;
	start: Date;
	end: Date;
	location?: string;
	description?: string;
};

// RFC 5545: commas, semicolons and backslashes are escaped, line breaks become \n.
const escapeText = (value: string) =>
	value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const utcStamp = (date: Date) =>
	date
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\.\d{3}/, "");

// Lines longer than 75 characters fold onto continuation lines that start with a space.
function fold(line: string) {
	const parts: string[] = [];
	let rest = line;
	while (rest.length > 75) {
		parts.push(rest.slice(0, 75));
		rest = ` ${rest.slice(75)}`;
	}
	parts.push(rest);
	return parts.join("\r\n");
}

/** One or more events as an .ics file's text, in UTC, for "Add to calendar". */
export function buildIcs(event: CalendarEvent | CalendarEvent[], now = new Date()): string {
	const events = Array.isArray(event) ? event : [event];
	const lines = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Reactive Resume//Applications//EN",
		"CALSCALE:GREGORIAN",
		...events.flatMap((item) => [
			"BEGIN:VEVENT",
			`UID:${item.uid}@reactive-resume`,
			`DTSTAMP:${utcStamp(now)}`,
			`DTSTART:${utcStamp(item.start)}`,
			`DTEND:${utcStamp(item.end)}`,
			`SUMMARY:${escapeText(item.title)}`,
			...(item.location ? [`LOCATION:${escapeText(item.location)}`] : []),
			...(item.description ? [`DESCRIPTION:${escapeText(item.description)}`] : []),
			"END:VEVENT",
		]),
		"END:VCALENDAR",
	];

	return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** A file name safe on every platform: "Fieldnote-interview-2026-10-19.ics". */
export const icsFileName = (company: string, day: string) => `${company}-${day}.ics`.replace(/[^\w.-]+/g, "-");
