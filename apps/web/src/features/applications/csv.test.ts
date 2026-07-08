import { describe, expect, it } from "vitest";
import { mapCsvToApplications, parseCsv } from "./csv";

describe("parseCsv", () => {
	it("parses quoted fields with commas and newlines", () => {
		const table = parseCsv('Company,Role\n"Acme, Inc.","Eng, Sr"\nBeta,"Line1\nLine2"');
		expect(table[1]).toEqual(["Acme, Inc.", "Eng, Sr"]);
		expect(table[2]).toEqual(["Beta", "Line1\nLine2"]);
	});

	it("handles escaped quotes and CRLF", () => {
		const table = parseCsv('A,B\r\n"say ""hi""",x\r\n');
		expect(table[1]).toEqual(['say "hi"', "x"]);
	});

	it("drops fully blank rows", () => {
		expect(parseCsv("A,B\n\n1,2\n").length).toBe(2);
	});

	it("strips a UTF-8 BOM so the first header still maps", () => {
		const { rows } = mapCsvToApplications(parseCsv("﻿Company,Role\nStripe,Eng"));
		expect(rows).toHaveLength(1);
		expect(rows[0]?.company).toBe("Stripe");
	});
});

describe("mapCsvToApplications", () => {
	it("maps aliased headers and coerces status/tags", () => {
		const csv =
			'Company,Job Title,Stage,Stage Date,Salary,Tags\nStripe,Frontend,Interview,2026-07-01,$180k,"remote;react"';
		const { rows, recognized } = mapCsvToApplications(parseCsv(csv));
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			company: "Stripe",
			role: "Frontend",
			status: "interview",
			stageEnteredAt: "2026-07-01",
			salary: "$180k",
			tags: ["remote", "react"],
		});
		expect(recognized).toEqual(
			expect.arrayContaining(["company", "role", "status", "stageEnteredAt", "salary", "tags"]),
		);
	});

	it("skips rows missing company or role and drops invalid status", () => {
		const csv =
			"company,role,status,stage date\nStripe,Eng,bogus,2026-99-99\n,NoCompany,applied,2026-07-01\nAcme,,saved,2026-07-01";
		const { rows, skipped } = mapCsvToApplications(parseCsv(csv));
		expect(rows).toHaveLength(1);
		expect(rows[0]?.status).toBeUndefined(); // "bogus" dropped
		expect(rows[0]?.stageEnteredAt).toBeUndefined(); // invalid date dropped
		expect(skipped).toBe(2);
	});
});
