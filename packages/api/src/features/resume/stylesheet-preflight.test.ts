import type { StylesheetPreflightRunner } from "@reactive-resume/pdf/server";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { EMPTY_SEMANTIC_CSS_SOURCE } from "@reactive-resume/schema/resume/stylesheet";
import {
	checkLegacyStylesheetParity,
	prepareImportedResumeData,
	validateHistoricalStylesheet,
} from "./stylesheet-preflight";

const semanticPdfMocks = vi.hoisted(() => ({
	compareLegacySemanticPresentation: vi.fn(),
}));

vi.mock("@reactive-resume/pdf/semantic", () => semanticPdfMocks);

const validSource = {
	languageVersion: 1,
	text: "@version 1;\nsection { color: #123456; }\n",
};
const validApplied = {
	languageVersion: 1,
	text: "@version 1;\nsection-heading { color: #654321; }\n",
};
const invalidSource = {
	languageVersion: 99,
	text: "@version 99;\n/* preserved future source */\n",
};

const resumeData = (source = validSource, applied = validApplied): ResumeData => {
	const data: ResumeData = structuredClone(defaultResumeData);
	data.metadata.stylesheet = { mode: "semantic", source, applied };
	return data;
};

const createRunner = () => {
	const run = vi.fn<StylesheetPreflightRunner["run"]>(async ({ stylesheet }) => ({
		ok: true,
		pageCount: stylesheet.text === EMPTY_SEMANTIC_CSS_SOURCE ? 1 : 2,
		byteCount: 100,
		diagnostics: [],
	}));
	return { run } satisfies StylesheetPreflightRunner;
};

describe("stylesheet persistence preparation", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		semanticPdfMocks.compareLegacySemanticPresentation.mockReset();
	});

	it("uses a valid imported source as applied only after PDF preflight", async () => {
		const runner = createRunner();

		const result = await prepareImportedResumeData({
			data: resumeData(validSource, validApplied),
			resumeId: "import-1",
			revision: 0,
			runner,
		});

		expect(result.metadata.stylesheet).toEqual({
			mode: "semantic",
			source: validSource,
			applied: validSource,
		});
		expect(runner.run).toHaveBeenCalledTimes(1);
		expect(runner.run).toHaveBeenCalledWith({
			data: expect.any(Object),
			template: defaultResumeData.metadata.template,
			stylesheet: validSource,
		});
	});

	it("returns a legacy stylesheet unchanged without PDF preflight", async () => {
		const data = resumeData();
		data.metadata.stylesheet = { mode: "legacy", source: validSource, applied: validApplied };
		const runner = createRunner();

		await expect(prepareImportedResumeData({ data, resumeId: "import-legacy", revision: 0, runner })).resolves.toBe(
			data,
		);
		expect(runner.run).not.toHaveBeenCalled();
	});

	it("preserves invalid imported source and independently validates the imported applied source", async () => {
		const runner = createRunner();

		const result = await prepareImportedResumeData({
			data: resumeData(invalidSource, validApplied),
			resumeId: "import-2",
			revision: 0,
			runner,
		});

		expect(result.metadata.stylesheet).toEqual({
			mode: "semantic",
			source: invalidSource,
			applied: validApplied,
		});
		expect(runner.run).toHaveBeenCalledTimes(1);
		expect(runner.run.mock.calls[0]?.[0].stylesheet).toEqual(validApplied);
	});

	it("uses the supported empty applied source when neither imported source is valid", async () => {
		const runner = createRunner();

		const result = await prepareImportedResumeData({
			data: resumeData(invalidSource, invalidSource),
			resumeId: "import-3",
			revision: 0,
			runner,
		});

		expect(result.metadata.stylesheet).toEqual({
			mode: "semantic",
			source: invalidSource,
			applied: { languageVersion: 1, text: EMPTY_SEMANTIC_CSS_SOURCE },
		});
		expect(runner.run).toHaveBeenCalledTimes(1);
		expect(runner.run.mock.calls[0]?.[0].stylesheet.text).toBe(EMPTY_SEMANTIC_CSS_SOURCE);
	});

	it("reports a controlled unavailable error when imported stylesheet preflight has no runner", async () => {
		await expect(
			prepareImportedResumeData({
				data: resumeData(),
				resumeId: "import-4",
				revision: 0,
			}),
		).rejects.toMatchObject({ code: "SEMANTIC_STYLESHEET_UNAVAILABLE", status: 503 });
	});

	it("validates and preflights historical applied independently while retaining invalid historical source", async () => {
		const runner = createRunner();
		const restored = {
			mode: "semantic" as const,
			source: invalidSource,
			applied: validApplied,
		};

		await expect(
			validateHistoricalStylesheet({
				data: resumeData(),
				resumeId: "restore-1",
				revision: 7,
				stylesheet: restored,
				runner,
			}),
		).resolves.toEqual(restored);
		expect(runner.run).toHaveBeenCalledTimes(1);
		expect(runner.run.mock.calls[0]?.[0].stylesheet).toEqual(validApplied);
	});

	it("emits compile and preflight metrics without embedding imported source text", async () => {
		const log = vi.spyOn(console, "info").mockImplementation(() => undefined);

		await prepareImportedResumeData({
			data: resumeData(),
			resumeId: "import-observed",
			revision: 0,
			runner: createRunner(),
		});

		const serialized = JSON.stringify(log.mock.calls);
		expect(log.mock.calls.map(([event]) => (event as { name: string }).name)).toEqual([
			"semantic_css.compile",
			"semantic_css.preflight",
		]);
		expect(serialized).not.toContain(validSource.text);
		expect(serialized).not.toContain("import-observed");
	});

	it("records a sanitized parity failure metric when the comparator throws", async () => {
		const privateText = "private parity failure john.doe@example.com";
		const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
		semanticPdfMocks.compareLegacySemanticPresentation.mockRejectedValueOnce(new Error(privateText));

		await expect(
			checkLegacyStylesheetParity({
				data: resumeData(),
				stylesheet: validSource,
				resumeId: "parity-observed",
				revision: 5,
			}),
		).rejects.toThrow(privateText);

		expect(log.mock.calls.map(([event]) => event)).toContainEqual(
			expect.objectContaining({
				name: "semantic_css.parity_check",
				durationMs: expect.any(Number),
				diagnosticCodes: [],
				success: false,
			}),
		);
		const serialized = JSON.stringify(log.mock.calls);
		expect(serialized).not.toContain(privateText);
		expect(serialized).not.toContain(validSource.text);
		expect(serialized).not.toContain("parity-observed");
	});
});
