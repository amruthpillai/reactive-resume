import type { UIMessage, UIMessageChunk } from "ai";
import type * as React from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import type { RouterOutput } from "@/libs/orpc/client";
import { useChat } from "@ai-sdk/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import {
	ArchiveIcon,
	ArrowClockwiseIcon,
	ArrowSquareOutIcon,
	ChatCircleDotsIcon,
	CircleNotchIcon,
	ClockCounterClockwiseIcon,
	CopyIcon,
	DotsThreeVerticalIcon,
	FileIcon,
	FilePdfIcon,
	MinusIcon,
	PaperclipIcon,
	PaperPlaneRightIcon,
	PlusIcon,
	SidebarSimpleIcon,
	SparkleIcon,
	SquaresFourIcon,
	StopIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { m } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { ResizableGroup, ResizablePanel, ResizableSeparator } from "@reactive-resume/ui/components/resizable";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";
import { downloadWithAnchor, generateFilename } from "@reactive-resume/utils/file";
import { cn } from "@reactive-resume/utils/style";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { ResumePreview } from "@/features/resume/preview/preview";
import { useConfirm } from "@/hooks/use-confirm";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { client, orpc, streamClient } from "@/libs/orpc/client";
import { AgentThreadSidebar } from "./-components/thread-sidebar";
import { attachmentIdsFromTransportBody, buildAgentChatSubmission } from "./-helpers/chat-attachments";
import { useAgentResumeUpdateSubscription } from "./-hooks/use-agent-resume-updates";

type AgentThreadDetail = RouterOutput["agent"]["threads"]["get"];
type AgentAction = AgentThreadDetail["actions"][number];
type AgentAttachment = AgentThreadDetail["attachments"][number];
type PatchOperation = AgentAction["operations"][number];

type PatchToolCardProps = {
	part: UIMessage["parts"][number];
	action: AgentAction | undefined;
	onRevert: (actionId: string) => void;
	isReverting: boolean;
};

type StarterPromptMarqueeProps = {
	onSelect: (prompt: string) => void;
};

type AssistantMarkdownProps = {
	text: string;
};

type MessagePartProps = {
	part: UIMessage["parts"][number];
	isUser: boolean;
	onAnswer: (toolCallId: string, answer: string) => void;
	onRevert: (actionId: string) => void;
	isReverting: boolean;
	actionsById: Map<string, AgentAction>;
};

type ChatMessageProps = {
	message: UIMessage;
	onAnswer: (toolCallId: string, answer: string) => void;
	onRevert: (actionId: string) => void;
	isReverting: boolean;
	actionsById: Map<string, AgentAction>;
};

type AgentChatProps = {
	threadId: string;
	initialMessages: UIMessage[];
	isReadOnly: boolean;
	readOnlyReason: "archived" | "missing" | null;
	threadStatus: string;
	activeRunId: string | null;
	actions: AgentAction[];
	onToggleThreads?: () => void;
	onToggleResume?: () => void;
};

type AgentChatReadOnlyBannerProps = {
	isReadOnly: boolean;
	readOnlyReason: "archived" | "missing" | null;
};

type AgentChatMessagesProps = {
	actionsById: Map<string, AgentAction>;
	error: Error | undefined;
	isReadOnly: boolean;
	isReverting: boolean;
	isStreaming: boolean;
	messages: UIMessage[];
	onAnswer: (toolCallId: string, answer: string) => void;
	onRevert: (actionId: string) => void;
	onRetry: () => void;
	onStarterSelect: (prompt: string) => void;
};

type AgentChatHeaderProps = {
	isArchived: boolean;
	isArchivePending: boolean;
	isDeletePending: boolean;
	onArchive: () => void;
	onCopyConversation: () => void;
	onCopyConversationJson: () => void;
	onDelete: () => void;
	onToggleResume?: () => void;
	onToggleThreads?: () => void;
};

type AgentChatComposerProps = {
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	input: string;
	isReadOnly: boolean;
	isStreaming: boolean;
	isUploading: boolean;
	pendingAttachments: Array<Pick<AgentAttachment, "filename" | "id" | "mediaType">>;
	onInputChange: (value: string) => void;
	onSend: () => void;
	onStopRun: () => void;
	onUploadFiles: (files: FileList | null) => void;
};

type ToolbarButtonProps = React.ComponentProps<typeof Button> & {
	label: string;
};

type ResumePaneProps = {
	resume: AgentThreadDetail["resume"];
};

