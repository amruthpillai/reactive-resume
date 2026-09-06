import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { createHash } from "node:crypto";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";

type RecoveryOutcome = "no-op" | "export-copy" | "blocked";
type RecoveryBlockReason =
	| "invalid-input"
	| "source-unavailable"
	| "owner-unverified"
	| "owner-mapping-missing"
	| "invalid-source-json"
	| "invalid-target-json"
	| "target-presence-mismatch";

type RecoveryComparisonRequest = {
	caseId: string;
	sourceResumeId: string;
	targetResumeId: string | null;
	ownerVerified: boolean;
	ownerMappingPresent: boolean;
	sourceAvailable: boolean;
	source: unknown;
	target: unknown;
};

export type RecoveryComparisonInput = string;

export type RecoveryManifest = {
	caseId: string;
	sourceResumeId: string;
	targetResumeId: string | null;
	sourceHash: string | null;
	targetHash: string | null;
	outcome: RecoveryOutcome;
	blockedReason: RecoveryBlockReason | null;
};

const REQUEST_KEYS = [
	"caseId",
	"ownerMappingPresent",
	"ownerVerified",
	"source",
	"sourceAvailable",
	"sourceResumeId",
	"target",
	"targetResumeId",
] as const;

const INVALID_INPUT_MANIFEST = {
	caseId: "invalid-input",
	sourceResumeId: "invalid-input",
	targetResumeId: null,
	sourceHash: null,
	targetHash: null,
	outcome: "blocked",
	blockedReason: "invalid-input",
} satisfies RecoveryManifest;

const UNICODE_CONTROL_OR_FORMAT_CHARACTER = /[\p{Cc}\p{Cf}]/u;

function hasDuplicateJsonMembers(input: string): boolean {
	let position = 0;
	const numberPattern = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

	function fail(): never {
		throw new SyntaxError("Invalid JSON");
	}

	function skipWhitespace(): void {
		while (
			input[position] === " " ||
			input[position] === "\t" ||
			input[position] === "\n" ||
			input[position] === "\r"
		) {
			position += 1;
		}
	}

	function scanString(): string {
		const start = position;
		if (input[position] !== '"') fail();
		position += 1;

		while (position < input.length) {
			const character = input[position] ?? fail();
			position += 1;
			if (character === '"') return JSON.parse(input.slice(start, position));
			if (character === "\\") {
				if (position >= input.length) fail();
				position += 1;
			} else if (character.charCodeAt(0) <= 0x1f) {
				fail();
			}
		}

		return fail();
	}

	function scanObject(): boolean {
		position += 1;
		skipWhitespace();
		if (input[position] === "}") {
			position += 1;
			return false;
		}

		const keys = new Set<string>();
		while (position < input.length) {
			const key = scanString();
			if (keys.has(key)) return true;
			keys.add(key);

			skipWhitespace();
			if (input[position] !== ":") fail();
			position += 1;
			if (scanValue()) return true;

			skipWhitespace();
			if (input[position] === "}") {
				position += 1;
				return false;
			}
			if (input[position] !== ",") fail();
			position += 1;
			skipWhitespace();
		}

		return fail();
	}

	function scanArray(): boolean {
		position += 1;
		skipWhitespace();
		if (input[position] === "]") {
			position += 1;
			return false;
		}

		while (position < input.length) {
			if (scanValue()) return true;
			skipWhitespace();
			if (input[position] === "]") {
				position += 1;
				return false;
			}
			if (input[position] !== ",") fail();
			position += 1;
			skipWhitespace();
		}

		return fail();
	}

	function scanValue(): boolean {
		skipWhitespace();
		const character = input[position];
		if (character === "{") return scanObject();
		if (character === "[") return scanArray();
		if (character === '"') {
			scanString();
			return false;
		}
		for (const literal of ["true", "false", "null"]) {
			if (input.startsWith(literal, position)) {
				position += literal.length;
				return false;
			}
		}

		numberPattern.lastIndex = position;
		const number = numberPattern.exec(input);
		if (!number) fail();
		position = numberPattern.lastIndex;
		return false;
	}

	const hasDuplicate = scanValue();
	if (hasDuplicate) return true;
	skipWhitespace();
	if (position !== input.length) fail();
	return false;
}

function isManifestId(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0 && !UNICODE_CONTROL_OR_FORMAT_CHARACTER.test(value);
}

function hasDuplicateSerializedResumeMembers(value: unknown): boolean {
	if (typeof value !== "string") return false;
	try {
		return hasDuplicateJsonMembers(value);
	} catch {
		return false;
	}
}

function isJsonValue(value: unknown): boolean {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value);
	if (Array.isArray(value)) return value.every(isJsonValue);
	if (typeof value === "object") return Object.values(value).every(isJsonValue);
	return false;
}

function parseRequest(input: string): RecoveryComparisonRequest | null {
	try {
		if (hasDuplicateJsonMembers(input)) return null;
		const value: unknown = JSON.parse(input);
		if (value === null || Array.isArray(value) || typeof value !== "object" || !isJsonValue(value)) return null;

		const keys = Object.keys(value).sort();
		if (keys.length !== REQUEST_KEYS.length || !keys.every((key, index) => key === REQUEST_KEYS[index])) return null;

		const request = value as Record<(typeof REQUEST_KEYS)[number], unknown>;
		if (hasDuplicateSerializedResumeMembers(request.source) || hasDuplicateSerializedResumeMembers(request.target)) {
			return null;
		}
		if (!isManifestId(request.caseId)) return null;
		if (!isManifestId(request.sourceResumeId)) return null;
		if (request.targetResumeId !== null && !isManifestId(request.targetResumeId)) return null;
		if (
			typeof request.ownerVerified !== "boolean" ||
			typeof request.ownerMappingPresent !== "boolean" ||
			typeof request.sourceAvailable !== "boolean"
		) {
			return null;
		}

		return request as RecoveryComparisonRequest;
	} catch {
		return null;
	}
}

function parseResume(value: unknown): ResumeData | null {
	try {
		const json = typeof value === "string" ? JSON.parse(value) : value;
		const result = resumeDataSchema.safeParse(json);
		if (!result.success || canonicalize(json) !== canonicalize(result.data)) return null;
		return result.data;
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
	if (typeof input !== "string") return { ...INVALID_INPUT_MANIFEST };

	const request = parseRequest(input);
	if (!request) return { ...INVALID_INPUT_MANIFEST };

	const manifest = {
		caseId: request.caseId,
		sourceResumeId: request.sourceResumeId,
		targetResumeId: request.targetResumeId,
		sourceHash: null,
		targetHash: null,
		outcome: "blocked",
		blockedReason: null,
	} satisfies RecoveryManifest;

	if (!request.sourceAvailable) return { ...manifest, blockedReason: "source-unavailable" };
	if (!request.ownerVerified) return { ...manifest, blockedReason: "owner-unverified" };
	if (!request.ownerMappingPresent) return { ...manifest, blockedReason: "owner-mapping-missing" };
	if ((request.targetResumeId === null) !== (request.target === null)) {
		return { ...manifest, blockedReason: "target-presence-mismatch" };
	}

	const source = parseResume(request.source);
	if (!source) return { ...manifest, blockedReason: "invalid-source-json" };

	const sourceHash = hashResume(source);
	if (request.target === null) {
		return { ...manifest, sourceHash, outcome: "export-copy", blockedReason: null };
	}

	const target = parseResume(request.target);
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
