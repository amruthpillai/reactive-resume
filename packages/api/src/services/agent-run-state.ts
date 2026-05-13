import { and, eq, isNull } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";

type AgentRunStateDb = Pick<typeof db, "update">;

export async function claimActiveAgentRun(
	input: { threadId: string; userId: string; runId: string; streamId: string },
	database: AgentRunStateDb = db,
) {
	const claimed = await database
		.update(schema.agentThread)
		.set({ activeRunId: input.runId, activeStreamId: input.streamId, activeRunStartedAt: new Date() })
		.where(
			and(
				eq(schema.agentThread.id, input.threadId),
				eq(schema.agentThread.userId, input.userId),
				isNull(schema.agentThread.activeRunId),
			),
		)
		.returning({ id: schema.agentThread.id });

	return claimed.length === 1;
}

export async function clearActiveAgentRunIfCurrent(
	input: { threadId: string; userId: string; runId: string; streamId: string | null },
	database: AgentRunStateDb = db,
) {
	await database
		.update(schema.agentThread)
		.set({ activeRunId: null, activeStreamId: null, activeRunStartedAt: null })
		.where(
			and(
				eq(schema.agentThread.id, input.threadId),
				eq(schema.agentThread.userId, input.userId),
				eq(schema.agentThread.activeRunId, input.runId),
				input.streamId === null
					? isNull(schema.agentThread.activeStreamId)
					: eq(schema.agentThread.activeStreamId, input.streamId),
			),
		);
}
