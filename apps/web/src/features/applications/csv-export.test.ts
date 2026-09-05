import type { Application } from "./types";
import { describe, expect, it } from "vitest";
import { exportApplicationsCsv, mapCsvToApplications, parseCsv, selectApplicationsForExport } from "./csv";

const application: Application = {
	id: "application",
	company: 'Müller, "Partners"',
	role: "Engineer",
	status: "interview",
	archived: false,
	location: "Berlin",
	salary: "€70,000",
	source: "Referral",
	sourceUrl: "https://example.com/job",
	notes: "First line\nSecond line",
	tags: ["remote", "typescript"],
	contacts: [{ name: "Ada", role: "Recruiter", type: "Referral" }],
	activity: [
		{ id: "interview", type: "stage", stage: "interview", at: new Date("2026-08-12T12:00:00Z") },
		{ id: "note", type: "note", text: "Called recruiter", at: new Date("2026-08-08T12:00:00Z") },
		{ id: "applied", type: "stage", stage: "applied", at: new Date("2026-08-03T12:00:00Z") },
	],
	appliedAt: new Date("2026-08-03T12:00:00Z"),
	createdAt: new Date("2026-08-01T12:00:00Z"),
	updatedAt: new Date("2026-08-12T12:00:00Z"),
	resumeId: null,
	jobDescription: null,
	matchScore: null,
	aiMetadata: null,
	resumeFileUrl: null,
	resumeFileName: null,
	coverLetterUrl: null,
	coverLetterName: null,
	followUpAt: null,
	followUpNote: null,
};

function exportedRecord(value: Application) {
	const [headers = [], values = []] = parseCsv(exportApplicationsCsv([value]));
	return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
}

describe("application CSV export", () => {
	it("round-trips quoted Unicode, commas and multiline notes through existing import fields", () => {
		const csv = exportApplicationsCsv([application]);
		expect(csv.startsWith("\uFEFF")).toBe(true);
		expect(csv).toContain('"Müller, ""Partners"""');
		expect(csv).toContain("\r\n");
		expect(mapCsvToApplications(parseCsv(csv)).rows).toEqual([
			{
				company: 'Müller, "Partners"',
				role: "Engineer",
				status: "interview",
				stageEnteredAt: "2026-08-12",
				location: "Berlin",
				salary: "€70,000",
				source: "Referral",
				sourceUrl: "https://example.com/job",
				notes: "First line\nSecond line",
				tags: ["remote", "typescript"],
			},
		]);
	});

	it("preserves application date and chronological stage and note history separately", () => {
		expect(exportedRecord(application)).toMatchObject({
			"Application Date": "2026-08-03",
			"Stage Date": "2026-08-12",
			"Stage History": "Applied (2026-08-03) → Interview (2026-08-12)",
			Timeline: "2026-08-03: Applied\n2026-08-08: Called recruiter\n2026-08-12: Interview",
			Contacts: "Ada (Recruiter, Referral)",
			Archived: "false",
		});
		expect(application.activity[0]?.id).toBe("interview");
	});

	it.each([
		"=1+1",
		"+1+1",
		"-1+1",
		"@SUM(A1)",
		"\t=1+1",
		"\r=1+1",
		"\n=1+1",
		"  =1+1",
		"＝1+1",
		"＋1+1",
		"－1+1",
		"＠SUM(A1)",
	])("neutralizes spreadsheet formula prefix %j without introducing another cell", (company) => {
		const value = `${company},"next"`;
		expect(exportedRecord({ ...application, company }).Company).toBe(`'${company}`);
		expect(exportedRecord({ ...application, company: value }).Company).toBe(`'${value}`);
	});

	it("exports headers for empty results and empty optional values without inventing history", () => {
		expect(parseCsv(exportApplicationsCsv([]))).toHaveLength(1);
		expect(exportedRecord({ ...application, activity: [], contacts: [], notes: null, sourceUrl: null })).toMatchObject({
			"Stage Date": "",
			"Stage History": "",
			Timeline: "",
			Contacts: "",
			Notes: "",
			URL: "",
		});
	});
});

describe("application export selection", () => {
	const early = { ...application, id: "early", appliedAt: new Date("2026-08-02T23:59:59Z") };
	const late = { ...application, id: "late", archived: true, appliedAt: new Date("2026-08-03T23:59:59Z") };
	const all = [early, application, late];

	it("exports exactly current filtered rows, or all rows including archived", () => {
		expect(selectApplicationsForExport(all, [application], { scope: "filtered" })).toEqual([application]);
		expect(selectApplicationsForExport(all, [application], { scope: "all" })).toEqual(all);
	});
	it("applies inclusive UTC date boundaries to selected scope without mutating source rows", () => {
		expect(
			selectApplicationsForExport(all, [application], { scope: "all", from: "2026-08-03", to: "2026-08-03" }),
		).toEqual([application, late]);
		expect(selectApplicationsForExport(all, [application], { scope: "all", to: "2026-08-02" })).toEqual([early]);
		expect(all).toHaveLength(3);
	});
});
