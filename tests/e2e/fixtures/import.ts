import type { Browser, Page, Request, Response, TestInfo } from "@playwright/test";
import type { E2EAccount } from "./data";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

export type ImportFormat = "pdf" | "reactive-resume-json" | "reactive-resume-v4-json" | "json-resume-json";

export type SyntheticImportFile = {
	name: string;
	mimeType: string;
	buffer: Buffer;
	declaredFormat: ImportFormat;
	expectedName?: string;
};

type ImportRpcSummary = {
	method: string;
	path: string;
	status: number;
	durationMs: number;
};

const IMPORT_RPC_PATH = "/api/rpc/resume/import";

function jsonFile(
	name: string,
	data: unknown,
	declaredFormat: Exclude<ImportFormat, "pdf">,
	expectedName?: string,
): SyntheticImportFile {
	return {
		name,
		mimeType: "application/json",
		buffer: Buffer.from(JSON.stringify(data)),
		declaredFormat,
		expectedName,
	};
}

export function currentJsonFixture(): SyntheticImportFile {
	const data = structuredClone(sampleResumeData);
	data.basics.name = "Current JSON Import Probe";
	data.picture.hidden = true;
	data.picture.url = "";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";

	return jsonFile("current-resume.json", data, "reactive-resume-json", data.basics.name);
}

// Minimal synthetic shape copied from packages/import/src/reactive-resume-v4-json.test.ts.
export function v4JsonFixture(): SyntheticImportFile {
	const section = (id: string) => ({
		name: id,
		columns: 1,
		separateLinks: false,
		visible: false,
		id,
		items: [],
	});
	const data = {
		basics: {
			name: "V4 JSON Import Probe",
			headline: "Diagnostic Engineer",
			email: "v4@example.test",
			phone: "",
			location: "Berlin",
			url: { label: "", href: "" },
			customFields: [],
			picture: {
				url: "",
				size: 80,
				aspectRatio: 1,
				borderRadius: 0,
				effects: { hidden: true, border: false, grayscale: false },
			},
		},
		sections: {
			summary: {
				name: "Summary",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "summary",
				content: "",
			},
			awards: section("awards"),
			certifications: section("certifications"),
			education: section("education"),
			experience: {
				...section("experience"),
				visible: true,
				items: [
					{
						id: "v4-experience",
						visible: true,
						company: "Synthetic Systems",
						position: "Engineer",
						location: "Berlin",
						date: "2021 - Present",
						summary: "Built deterministic import fixtures.",
						url: { label: "", href: "" },
					},
				],
			},
			volunteer: section("volunteer"),
			interests: section("interests"),
			languages: section("languages"),
			profiles: section("profiles"),
			projects: section("projects"),
			publications: section("publications"),
			references: section("references"),
			skills: section("skills"),
		},
		metadata: {
			template: "onyx",
			layout: [[["experience"], []]],
			css: { value: "", visible: false },
			page: { margin: 14, format: "a4", options: { breakLine: false, pageNumbers: false } },
			theme: { background: "#ffffff", text: "#000000", primary: "#dc2626" },
			typography: {
				font: { family: "Helvetica", subset: "latin", variants: ["regular"], size: 10 },
				lineHeight: 1.5,
				hideIcons: false,
				underlineLinks: false,
			},
			notes: "",
		},
	};

	return jsonFile("v4-resume.json", data, "reactive-resume-v4-json", data.basics.name);
}

// Minimal synthetic shape copied from packages/import/src/json-resume.test.ts.
export function jsonResumeFixture(): SyntheticImportFile {
	const data = {
		basics: {
			name: "JSON Resume Import Probe",
			label: "Diagnostic Engineer",
			email: "json-resume@example.test",
			location: { city: "Berlin", countryCode: "DE" },
		},
		work: [
			{
				name: "Synthetic Systems",
				position: "Engineer",
				startDate: "2021-01",
				endDate: "2025-01",
				highlights: ["Built deterministic import fixtures"],
			},
		],
	};

	return jsonFile("json-resume.json", data, "json-resume-json", data.basics.name);
}

