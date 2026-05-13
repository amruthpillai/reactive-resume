import type { FileUIPart, UIMessage, UIMessageChunk } from "ai";
import type { RouterOutput } from "@/libs/orpc/client";
import { useChat } from "@ai-sdk/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import {
	ArchiveIcon,
	ArrowClockwiseIcon,
	ChatCircleDotsIcon,
	ClockCounterClockwiseIcon,
	CopyIcon,
	DotsThreeVerticalIcon,
	FileIcon,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { ResizableGroup, ResizablePanel, ResizableSeparator } from "@reactive-resume/ui/components/resizable";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { cn } from "@reactive-resume/utils/style";
import { ResumePreview } from "@/components/resume/preview";
import { useConfirm } from "@/hooks/use-confirm";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { client, orpc, streamClient } from "@/libs/orpc/client";

type AgentThreadDetail = RouterOutput["agent"]["threads"]["get"];
type AgentAction = AgentThreadDetail["actions"][number];
type AgentAttachment = AgentThreadDetail["attachments"][number];
type PatchOperation = AgentAction["operations"][number];

function truncate(str: string, max = 200) {
	return str.length > max ? `${str.slice(0, max)}...` : str;
}

function PatchToolCard({
	part,
	action,
	onRevert,
	isReverting,
}: {
	part: UIMessage["parts"][number];
	action: AgentAction | undefined;
	onRevert: (actionId: string) => void;
	isReverting: boolean;
}) {
	const output =
		"output" in part && typeof part.output === "object" && part.output
			? (part.output as Record<string, unknown>)
			: null;
	const actionId = action?.id ?? (typeof output?.actionId === "string" ? output.actionId : null);

	const title = action?.title ?? (typeof output?.title === "string" ? output.title : t`Resume patch`);
	const operations: PatchOperation[] =
		action?.operations ?? (Array.isArray(output?.operations) ? (output.operations as PatchOperation[]) : []);
	const status = action?.status ?? "applied";
	const revertMessage = action?.revertMessage ?? null;

	const containerClass =
		status === "reverted"
			? "border-muted bg-muted/30 text-foreground"
			: status === "conflicted"
				? "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100"
				: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100";

	const statusBadge =
		status === "reverted" ? (
			<Badge variant="secondary">
				<Trans>Reverted</Trans>
			</Badge>
		) : status === "conflicted" ? (
			<Badge variant="destructive">
				<Trans>Conflicted</Trans>
			</Badge>
		) : (
			<Badge variant="outline">
				<Trans>Applied</Trans>
			</Badge>
		);

	const revertDisabled = isReverting || status === "reverted" || status === "conflicted";

	return (
		<div className={cn("space-y-3 rounded-md border p-3", containerClass)}>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 space-y-1">
					<div className="flex items-center gap-2">
						<span className="font-medium">{title}</span>
						{statusBadge}
					</div>
					{status === "conflicted" && revertMessage ? (
						<p className="text-sm opacity-80">{revertMessage}</p>
					) : (
						<p className="text-sm opacity-80">
							{status === "reverted" ? (
								<Trans>Reverted from the working resume.</Trans>
							) : (
								<Trans>Applied to the working resume.</Trans>
							)}
						</p>
					)}
				</div>
				{actionId ? (
					<Button size="sm" variant="outline" disabled={revertDisabled} onClick={() => onRevert(actionId)}>
						<ClockCounterClockwiseIcon />
						<Trans>Revert</Trans>
					</Button>
				) : null}
			</div>

			{operations.length > 0 ? (
				<details className="rounded border bg-background/40 px-2 py-1 text-sm">
					<summary className="cursor-pointer text-muted-foreground">
						<Trans>Show changes</Trans>
					</summary>
					<ul className="mt-2 space-y-2">
						{operations.map((op, index) => {
							const opKey = `${op.op}-${op.path}-${index}`;
							const indicator =
								op.op === "add" ? (
									<span className="text-emerald-600 dark:text-emerald-400">+ Add</span>
								) : op.op === "replace" ? (
									<span className="text-amber-600 dark:text-amber-400">~ Replace</span>
								) : op.op === "remove" ? (
									<span className="text-rose-600 dark:text-rose-400">− Remove</span>
								) : (
									<span className="text-muted-foreground">{op.op}</span>
								);

							const value = op.op === "add" || op.op === "replace" ? truncate(JSON.stringify(op.value, null, 2)) : null;

							return (
								<li key={opKey} className="space-y-1">
									<div className="flex items-center gap-2 text-xs">
										<span className="font-medium">{indicator}</span>
										<span className="font-mono text-xs">{op.path}</span>
									</div>
									{value !== null ? (
										<pre className="whitespace-pre-wrap break-words rounded bg-muted/50 p-2 font-mono text-xs">
											{value}
										</pre>
									) : null}
								</li>
							);
						})}
					</ul>
				</details>
			) : null}
		</div>
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
	return message.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("\n");
}

function attachmentToFilePart(attachment: Pick<AgentAttachment, "id" | "filename" | "mediaType">): FileUIPart {
	return {
		type: "file",
		url: `agent-attachment:${attachment.id}`,
		mediaType: attachment.mediaType,
		filename: attachment.filename,
	};
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

						controller.enqueue(JSON.parse(data) as UIMessageChunk);
					}

					boundary = eventBoundary.exec(buffer);
				}
			},
		}),
	);
}

