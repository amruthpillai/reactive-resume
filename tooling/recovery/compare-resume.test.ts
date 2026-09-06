import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { compareResumeRecovery } from "./compare-resume";

const SYNTHETIC_SOURCE_HASH = "2fc24960657492304068db58c4f4f8b0861ef4937bf12aadeced12ed03856d41";
const RECOVERED_COPY_HASH = "87b3c6293158e14591387969b804dda0233ae83df79e59043b340c9f0180bf6d";
const CURRENT_COPY_HASH = "701ee9fde9161c974ee6325e169132249ccb77adb31d875541ab70dd20835017";
const DEFAULT_RESUME_HASH = "bb0b5937876766c5a0d5014538257870396f30902d86a2d32d2c901f644ffb1f";

const FORMAT_CHARACTERS = [
	["zero-width space (U+200B)", "\u200B"],
	["left-to-right isolate (U+2066)", "\u2066"],
	["right-to-left override (U+202E)", "\u202E"],
	["byte-order mark (U+FEFF)", "\uFEFF"],
] as const;

const INVALID_INPUT_MANIFEST = {
	caseId: "invalid-input",
	sourceResumeId: "invalid-input",
	targetResumeId: null,
	sourceHash: null,
	targetHash: null,
	outcome: "blocked",
	blockedReason: "invalid-input",
};

type RecoveryRequest = {
	caseId: unknown;
	sourceResumeId: unknown;
	targetResumeId: unknown;
	ownerVerified: unknown;
	ownerMappingPresent: unknown;
	sourceAvailable: unknown;
	source: unknown;
	target: unknown;
};

function resumeWithName(name: string) {
	const resume = structuredClone(defaultResumeData);
	resume.basics.name = name;
	return resume;
}

function resumeWithTemplate(template: string): unknown {
	const resume = structuredClone(defaultResumeData);
	return { ...resume, metadata: { ...resume.metadata, template } };
}

function validRequestObject(overrides: Partial<RecoveryRequest> = {}): RecoveryRequest {
	return {
		caseId: "case-synthetic-001",
		sourceResumeId: "resume-v4-synthetic-001",
		targetResumeId: "resume-v5-synthetic-001",
		ownerVerified: true,
		ownerMappingPresent: true,
		sourceAvailable: true,
		source: resumeWithName("Synthetic source"),
		target: resumeWithName("Synthetic source"),
		...overrides,
	};
}

function validRequest(overrides: Partial<RecoveryRequest> = {}): string {
	return JSON.stringify(validRequestObject(overrides));
}

function validRequestWithRawValue(field: "source" | "target", rawValue: string): string {
	const marker = `raw-${field}-value`;
	return validRequest({ [field]: marker }).replace(JSON.stringify(marker), rawValue);
}

