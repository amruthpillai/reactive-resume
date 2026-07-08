import type { ApplicationStatus } from "@reactive-resume/schema/applications/data";
import { applicationStatusSchema } from "@reactive-resume/schema/applications/data";

// Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes (""), commas and
// newlines inside quotes, and \r\n. Enough for spreadsheet exports; not a full streaming parser.
export function parseCsv(input: string): string[][] {
	// Strip a UTF-8 BOM (Excel prepends one) — trim() doesn't remove ﻿, so the first header
	// would otherwise become "﻿company" and never match an alias.
	const text = input.replace(/^﻿/, "");
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];

		if (inQuotes) {
			if (char === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += char;
			}
			continue;
		}

		if (char === '"') inQuotes = true;
		else if (char === ",") {
			row.push(field);
			field = "";
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && text[i + 1] === "\n") i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else {
			field += char;
		}
	}
	// Flush the trailing field/row if the file didn't end in a newline.
	if (field !== "" || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

type ParsedApplication = {
	company: string;
	role: string;
	status?: ApplicationStatus;
	location?: string;
	salary?: string;
	source?: string;
	notes?: string;
	sourceUrl?: string;
	stageEnteredAt?: string;
	tags?: string[];
};

function dateOnly(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));
	return date.toISOString().slice(0, 10) === value ? value : undefined;
}

// Header aliases → canonical field. Matched case-insensitively after trimming.
const HEADER_ALIASES: Record<string, keyof ParsedApplication> = {
	company: "company",
	employer: "company",
	organization: "company",
	role: "role",
	title: "role",
	position: "role",
	"job title": "role",
	status: "status",
	stage: "status",
	"applied date": "stageEnteredAt",
	"stage date": "stageEnteredAt",
	"stage entered at": "stageEnteredAt",
	location: "location",
	salary: "salary",
	"salary range": "salary",
	compensation: "salary",
	source: "source",
	notes: "notes",
	note: "notes",
	url: "sourceUrl",
	link: "sourceUrl",
	"job url": "sourceUrl",
	"job posting": "sourceUrl",
	tags: "tags",
};

export type CsvMapResult = {
	rows: ParsedApplication[];
	skipped: number;
	headers: string[];
	recognized: string[];
};

// Maps parsed CSV rows to application inputs using the header row. Rows missing company or role
// are skipped (and counted). Status is coerced to a valid stage or dropped.
export function mapCsvToApplications(table: string[][]): CsvMapResult {
	const [headerRow, ...dataRows] = table;
	if (!headerRow) return { rows: [], skipped: 0, headers: [], recognized: [] };

	const headers = headerRow.map((h) => h.trim());
	const fieldFor = headers.map((h) => HEADER_ALIASES[h.toLowerCase()]);
	const recognized = [...new Set(fieldFor.filter((f): f is keyof ParsedApplication => !!f))];

	const rows: ParsedApplication[] = [];
	let skipped = 0;

	for (const raw of dataRows) {
		const record: Partial<ParsedApplication> = {};
		fieldFor.forEach((field, i) => {
			if (!field) return;
			const value = (raw[i] ?? "").trim();
			if (!value) return;
			if (field === "tags")
				record.tags = value
					.split(/[;,|]/)
					.map((t) => t.trim())
					.filter(Boolean);
			else if (field === "status") {
				const parsed = applicationStatusSchema.safeParse(value.toLowerCase());
				if (parsed.success) record.status = parsed.data;
			} else if (field === "stageEnteredAt") {
				record.stageEnteredAt = dateOnly(value);
			} else record[field] = value as never;
		});

		if (!record.company || !record.role) {
			skipped++;
			continue;
		}
		rows.push(record as ParsedApplication);
	}

	return { rows, skipped, headers, recognized };
}
