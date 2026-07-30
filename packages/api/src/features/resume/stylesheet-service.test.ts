import type { PdfPreflightResult } from "@reactive-resume/pdf/server";
import type { CompileStylesheetResult } from "@reactive-resume/resume/stylesheet";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SemanticStylesheet, StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { SemanticCssEventInput } from "./stylesheet-observability";
import type { StylesheetSnapshot } from "./stylesheet-service";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createStylesheetService } from "./stylesheet-service";

const validSource = {
	languageVersion: 1,
	text: "@rr-version 1;\nsection { color: #112233; }\n",
} satisfies StylesheetSource;
const invalidSource = {
	languageVersion: 1,
	text: "@rr-version 1;\nsection {",
} satisfies StylesheetSource;
const previousSource = {
	languageVersion: 1,
	text: "@rr-version 1;\nsection { color: #445566; }\n",
} satisfies StylesheetSource;
const previousApplied = {
	languageVersion: 1,
	text: "@rr-version 1;\nsection { color: #778899; }\n",
} satisfies StylesheetSource;
const previousStylesheet = {
	mode: "semantic",
	source: previousSource,
	applied: previousApplied,
} satisfies SemanticStylesheet;
const diagnostic = {
	code: "PARSE_ERROR",
	severity: "error" as const,
	message: "Invalid stylesheet.",
	range: {
		start: { line: 1, column: 1, offset: 0 },
		end: { line: 1, column: 1, offset: 0 },
	},
};
const successfulCompile = {
	program: { languageVersion: 1, rules: [] },
	diagnostics: [],
} satisfies CompileStylesheetResult;
const failedCompile = { program: null, diagnostics: [diagnostic] } satisfies CompileStylesheetResult;
const successfulPreflight = {
	ok: true,
	pageCount: 1,
	byteCount: 256,
	diagnostics: [],
} satisfies PdfPreflightResult;

const commonMutationInput = {
	id: "resume-1",
	userId: "user-1",
	expectedRevision: 3,
	expectedRenderDataVersion: 8,
	editGeneration: 11,
} as const;

const snapshot = (stylesheet: SemanticStylesheet = previousStylesheet): StylesheetSnapshot => {
	const data: ResumeData = structuredClone(defaultResumeData);
	data.metadata.stylesheet = stylesheet;
	data.metadata.styleRules = [
		{
			id: "legacy-rule",
			label: "Legacy",
			enabled: true,
			target: { scope: "global" },
			slots: { heading: { color: "#123456" } },
		},
	];

	return {
		id: "resume-1",
		userId: "user-1",
		data,
		isLocked: false,
		stylesheetRevision: 3,
		renderDataVersion: 8,
		updatedAt: new Date("2026-07-28T12:00:00.000Z"),
	};
};

type HarnessOptions = {
	initial?: StylesheetSnapshot;
	compile?: (source: StylesheetSource) => CompileStylesheetResult;
	preflight?: ((input: { data: ResumeData; stylesheet: StylesheetSource }) => Promise<PdfPreflightResult>) | undefined;
	parityMismatches?: readonly string[];
	parity?: () => Promise<{ mismatches: readonly string[] }>;
	locked?: StylesheetSnapshot;
	useDefaultObserver?: boolean;
};