function ThreadSidebar({ activeThreadId }: { activeThreadId: string }) {
	const { data: threads } = useQuery(orpc.agent.threads.list.queryOptions());

	return (
		<aside className="flex h-full flex-col border-e bg-muted/30">
			<div className="flex h-14 items-center justify-between gap-2 border-b px-3">
				<div className="flex items-center gap-2 font-semibold">
					<ChatCircleDotsIcon />
					<Trans>Agent</Trans>
				</div>
				<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link to="/agent" />}>
					<PlusIcon />
					<span className="sr-only">
						<Trans>New thread</Trans>
					</span>
				</Button>
			</div>
			<ScrollArea className="min-h-0 flex-1">
				<div className="space-y-1 p-2">
					{threads?.map((thread) => {
						const isArchived = thread.status === "archived";

						return (
							<Link
								key={thread.id}
								to="/agent/$threadId"
								params={{ threadId: thread.id }}
								className={cn(
									"block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
									thread.id === activeThreadId && "bg-accent",
									isArchived && "opacity-60",
								)}
							>
								<div className="flex items-center justify-between gap-2">
									<div className="truncate font-medium">{thread.title}</div>
									{isArchived ? (
										<Badge variant="secondary">
											<Trans>Archived</Trans>
										</Badge>
									) : null}
								</div>
								<div className="truncate text-muted-foreground text-xs">
									{thread.resumeName ?? thread.providerLabel}
								</div>
							</Link>
						);
					})}
				</div>
			</ScrollArea>
		</aside>
	);
}