describe("compareResumeRecovery", () => {
	it("returns no-op with hand-checked hashes when serialized source and target are identical", () => {
		expect(compareResumeRecovery(validRequest())).toEqual({
			caseId: "case-synthetic-001",
			sourceResumeId: "resume-v4-synthetic-001",
			targetResumeId: "resume-v5-synthetic-001",
			sourceHash: SYNTHETIC_SOURCE_HASH,
			targetHash: SYNTHETIC_SOURCE_HASH,
			outcome: "no-op",
			blockedReason: null,
		});
	});

	it("returns export-copy when serialized request has no target resume", () => {
		expect(compareResumeRecovery(validRequest({ targetResumeId: null, target: null }))).toEqual({
			caseId: "case-synthetic-001",
			sourceResumeId: "resume-v4-synthetic-001",
			targetResumeId: null,
			sourceHash: SYNTHETIC_SOURCE_HASH,
			targetHash: null,
			outcome: "export-copy",
			blockedReason: null,
		});
	});

	it("returns export-copy with both hashes when serialized source and target diverge", () => {
		expect(
			compareResumeRecovery(
				validRequest({ source: resumeWithName("Recovered copy"), target: resumeWithName("Current copy") }),
			),
		).toEqual({
			caseId: "case-synthetic-001",
			sourceResumeId: "resume-v4-synthetic-001",
			targetResumeId: "resume-v5-synthetic-001",
			sourceHash: RECOVERED_COPY_HASH,
			targetHash: CURRENT_COPY_HASH,
			outcome: "export-copy",
			blockedReason: null,
		});
	});

	it.each([
		[{ ownerVerified: false }, "owner-unverified"],
		[{ ownerMappingPresent: false }, "owner-mapping-missing"],
	] as const)("blocks before hashing when serialized identity gate fails with %s", (overrides, blockedReason) => {
		expect(compareResumeRecovery(validRequest(overrides))).toMatchObject({
			sourceHash: null,
			targetHash: null,
			outcome: "blocked",
			blockedReason,
		});
	});

	it("blocks when serialized request says source snapshot is unavailable", () => {
		expect(compareResumeRecovery(validRequest({ sourceAvailable: false, source: null }))).toMatchObject({
			sourceHash: null,
			targetHash: null,
			outcome: "blocked",
			blockedReason: "source-unavailable",
		});
	});

	it.each(["ownerVerified", "ownerMappingPresent", "sourceAvailable"] as const)(
		"rejects string false for %s as invalid input",
		(flag) => {
			expect(compareResumeRecovery(validRequest({ [flag]: "false" }))).toEqual(INVALID_INPUT_MANIFEST);
		},
	);

	it.each([
		["caseId", 42],
		["caseId", ""],
		["sourceResumeId", 42],
		["sourceResumeId", ""],
		["targetResumeId", 42],
		["targetResumeId", ""],
	] as const)("rejects invalid %s value %s", (field, value) => {
		expect(compareResumeRecovery(validRequest({ [field]: value }))).toEqual(INVALID_INPUT_MANIFEST);
	});

	describe.each(["caseId", "sourceResumeId", "targetResumeId"] as const)("safe %s validation", (field) => {
		it.each([
			["spaces", "   "],
			["tab", "\t"],
			["newline", "\n"],
			["NUL", "\u0000"],
			["embedded control character", "valid\u001fid"],
		] as const)("rejects %s", (_description, value) => {
			expect(compareResumeRecovery(validRequest({ [field]: value }))).toEqual(INVALID_INPUT_MANIFEST);
		});

		it.each(FORMAT_CHARACTERS)("rejects embedded %s", (_description, character) => {
			expect(compareResumeRecovery(validRequest({ [field]: `valid${character}id` }))).toEqual(INVALID_INPUT_MANIFEST);
		});

		it.each(FORMAT_CHARACTERS)("rejects format-only %s", (_description, character) => {
			expect(compareResumeRecovery(validRequest({ [field]: character }))).toEqual(INVALID_INPUT_MANIFEST);
		});
	});

	it("preserves valid manifest identifiers", () => {
		expect(
			compareResumeRecovery(
				validRequest({
					caseId: " case-synthetic-001 ",
					sourceResumeId: "résumé/source 001",
					targetResumeId: "target 001",
				}),
			),
		).toMatchObject({
			caseId: " case-synthetic-001 ",
			sourceResumeId: "résumé/source 001",
			targetResumeId: "target 001",
			outcome: "no-op",
			blockedReason: null,
		});
	});

	it.each([
		['"ownerVerified":false,"ownerVerified":true', "false before true"],
		['"ownerVerified":true,"ownerVerified":false', "true before false"],
		['"ownerVerified":false,"\\u006fwnerVerified":true', "escaped duplicate name"],
	] as const)("rejects duplicate top-level safety members with %s (%s)", (duplicateMembers, _order) => {
		const request = validRequest().replace('"ownerVerified":true', duplicateMembers);
		expect(compareResumeRecovery(request)).toEqual(INVALID_INPUT_MANIFEST);
	});

	it.each(["source", "target"] as const)("rejects duplicate members within nested %s data", (field) => {
		const resume = JSON.stringify(resumeWithName("Synthetic source")).replace(
			'"name":"Synthetic source"',
			'"name":"first value","name":"second value"',
		);
		const request = validRequestWithRawValue(field, resume);

		expect(compareResumeRecovery(request)).toEqual(INVALID_INPUT_MANIFEST);
	});

	it.each(["source", "target"] as const)("rejects duplicate members within serialized nested %s data", (field) => {
		const resume = JSON.stringify(resumeWithName("Synthetic source")).replace(
			'"name":"Synthetic source"',
			'"name":"first value","name":"second value"',
		);

		expect(compareResumeRecovery(validRequest({ [field]: resume }))).toEqual(INVALID_INPUT_MANIFEST);
	});

	it("rejects unknown envelope keys", () => {
		const request = { ...validRequestObject(), unexpected: true };
		expect(compareResumeRecovery(JSON.stringify(request))).toEqual(INVALID_INPUT_MANIFEST);
	});

	it.each([
		["source", { source: undefined }],
		["target", { target: undefined }],
	] as const)("rejects missing required %s value", (_field, overrides) => {
		expect(compareResumeRecovery(validRequest(overrides))).toEqual(INVALID_INPUT_MANIFEST);
	});

	it.each([
		["malformed JSON", "{"],
		[
			"NaN",
			'{"caseId":"case","sourceResumeId":"source","targetResumeId":null,"ownerVerified":true,"ownerMappingPresent":true,"sourceAvailable":true,"source":NaN,"target":null}',
		],
		[
			"Infinity",
			'{"caseId":"case","sourceResumeId":"source","targetResumeId":null,"ownerVerified":true,"ownerMappingPresent":true,"sourceAvailable":true,"source":Infinity,"target":null}',
		],
		[
			"a number that overflows to Infinity",
			'{"caseId":"case","sourceResumeId":"source","targetResumeId":null,"ownerVerified":true,"ownerMappingPresent":true,"sourceAvailable":true,"source":1e400,"target":null}',
		],
	] as const)("rejects request containing %s", (_description, request) => {
		expect(compareResumeRecovery(request)).toEqual(INVALID_INPUT_MANIFEST);
	});

	it("returns a fresh stable manifest for each invalid request", () => {
		const first = compareResumeRecovery("{");
		first.caseId = "mutated-by-caller";

		expect(compareResumeRecovery("{")).toEqual(INVALID_INPUT_MANIFEST);
	});

	it("rejects an object argument before reading a top-level accessor", () => {
		let getterCalls = 0;
		const request = Object.defineProperty({}, "caseId", {
			enumerable: true,
			get() {
				getterCalls += 1;
				return "case";
			},
		});

		expect(compareResumeRecovery(request as never)).toEqual(INVALID_INPUT_MANIFEST);
		expect(getterCalls).toBe(0);
	});

	it("rejects a proxy argument without triggering any traps", () => {
		let trapCalls = 0;
		const request = new Proxy(
			{},
			{
				get() {
					trapCalls += 1;
					return undefined;
				},
				getOwnPropertyDescriptor() {
					trapCalls += 1;
					return undefined;
				},
				ownKeys() {
					trapCalls += 1;
					return [];
				},
			},
		);

		expect(compareResumeRecovery(request as never)).toEqual(INVALID_INPUT_MANIFEST);
		expect(trapCalls).toBe(0);
	});

	it("rejects an object argument before reading a schema-valid changing getter", () => {
		let getterCalls = 0;
		const source = structuredClone(defaultResumeData);
		Object.defineProperty(source.basics, "name", {
			enumerable: true,
			get() {
				getterCalls += 1;
				return getterCalls % 2 === 0 ? "Second" : "First";
			},
		});

		expect(compareResumeRecovery(validRequestObject({ source }) as never)).toEqual(INVALID_INPUT_MANIFEST);
		expect(getterCalls).toBe(0);
	});

	it("rejects an object envelope containing a boxed string before serialization", () => {
		const source = {
			...structuredClone(defaultResumeData),
			basics: {
				...structuredClone(defaultResumeData.basics),
				name: new String(""),
			},
		};

		expect(compareResumeRecovery(validRequestObject({ source }) as never)).toEqual(INVALID_INPUT_MANIFEST);
	});

	it("rejects an object envelope without executing a nested toJSON method", () => {
		let toJSONCalls = 0;
		const source = {
			...structuredClone(defaultResumeData),
			toJSON() {
				toJSONCalls += 1;
				return structuredClone(defaultResumeData);
			},
		};

		expect(compareResumeRecovery(validRequestObject({ source }) as never)).toEqual(INVALID_INPUT_MANIFEST);
		expect(toJSONCalls).toBe(0);
	});

	it("keeps malformed non-JSON source distinct from serialized null source", () => {
		const nonJsonManifest = compareResumeRecovery(validRequestObject({ source: Number.NaN }) as never);
		const nullManifest = compareResumeRecovery(validRequest({ source: null }));

		expect(nonJsonManifest).toEqual(INVALID_INPUT_MANIFEST);
		expect(nullManifest).toMatchObject({
			caseId: "case-synthetic-001",
			sourceResumeId: "resume-v4-synthetic-001",
			blockedReason: "invalid-source-json",
		});
		expect(nonJsonManifest).not.toEqual(nullManifest);
	});

	it("blocks malformed source data instead of treating it as an empty resume", () => {
		expect(compareResumeRecovery(validRequest({ source: "{" }))).toMatchObject({
			sourceHash: null,
			targetHash: null,
			outcome: "blocked",
			blockedReason: "invalid-source-json",
		});
	});

	it("blocks malformed target data instead of replacing it", () => {
		expect(compareResumeRecovery(validRequest({ target: "{" }))).toMatchObject({
			sourceHash: SYNTHETIC_SOURCE_HASH,
			targetHash: null,
			outcome: "blocked",
			blockedReason: "invalid-target-json",
		});
	});

	it("blocks schema-invalid source data instead of treating normalized content as identical", () => {
		expect(
			compareResumeRecovery(
				validRequest({ source: resumeWithTemplate("not-a-template"), target: structuredClone(defaultResumeData) }),
			),
		).toMatchObject({
			sourceHash: null,
			targetHash: null,
			outcome: "blocked",
			blockedReason: "invalid-source-json",
		});
	});

	it("blocks schema-invalid target data instead of treating normalized content as identical", () => {
		expect(
			compareResumeRecovery(
				validRequest({ source: structuredClone(defaultResumeData), target: resumeWithTemplate("not-a-template") }),
			),
		).toMatchObject({
			sourceHash: DEFAULT_RESUME_HASH,
			targetHash: null,
			outcome: "blocked",
			blockedReason: "invalid-target-json",
		});
	});

	it.each([
		[{ targetResumeId: null }, null],
		[{ target: null }, "resume-v5-synthetic-001"],
	] as const)("blocks contradictory serialized target presence for %s", (overrides, targetResumeId) => {
		expect(compareResumeRecovery(validRequest(overrides))).toEqual({
			caseId: "case-synthetic-001",
			sourceResumeId: "resume-v4-synthetic-001",
			targetResumeId,
			sourceHash: null,
			targetHash: null,
			outcome: "blocked",
			blockedReason: "target-presence-mismatch",
		});
	});

	it("returns the same manifest for repeated serialized dry runs", () => {
		const request = validRequest({ source: resumeWithName("Recovered copy"), targetResumeId: null, target: null });

		expect(compareResumeRecovery(request)).toEqual(compareResumeRecovery(request));
	});
});
