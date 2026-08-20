import type { ToolCallRepairFunction, ToolSet } from "ai";
import { jsonrepair } from "jsonrepair";
import { applyResumePatchInputSchema } from "@reactive-resume/ai/tools/agent-tool-contracts";

// Repairs sloppy apply_resume_patch calls from weaker BYOK models: fix broken JSON with
// jsonrepair, strip the common `/data` path prefix, then re-validate against the shared schema.
// Returning null falls back to the SDK's re-ask. Section-shortcut normalization stays in
// normalizeAgentResumePatchOperations (it needs the resume's section ids at execute time).

function stripDataPrefix(path: unknown): unknown {
	if (typeof path !== "string") return path;
	if (path === "/data") return "";
	return path.startsWith("/data/") ? path.slice("/data".length) : path;
}

function normalizeRepairedInput(parsed: unknown): unknown {
	if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { operations?: unknown }).operations)) {
		return parsed;
	}

	const record = parsed as Record<string, unknown> & { operations: unknown[] };
	return {
		...record,
		operations: record.operations.map((operation) => {
			if (!operation || typeof operation !== "object") return operation;
			const op = operation as Record<string, unknown>;
			return {
				...op,
				path: stripDataPrefix(op.path),
				...("from" in op ? { from: stripDataPrefix(op.from) } : {}),
			};
		}),
	};
}

// Pure core, exported for tests: returns the repaired stringified input or null.
export function repairAgentPatchToolCallInput(rawInput: string): string | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonrepair(rawInput));
	} catch {
		return null;
	}

	const validated = applyResumePatchInputSchema.safeParse(normalizeRepairedInput(parsed));
	return validated.success ? JSON.stringify(validated.data) : null;
}

export const repairAgentToolCall: ToolCallRepairFunction<ToolSet> = ({ toolCall }) => {
	if (toolCall.toolName !== "apply_resume_patch") return Promise.resolve(null);

	const repairedInput = repairAgentPatchToolCallInput(toolCall.input);
	if (repairedInput === null || repairedInput === toolCall.input) return Promise.resolve(null);

	return Promise.resolve({ ...toolCall, input: repairedInput });
};
