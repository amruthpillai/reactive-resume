import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { createHash } from "node:crypto";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";

export type RecoveryOutcome = "no-op" | "export-copy" | "blocked";
export type RecoveryBlockReason =
	| "source-unavailable"
	| "owner-unverified"
	| "owner-mapping-missing"
	| "invalid-source-json"
	| "invalid-target-json";

export type RecoveryComparisonInput = {
	caseId: string;
	sourceResumeId: string;
	targetResumeId: string | null;
	ownerVerified: boolean;
	ownerMappingPresent: boolean;
	sourceAvailable: boolean;
	source: unknown;
	target: unknown | null;
};

export type RecoveryManifest = {
	caseId: string;
	sourceResumeId: string;
	targetResumeId: string | null;
	sourceHash: string | null;
	targetHash: string | null;
	outcome: RecoveryOutcome;
	blockedReason: RecoveryBlockReason | null;
};

function parseResume(value: unknown): ResumeData | null {
	try {
		const json = JSON.parse(typeof value === "string" ? value : JSON.stringify(value));
		const result = resumeDataSchema.safeParse(json);
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

function canonicalize(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
	if (typeof value === "object") {
		const entries = Object.entries(value)
			.filter(([, item]) => item !== undefined)
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
		return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(",")}}`;
	}

	return JSON.stringify(value);
}

function hashResume(resume: ResumeData): string {
	return createHash("sha256").update(canonicalize(resume)).digest("hex");
}

export function compareResumeRecovery(input: RecoveryComparisonInput): RecoveryManifest {
	const manifest = {
		caseId: input.caseId,
		sourceResumeId: input.sourceResumeId,
		targetResumeId: input.targetResumeId,
		sourceHash: null,
		targetHash: null,
		outcome: "blocked",
		blockedReason: null,
	} satisfies RecoveryManifest;

	if (!input.sourceAvailable) return { ...manifest, blockedReason: "source-unavailable" };
	if (!input.ownerVerified) return { ...manifest, blockedReason: "owner-unverified" };
	if (!input.ownerMappingPresent) return { ...manifest, blockedReason: "owner-mapping-missing" };

	const source = parseResume(input.source);
	if (!source) return { ...manifest, blockedReason: "invalid-source-json" };

	const sourceHash = hashResume(source);
	if (input.target === null) {
		return { ...manifest, sourceHash, outcome: "export-copy", blockedReason: null };
	}

	const target = parseResume(input.target);
	if (!target) return { ...manifest, sourceHash, blockedReason: "invalid-target-json" };

	const targetHash = hashResume(target);
	return {
		...manifest,
		sourceHash,
		targetHash,
		outcome: sourceHash === targetHash ? "no-op" : "export-copy",
		blockedReason: null,
	};
}