function MessagePart({
	part,
	onAnswer,
	onRevert,
	isReverting,
	actionsById,
}: {
	part: UIMessage["parts"][number];
	onAnswer: (toolCallId: string, answer: string) => void;
	onRevert: (actionId: string) => void;
	isReverting: boolean;
	actionsById: Map<string, AgentAction>;
}) {
	if (part.type === "text") return <div className="whitespace-pre-wrap leading-relaxed">{part.text}</div>;

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

	if (part.type === "tool-fetch_url") {
		const output =
			"output" in part && typeof part.output === "object" && part.output
				? (part.output as Record<string, unknown>)
				: null;
		return (
			<details className="rounded-md border bg-card p-3 text-sm">
				<summary className="cursor-pointer font-medium">
					<Trans>Fetched URL</Trans>
				</summary>
				<div className="mt-2 space-y-1 text-muted-foreground">
					<p>{typeof output?.url === "string" ? output.url : t`Waiting for fetch result...`}</p>
					{typeof output?.title === "string" ? <p>{output.title}</p> : null}
				</div>
			</details>
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

function ChatMessage({
	message,
	onAnswer,
	onRevert,
	isReverting,
	actionsById,
}: {
	message: UIMessage;
	onAnswer: (toolCallId: string, answer: string) => void;
	onRevert: (actionId: string) => void;
	isReverting: boolean;
	actionsById: Map<string, AgentAction>;
}) {
	const isUser = message.role === "user";

	return (
		<div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[86%] space-y-3 rounded-md px-4 py-3 text-sm",
					isUser ? "bg-primary text-primary-foreground" : "bg-muted",
				)}
			>
				{message.parts.map((part, index) => (
					<MessagePart
						key={`${message.id}-${index}`}
						part={part}
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
	actions,
}: {
	threadId: string;
	initialMessages: UIMessage[];
	isReadOnly: boolean;
	readOnlyReason: "archived" | "missing" | null;
	threadStatus: string;
	actions: AgentAction[];
}) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const confirm = useConfirm();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [input, setInput] = useState("");
	const [pendingAttachments, setPendingAttachments] = useState<
		Array<Pick<AgentAttachment, "id" | "filename" | "mediaType">>
	>([]);
	const [isUploading, setIsUploading] = useState(false);
	const revertMutation = useMutation(orpc.agent.actions.revert.mutationOptions());
	const archiveMutation = useMutation(orpc.agent.threads.archive.mutationOptions());
	const deleteMutation = useMutation(orpc.agent.threads.delete.mutationOptions());
	const isArchived = threadStatus === "archived";

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
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: orpc.agent.threads.list.queryKey() }),
						queryClient.invalidateQueries({ queryKey: orpc.agent.threads.get.queryKey({ input: { id: threadId } }) }),
					]);
				},
				onError: (error) => {
					toast.error(getOrpcErrorMessage(error, { fallback: t`Failed to archive thread.` }));
				},
			},
		);
	};

	const handleDelete = async () => {
		const confirmation = await confirm(t`Delete this agent thread?`, {
			description: t`This action cannot be undone. Messages and the working draft will be removed.`,
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
				const attachmentIds =
					options.body && "attachmentIds" in options.body && Array.isArray(options.body.attachmentIds)
						? options.body.attachmentIds.filter((id): id is string => typeof id === "string")
						: undefined;

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
		resume: true,
		transport,
	});

	useEffect(() => {
		setMessages(initialMessages);
	}, [initialMessages, setMessages]);

	const isStreaming = status === "submitted" || status === "streaming";

	const send = () => {
		const text = input.trim();
		if ((!text && pendingAttachments.length === 0) || isReadOnly || isStreaming) return;

		clearError();
		const files = pendingAttachments.map(attachmentToFilePart);
		sendMessage(text ? { text, ...(files.length > 0 ? { files } : {}) } : { files }, {
			body: { attachmentIds: pendingAttachments.map((attachment) => attachment.id) },
		});
		setInput("");
		setPendingAttachments([]);
	};

	const uploadFiles = async (files: FileList | null) => {
		if (!files?.length) return;

		setIsUploading(true);
		try {
			for (const file of Array.from(files)) {
				const attachment = await client.agent.attachments.create({
					threadId,
					filename: file.name,
					mediaType: file.type || "application/octet-stream",
					data: await fileToBase64(file),
				});
				setPendingAttachments((current) => [
					...current,
					{ id: attachment.id, filename: attachment.filename, mediaType: attachment.mediaType },
				]);
			}
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

	return (
		<section className="flex h-full min-h-0 flex-col bg-background">
			<div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
				<div>
					<div className="font-semibold">
						<Trans>Chat</Trans>
					</div>
					<div className="text-muted-foreground text-xs">
						<Trans>Use URLs, files, and direct instructions to refine the draft.</Trans>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<Button
						size="icon-sm"
						variant="ghost"
						onClick={() => {
							void navigator.clipboard.writeText(messages.map(textFromMessage).join("\n\n"));
							toast.success(t`Conversation copied.`);
						}}
					>
						<CopyIcon />
					</Button>
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
							{!isArchived ? (
								<DropdownMenuItem disabled={archiveMutation.isPending} onClick={handleArchive}>
									<ArchiveIcon />
									<Trans>Archive</Trans>
								</DropdownMenuItem>
							) : null}
							<DropdownMenuItem
								variant="destructive"
								disabled={deleteMutation.isPending}
								onClick={() => void handleDelete()}
							>
								<TrashIcon />
								<Trans>Delete</Trans>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{isReadOnly ? (
				<div className="border-amber-300 border-b bg-amber-50 px-4 py-2 text-amber-950 text-sm dark:bg-amber-950/20 dark:text-amber-200">
					{readOnlyReason === "archived" ? (
						<Trans>This thread is archived. New messages cannot be sent.</Trans>
					) : (
						<Trans>This thread is read-only because the working resume or AI provider is unavailable.</Trans>
					)}
				</div>
			) : null}

			<ScrollArea className="min-h-0 flex-1">
				<div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
					{messages.length === 0 ? (
						<div className="grid gap-3 py-12 text-center">
							<SparkleIcon className="mx-auto size-8 text-primary" />
							<h2 className="font-semibold text-2xl">
								<Trans>What should this resume target?</Trans>
							</h2>
							<div className="mx-auto flex max-w-xl flex-wrap justify-center gap-2">
								{[
									t`Tailor this resume to a product manager job description.`,
									t`Find weak bullets and rewrite them with stronger outcomes.`,
									t`Compare this resume against a role URL and update keywords.`,
								].map((prompt) => (
									<Button key={prompt} variant="outline" onClick={() => setInput(prompt)}>
										{prompt}
									</Button>
								))}
							</div>
						</div>
					) : null}

					{messages.map((message) => (
						<ChatMessage
							key={message.id}
							message={message}
							isReverting={revertMutation.isPending}
							actionsById={actionsById}
							onAnswer={(toolCallId, answer) => {
								addToolOutput({ tool: "ask_user_question", toolCallId, output: answer });
								sendMessage({ text: answer });
							}}
							onRevert={(actionId) =>
								revertMutation.mutate(
									{ id: actionId },
									{
										onSuccess: (action) => {
											if (action.status === "conflicted") {
												toast.error(
													action.revertMessage ?? t`Cannot revert; the resume has changed since this edit was applied.`,
												);
											} else if (action.status === "reverted") {
												toast.success(t`Patch reverted.`);
											}
											void queryClient.invalidateQueries({
												queryKey: orpc.agent.threads.get.queryKey({ input: { id: threadId } }),
											});
										},
										onError: (error) =>
											toast.error(getOrpcErrorMessage(error, { fallback: t`Could not revert this patch.` })),
									},
								)
							}
						/>
					))}

					{isStreaming ? (
						<div className="flex justify-start">
							<div className="rounded-md bg-muted px-4 py-3 text-muted-foreground text-sm">
								<Trans>Working...</Trans>
							</div>
						</div>
					) : null}

					{error ? (
						<div className="flex items-center justify-between gap-3 rounded-md border border-rose-300 bg-rose-50 p-3 text-rose-950 text-sm dark:bg-rose-950/20 dark:text-rose-200">
							<span>{error.message}</span>
							{!isReadOnly ? (
								<Button
									size="sm"
									variant="outline"
									type="button"
									onClick={() => {
										clearError();
										void regenerate();
									}}
								>
									<ArrowClockwiseIcon />
									<Trans>Retry</Trans>
								</Button>
							) : null}
						</div>
					) : null}
				</div>
			</ScrollArea>

			<form
				className="border-t p-3"
				onSubmit={(event) => {
					event.preventDefault();
					send();
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

					<div className="flex items-end gap-2 rounded-md border bg-card p-2">
						<input
							ref={fileInputRef}
							type="file"
							multiple
							className="hidden"
							onChange={(event) => void uploadFiles(event.target.files)}
						/>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							disabled={isReadOnly || isUploading}
							onClick={() => fileInputRef.current?.click()}
						>
							{isUploading ? <ArrowClockwiseIcon className="animate-spin" /> : <PlusIcon />}
						</Button>
						<Textarea
							value={input}
							disabled={isReadOnly || isStreaming}
							onChange={(event) => setInput(event.target.value)}
							onKeyDown={(event) => {
								if (event.key !== "Enter" || event.shiftKey) return;
								event.preventDefault();
								send();
							}}
							placeholder={isReadOnly ? t`This thread is read-only` : t`Ask anything about this resume`}
							className="max-h-40 min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
						/>
						{isStreaming && !isReadOnly ? (
							<Button type="button" size="icon" variant="outline" onClick={() => void stopRun()}>
								<StopIcon />
							</Button>
						) : (
							<Button
								type="submit"
								size="icon"
								disabled={isReadOnly || (!input.trim() && pendingAttachments.length === 0)}
							>
								<PaperPlaneRightIcon />
							</Button>
						)}
					</div>
				</div>
			</form>
		</section>
	);
}

function ResumePane({ resume }: { resume: AgentThreadDetail["resume"] }) {
	return (
		<section className="flex h-full min-h-0 flex-col bg-muted/30">
			<div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
				<div>
					<div className="font-semibold">
						<Trans>Resume</Trans>
					</div>
					<div className="text-muted-foreground text-xs">{resume?.name ?? t`Missing working resume`}</div>
				</div>
				{resume ? (
					<Button
						size="sm"
						variant="outline"
						nativeButton={false}
						render={<Link to="/builder/$resumeId" params={{ resumeId: resume.id }} />}
					>
						<Trans>Open Builder</Trans>
					</Button>
				) : null}
			</div>

			<div className="min-h-0 flex-1 overflow-auto p-4">
				{resume ? (
					<ResumePreview
						data={resume.data}
						pageLayout="vertical"
						pageScale={0.62}
						pageGap={28}
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
		</section>
	);
}

function RouteComponent() {
	const { threadId } = Route.useParams();
	const navigate = useNavigate();
	const [mobileTab, setMobileTab] = useState("chat");
	const { data, isLoading, error } = useQuery(orpc.agent.threads.get.queryOptions({ input: { id: threadId } }));

	if (isLoading) {
		return (
			<div className="grid h-svh place-items-center bg-background text-muted-foreground">
				<Trans>Loading agent workspace...</Trans>
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
					<Button onClick={() => void navigate({ to: "/agent" })}>
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
					<ResizablePanel id="threads" defaultSize="18%" minSize="240px" maxSize="360px">
						<ThreadSidebar activeThreadId={threadId} />
					</ResizablePanel>
					<ResizableSeparator withHandle />
					<ResizablePanel id="chat" defaultSize="52%" minSize="420px">
						<AgentChat
							threadId={threadId}
							initialMessages={data.messages}
							isReadOnly={data.isReadOnly}
							readOnlyReason={readOnlyReason}
							threadStatus={data.thread.status}
							actions={data.actions}
						/>
					</ResizablePanel>
					<ResizableSeparator withHandle />
					<ResizablePanel id="resume" defaultSize="30%" minSize="340px">
						<ResumePane resume={data.resume} />
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
					{mobileTab === "threads" ? <ThreadSidebar activeThreadId={threadId} /> : null}
					{mobileTab === "chat" ? (
						<AgentChat
							threadId={threadId}
							initialMessages={data.messages}
							isReadOnly={data.isReadOnly}
							readOnlyReason={readOnlyReason}
							threadStatus={data.thread.status}
							actions={data.actions}
						/>
					) : null}
					{mobileTab === "resume" ? <ResumePane resume={data.resume} /> : null}
				</div>
			</div>
		</div>
	);
}