function toRecord(value: unknown) {
	return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function PatchToolCard({ part, action, onRevert, isReverting }: PatchToolCardProps) {
	const partRecord = part as Record<string, unknown>;
	const state = typeof partRecord.state === "string" ? partRecord.state : null;
	const input = toRecord(partRecord.input);
	const output = toRecord(partRecord.output);
	const actionId =
		state === "output-available"
			? (action?.id ?? (typeof output?.actionId === "string" ? output.actionId : null))
			: null;

	const title =
		action?.title ??
		(typeof output?.title === "string" ? output.title : null) ??
		(typeof input?.title === "string" ? input.title : t`Resume patch`);
	const operations: PatchOperation[] =
		action?.operations ??
		(Array.isArray(output?.operations)
			? (output.operations as PatchOperation[])
			: Array.isArray(input?.operations)
				? (input.operations as PatchOperation[])
				: []);
	const status = action?.status ?? "applied";
	const revertMessage = action?.revertMessage ?? null;
	const label =
		state === "output-error"
			? t`Patch failed`
			: state !== "output-available"
				? t`Patch pending`
				: status === "rolled_back" || status === "reverted"
					? t`Patch rolled back`
					: status === "conflicted"
						? t`Patch conflicted`
						: t`Patch applied`;
	const canRollback = action?.canRollback ?? (Boolean(actionId) && status === "applied");
	const revertDisabled =
		isReverting || !canRollback || status === "rolled_back" || status === "reverted" || status === "conflicted";
	const errorText = typeof partRecord.errorText === "string" ? partRecord.errorText : null;
	const rawPayload = JSON.stringify(
		{
			state,
			input,
			...(partRecord.rawInput !== undefined ? { rawInput: partRecord.rawInput } : {}),
			output,
			...(errorText ? { errorText } : {}),
			...(action ? { action } : {}),
			operations,
		},
		null,
		2,
	);

	return (
		<details className="group text-muted-foreground text-xs">
			<summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-md py-1 font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
				<span>{label}</span>
				<span className="text-muted-foreground/70 group-open:hidden">{title}</span>
			</summary>

			<div className="mt-2 space-y-2 rounded-md border bg-muted/20 p-3">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="truncate font-medium text-foreground">{title}</p>
						{status === "conflicted" && revertMessage ? (
							<p className="mt-1 text-amber-600 dark:text-amber-300">{revertMessage}</p>
						) : null}
						{status === "rolled_back" && revertMessage ? (
							<p className="mt-1 text-muted-foreground">{revertMessage}</p>
						) : null}
						{errorText ? <p className="mt-1 text-rose-500">{errorText}</p> : null}
					</div>
					{actionId ? (
						<Button size="xs" variant="ghost" disabled={revertDisabled} onClick={() => onRevert(actionId)}>
							<ClockCounterClockwiseIcon />
							<Trans>Restore</Trans>
						</Button>
					) : null}
				</div>
				<pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded border bg-background p-3 font-mono text-[0.7rem] leading-relaxed">
					{rawPayload}
				</pre>
			</div>
		</details>
	);
}

export const Route = createFileRoute("/agent/$threadId")({
	component: RouteComponent,
});

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function textFromMessage(message: UIMessage) {
	const textParts: string[] = [];

	for (const part of message.parts) {
		if (part.type === "text") textParts.push(part.text);
	}

	return textParts.join("\n");
}

function parseAgentSseStream(stream: ReadableStream<string>) {
	let buffer = "";
	const eventBoundary = /\r?\n\r?\n/;

	return stream.pipeThrough(
		new TransformStream<string, UIMessageChunk>({
			transform(chunk, controller) {
				buffer += chunk;

				let boundary = eventBoundary.exec(buffer);
				while (boundary) {
					const event = buffer.slice(0, boundary.index);
					buffer = buffer.slice(boundary.index + boundary[0].length);

					for (const line of event.split(/\r?\n/)) {
						if (!line.startsWith("data:")) continue;

						const data = line.slice("data:".length).trimStart();
						if (!data || data === "[DONE]") continue;

						try {
							controller.enqueue(JSON.parse(data) as UIMessageChunk);
						} catch (error) {
							console.warn("[agent] dropping malformed SSE frame", error);
						}
					}

					boundary = eventBoundary.exec(buffer);
				}
			},
		}),
	);
}

function promptPreview(prompt: string) {
	const words = prompt.split(/\s+/).filter(Boolean);
	return `${words.slice(0, 7).join(" ")}${words.length > 7 ? "…" : ""}`;
}

function chunkPrompts(prompts: string[], columns: number) {
	return prompts.reduce<string[][]>(
		(rows, prompt, index) => {
			rows[index % columns]?.push(prompt);
			return rows;
		},
		Array.from({ length: columns }, () => []),
	);
}

function StarterPromptMarquee({ onSelect }: StarterPromptMarqueeProps) {
	const prompts = [
		t`Tailor this resume to a product manager job description and emphasize roadmap ownership, stakeholder communication, and measurable launch outcomes.`,
		t`Compare this resume against this role URL and update keywords while keeping the voice concise and credible.`,
		t`Find weak bullets and rewrite them with stronger outcomes, numbers, scope, and sharper verbs.`,
		t`Rework the summary so it targets a senior engineering manager role without sounding generic.`,
		t`Identify gaps for an applicant tracking system and apply only high-confidence keyword improvements.`,
		t`Rewrite this resume for a startup founder-to-product-lead transition with clear business impact.`,
		t`Make the experience section more results-oriented and remove vague responsibilities.`,
		t`Adjust the resume for a remote-first role that values async communication and ownership.`,
		t`Review the resume against a job description and ask me questions before changing uncertain sections.`,
		t`Tighten the skills section so it supports the target role instead of reading like a keyword dump.`,
		t`Update project bullets to show leadership, constraints, tradeoffs, and measurable outcomes.`,
		t`Prepare a conservative patch that improves clarity without changing my career narrative.`,
	];

	const promptRows = chunkPrompts(prompts, 3);

	return (
		<div className="relative mx-auto grid w-full max-w-4xl gap-3 overflow-hidden py-1 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
			{promptRows.map((row, rowIndex) => {
				const marqueePrompts = row.flatMap((prompt) => [
					{ id: `${prompt}-primary`, prompt },
					{ id: `${prompt}-repeat-a`, prompt },
					{ id: `${prompt}-repeat-b`, prompt },
				]);
				const duration = 135 + rowIndex * 22;
				const animate = rowIndex % 2 === 0 ? { x: ["0%", "-33.333%"] } : { x: ["-33.333%", "0%"] };

				return (
					<m.div
						key={`prompt-row-${row.join("|")}`}
						className="flex w-max gap-3"
						animate={animate}
						transition={{ duration, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
					>
						{marqueePrompts.map(({ id, prompt }) => (
							<Button
								key={id}
								type="button"
								variant="outline"
								className="h-8 shrink-0 rounded-full bg-background/70 px-3 font-normal text-muted-foreground hover:text-foreground"
								onClick={() => onSelect(prompt)}
							>
								{promptPreview(prompt)}
							</Button>
						))}
					</m.div>
				);
			})}
		</div>
	);
}

function getMessagePartKey(messageId: string, part: UIMessage["parts"][number]) {
	if ("toolCallId" in part && typeof part.toolCallId === "string")
		return `${messageId}-${part.type}-${part.toolCallId}`;
	if (part.type === "text") return `${messageId}-text-${part.text}`;
	if (part.type === "file") return `${messageId}-file-${part.url ?? part.filename}`;
	return `${messageId}-${part.type}-${JSON.stringify(part)}`;
}

function AssistantMarkdown({ text }: AssistantMarkdownProps) {
	return (
		<ReactMarkdown
			skipHtml
			components={{
				p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
				ul: ({ children }) => <ul className="my-2 ms-5 list-disc space-y-1">{children}</ul>,
				ol: ({ children }) => <ol className="my-2 ms-5 list-decimal space-y-1">{children}</ol>,
				li: ({ children }) => <li className="ps-1">{children}</li>,
				a: ({ children, href }) => (
					<a className="text-primary underline underline-offset-4" href={href} target="_blank" rel="noreferrer">
						{children}
					</a>
				),
				code: ({ children, className }) => (
					<code className={cn("rounded border bg-muted px-1 py-0.5 font-mono text-[0.85em]", className)}>
						{children}
					</code>
				),
				pre: ({ children }) => (
					<pre className="my-3 max-w-full overflow-auto rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">
						{children}
					</pre>
				),
				blockquote: ({ children }) => (
					<blockquote className="my-3 border-l-2 ps-3 text-muted-foreground">{children}</blockquote>
				),
			}}
		>
			{text}
		</ReactMarkdown>
	);
}

function MessagePart({ part, isUser, onAnswer, onRevert, isReverting, actionsById }: MessagePartProps) {
	if (part.type === "text") {
		return isUser ? (
			<div className="whitespace-pre-wrap leading-relaxed">{part.text}</div>
		) : (
			<AssistantMarkdown text={part.text} />
		);
	}

	if (part.type === "reasoning") {
		return (
			<details className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
				<summary className="cursor-pointer text-muted-foreground">
					<Trans>Thinking</Trans>
				</summary>
				<div className="mt-2 whitespace-pre-wrap">{part.text}</div>
			</details>
		);
	}

	if (part.type === "tool-ask_user_question") {
		const input =
			"input" in part && typeof part.input === "object" && part.input ? (part.input as Record<string, unknown>) : {};
		const choices = Array.isArray(input.choices)
			? input.choices.filter((choice): choice is string => typeof choice === "string")
			: [];
		const question = typeof input.question === "string" ? input.question : t`The agent needs your input.`;

		return (
			<div className="space-y-3 rounded-md border bg-card p-3">
				<div className="font-medium">{question}</div>
				<div className="flex flex-wrap gap-2">
					{choices.map((choice) => (
						<Button key={choice} size="sm" variant="outline" onClick={() => onAnswer(part.toolCallId, choice)}>
							{choice}
						</Button>
					))}
				</div>
			</div>
		);
	}

	if (part.type === "tool-apply_resume_patch") {
		const output =
			"output" in part && typeof part.output === "object" && part.output
				? (part.output as Record<string, unknown>)
				: null;
		const actionId = typeof output?.actionId === "string" ? output.actionId : null;
		const action = actionId ? actionsById.get(actionId) : undefined;

		return <PatchToolCard part={part} action={action} onRevert={onRevert} isReverting={isReverting} />;
	}

	if (part.type === "source-url") {
		const title = part.title?.trim() || null;

		return (
			<a className="block text-primary text-sm underline" href={part.url} target="_blank" rel="noreferrer">
				{title ? (
					<>
						<span className="block truncate">{title}</span>
						<span className="block truncate text-muted-foreground">{part.url}</span>
					</>
				) : (
					<span className="block truncate">{part.url}</span>
				)}
			</a>
		);
	}

	if (part.type === "file") {
		return (
			<div className="flex max-w-full items-center gap-2 rounded-md border bg-background/20 px-2 py-1 text-sm">
				<FileIcon className="shrink-0" />
				<span className="truncate">{part.filename ?? part.url}</span>
			</div>
		);
	}

	return null;
}

function ChatMessage({ message, onAnswer, onRevert, isReverting, actionsById }: ChatMessageProps) {
	const isUser = message.role === "user";

	return (
		<div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"space-y-3 text-sm",
					isUser
						? "max-w-[86%] rounded-md bg-primary px-4 py-3 text-primary-foreground"
						: "w-full max-w-full py-1 text-foreground",
				)}
			>
				{message.parts.map((part) => (
					<MessagePart
						key={getMessagePartKey(message.id, part)}
						part={part}
						isUser={isUser}
						onAnswer={onAnswer}
						onRevert={onRevert}
						isReverting={isReverting}
						actionsById={actionsById}
					/>
				))}
			</div>
		</div>
	);
}

function AgentChat({
	threadId,
	initialMessages,
	isReadOnly,
	readOnlyReason,
	threadStatus,
	activeRunId,
	actions,
	onToggleThreads,
	onToggleResume,
}: AgentChatProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const confirm = useConfirm();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const refreshedPatchOutputsRef = useRef(new Set<string>());
	const lastSyncedThreadIdRef = useRef<string | null>(null);
	const [input, setInput] = useState("");
	const [pendingAttachments, setPendingAttachments] = useState<
		Array<Pick<AgentAttachment, "id" | "filename" | "mediaType">>
	>([]);
	const [isUploading, setIsUploading] = useState(false);
	const revertMutation = useMutation(orpc.agent.actions.revert.mutationOptions());
	const archiveMutation = useMutation(orpc.agent.threads.archive.mutationOptions());
	const deleteMutation = useMutation(orpc.agent.threads.delete.mutationOptions());
	const isArchived = threadStatus === "archived";

	const refreshThread = useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: orpc.agent.threads.list.queryKey() }),
			queryClient.invalidateQueries({ queryKey: orpc.agent.threads.get.queryKey({ input: { id: threadId } }) }),
		]);
	}, [queryClient, threadId]);

	const actionsById = useMemo(() => {
		const map = new Map<string, AgentAction>();
		for (const action of actions) map.set(action.id, action);
		return map;
	}, [actions]);

	const handleArchive = () => {
		archiveMutation.mutate(
			{ id: threadId },
			{
				onSuccess: async () => {
					toast.success(t`Thread archived.`);
					await refreshThread();
				},
				onError: (error) => {
					toast.error(getOrpcErrorMessage(error, { fallback: t`Failed to archive thread.` }));
				},
			},
		);
	};

	const handleDelete = async () => {
		const confirmation = await confirm(t`Delete this agent thread?`, {
			description: t`This action cannot be undone. Conversation messages and uploaded attachments will be removed. The working resume draft remains in your dashboard and can be deleted separately.`,
		});

		if (!confirmation) return;

		deleteMutation.mutate(
			{ id: threadId },
			{
				onSuccess: async () => {
					toast.success(t`Thread deleted.`);
					await queryClient.invalidateQueries({ queryKey: orpc.agent.threads.list.queryKey() });
					void navigate({ to: "/agent" });
				},
				onError: (error) => {
					toast.error(getOrpcErrorMessage(error, { fallback: t`Failed to delete thread.` }));
				},
			},
		);
	};

	const transport = useMemo(
		() => ({
			async sendMessages(options: { messages: UIMessage[]; abortSignal?: AbortSignal; body?: object }) {
				const message = options.messages.at(-1);
				if (!message) throw new Error("No message to send.");
				const attachmentIds = attachmentIdsFromTransportBody(options.body);

				return parseAgentSseStream(
					eventIteratorToUnproxiedDataStream(
						await streamClient.agent.messages.send(
							{ threadId, message, attachmentIds },
							{ signal: options.abortSignal },
						),
					),
				);
			},
			async reconnectToStream() {
				return parseAgentSseStream(
					eventIteratorToUnproxiedDataStream(await streamClient.agent.messages.resume({ threadId })),
				);
			},
		}),
		[threadId],
	);

	const { messages, sendMessage, regenerate, setMessages, status, error, clearError, addToolOutput } = useChat({
		id: threadId,
		messages: initialMessages,
		resume: !!activeRunId,
		transport,
		sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
		onFinish: () => {
			void refreshThread();
		},
	});

	useEffect(() => {
		let shouldRefresh = false;

		for (const message of messages) {
			for (const part of message.parts) {
				if (part.type !== "tool-apply_resume_patch" || !("output" in part) || !part.output) continue;

				const output = typeof part.output === "object" ? (part.output as Record<string, unknown>) : null;
				const actionId = typeof output?.actionId === "string" ? output.actionId : null;
				const toolCallId = "toolCallId" in part && typeof part.toolCallId === "string" ? part.toolCallId : null;
				const patchOutputKey = actionId ?? toolCallId;

				if (!patchOutputKey || refreshedPatchOutputsRef.current.has(patchOutputKey)) continue;

				refreshedPatchOutputsRef.current.add(patchOutputKey);
				shouldRefresh = true;
			}
		}

		if (shouldRefresh) void refreshThread();
	}, [messages, refreshThread]);

	useEffect(() => {
		if (lastSyncedThreadIdRef.current === threadId) return;
		lastSyncedThreadIdRef.current = threadId;
		setMessages(initialMessages);
	}, [threadId, initialMessages, setMessages]);

	const isStreaming = status === "submitted" || status === "streaming";

	const send = () => {
		const text = input.trim();
		if ((!text && pendingAttachments.length === 0) || isReadOnly || isStreaming || isUploading) return;

		clearError();
		const submission = buildAgentChatSubmission(text, pendingAttachments);
		sendMessage(submission.message, submission.options);
		setInput("");
		setPendingAttachments([]);
	};

	const uploadFiles = async (files: FileList | null) => {
		if (!files?.length) return;

		setIsUploading(true);
		try {
			const attachments = await Promise.all(
				Array.from(files).map(async (file) => {
					const attachment = await client.agent.attachments.create({
						threadId,
						filename: file.name,
						mediaType: file.type || "application/octet-stream",
						data: await fileToBase64(file),
					});
					return { id: attachment.id, filename: attachment.filename, mediaType: attachment.mediaType };
				}),
			);

			setPendingAttachments((current) => [...current, ...attachments]);
			toast.success(t`Attachment uploaded.`);
		} catch (error) {
			toast.error(getOrpcErrorMessage(error, { fallback: t`Failed to upload attachment.` }));
		} finally {
			setIsUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const stopRun = async () => {
		const last = messages.at(-1);
		await client.agent.messages.stop({
			threadId,
			...(last?.role === "assistant" ? { partialMessage: last } : {}),
		});
	};

	const copyConversationJson = () => {
		void navigator.clipboard.writeText(
			JSON.stringify(
				{
					threadId,
					threadStatus,
					chatStatus: status,
					isReadOnly,
					readOnlyReason,
					messages,
					actions,
				},
				null,
				2,
			),
		);
		toast.success(t`Conversation JSON copied.`);
	};

	const copyConversationText = () => {
		void navigator.clipboard.writeText(messages.map(textFromMessage).join("\n\n"));
		toast.success(t`Conversation copied.`);
	};

	const answerToolCall = (toolCallId: string, answer: string) => {
		addToolOutput({ tool: "ask_user_question", toolCallId, output: answer });
	};

	const revertAction = (actionId: string) => {
		const confirmation = window.confirm(
			t`Restore the resume to before this patch? This will roll back this patch and any patches applied after it.`,
		);
		if (!confirmation) return;

		revertMutation.mutate(
			{ id: actionId },
			{
				onSuccess: (action) => {
					if (action.status === "conflicted") {
						toast.error(action.revertMessage ?? t`Cannot restore; the resume has changed since this edit was applied.`);
					} else if (action.status === "rolled_back" || action.status === "reverted") {
						toast.success(t`Patch rolled back.`);
					}
					void refreshThread();
				},
				onError: (error) => toast.error(getOrpcErrorMessage(error, { fallback: t`Could not restore this patch.` })),
			},
		);
	};

	const retryLastMessage = () => {
		clearError();
		void regenerate();
	};

	return (
		<section className="flex h-full min-h-0 flex-col bg-background">
			<AgentChatHeader
				isArchived={isArchived}
				isArchivePending={archiveMutation.isPending}
				isDeletePending={deleteMutation.isPending}
				onArchive={handleArchive}
				onCopyConversation={copyConversationText}
				onCopyConversationJson={copyConversationJson}
				onDelete={() => void handleDelete()}
				onToggleResume={onToggleResume}
				onToggleThreads={onToggleThreads}
			/>

			<AgentChatReadOnlyBanner isReadOnly={isReadOnly} readOnlyReason={readOnlyReason} />

			<AgentChatMessages
				actionsById={actionsById}
				error={error}
				isReadOnly={isReadOnly}
				isReverting={revertMutation.isPending}
				isStreaming={isStreaming}
				messages={messages}
				onAnswer={answerToolCall}
				onRevert={revertAction}
				onRetry={retryLastMessage}
				onStarterSelect={setInput}
			/>

			<AgentChatComposer
				fileInputRef={fileInputRef}
				input={input}
				isReadOnly={isReadOnly}
				isStreaming={isStreaming}
				isUploading={isUploading}
				pendingAttachments={pendingAttachments}
				onInputChange={setInput}
				onSend={send}
				onStopRun={() => void stopRun()}
				onUploadFiles={(files) => void uploadFiles(files)}
			/>
		</section>
	);
}

function AgentChatReadOnlyBanner({ isReadOnly, readOnlyReason }: AgentChatReadOnlyBannerProps) {
	if (!isReadOnly) return null;

	return (
		<div className="border-amber-300 border-b bg-amber-50 px-4 py-2 text-amber-950 text-sm dark:bg-amber-950/20 dark:text-amber-200">
			{readOnlyReason === "archived" ? (
				<Trans>This thread is archived. New messages cannot be sent.</Trans>
			) : (
				<Trans>This thread is read-only because the working resume or AI provider is unavailable.</Trans>
			)}
		</div>
	);
}

function AgentChatMessages({
	actionsById,
	error,
	isReadOnly,
	isReverting,
	isStreaming,
	messages,
	onAnswer,
	onRevert,
	onRetry,
	onStarterSelect,
}: AgentChatMessagesProps) {
	return (
		<ScrollArea className="min-h-0 flex-1">
			<div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
				{messages.length === 0 ? (
					<div className="grid gap-6 py-12 text-center">
						<SparkleIcon className="mx-auto size-8 text-muted-foreground" />
						<h2 className="font-semibold text-2xl">
							<Trans>What do you want to do?</Trans>
						</h2>
						<StarterPromptMarquee onSelect={onStarterSelect} />
					</div>
				) : null}

				{messages.map((message) => (
					<ChatMessage
						key={message.id}
						message={message}
						isReverting={isReverting}
						actionsById={actionsById}
						onAnswer={onAnswer}
						onRevert={onRevert}
					/>
				))}

				{isStreaming ? (
					<div className="flex justify-start">
						<div className="rounded-md bg-muted px-4 py-3 text-muted-foreground text-sm">
							<Trans>Working…</Trans>
						</div>
					</div>
				) : null}

				{error ? (
					<div className="flex items-center justify-between gap-3 rounded-md border border-rose-300 bg-rose-50 p-3 text-rose-950 text-sm dark:bg-rose-950/20 dark:text-rose-200">
						<span>{error.message}</span>
						{!isReadOnly ? (
							<Button size="sm" variant="outline" type="button" onClick={onRetry}>
								<ArrowClockwiseIcon />
								<Trans>Retry</Trans>
							</Button>
						) : null}
					</div>
				) : null}
			</div>
		</ScrollArea>
	);
}

function AgentChatHeader({
	isArchived,
	isArchivePending,
	isDeletePending,
	onArchive,
	onCopyConversation,
	onCopyConversationJson,
	onDelete,
	onToggleResume,
	onToggleThreads,
}: AgentChatHeaderProps) {
	return (
		<div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
			<div className="flex min-w-0 items-center gap-2">
				{onToggleThreads ? (
					<Button size="icon-sm" variant="ghost" onClick={onToggleThreads}>
						<SidebarSimpleIcon />
						<span className="sr-only">
							<Trans>Toggle threads</Trans>
						</span>
					</Button>
				) : null}

				<div className="min-w-0 truncate font-semibold">
					<Trans>Chat</Trans>
				</div>
			</div>
			<div className="flex items-center gap-1">
				{onToggleResume ? (
					<Button size="icon-sm" variant="ghost" onClick={onToggleResume}>
						<SquaresFourIcon />
						<span className="sr-only">
							<Trans>Toggle resume preview</Trans>
						</span>
					</Button>
				) : null}
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button size="icon-sm" variant="ghost">
								<DotsThreeVerticalIcon />
								<span className="sr-only">
									<Trans>Thread actions</Trans>
								</span>
							</Button>
						}
					/>

					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onCopyConversation}>
							<CopyIcon />
							<Trans>Copy</Trans>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={onCopyConversationJson}>
							<CopyIcon />
							<Trans>Copy JSON</Trans>
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						{!isArchived ? (
							<DropdownMenuItem disabled={isArchivePending} onClick={onArchive}>
								<ArchiveIcon />
								<Trans>Archive</Trans>
							</DropdownMenuItem>
						) : null}

						<DropdownMenuItem variant="destructive" disabled={isDeletePending} onClick={onDelete}>
							<TrashIcon />
							<Trans>Delete</Trans>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

function AgentChatComposer({
	fileInputRef,
	input,
	isReadOnly,
	isStreaming,
	isUploading,
	pendingAttachments,
	onInputChange,
	onSend,
	onStopRun,
	onUploadFiles,
}: AgentChatComposerProps) {
	return (
		<form
			className="border-t p-3"
			onSubmit={(event) => {
				event.preventDefault();
				onSend();
			}}
		>
			<div className="mx-auto max-w-3xl space-y-2">
				{pendingAttachments.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{pendingAttachments.map((attachment) => (
							<Badge key={attachment.id} variant="secondary">
								<FileIcon />
								{attachment.filename}
							</Badge>
						))}
					</div>
				) : null}

				<div className="flex items-end gap-1 rounded-md border bg-card p-1.5">
					<input
						ref={fileInputRef}
						type="file"
						multiple
						aria-label={t`Upload attachments`}
						className="hidden"
						onChange={(event) => onUploadFiles(event.target.files)}
					/>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						aria-label={t`Attach files`}
						disabled={isReadOnly || isUploading}
						onClick={() => fileInputRef.current?.click()}
					>
						{isUploading ? <ArrowClockwiseIcon className="animate-spin" /> : <PaperclipIcon />}
					</Button>
					<Textarea
						value={input}
						rows={1}
						disabled={isReadOnly || isStreaming}
						onChange={(event) => onInputChange(event.target.value)}
						onKeyDown={(event) => {
							if (event.nativeEvent.isComposing) return;
							if (event.key !== "Enter" || event.shiftKey) return;
							event.preventDefault();
							onSend();
						}}
						placeholder={isReadOnly ? t`This thread is read-only` : t`Ask anything about this resume`}
						className="max-h-40 min-h-9 resize-none border-0 bg-transparent p-2 leading-5 shadow-none focus-visible:ring-0"
					/>
					{isStreaming && !isReadOnly ? (
						<Button type="button" size="icon" variant="outline" aria-label={t`Stop generation`} onClick={onStopRun}>
							<StopIcon />
						</Button>
					) : (
						<Button
							type="submit"
							size="icon"
							aria-label={t`Send message`}
							disabled={isReadOnly || isUploading || (!input.trim() && pendingAttachments.length === 0)}
						>
							<PaperPlaneRightIcon />
						</Button>
					)}
				</div>
			</div>
		</form>
	);
}