const createHarness = (options: HarnessOptions = {}) => {
	const callOrder: string[] = [];
	const events: SemanticCssEventInput[] = [];
	let persisted = structuredClone(options.initial ?? snapshot());
	const compile = vi.fn((source: StylesheetSource) => {
		callOrder.push("compile");
		return options.compile?.(source) ?? successfulCompile;
	});
	const preflight = options.preflight
		? vi.fn(options.preflight)
		: vi.fn(() => {
				callOrder.push("preflight");
				return Promise.resolve(successfulPreflight);
			});
	const parity = vi.fn(() => {
		callOrder.push("parity");
		return options.parity?.() ?? Promise.resolve({ mismatches: options.parityMismatches ?? [] });
	});
	const publish = vi.fn(() => {
		callOrder.push("publish");
		return Promise.resolve();
	});

	const service = createStylesheetService({
		readSnapshot: () => {
			callOrder.push("readSnapshot");
			return Promise.resolve(structuredClone(persisted));
		},
		convertLegacy: () => {
			callOrder.push("convertLegacy");
			return { languageVersion: 1, text: "@rr-version 1;\n" };
		},
		compile,
		preflight:
			options.preflight === undefined
				? preflight
				: (input) => {
						callOrder.push("preflight");
						return preflight(input);
					},
		parity,
		transaction: async (run) => {
			callOrder.push("begin");
			try {
				const result = await run({
					lock: () => {
						callOrder.push("lock");
						return Promise.resolve(structuredClone(options.locked ?? persisted));
					},
					update: ({ data }) => {
						callOrder.push("update");
						persisted = {
							...persisted,
							data,
							stylesheetRevision: persisted.stylesheetRevision + 1,
						};
						return Promise.resolve(structuredClone(persisted));
					},
				});
				callOrder.push("commit");
				return result;
			} catch (error) {
				callOrder.push("rollback");
				throw error;
			}
		},
		compare: (locked, input) => {
			callOrder.push("compare");
			return (
				locked.stylesheetRevision === input.expectedRevision &&
				locked.renderDataVersion === input.expectedRenderDataVersion
			);
		},
		publish,
		...(options.useDefaultObserver ? {} : { observe: (event: SemanticCssEventInput) => events.push(event) }),
	});

	return { callOrder, compile, events, parity, persisted: () => persisted, preflight, publish, service };
};

