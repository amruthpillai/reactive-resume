import type { Locale } from "@reactive-resume/utils/locale";
import type { JsonPatchOperation } from "@reactive-resume/utils/resume/patch";
import type { UIMessage } from "ai";
import type { getModel } from "./ai";
import { ORPCError } from "@orpc/client";
import { streamToEventIterator } from "@orpc/server";
import { convertToModelMessages, stepCountIs, ToolLoopAgent } from "ai";
import { and, asc, count, desc, eq, isNull, max, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { generateId } from "@reactive-resume/utils/string";
import { createInverseResumePatches } from "./agent-patches";
import { buildAgentDraftResumeName, buildUniqueAgentDraftSlug } from "./agent-resume";
import { claimActiveAgentRun, clearActiveAgentRunIfCurrent } from "./agent-run-state";
import { agentStreamLifecycle } from "./agent-streams";
import { buildAgentInstructions, buildAgentTools } from "./agent-tools";
import { fetchUrlForAgent } from "./agent-url";
import { getAgentModel } from "./ai";
import { assertAgentEnvironment } from "./ai-credentials";
import { aiProvidersService } from "./ai-providers";
import { resumeService } from "./resume";
import { getStorageService, inferContentType } from "./storage";

const MAX_AGENT_STEPS = 30;
const MAX_ATTACHMENTS_PER_MESSAGE = 10;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_THREAD_ATTACHMENT_BYTES = 100 * 1024 * 1024;
const READABLE_ATTACHMENT_TYPES = new Set(["text/plain", "text/markdown", "application/json"]);

const activeRunControllers = new Map<string, AbortController>();
const canceledRunsWithPersistedPartial = new Set<string>();

type AgentThreadRecord = typeof schema.agentThread.$inferSelect;
type AgentMessageRecord = typeof schema.agentMessage.$inferSelect;
type AgentActionRecord = typeof schema.agentAction.$inferSelect;
type AgentAttachmentRecord = typeof schema.agentAttachment.$inferSelect;

type CreateThreadInput = {
	userId: string;
	locale: Locale;
	aiProviderId?: string;
	sourceResumeId?: string;
};

type SendMessageInput = {
	userId: string;
	threadId: string;
	message: UIMessage;
};

type CreateAttachmentInput = {
	userId: string;
	threadId: string;
	filename: string;
	mediaType: string;
	data: Uint8Array;
};

function cloneResumeData<T>(data: T): T {
	return structuredClone(data);
}

function toThreadSummary(row: AgentThreadRecord & { resumeName?: string | null; providerLabel?: string | null }) {
	return {
		id: row.id,
		title: row.title,
		status: row.status,
		sourceResumeId: row.sourceResumeId,
		workingResumeId: row.workingResumeId,
		aiProviderId: row.aiProviderId,
		resumeName: row.resumeName ?? null,
		providerLabel: row.providerLabel ?? null,
		activeRunId: row.activeRunId,
		lastMessageAt: row.lastMessageAt,
		archivedAt: row.archivedAt,
		deletedAt: row.deletedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function toMessage(row: AgentMessageRecord): UIMessage {
	return row.uiMessage as unknown as UIMessage;
}

function toAction(row: AgentActionRecord) {
	return {
		id: row.id,
		threadId: row.threadId,
		messageId: row.messageId,
		resumeId: row.resumeId,
		kind: row.kind,
		status: row.status,
		title: row.title,
		summary: row.summary,
		operations: row.operations,
		inverseOperations: row.inverseOperations,
		baseUpdatedAt: row.baseUpdatedAt,
		appliedUpdatedAt: row.appliedUpdatedAt,
		revertedAt: row.revertedAt,
		revertMessage: row.revertMessage,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function toAttachment(row: AgentAttachmentRecord) {
	return {
		id: row.id,
		threadId: row.threadId,
		messageId: row.messageId,
		filename: row.filename,
		mediaType: row.mediaType,
		size: row.size,
		createdAt: row.createdAt,
	};
}

async function getExistingResumeSlugs(userId: string) {
	const rows = await db
		.select({ slug: schema.resume.slug })
		.from(schema.resume)
		.where(eq(schema.resume.userId, userId));
	return new Set(rows.map((row) => row.slug));
}

async function createWorkingResume(input: CreateThreadInput) {
	if (input.sourceResumeId) {
		const source = await resumeService.getById({ id: input.sourceResumeId, userId: input.userId });
		const existingSlugs = await getExistingResumeSlugs(input.userId);
		const name = buildAgentDraftResumeName(source.name);
		const slug = buildUniqueAgentDraftSlug(source.name, existingSlugs);

		const id = await resumeService.create({
			userId: input.userId,
			name,
			slug,
			tags: [...source.tags],
			locale: input.locale,
			data: cloneResumeData(source.data),
		});

		return { id, source, title: name };
	}

	const existingSlugs = await getExistingResumeSlugs(input.userId);
	const name = "AI Draft";
	const id = await resumeService.create({
		userId: input.userId,
		name,
		slug: buildUniqueAgentDraftSlug(name, existingSlugs),
		tags: [],
		locale: input.locale,
		data: cloneResumeData(defaultResumeData),
	});

	return { id, source: null, title: name };
}

async function getThread(input: { id: string; userId: string }) {
	const [thread] = await db
		.select()
		.from(schema.agentThread)
		.where(
			and(
				eq(schema.agentThread.id, input.id),
				eq(schema.agentThread.userId, input.userId),
				isNull(schema.agentThread.deletedAt),
			),
		)
		.limit(1);

	if (!thread) throw new ORPCError("NOT_FOUND");

	return thread;
}

async function getNextMessageSequence(threadId: string) {
	const [row] = await db
		.select({ maxSequence: max(schema.agentMessage.sequence) })
		.from(schema.agentMessage)
		.where(eq(schema.agentMessage.threadId, threadId));

	return (row?.maxSequence ?? -1) + 1;
}

async function persistMessage(input: {
	userId: string;
	threadId: string;
	message: UIMessage;
	status?: string;
	sequence?: number;
}) {
	const sequence = input.sequence ?? (await getNextMessageSequence(input.threadId));
	const [message] = await db
		.insert(schema.agentMessage)
		.values({
			userId: input.userId,
			threadId: input.threadId,
			role: input.message.role,
			status: input.status ?? "completed",
			sequence,
			uiMessage: input.message as unknown as Record<string, unknown>,
		})
		.returning();

	await db
		.update(schema.agentThread)
		.set({ lastMessageAt: new Date() })
		.where(and(eq(schema.agentThread.id, input.threadId), eq(schema.agentThread.userId, input.userId)));

	return message;
}

async function cleanupActiveRun(input: {
	threadId: string;
	userId: string;
	runId: string;
	streamId: string;
	primaryError?: unknown;
}) {
	activeRunControllers.delete(input.runId);
	canceledRunsWithPersistedPartial.delete(input.runId);

	try {
		await clearActiveAgentRunIfCurrent(input);
	} catch (error) {
		if (!input.primaryError) throw error;
		console.error("[agent] Failed to clear active run after run error", error);
	}
}

function messageText(message: UIMessage) {
	return message.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join(" ")
		.trim();
}

function buildThreadTitle(message: UIMessage, fallback: string) {
	const text = messageText(message);
	if (!text) return fallback;
	return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

async function listThreadMessages(input: { threadId: string; userId: string }) {
	return db
		.select()
		.from(schema.agentMessage)
		.where(and(eq(schema.agentMessage.threadId, input.threadId), eq(schema.agentMessage.userId, input.userId)))
		.orderBy(asc(schema.agentMessage.sequence));
}

async function readAttachment(input: { id: string; threadId: string; userId: string }) {
	const [attachment] = await db
		.select()
		.from(schema.agentAttachment)
		.where(
			and(
				eq(schema.agentAttachment.id, input.id),
				eq(schema.agentAttachment.threadId, input.threadId),
				eq(schema.agentAttachment.userId, input.userId),
			),
		)
		.limit(1);

	if (!attachment) throw new Error("ATTACHMENT_NOT_FOUND");

	const stored = await getStorageService().read(attachment.storageKey);
	if (!stored) throw new Error("ATTACHMENT_NOT_FOUND");

	if (!READABLE_ATTACHMENT_TYPES.has(attachment.mediaType)) {
		return {
			id: attachment.id,
			filename: attachment.filename,
			mediaType: attachment.mediaType,
			size: attachment.size,
			content: null,
			note: "This attachment is available to the model as metadata only in this version.",
		};
	}

	return {
		id: attachment.id,
		filename: attachment.filename,
		mediaType: attachment.mediaType,
		size: attachment.size,
		content: new TextDecoder().decode(stored.data).slice(0, 40_000),
	};
}

async function applyResumePatch(input: {
	userId: string;
	threadId: string;
	resumeId: string;
	title: string;
	summary?: string;
	operations: JsonPatchOperation[];
}) {
	const before = await resumeService.getById({ id: input.resumeId, userId: input.userId });
	const inverseOperations = createInverseResumePatches(before.data, input.operations);
	const patched = await resumeService.patch({
		id: input.resumeId,
		userId: input.userId,
		operations: input.operations,
		expectedUpdatedAt: before.updatedAt,
	});

	const [action] = await db
		.insert(schema.agentAction)
		.values({
			userId: input.userId,
			threadId: input.threadId,
			resumeId: input.resumeId,
			kind: "resume_patch",
			status: "applied",
			title: input.title,
			...(input.summary !== undefined ? { summary: input.summary } : {}),
			operations: input.operations,
			inverseOperations,
			baseUpdatedAt: before.updatedAt,
			appliedUpdatedAt: patched.updatedAt,
		})
		.returning();

	if (!action) throw new Error("AGENT_ACTION_CREATE_FAILED");

	return {
		actionId: action.id,
		resumeId: input.resumeId,
		title: action.title,
		summary: action.summary,
		operations: action.operations,
		appliedUpdatedAt: action.appliedUpdatedAt.toISOString(),
	};
}

function createAgent(input: {
	userId: string;
	threadId: string;
	resumeId: string;
	provider: {
		provider: Parameters<typeof getModel>[0]["provider"];
		model: string;
		apiKey: string;
		baseURL?: string;
	};
	model: ReturnType<typeof getModel>;
}) {
	const tools = buildAgentTools({
		provider: input.provider,
		handlers: {
			fetchUrl: fetchUrlForAgent,
			readResume: async () => {
				const resume = await resumeService.getById({ id: input.resumeId, userId: input.userId });
				return {
					id: resume.id,
					name: resume.name,
					updatedAt: resume.updatedAt.toISOString(),
					data: resume.data,
				};
			},
			readAttachment: (attachmentId) =>
				readAttachment({ id: attachmentId, threadId: input.threadId, userId: input.userId }),
			applyResumePatch: ({ title, summary, operations }) =>
				applyResumePatch({
					userId: input.userId,
					threadId: input.threadId,
					resumeId: input.resumeId,
					title,
					...(summary !== undefined ? { summary } : {}),
					operations,
				}),
		},
	});

	return new ToolLoopAgent({
		model: input.model,
		instructions: buildAgentInstructions({ hasProviderNativeSearch: "web_search" in tools }),
		stopWhen: stepCountIs(MAX_AGENT_STEPS),
		tools,
	});
}

export const agentService = {
	threads: {
		list: async (input: { userId: string }) => {
			assertAgentEnvironment();

			const rows = await db
				.select({
					id: schema.agentThread.id,
					userId: schema.agentThread.userId,
					aiProviderId: schema.agentThread.aiProviderId,
					sourceResumeId: schema.agentThread.sourceResumeId,
					workingResumeId: schema.agentThread.workingResumeId,
					title: schema.agentThread.title,
					status: schema.agentThread.status,
					activeRunId: schema.agentThread.activeRunId,
					activeStreamId: schema.agentThread.activeStreamId,
					activeRunStartedAt: schema.agentThread.activeRunStartedAt,
					lastMessageAt: schema.agentThread.lastMessageAt,
					archivedAt: schema.agentThread.archivedAt,
					deletedAt: schema.agentThread.deletedAt,
					createdAt: schema.agentThread.createdAt,
					updatedAt: schema.agentThread.updatedAt,
					resumeName: schema.resume.name,
					providerLabel: schema.aiProvider.label,
				})
				.from(schema.agentThread)
				.leftJoin(schema.resume, eq(schema.agentThread.workingResumeId, schema.resume.id))
				.leftJoin(schema.aiProvider, eq(schema.agentThread.aiProviderId, schema.aiProvider.id))
				.where(and(eq(schema.agentThread.userId, input.userId), isNull(schema.agentThread.deletedAt)))
				.orderBy(desc(schema.agentThread.lastMessageAt));

			return rows.map(toThreadSummary);
		},

		create: async (input: CreateThreadInput) => {
			assertAgentEnvironment();

			const selectedProvider = input.aiProviderId
				? await aiProvidersService.getRunnableById({ id: input.aiProviderId, userId: input.userId })
				: await aiProvidersService.getDefaultRunnable({ userId: input.userId });

			if (!selectedProvider) throw new ORPCError("BAD_REQUEST", { message: "No tested AI provider is available." });

			const working = await createWorkingResume(input);
			const [thread] = await db
				.insert(schema.agentThread)
				.values({
					userId: input.userId,
					aiProviderId: selectedProvider.id,
					sourceResumeId: input.sourceResumeId ?? null,
					workingResumeId: working.id,
					title: working.title,
				})
				.returning();

			if (!thread) throw new Error("AGENT_THREAD_CREATE_FAILED");

			return toThreadSummary({
				...thread,
				resumeName: working.title,
				providerLabel: selectedProvider.label,
			});
		},

		get: async (input: { id: string; userId: string }) => {
			assertAgentEnvironment();

			const thread = await getThread(input);
			const [messages, actions, attachments, resume] = await Promise.all([
				listThreadMessages({ threadId: input.id, userId: input.userId }),
				db
					.select()
					.from(schema.agentAction)
					.where(and(eq(schema.agentAction.threadId, input.id), eq(schema.agentAction.userId, input.userId)))
					.orderBy(desc(schema.agentAction.createdAt)),
				db
					.select()
					.from(schema.agentAttachment)
					.where(and(eq(schema.agentAttachment.threadId, input.id), eq(schema.agentAttachment.userId, input.userId)))
					.orderBy(asc(schema.agentAttachment.createdAt)),
				thread.workingResumeId
					? resumeService.getById({ id: thread.workingResumeId, userId: input.userId }).catch(() => null)
					: null,
			]);

			return {
				thread: toThreadSummary(thread),
				messages: messages.map(toMessage),
				actions: actions.map(toAction),
				attachments: attachments.map(toAttachment),
				resume,
				isReadOnly: thread.status === "archived" || !thread.workingResumeId || !thread.aiProviderId || !resume,
			};
		},

		archive: async (input: { id: string; userId: string }) => {
			assertAgentEnvironment();

			await db
				.update(schema.agentThread)
				.set({ status: "archived", archivedAt: new Date() })
				.where(and(eq(schema.agentThread.id, input.id), eq(schema.agentThread.userId, input.userId)));
		},

		delete: async (input: { id: string; userId: string }) => {
			assertAgentEnvironment();

			await getStorageService().delete(`uploads/${input.userId}/agent/${input.id}`);
			await db.delete(schema.agentAttachment).where(eq(schema.agentAttachment.threadId, input.id));
			await db
				.update(schema.agentThread)
				.set({ status: "deleted", deletedAt: new Date() })
				.where(and(eq(schema.agentThread.id, input.id), eq(schema.agentThread.userId, input.userId)));
		},
	},

	messages: {
		send: async (input: SendMessageInput) => {
			assertAgentEnvironment();

			const thread = await getThread({ id: input.threadId, userId: input.userId });
			if (thread.status === "archived") {
				throw new ORPCError("CONFLICT", { message: "This thread is archived." });
			}
			if (thread.activeRunId) {
				throw new ORPCError("CONFLICT", { message: "This thread already has an active run." });
			}
			if (!thread.workingResumeId || !thread.aiProviderId) {
				throw new ORPCError("BAD_REQUEST", { message: "This thread is read-only." });
			}

			const runnableProvider = await aiProvidersService.getRunnableById({
				id: thread.aiProviderId,
				userId: input.userId,
			});
			const runId = generateId();
			const streamId = generateId();
			const controller = new AbortController();
			activeRunControllers.set(runId, controller);

			const claimed = await claimActiveAgentRun({ threadId: input.threadId, userId: input.userId, runId, streamId });
			if (!claimed) {
				activeRunControllers.delete(runId);
				throw new ORPCError("CONFLICT", { message: "This thread already has an active run." });
			}

			try {
				const sequence = await getNextMessageSequence(input.threadId);
				await persistMessage({ userId: input.userId, threadId: input.threadId, message: input.message, sequence });

				const [messageCount] = await db
					.select({ total: count() })
					.from(schema.agentMessage)
					.where(eq(schema.agentMessage.threadId, input.threadId));

				if ((messageCount?.total ?? 0) === 1) {
					await db
						.update(schema.agentThread)
						.set({ title: buildThreadTitle(input.message, thread.title) })
						.where(and(eq(schema.agentThread.id, input.threadId), eq(schema.agentThread.userId, input.userId)));
				}

				await aiProvidersService.markUsed({ id: runnableProvider.id, userId: input.userId });

				const messages = (await listThreadMessages({ threadId: input.threadId, userId: input.userId })).map(toMessage);
				const agent = createAgent({
					userId: input.userId,
					threadId: input.threadId,
					resumeId: thread.workingResumeId,
					provider: {
						provider: runnableProvider.provider,
						model: runnableProvider.model,
						apiKey: runnableProvider.apiKey,
						baseURL: runnableProvider.baseURL ?? "",
					},
					model: getAgentModel({
						provider: runnableProvider.provider,
						model: runnableProvider.model,
						apiKey: runnableProvider.apiKey,
						baseURL: runnableProvider.baseURL ?? "",
					}),
				});

				const result = await agent.stream({
					messages: await convertToModelMessages(messages),
					abortSignal: controller.signal,
				});

				return streamToEventIterator(
					await agentStreamLifecycle.create(streamId, () =>
						result.toUIMessageStream({
							originalMessages: messages,
							generateMessageId: generateId,
							sendSources: true,
							onFinish: async ({ responseMessage, isAborted }) => {
								let persistError: unknown;
								try {
									if (!(isAborted && canceledRunsWithPersistedPartial.has(runId))) {
										await persistMessage({
											userId: input.userId,
											threadId: input.threadId,
											message: responseMessage,
											status: isAborted ? "canceled" : "completed",
										});
									}
								} catch (error) {
									persistError = error;
									throw error;
								} finally {
									await cleanupActiveRun({
										threadId: input.threadId,
										userId: input.userId,
										runId,
										streamId,
										primaryError: persistError,
									});
								}
							},
							onError: (error) => (error instanceof Error ? error.message : "Agent run failed."),
						}),
					),
				);
			} catch (error) {
				await cleanupActiveRun({
					threadId: input.threadId,
					userId: input.userId,
					runId,
					streamId,
					primaryError: error,
				});
				throw error;
			}
		},

		stop: async (input: { userId: string; threadId: string; partialMessage?: UIMessage }) => {
			assertAgentEnvironment();

			const thread = await getThread({ id: input.threadId, userId: input.userId });
			const activeRunId = thread.activeRunId;
			const activeStreamId = thread.activeStreamId;

			let persistError: unknown;
			let cleanupError: unknown;
			try {
				if (input.partialMessage) {
					await persistMessage({
						userId: input.userId,
						threadId: input.threadId,
						message: input.partialMessage,
						status: "canceled",
					});
					if (activeRunId) canceledRunsWithPersistedPartial.add(activeRunId);
				}
			} catch (error) {
				persistError = error;
			} finally {
				if (activeRunId) {
					activeRunControllers.get(activeRunId)?.abort("USER_STOPPED");
					activeRunControllers.delete(activeRunId);
					try {
						await clearActiveAgentRunIfCurrent({
							threadId: input.threadId,
							userId: input.userId,
							runId: activeRunId,
							streamId: activeStreamId,
						});
					} catch (error) {
						cleanupError = error;
						if (persistError) console.error("[agent] Failed to clear active run after stop persistence error", error);
					}
				}
			}

			if (persistError) throw persistError;
			if (cleanupError) throw cleanupError;
		},
		resume: async (input: { userId: string; threadId: string }) => {
			assertAgentEnvironment();
			const thread = await getThread({ id: input.threadId, userId: input.userId });
			return streamToEventIterator(await agentStreamLifecycle.resume(thread.activeStreamId));
		},
	},

	attachments: {
		create: async (input: CreateAttachmentInput) => {
			assertAgentEnvironment();
			await getThread({ id: input.threadId, userId: input.userId });

			const [aggregate] = await db
				.select({ totalBytes: sql<number>`coalesce(sum(${schema.agentAttachment.size}), 0)` })
				.from(schema.agentAttachment)
				.where(
					and(eq(schema.agentAttachment.threadId, input.threadId), eq(schema.agentAttachment.userId, input.userId)),
				);

			const [attachmentCount] = await db
				.select({ total: count() })
				.from(schema.agentAttachment)
				.where(
					and(eq(schema.agentAttachment.threadId, input.threadId), eq(schema.agentAttachment.userId, input.userId)),
				);

			if ((attachmentCount?.total ?? 0) >= MAX_ATTACHMENTS_PER_MESSAGE) throw new ORPCError("BAD_REQUEST");
			if (input.data.byteLength > MAX_ATTACHMENT_BYTES) throw new ORPCError("BAD_REQUEST");
			if ((aggregate?.totalBytes ?? 0) + input.data.byteLength > MAX_THREAD_ATTACHMENT_BYTES) {
				throw new ORPCError("BAD_REQUEST");
			}

			const mediaType = input.mediaType || inferContentType(input.filename);
			const id = generateId();
			const key = `uploads/${input.userId}/agent/${input.threadId}/${id}-${input.filename}`;

			await getStorageService().write({ key, data: input.data, contentType: mediaType });
			const [attachment] = await db
				.insert(schema.agentAttachment)
				.values({
					id,
					userId: input.userId,
					threadId: input.threadId,
					storageKey: key,
					filename: input.filename,
					mediaType,
					size: input.data.byteLength,
				})
				.returning();

			if (!attachment) throw new Error("AGENT_ATTACHMENT_CREATE_FAILED");

			return toAttachment(attachment);
		},

		delete: async (input: { id: string; userId: string }) => {
			assertAgentEnvironment();

			const [attachment] = await db
				.select()
				.from(schema.agentAttachment)
				.where(and(eq(schema.agentAttachment.id, input.id), eq(schema.agentAttachment.userId, input.userId)))
				.limit(1);

			if (!attachment) return;

			await getStorageService().delete(attachment.storageKey);
			await db
				.delete(schema.agentAttachment)
				.where(and(eq(schema.agentAttachment.id, input.id), eq(schema.agentAttachment.userId, input.userId)));
		},
	},

	actions: {
		revert: async (input: { id: string; userId: string }) => {
			assertAgentEnvironment();

			const [action] = await db
				.select()
				.from(schema.agentAction)
				.where(and(eq(schema.agentAction.id, input.id), eq(schema.agentAction.userId, input.userId)))
				.limit(1);

			if (!action) throw new ORPCError("NOT_FOUND");
			if (action.status === "reverted") return toAction(action);
			if (!action.resumeId) throw new ORPCError("BAD_REQUEST", { message: "The edited resume no longer exists." });

			try {
				const reverted = await resumeService.patch({
					id: action.resumeId,
					userId: input.userId,
					operations: action.inverseOperations,
					expectedUpdatedAt: action.appliedUpdatedAt,
				});

				const [updated] = await db
					.update(schema.agentAction)
					.set({
						status: "reverted",
						revertedAt: new Date(),
						revertMessage: null,
						appliedUpdatedAt: reverted.updatedAt,
					})
					.where(and(eq(schema.agentAction.id, input.id), eq(schema.agentAction.userId, input.userId)))
					.returning();

				if (!updated) throw new ORPCError("NOT_FOUND");

				return toAction(updated);
			} catch (error) {
				if (error instanceof ORPCError && error.code === "RESUME_VERSION_CONFLICT") {
					const [updated] = await db
						.update(schema.agentAction)
						.set({ status: "conflicted", revertMessage: "The resume changed after this action was applied." })
						.where(and(eq(schema.agentAction.id, input.id), eq(schema.agentAction.userId, input.userId)))
						.returning();

					if (!updated) throw new ORPCError("NOT_FOUND");

					return toAction(updated);
				}

				throw error;
			}
		},
	},
};
