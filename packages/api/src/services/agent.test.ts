import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORPCError } from "@orpc/client";

const dbMock = {
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
};

const clearActiveAgentRunIfCurrentMock = vi.fn();
const claimActiveAgentRunMock = vi.fn();
const storageServiceMock = {
	delete: vi.fn(),
	write: vi.fn(),
	read: vi.fn(),
};

const resumeServiceMock = {
	getById: vi.fn(),
	patch: vi.fn(),
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
		id: "agent_messages.id",
		threadId: "agent_messages.thread_id",
		userId: "agent_messages.user_id",
		role: "agent_messages.role",
		status: "agent_messages.status",
		sequence: "agent_messages.sequence",
		uiMessage: "agent_messages.ui_message",
	},
	agentAction: {
		id: "agent_actions.id",
		threadId: "agent_actions.thread_id",
		userId: "agent_actions.user_id",
		createdAt: "agent_actions.created_at",
	},
	agentAttachment: {
		id: "agent_attachments.id",
		threadId: "agent_attachments.thread_id",
		userId: "agent_attachments.user_id",
		messageId: "agent_attachments.message_id",
		storageKey: "agent_attachments.storage_key",
		filename: "agent_attachments.filename",
		mediaType: "agent_attachments.media_type",
		size: "agent_attachments.size",
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
	inArray: (left: unknown, values: unknown[]) => ({ type: "inArray", left, values }),
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
vi.mock("./storage", () => ({ getStorageService: vi.fn(() => storageServiceMock), inferContentType: vi.fn() }));
vi.mock("./agent-patches", () => ({ createInverseResumePatches: vi.fn() }));
vi.mock("./agent-resume", () => ({
	buildAgentDraftResumeName: vi.fn(),
	buildUniqueAgentDraftSlug: vi.fn(),
}));
vi.mock("./agent-run-state", () => ({
	claimActiveAgentRun: claimActiveAgentRunMock,
	clearActiveAgentRunIfCurrent: clearActiveAgentRunIfCurrentMock,
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

beforeEach(() => {
	for (const mock of Object.values(dbMock)) mock.mockReset();
	clearActiveAgentRunIfCurrentMock.mockReset();
	claimActiveAgentRunMock.mockReset();
	for (const mock of Object.values(storageServiceMock)) mock.mockReset();
	for (const mock of Object.values(resumeServiceMock)) mock.mockReset();
	for (const mock of Object.values(aiProvidersServiceMock)) mock.mockReset();
});

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

function selectLimitResult(rows: unknown[]) {
	const limit = vi.fn(async () => rows);
	const where = vi.fn(() => ({ limit }));
	const from = vi.fn(() => ({ where }));
	return { from };
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

describe("agentService.threads.archive", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("skips active-run cleanup when there is no active run", async () => {
		const idleThread = buildArchivedThread({
			status: "active",
			activeRunId: null,
			activeStreamId: null,
			archivedAt: null,
		});

		dbMock.select.mockImplementation(() => {
			const limit = vi.fn(async () => [idleThread]);
			const where = vi.fn(() => ({ limit }));
			const from = vi.fn(() => ({ where }));
			return { from };
		});

		const updateWhere = vi.fn(async () => undefined);
		const updateSet = vi.fn(() => ({ where: updateWhere }));
		dbMock.update.mockReturnValue({ set: updateSet });

		const { agentService } = await import("./agent");

		await agentService.threads.archive({ id: "thread-1", userId: "user-1" });

		expect(clearActiveAgentRunIfCurrentMock).not.toHaveBeenCalled();
		expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "archived" }));
		expect(updateWhere).toHaveBeenCalled();
	});

	it("clears active-run state when an active run is present, then flips status", async () => {
		const activeThread = buildArchivedThread({
			status: "active",
			activeRunId: "run-1",
			activeStreamId: "stream-1",
			archivedAt: null,
		});

		dbMock.select.mockImplementation(() => {
			const limit = vi.fn(async () => [activeThread]);
			const where = vi.fn(() => ({ limit }));
			const from = vi.fn(() => ({ where }));
			return { from };
		});

		const updateWhere = vi.fn(async () => undefined);
		const updateSet = vi.fn(() => ({ where: updateWhere }));
		dbMock.update.mockReturnValue({ set: updateSet });

		clearActiveAgentRunIfCurrentMock.mockResolvedValue(undefined);

		const { agentService } = await import("./agent");

		await agentService.threads.archive({ id: "thread-1", userId: "user-1" });

		expect(clearActiveAgentRunIfCurrentMock).toHaveBeenCalledWith({
			threadId: "thread-1",
			userId: "user-1",
			runId: "run-1",
			streamId: "stream-1",
		});
		expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "archived" }));
		expect(updateWhere).toHaveBeenCalled();
	});

	it("still flips status when clearActiveAgentRunIfCurrent throws", async () => {
		const activeThread = buildArchivedThread({
			status: "active",
			activeRunId: "run-2",
			activeStreamId: "stream-2",
			archivedAt: null,
		});

		dbMock.select.mockImplementation(() => {
			const limit = vi.fn(async () => [activeThread]);
			const where = vi.fn(() => ({ limit }));
			const from = vi.fn(() => ({ where }));
			return { from };
		});

		const updateWhere = vi.fn(async () => undefined);
		const updateSet = vi.fn(() => ({ where: updateWhere }));
		dbMock.update.mockReturnValue({ set: updateSet });

		clearActiveAgentRunIfCurrentMock.mockRejectedValue(new Error("boom"));
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

		const { agentService } = await import("./agent");

		await agentService.threads.archive({ id: "thread-1", userId: "user-1" });

		expect(clearActiveAgentRunIfCurrentMock).toHaveBeenCalled();
		expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "archived" }));
		expect(consoleSpy).toHaveBeenCalled();

		consoleSpy.mockRestore();
	});
});

