import type { RecoveryComparisonInput } from "./compare-resume";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { compareResumeRecovery } from "./compare-resume";

const SYNTHETIC_SOURCE_HASH = "68cbff28a704f3859c7f5385e9e82a3517521374d99ec2f65ca15887f81310cc";
const RECOVERED_COPY_HASH = "56d3e7d3ecd336b6d910224e2ecb64c7a3c010ff980782f3bea985682018e3a6";
const CURRENT_COPY_HASH = "40cb0aba1e7b3d0950314c3ad20a74b30785545658b296fea97885d6364c9b2f";

function resumeWithName(name: string) {
	const resume = structuredClone(defaultResumeData);
	resume.basics.name = name;
	return resume;
}

function validInput(overrides: Partial<RecoveryComparisonInput> = {}): RecoveryComparisonInput {
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

describe("compareResumeRecovery", () => {
	it("returns no-op with hand-checked hashes when source and target are identical", () => {
		expect(compareResumeRecovery(validInput())).toEqual({
			caseId: "case-synthetic-001",
			sourceResumeId: "resume-v4-synthetic-001",
			targetResumeId: "resume-v5-synthetic-001",
			sourceHash: SYNTHETIC_SOURCE_HASH,
			targetHash: SYNTHETIC_SOURCE_HASH,
			outcome: "no-op",
			blockedReason: null,
		});
	});

	it("returns export-copy when no target resume exists", () => {
		expect(compareResumeRecovery(validInput({ targetResumeId: null, target: null }))).toEqual({
			caseId: "case-synthetic-001",
			sourceResumeId: "resume-v4-synthetic-001",
			targetResumeId: null,
			sourceHash: SYNTHETIC_SOURCE_HASH,
			targetHash: null,
			outcome: "export-copy",
			blockedReason: null,
		});
	});

	it("returns export-copy with both hashes when source and target diverge", () => {
		expect(
			compareResumeRecovery(
				validInput({ source: resumeWithName("Recovered copy"), target: resumeWithName("Current copy") }),
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
	] as const)("blocks before hashing when identity gate fails with %s", (overrides, blockedReason) => {
		expect(compareResumeRecovery(validInput(overrides))).toMatchObject({
			sourceHash: null,
			targetHash: null,
			outcome: "blocked",
			blockedReason,
		});
	});

	it("blocks when source snapshot is unavailable", () => {
		expect(compareResumeRecovery(validInput({ sourceAvailable: false, source: undefined }))).toMatchObject({
			sourceHash: null,
			targetHash: null,
			outcome: "blocked",
			blockedReason: "source-unavailable",
		});
	});

	it("blocks malformed source JSON instead of treating it as an empty resume", () => {
		expect(compareResumeRecovery(validInput({ source: "{" }))).toMatchObject({
			sourceHash: null,
			targetHash: null,
			outcome: "blocked",
			blockedReason: "invalid-source-json",
		});
	});

	it("blocks malformed target JSON instead of replacing it", () => {
		expect(compareResumeRecovery(validInput({ target: "{" }))).toMatchObject({
			sourceHash: SYNTHETIC_SOURCE_HASH,
			targetHash: null,
			outcome: "blocked",
			blockedReason: "invalid-target-json",
		});
	});

	it("returns the same manifest for repeated dry runs", () => {
		const input = validInput({ source: JSON.stringify(resumeWithName("Recovered copy")), target: null });

		expect(compareResumeRecovery(input)).toEqual(compareResumeRecovery(input));
	});

	it("does not mutate source or target objects", () => {
		const input = validInput({ source: resumeWithName("Recovered copy"), target: resumeWithName("Current copy") });
		const before = structuredClone(input);

		compareResumeRecovery(input);

		expect(input).toEqual(before);
	});
});
