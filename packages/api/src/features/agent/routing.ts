import type { UIMessage } from "ai";
import { ORPCError } from "@orpc/client";

export function isAgentEnvironmentUnavailable(error: unknown) {
	return error instanceof Error && error.message === "AGENT_ENVIRONMENT_UNAVAILABLE";
}

export function throwUnavailable(): never {
	throw new ORPCError("PRECONDITION_FAILED", {
		message: "AI agent workspace is unavailable because REDIS_URL or ENCRYPTION_SECRET is not configured.",
	});
}

export function isUiMessage(value: unknown): value is UIMessage {
	if (!value || typeof value !== "object") return false;

	const message = value as Partial<UIMessage>;
	return (
		typeof message.id === "string" &&
		(message.role === "system" || message.role === "user" || message.role === "assistant") &&
		Array.isArray(message.parts)
	);
}