describe("agentService.threads.delete", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("throws NOT_FOUND when the thread does not belong to the user and skips destructive work", async () => {
		dbMock.select.mockImplementation(() => {
			const limit = vi.fn(async () => []);
			const where = vi.fn(() => ({ limit }));
			const from = vi.fn(() => ({ where }));
			return { from };
		});

		const { agentService } = await import("./agent");

		const deleting = agentService.threads.delete({ id: "thread-x", userId: "user-y" });

		await expect(deleting).rejects.toBeInstanceOf(ORPCError);
		await expect(deleting).rejects.toMatchObject({ code: "NOT_FOUND" });

		expect(storageServiceMock.delete).not.toHaveBeenCalled();
		expect(dbMock.delete).not.toHaveBeenCalled();
		expect(dbMock.update).not.toHaveBeenCalled();
	});

	it("proceeds with cleanup when the thread is owned by the user", async () => {
		const ownedThread = buildArchivedThread({
			id: "thread-own",
			userId: "user-own",
			status: "active",
			activeRunId: null,
			activeStreamId: null,
			archivedAt: null,
		});

		dbMock.select.mockImplementation(() => {
			const limit = vi.fn(async () => [ownedThread]);
			const where = vi.fn(() => ({ limit }));
			const from = vi.fn(() => ({ where }));
			return { from };
		});

		const deleteWhere = vi.fn(async () => undefined);
		dbMock.delete.mockReturnValue({ where: deleteWhere });

		const updateWhere = vi.fn(async () => undefined);
		const updateSet = vi.fn(() => ({ where: updateWhere }));
		dbMock.update.mockReturnValue({ set: updateSet });

		storageServiceMock.delete.mockResolvedValue(undefined);

		const { agentService } = await import("./agent");

		await agentService.threads.delete({ id: "thread-own", userId: "user-own" });

		expect(storageServiceMock.delete).toHaveBeenCalledWith("uploads/user-own/agent/thread-own");
		expect(dbMock.delete).toHaveBeenCalled();
		expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "deleted" }));
	});
});

