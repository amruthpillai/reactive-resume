import { describe, expect, it } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import { agentAction, agentAttachment, agentMessage, agentThread, aiProvider } from "./agent";

describe("aiProvider table definition", () => {
	it("is named ai_providers and stores encrypted credentials metadata", () => {
		expect(getTableName(aiProvider)).toBe("ai_providers");

		const columns = getTableColumns(aiProvider);
		for (const name of [
			"id",
			"userId",
			"label",
			"provider",
			"model",
			"baseUrl",
			"encryptedApiKey",
			"apiKeySalt",
			"apiKeyHash",
			"apiKeyPreview",
			"testStatus",
			"lastTestedAt",
			"lastUsedAt",
			"enabled",
			"createdAt",
			"updatedAt",
		]) {
			expect(columns[name as keyof typeof columns], name).toBeDefined();
		}
	});
});

describe("agent workspace table definitions", () => {
	it("declares threads, messages, attachments, and actions", () => {
		expect(getTableName(agentThread)).toBe("agent_threads");
		expect(getTableName(agentMessage)).toBe("agent_messages");
		expect(getTableName(agentAttachment)).toBe("agent_attachments");
		expect(getTableName(agentAction)).toBe("agent_actions");

		expect(getTableColumns(agentThread).workingResumeId).toBeDefined();
		expect(getTableColumns(agentThread).lastMessageAt).toBeDefined();
		expect(getTableColumns(agentMessage).uiMessage).toBeDefined();
		expect(getTableColumns(agentAttachment).storageKey).toBeDefined();
		expect(getTableColumns(agentAction).inverseOperations).toBeDefined();
	});
});