const AGENT_PREVIEW_ZOOM_STORAGE_KEY = "reactive-resume:agent-preview-zoom:v3";
const AGENT_PREVIEW_ZOOM_MIGRATION_KEY = `${AGENT_PREVIEW_ZOOM_STORAGE_KEY}:initialized`;
const MIN_PREVIEW_ZOOM = 0.4;
const MAX_PREVIEW_ZOOM = 1.5;
const PREVIEW_ZOOM_STEP = 0.05;
const DEFAULT_PREVIEW_ZOOM = 1;

function clampPreviewZoom(value: number) {
	return Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, value));
}

function getInitialPreviewZoom() {
	if (typeof window === "undefined") return DEFAULT_PREVIEW_ZOOM;

	if (!window.localStorage.getItem(AGENT_PREVIEW_ZOOM_MIGRATION_KEY)) {
		window.localStorage.setItem(AGENT_PREVIEW_ZOOM_STORAGE_KEY, String(DEFAULT_PREVIEW_ZOOM));
		window.localStorage.setItem(AGENT_PREVIEW_ZOOM_MIGRATION_KEY, "true");
		return DEFAULT_PREVIEW_ZOOM;
	}

	const stored = Number(window.localStorage.getItem(AGENT_PREVIEW_ZOOM_STORAGE_KEY));
	return Number.isFinite(stored) ? clampPreviewZoom(stored) : DEFAULT_PREVIEW_ZOOM;
}