describe("stylesheet service", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("stores invalid editable source while preserving the last-valid applied source and render version", async () => {
		const harness = createHarness({ compile: () => failedCompile });

		const result = await harness.service.mutate({
			...commonMutationInput,
			transition: "edit_source",
			source: invalidSource,
		});

		expect(result.stylesheet.source).toEqual(invalidSource);
		expect(result.stylesheet.applied).toEqual(previousApplied);
		expect(result.revision).toBe(4);
		expect(result.renderDataVersion).toBe(8);
		expect(result.editGeneration).toBe(11);
		expect(result.diagnostics).toEqual([diagnostic]);
		expect(harness.preflight).not.toHaveBeenCalled();
	});

	it("promotes a valid edit only in semantic mode after preflight outside the short transaction", async () => {
		const harness = createHarness();

		const result = await harness.service.mutate({
			...commonMutationInput,
			transition: "edit_source",
			source: validSource,
		});

		expect(result.stylesheet.source).toEqual(validSource);
		expect(result.stylesheet.applied).toEqual(validSource);
		expect(harness.callOrder).toEqual([
			"readSnapshot",
			"compile",
			"preflight",
			"begin",
			"lock",
			"compare",
			"update",
			"commit",
			"publish",
		]);
	});

	it("keeps a valid legacy-mode edit dormant without preflight", async () => {
		const initial = snapshot({ ...previousStylesheet, mode: "legacy" });
		const harness = createHarness({ initial });

		const result = await harness.service.mutate({
			...commonMutationInput,
			transition: "edit_source",
			source: validSource,
		});

		expect(result.stylesheet).toEqual({
			mode: "legacy",
			source: validSource,
			applied: previousApplied,
		});
		expect(harness.preflight).not.toHaveBeenCalled();
	});

	it("preserves editable source but not applied source when semantic render preflight fails", async () => {
		const harness = createHarness({
			preflight: async () => ({
				ok: false,
				code: "STYLESHEET_PREFLIGHT_RENDER_FAILED",
				message: "PDF rendering failed.",
				diagnostics: [],
			}),
		});

		const result = await harness.service.mutate({
			...commonMutationInput,
			transition: "edit_source",
			source: validSource,
		});

		expect(result.stylesheet.source).toEqual(validSource);
		expect(result.stylesheet.applied).toEqual(previousApplied);
		expect(result.diagnostics).toEqual([
			expect.objectContaining({ code: "STYLESHEET_PREFLIGHT_RENDER_FAILED", severity: "error" }),
		]);
	});

	it("requires parity and preflight before explicit activation", async () => {
		const initial = snapshot({ ...previousStylesheet, mode: "legacy" });
		const harness = createHarness({ initial });

		const result = await harness.service.mutate({
			...commonMutationInput,
			transition: "activate",
			source: validSource,
		});

		expect(result.stylesheet).toEqual({ mode: "semantic", source: validSource, applied: validSource });
		expect(harness.parity).toHaveBeenCalledOnce();
		expect(harness.preflight).toHaveBeenCalledOnce();
		expect(result.revision).toBe(4);
		expect(result.renderDataVersion).toBe(8);
		expect(harness.events).toContainEqual(
			expect.objectContaining({
				name: "semantic_css.activate",
				durationMs: expect.any(Number),
				pageCount: 1,
				revision: 4,
				success: true,
			}),
		);
	});

	it("records a sanitized compile failure metric when the compiler throws", async () => {
		const privateText = "private compiler failure john.doe@example.com";
		const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const harness = createHarness({
			compile: () => {
				throw new Error(privateText);
			},
			useDefaultObserver: true,
		});

		await expect(
			harness.service.mutate({ ...commonMutationInput, transition: "edit_source", source: validSource }),
		).rejects.toThrow(privateText);

		expect(log.mock.calls.map(([event]) => event)).toContainEqual(
			expect.objectContaining({
				name: "semantic_css.compile",
				durationMs: expect.any(Number),
				diagnosticCodes: [],
				success: false,
			}),
		);
		const serialized = JSON.stringify(log.mock.calls);
		expect(serialized).not.toContain(privateText);
		expect(serialized).not.toContain(validSource.text);
		expect(serialized).not.toContain("resume-1");
	});

	it("records a sanitized preflight failure metric when the runner throws", async () => {
		const privateText = "private preflight failure john.doe@example.com";
		const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const harness = createHarness({
			preflight: () => Promise.reject(new Error(privateText)),
			useDefaultObserver: true,
		});

		await expect(
			harness.service.mutate({ ...commonMutationInput, transition: "edit_source", source: validSource }),
		).rejects.toThrow(privateText);

		expect(log.mock.calls.map(([event]) => event)).toContainEqual(
			expect.objectContaining({
				name: "semantic_css.preflight",
				durationMs: expect.any(Number),
				diagnosticCodes: [],
				success: false,
			}),
		);
		const serialized = JSON.stringify(log.mock.calls);
		expect(serialized).not.toContain(privateText);
		expect(serialized).not.toContain(validSource.text);
		expect(serialized).not.toContain("resume-1");
	});

	it("records a sanitized activation failure metric when parity throws", async () => {
		const privateText = "private parity failure john.doe@example.com";
		const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const harness = createHarness({
			initial: snapshot({ ...previousStylesheet, mode: "legacy" }),
			parity: () => Promise.reject(new Error(privateText)),
			useDefaultObserver: true,
		});

		await expect(
			harness.service.mutate({ ...commonMutationInput, transition: "activate", source: validSource }),
		).rejects.toThrow(privateText);

		expect(log.mock.calls.map(([event]) => event)).toContainEqual(
			expect.objectContaining({
				name: "semantic_css.activate",
				durationMs: expect.any(Number),
				diagnosticCodes: [],
				pageCount: null,
				revision: 3,
				success: false,
			}),
		);
		const serialized = JSON.stringify(log.mock.calls);
		expect(serialized).not.toContain(privateText);
		expect(serialized).not.toContain(validSource.text);
		expect(serialized).not.toContain("resume-1");
	});

	it("deactivates without compiling or deleting either source", async () => {
		const harness = createHarness();

		const result = await harness.service.mutate({ ...commonMutationInput, transition: "deactivate" });

		expect(result.stylesheet).toEqual({ ...previousStylesheet, mode: "legacy" });
		expect(harness.compile).not.toHaveBeenCalled();
		expect(harness.parity).not.toHaveBeenCalled();
		expect(harness.preflight).not.toHaveBeenCalled();
	});

	it("does not rewrite invalid stored resume data during deactivation", async () => {
		const initial = snapshot();
		initial.data.customSections = [
			{
				id: "custom-experience",
				type: "experience",
				title: "Experience",
				icon: "",
				columns: 1,
				hidden: false,
				keepTogether: false,
				startOnNewPage: false,
				items: [{ id: "summary-item", hidden: false, content: "<p>Missing company</p>" }],
			} as never,
		];
		const harness = createHarness({ initial });

		const error = await harness.service
			.mutate({ ...commonMutationInput, transition: "deactivate" })
			.catch((caught: unknown) => caught);

		expect(error).toMatchObject({ code: "INTERNAL_SERVER_ERROR", status: 500 });
		expect(error).toHaveProperty("cause.issues.0.path", ["customSections", 0, "items", 0, "company"]);
		expect(harness.callOrder).not.toContain("update");
		expect(harness.publish).not.toHaveBeenCalled();
	});

	it("normalizes valid stored resume data during deactivation", async () => {
		const initial = snapshot();
		initial.data.customSections = [
			{
				id: "custom-experience",
				type: "experience",
				title: "Experience",
				icon: "",
				columns: 1,
				hidden: false,
				keepTogether: false,
				startOnNewPage: false,
				items: [
					{
						id: "experience-item",
						hidden: false,
						company: "Analytical Engines",
						position: "Programmer",
						location: "London",
						period: "1842–1843",
						description: "<p>Wrote the first algorithm.</p>",
						content: "<p>Compatible overlap</p>",
					},
				],
			} as never,
		];
		const harness = createHarness({ initial });

		await harness.service.mutate({ ...commonMutationInput, transition: "deactivate" });

		expect(harness.persisted().data.customSections[0]?.items[0]).toMatchObject({
			content: "<p>Compatible overlap</p>",
			roles: [],
			website: { url: "", label: "", inlineLink: false },
		});
	});

	it("validates and preflights restored applied source independently from invalid editable source", async () => {
		const restoredApplied = { ...validSource, text: "@rr-version 1;\nresume { color: #abcdef; }\n" };
		const compile = vi.fn((source: StylesheetSource) =>
			source === restoredApplied ? successfulCompile : failedCompile,
		);
		const harness = createHarness({ compile });

		const result = await harness.service.mutate({
			...commonMutationInput,
			transition: "restore_history",
			restore: {
				mode: "semantic",
				source: invalidSource,
				applied: restoredApplied,
			},
		});

		expect(compile).toHaveBeenCalledTimes(1);
		expect(compile).toHaveBeenCalledWith(restoredApplied);
		expect(harness.preflight).toHaveBeenCalledWith({
			data: expect.any(Object),
			stylesheet: restoredApplied,
		});
		expect(result.stylesheet).toEqual({
			mode: "semantic",
			source: invalidSource,
			applied: restoredApplied,
		});
	});

	it("rejects locked resumes before compiler or preflight work", async () => {
		const initial = { ...snapshot(), isLocked: true };
		const harness = createHarness({ initial });

		await expect(
			harness.service.mutate({ ...commonMutationInput, transition: "edit_source", source: validSource }),
		).rejects.toMatchObject({ code: "RESUME_LOCKED" });
		expect(harness.compile).not.toHaveBeenCalled();
		expect(harness.preflight).not.toHaveBeenCalled();
	});

	it("returns the locked canonical snapshot on a two-version conflict without writing", async () => {
		const locked = {
			...snapshot(),
			stylesheetRevision: 4,
			renderDataVersion: 9,
		};
		delete locked.data.metadata.stylesheet;
		const harness = createHarness({ locked });

		const error = await harness.service
			.mutate({ ...commonMutationInput, transition: "edit_source", source: validSource })
			.catch((caught: unknown) => caught);

		expect(error).toMatchObject({
			code: "STYLESHEET_REVISION_CONFLICT",
			data: {
				state: expect.objectContaining({
					revision: 4,
					renderDataVersion: 9,
					stylesheet: expect.objectContaining({
						mode: "legacy",
						source: { languageVersion: 1, text: "@rr-version 1;\n" },
					}),
				}),
			},
		});
		expect(harness.callOrder).not.toContain("update");
		expect(harness.publish).not.toHaveBeenCalled();
		expect(harness.callOrder.indexOf("rollback")).toBeLessThan(harness.callOrder.indexOf("convertLegacy"));
	});

	it("reloads the exact invalid source, last-valid applied source, and untouched legacy rules", async () => {
		const harness = createHarness({ compile: () => failedCompile });
		await harness.service.mutate({
			...commonMutationInput,
			transition: "edit_source",
			source: invalidSource,
		});

		const reloaded = await harness.service.getState({ id: "resume-1", userId: "user-1" });

		expect(reloaded.stylesheet.source).toEqual(invalidSource);
		expect(reloaded.stylesheet.applied).toEqual(previousApplied);
		expect(harness.persisted().data.metadata.styleRules).toEqual(snapshot().data.metadata.styleRules);
	});
});