describe("agentService.actions.revert", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function buildAction(overrides: Record<string, unknown> = {}) {
		return {
			id: "action-1",
			userId: "user-1",
			threadId: "thread-1",
			messageId: null,
			resumeId: "resume-1",
			kind: "resume_patch",
			status: "applied",
			title: "Tighten summary",
			summary: null,
			operations: [{ op: "replace", path: "/basics/name", value: "Bob" }],
			inverseOperations: [{ op: "replace", path: "/basics/name", value: "Alice" }],
			baseUpdatedAt: new Date("2026-05-01T00:00:00.000Z"),
			appliedUpdatedAt: new Date("2026-05-02T00:00:00.000Z"),
			revertedAt: null,
			revertMessage: null,
			createdAt: new Date("2026-05-02T00:00:00.000Z"),
			updatedAt: new Date("2026-05-02T00:00:00.000Z"),
			...overrides,
		};
	}

	it("reverts an applied action, calls resumeService.patch with the inverse operations, and updates the DB row", async () => {
		const action = buildAction();
		const updatedAction = { ...action, status: "reverted", revertedAt: new Date(), revertMessage: null };

		dbMock.select.mockImplementation(() => selectLimitResult([action]));

		const updateReturning = vi.fn(async () => [updatedAction]);
		const updateWhere = vi.fn(() => ({ returning: updateReturning }));
		const updateSet = vi.fn(() => ({ where: updateWhere }));
		dbMock.update.mockReturnValue({ set: updateSet });

		resumeServiceMock.patch.mockResolvedValue({ updatedAt: new Date("2026-05-03T00:00:00.000Z") });

		const { agentService } = await import("./agent");

		const result = await agentService.actions.revert({ id: "action-1", userId: "user-1" });

		expect(resumeServiceMock.patch).toHaveBeenCalledWith({
			id: "resume-1",
			userId: "user-1",
			operations: action.inverseOperations,
			expectedUpdatedAt: action.appliedUpdatedAt,
		});
		expect(updateSet).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "reverted",
				revertMessage: null,
				appliedUpdatedAt: new Date("2026-05-03T00:00:00.000Z"),
			}),
		);
		expect(result.status).toBe("reverted");
	});

	it("returns a conflicted action when resumeService.patch throws RESUME_VERSION_CONFLICT", async () => {
		const action = buildAction();
		const conflictedAction = {
			...action,
			status: "conflicted",
			revertMessage: "The resume changed after this action was applied.",
		};

		dbMock.select.mockImplementation(() => selectLimitResult([action]));

		const updateReturning = vi.fn(async () => [conflictedAction]);
		const updateWhere = vi.fn(() => ({ returning: updateReturning }));
		const updateSet = vi.fn(() => ({ where: updateWhere }));
		dbMock.update.mockReturnValue({ set: updateSet });

		resumeServiceMock.patch.mockRejectedValue(new ORPCError("RESUME_VERSION_CONFLICT"));

		const { agentService } = await import("./agent");

		const result = await agentService.actions.revert({ id: "action-1", userId: "user-1" });

		expect(resumeServiceMock.patch).toHaveBeenCalled();
		expect(updateSet).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "conflicted",
				revertMessage: "The resume changed after this action was applied.",
			}),
		);
		expect(updateWhere).toHaveBeenCalled();
		expect(updateReturning).toHaveBeenCalled();
		expect(result.status).toBe("conflicted");
		expect(result.revertMessage).toBe("The resume changed after this action was applied.");
	});

	it("returns the existing action unchanged when its status is already reverted", async () => {
		const action = buildAction({
			status: "reverted",
			revertedAt: new Date("2026-05-03T00:00:00.000Z"),
		});

		dbMock.select.mockImplementation(() => selectLimitResult([action]));

		const { agentService } = await import("./agent");

		const result = await agentService.actions.revert({ id: "action-1", userId: "user-1" });

		expect(resumeServiceMock.patch).not.toHaveBeenCalled();
		expect(dbMock.update).not.toHaveBeenCalled();
		expect(result.status).toBe("reverted");
		expect(result.id).toBe("action-1");
	});

	it("throws BAD_REQUEST when the action has no resumeId", async () => {
		const action = buildAction({ resumeId: null });

		dbMock.select.mockImplementation(() => selectLimitResult([action]));

		const { agentService } = await import("./agent");

		const reverting = agentService.actions.revert({ id: "action-1", userId: "user-1" });

		await expect(reverting).rejects.toBeInstanceOf(ORPCError);
		await expect(reverting).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(resumeServiceMock.patch).not.toHaveBeenCalled();
	});

	it("throws NOT_FOUND when no matching action is found", async () => {
		dbMock.select.mockImplementation(() => selectLimitResult([]));

		const { agentService } = await import("./agent");

		const reverting = agentService.actions.revert({ id: "missing-id", userId: "user-1" });

		await expect(reverting).rejects.toBeInstanceOf(ORPCError);
		await expect(reverting).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(resumeServiceMock.patch).not.toHaveBeenCalled();
	});
});
