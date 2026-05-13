import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORPCError } from "@orpc/client";

const dbMock = {
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
};

const resumeServiceMock = {
	getById: vi.fn(),
};

const aiProvidersServiceMock = {
	getRunnableById: vi.fn(),
	getDefaultRunnable: vi.fn(),
	markUsed: vi.fn(),
};

vi.mock("@reactive-resume/db/client", () => ({ db: dbMock }));
vi.mock("@reactive-resume/db/schema", () => ({
	agentThread: {
		id: "agent_threads.id",
		userId: "agent_threads.user_id",
		deletedAt: "agent_threads.deleted_at",
		archivedAt: "agent_threads.archived_at",
		status: "agent_threads.status",
		activeRunId: "agent_threads.active_run_id",
		activeStreamId: "agent_threads.active_stream_id",
		activeRunStartedAt: "agent_threads.active_run_started_at",
		aiProviderId: "agent_threads.ai_provider_id",
		workingResumeId: "agent_threads.working_resume_id",
		sourceResumeId: "agent_threads.source_resume_id",
		title: "agent_threads.title",
		lastMessageAt: "agent_threads.last_message_at",
		createdAt: "agent_threads.created_at",
		updatedAt: "agent_threads.updated_at",
	},
	agentMessage: {
		threadId: "agent_messages.thread_id",
		userId: "agent_messages.user_id",
		sequence: "agent_messages.sequence",
	},
	agentAction: {
		threadId: "agent_actions.thread_id",
		userId: "agent_actions.user_id",
		createdAt: "agent_actions.created_at",
	},
	agentAttachment: {
		threadId: "agent_attachments.thread_id",
		userId: "agent_attachments.user_id",
		createdAt: "agent_attachments.created_at",
	},
	resume: { name: "resume.name", id: "resume.id", userId: "resume.user_id", slug: "resume.slug" },
	aiProvider: { label: "ai_provider.label", id: "ai_provider.id" },
}));

vi.mock("drizzle-orm", () => ({
	and: (...conditions: unknown[]) => ({ type: "and", conditions }),
	asc: (value: unknown) => ({ type: "asc", value }),
	count: () => ({ type: "count" }),
	desc: (value: unknown) => ({ type: "desc", value }),
	eq: (left: unknown, right: unknown) => ({ type: "eq", left, right }),
	isNull: (value: unknown) => ({ type: "isNull", value }),
	max: (value: unknown) => ({ type: "max", value }),
	sql: () => ({ type: "sql" }),
}));

vi.mock("ai", () => ({
	convertToModelMessages: vi.fn(),
	stepCountIs: vi.fn(),
	ToolLoopAgent: vi.fn(),
}));

vi.mock("./ai", () => ({ getAgentModel: vi.fn() }));
vi.mock("./ai-credentials", () => ({ assertAgentEnvironment: vi.fn() }));
vi.mock("./ai-providers", () => ({ aiProvidersService: aiProvidersServiceMock }));
vi.mock("./resume", () => ({ resumeService: resumeServiceMock }));
vi.mock("./storage", () => ({ getStorageService: vi.fn(), inferContentType: vi.fn() }));
vi.mock("./agent-patches", () => ({ createInverseResumePatches: vi.fn() }));
vi.mock("./agent-resume", () => ({
	buildAgentDraftResumeName: vi.fn(),
	buildUniqueAgentDraftSlug: vi.fn(),
}));
vi.mock("./agent-run-state", () => ({
	claimActiveAgentRun: vi.fn(),
	clearActiveAgentRunIfCurrent: vi.fn(),
}));
vi.mock("./agent-streams", () => ({
	agentStreamLifecycle: { create: vi.fn(), resume: vi.fn() },
}));
vi.mock("./agent-tools", () => ({
	buildAgentInstructions: vi.fn(),
	buildAgentTools: vi.fn(() => ({})),
}));
vi.mock("./agent-url", () => ({ fetchUrlForAgent: vi.fn() }));
vi.mock("@reactive-resume/schema/resume/default", () => ({ defaultResumeData: {} }));
vi.mock("@reactive-resume/utils/string", () => ({ generateId: () => "test-id" }));
vi.mock("@orpc/server", () => ({ streamToEventIterator: vi.fn() }));

function buildArchivedThread(overrides: Record<string, unknown> = {}) {
	return {
		id: "thread-1",
		userId: "user-1",
		aiProviderId: "provider-1",
		workingResumeId: "resume-1",
		sourceResumeId: null,
		title: "Archived thread",
		status: "archived",
		activeRunId: null,
		activeStreamId: null,
		activeRunStartedAt: null,
		lastMessageAt: new Date("2026-05-01T00:00:00.000Z"),
		archivedAt: new Date("2026-05-02T00:00:00.000Z"),
		deletedAt: null,
		createdAt: new Date("2026-04-01T00:00:00.000Z"),
		updatedAt: new Date("2026-05-02T00:00:00.000Z"),
		...overrides,
	};
}

describe("agentService.threads.get", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns isReadOnly: true when the thread is archived, even if the resume and provider are present", async () => {
		const archivedThread = buildArchivedThread();

		// First select call is `getThread` (limit), then three select calls for messages/actions/attachments (orderBy).
		const threadSelect = () => {
			const limit = vi.fn(async () => [archivedThread]);
			const where = vi.fn(() => ({ limit }));
			const from = vi.fn(() => ({ where }));
			return { from };
		};
		const emptyListSelect = () => {
			const orderBy = vi.fn(async () => []);
			const where = vi.fn(() => ({ orderBy }));
			const from = vi.fn(() => ({ where }));
			return { from };
		};

		dbMock.select
			.mockImplementationOnce(threadSelect)
			.mockImplementationOnce(emptyListSelect)
			.mockImplementationOnce(emptyListSelect)
			.mockImplementationOnce(emptyListSelect);

		resumeServiceMock.getById.mockResolvedValue({
			id: "resume-1",
			name: "Resume",
			data: {},
			updatedAt: new Date(),
		});

		const { agentService } = await import("./agent");

		const result = await agentService.threads.get({ id: "thread-1", userId: "user-1" });

		expect(result.isReadOnly).toBe(true);
		expect(result.thread.status).toBe("archived");
		expect(result.resume).toEqual(expect.objectContaining({ id: "resume-1" }));
	});
});

describe("agentService.messages.send", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("throws CONFLICT when the underlying thread is archived", async () => {
		const archivedThread = buildArchivedThread();

		dbMock.select.mockImplementation(() => {
			const limit = vi.fn(async () => [archivedThread]);
			const where = vi.fn(() => ({ limit }));
			const from = vi.fn(() => ({ where }));
			return { from };
		});

		const { agentService } = await import("./agent");

		const sending = agentService.messages.send({
			threadId: "thread-1",
			userId: "user-1",
			// biome-ignore lint/suspicious/noExplicitAny: minimal fixture for unit test
			message: { id: "msg-1", role: "user", parts: [{ type: "text", text: "hi" }] } as any,
		});

		await expect(sending).rejects.toBeInstanceOf(ORPCError);
		await expect(sending).rejects.toMatchObject({ code: "CONFLICT", message: "This thread is archived." });

		// Ensure we never tried to claim a run or persist anything for an archived thread.
		expect(aiProvidersServiceMock.getRunnableById).not.toHaveBeenCalled();
	});
});