function ToolbarButton({ label, children, ...props }: ToolbarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button size="icon-sm" variant="ghost" aria-label={label} {...props}>
						{children}
					</Button>
				}
			/>
			<TooltipContent side="bottom" align="center">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

function ResumePane({ resume }: ResumePaneProps) {
	const [zoom, setZoom] = useState(getInitialPreviewZoom);
	const [isPrinting, setIsPrinting] = useState(false);

	useEffect(() => {
		window.localStorage.setItem(AGENT_PREVIEW_ZOOM_STORAGE_KEY, String(zoom));
	}, [zoom]);

	const setClampedZoom = useCallback((value: number) => {
		setZoom(clampPreviewZoom(Number(value.toFixed(2))));
	}, []);

	const onDownloadPDF = useCallback(async () => {
		if (!resume) return;

		const filename = generateFilename(resume.name || resume.data.basics.name || resume.id, "pdf");
		const toastId = toast.loading(t`Please wait while your PDF is being generated…`);

		setIsPrinting(true);

		try {
			const blob = await createResumePdfBlob(resume.data);
			downloadWithAnchor(blob, filename);
		} catch {
			toast.error(t`There was a problem while generating the PDF, please try again.`);
		} finally {
			setIsPrinting(false);
			toast.dismiss(toastId);
		}
	}, [resume]);

	const zoomPercent = Math.round(zoom * 100);

	return (
		<section className="flex h-full min-h-0 flex-col bg-muted/30">
			<div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
				<div>
					<div className="font-semibold">
						<Trans>Resume</Trans>
					</div>
					<div className="text-muted-foreground text-xs">{resume?.name ?? t`Missing working resume`}</div>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-auto">
				<div className="sticky top-0 z-10 flex h-10 items-center justify-between border-b bg-background/90 px-2 backdrop-blur">
					<div className="flex items-center gap-1">
						<ToolbarButton
							label={t`Decrease zoom`}
							disabled={!resume}
							onClick={() => setClampedZoom(zoom - PREVIEW_ZOOM_STEP)}
						>
							<MinusIcon />
						</ToolbarButton>
						<Tooltip>
							<TooltipTrigger
								render={
									<input
										type="text"
										inputMode="numeric"
										value={`${zoomPercent}%`}
										disabled={!resume}
										aria-label={t`Zoom level`}
										className="h-8 w-14 rounded-md border bg-background px-1 text-center text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
										onChange={(event) => {
											const nextValue = Number(event.target.value.replace(/[^0-9.]/g, ""));
											if (Number.isFinite(nextValue)) setClampedZoom(nextValue / 100);
										}}
									/>
								}
							/>
							<TooltipContent side="bottom" align="center">
								<Trans>Zoom level</Trans>
							</TooltipContent>
						</Tooltip>
						<ToolbarButton
							label={t`Increase zoom`}
							disabled={!resume}
							onClick={() => setClampedZoom(zoom + PREVIEW_ZOOM_STEP)}
						>
							<PlusIcon />
						</ToolbarButton>
					</div>
					<div className="flex items-center gap-1">
						<ToolbarButton
							label={t`Open in builder`}
							disabled={!resume}
							nativeButton={false}
							render={resume ? <Link to="/builder/$resumeId" params={{ resumeId: resume.id }} /> : undefined}
						>
							<ArrowSquareOutIcon />
						</ToolbarButton>
						<ToolbarButton
							label={t`Download PDF`}
							disabled={!resume || isPrinting}
							onClick={() => void onDownloadPDF()}
						>
							{isPrinting ? <CircleNotchIcon className="animate-spin" /> : <FilePdfIcon />}
						</ToolbarButton>
					</div>
				</div>
				<div className="p-4">
					{resume ? (
						<ResumePreview
							data={resume.data}
							pageLayout="vertical"
							pageScale={zoom}
							showPageNumbers
							className="mx-auto"
							pageClassName="shadow-lg"
						/>
					) : (
						<div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
							<Trans>The working resume was deleted. This thread is read-only.</Trans>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}

function RouteComponent() {
	const { threadId } = Route.useParams();
	const navigate = useNavigate();
	const [mobileTab, setMobileTab] = useState("chat");
	const threadsPanelRef = useRef<PanelImperativeHandle | null>(null);
	const resumePanelRef = useRef<PanelImperativeHandle | null>(null);
	const [isThreadsCollapsed, setIsThreadsCollapsed] = useState(false);
	const [isResumeCollapsed, setIsResumeCollapsed] = useState(false);
	const { data, isLoading, error } = useQuery(orpc.agent.threads.get.queryOptions({ input: { id: threadId } }));
	useAgentResumeUpdateSubscription({ resumeId: data?.resume?.id, threadId });

	const toggleThreadsPanel = useCallback(() => {
		const panel = threadsPanelRef.current;
		if (!panel) return;
		if (panel.isCollapsed()) {
			panel.expand();
			setIsThreadsCollapsed(false);
		} else {
			panel.collapse();
			setIsThreadsCollapsed(true);
		}
	}, []);

	const toggleResumePanel = useCallback(() => {
		const panel = resumePanelRef.current;
		if (!panel) return;
		if (panel.isCollapsed()) {
			panel.expand();
			setIsResumeCollapsed(false);
		} else {
			panel.collapse();
			setIsResumeCollapsed(true);
		}
	}, []);

	if (isLoading) {
		return (
			<div className="grid h-svh place-items-center bg-background text-muted-foreground">
				<Trans>Loading agent workspace…</Trans>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="grid h-svh place-items-center bg-background p-6 text-center">
				<div className="space-y-4">
					<p className="text-muted-foreground">
						<Trans>This agent thread could not be opened.</Trans>
					</p>
					<Button onClick={() => void navigate({ to: "/agent/new" })}>
						<Trans>Start a new thread</Trans>
					</Button>
				</div>
			</div>
		);
	}

	const readOnlyReason: "archived" | "missing" | null = data.isReadOnly
		? data.thread.status === "archived"
			? "archived"
			: "missing"
		: null;

	return (
		<div className="h-svh bg-background">
			<div className="hidden h-full lg:block">
				<ResizableGroup orientation="horizontal" className="h-full">
					<ResizablePanel
						id="threads"
						panelRef={threadsPanelRef}
						defaultSize="18%"
						minSize="240px"
						maxSize="360px"
						collapsible
						collapsedSize="0px"
						onResize={(size) => setIsThreadsCollapsed(size.inPixels < 24)}
					>
						<AgentThreadSidebar activeThreadId={threadId} className={cn(isThreadsCollapsed && "invisible")} />
					</ResizablePanel>
					<ResizableSeparator withHandle />
					<ResizablePanel id="chat" defaultSize="52%" minSize="280px">
						<AgentChat
							threadId={threadId}
							initialMessages={data.messages}
							isReadOnly={data.isReadOnly}
							readOnlyReason={readOnlyReason}
							threadStatus={data.thread.status}
							activeRunId={data.thread.activeRunId}
							actions={data.actions}
							onToggleThreads={toggleThreadsPanel}
							onToggleResume={toggleResumePanel}
						/>
					</ResizablePanel>
					<ResizableSeparator withHandle />
					<ResizablePanel
						id="resume"
						panelRef={resumePanelRef}
						defaultSize="30%"
						minSize="340px"
						maxSize="70%"
						collapsible
						collapsedSize="0px"
						onResize={(size) => setIsResumeCollapsed(size.inPixels < 24)}
					>
						<div className={cn("h-full", isResumeCollapsed && "invisible")}>
							<ResumePane resume={data.resume} />
						</div>
					</ResizablePanel>
				</ResizableGroup>
			</div>

			<div className="flex h-full flex-col lg:hidden">
				<div className="border-b p-2">
					<Tabs value={mobileTab} onValueChange={setMobileTab}>
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="threads">
								<SidebarSimpleIcon />
								<Trans>Threads</Trans>
							</TabsTrigger>
							<TabsTrigger value="chat">
								<ChatCircleDotsIcon />
								<Trans>Chat</Trans>
							</TabsTrigger>
							<TabsTrigger value="resume">
								<SquaresFourIcon />
								<Trans>Resume</Trans>
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
				<div className="min-h-0 flex-1">
					<div className={cn("h-full", mobileTab !== "threads" && "hidden")}>
						<AgentThreadSidebar activeThreadId={threadId} />
					</div>
					<div className={cn("h-full", mobileTab !== "chat" && "hidden")}>
						<AgentChat
							threadId={threadId}
							initialMessages={data.messages}
							isReadOnly={data.isReadOnly}
							readOnlyReason={readOnlyReason}
							threadStatus={data.thread.status}
							activeRunId={data.thread.activeRunId}
							actions={data.actions}
						/>
					</div>
					<div className={cn("h-full", mobileTab !== "resume" && "hidden")}>
						<ResumePane resume={data.resume} />
					</div>
				</div>
			</div>
		</div>
	);
}