export function malformedJsonFixture(): SyntheticImportFile {
	return {
		name: "malformed.json",
		mimeType: "application/json",
		buffer: Buffer.from('{"basics":'),
		declaredFormat: "reactive-resume-json",
	};
}

export function structurallyInvalidCurrentJsonFixture(): SyntheticImportFile {
	const data = structuredClone(sampleResumeData) as unknown as Record<string, unknown>;
	delete data.picture;

	return jsonFile("missing-picture.json", data, "reactive-resume-json");
}

export function withoutMimeType(file: SyntheticImportFile): SyntheticImportFile {
	return { ...file, mimeType: "" };
}

export async function pdfFixture(
	browser: Browser,
	testInfo: TestInfo,
	options: { blank?: boolean; mimeType?: string } = {},
): Promise<SyntheticImportFile> {
	const name = options.blank ? "blank-resume.pdf" : "text-resume.pdf";
	const path = testInfo.outputPath(name);
	const page = await browser.newPage();

	try {
		await page.setContent(`<!doctype html>
			<html>
				<head>
					<style>
						@page { size: A4; margin: 18mm; }
						body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.45; }
						h1 { font-size: 22px; margin: 0 0 8px; }
						h2 { font-size: 15px; margin: 20px 0 8px; text-transform: uppercase; }
					</style>
				</head>
				<body>
					${
						options.blank
							? ""
							: `<h1>PDF Import Probe</h1>
								<p>pdf-import@example.test · Berlin</p>
								<h2>Experience</h2>
								<p><strong>Synthetic Systems · Diagnostic Engineer</strong></p>
								<p>2021 – Present</p>
								<ul><li>Built deterministic browser PDF fixtures.</li><li>Verified offline resume import.</li></ul>`
					}
				</body>
			</html>`);
		await page.pdf({ path, format: "A4", printBackground: true });
	} finally {
		await page.close();
	}

	return {
		name,
		mimeType: options.mimeType ?? "application/pdf",
		buffer: await readFile(path),
		declaredFormat: "pdf",
		expectedName: options.blank ? undefined : "PDF Import Probe",
	};
}

export async function countUserResumes(account: E2EAccount): Promise<number> {
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for import reproduction E2E.");
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	try {
		const result = await pool.query<{ count: string }>(
			`select count(*)::text as count
			 from "resume"
			 join "user" on "user".id = "resume".user_id
			 where "user".email = $1`,
			[account.email],
		);
		return Number(result.rows[0]?.count ?? 0);
	} finally {
		await pool.end();
	}
}

export function observeImport(page: Page) {
	const pageErrors: Array<{ message: string; stack: string }> = [];
	const rpc: ImportRpcSummary[] = [];
	const requestStart = new WeakMap<Request, number>();

	const onPageError = (error: Error) => {
		pageErrors.push({ message: error.message, stack: error.stack ?? error.message });
	};
	const onRequest = (request: Request) => {
		if (new URL(request.url()).pathname !== IMPORT_RPC_PATH) return;
		requestStart.set(request, performance.now());
	};
	const onResponse = (response: Response) => {
		const request = response.request();
		const path = new URL(response.url()).pathname;
		if (path !== IMPORT_RPC_PATH) return;
		rpc.push({
			method: request.method(),
			path,
			status: response.status(),
			durationMs: Math.round(performance.now() - (requestStart.get(request) ?? performance.now())),
		});
	};

	page.on("pageerror", onPageError);
	page.on("request", onRequest);
	page.on("response", onResponse);

	return {
		pageErrors,
		rpc,
		async attach(
			testInfo: TestInfo,
			details: {
				fixture: string;
				detectedFormat: ImportFormat | "";
				selectedFormat: ImportFormat;
				providerState: "none";
				uiOutcome: string;
				beforeCount: number;
				afterCount: number;
			},
		) {
			await testInfo.attach("import-diagnostics", {
				contentType: "application/json",
				body: Buffer.from(JSON.stringify({ ...details, rpc, pageErrors }, null, 2)),
			});
		},
		dispose() {
			page.off("pageerror", onPageError);
			page.off("request", onRequest);
			page.off("response", onResponse);
		},
	};
}
