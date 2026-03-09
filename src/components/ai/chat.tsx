import { useChat } from "@ai-sdk/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import {
	CheckCircleIcon,
	CircleNotchIcon,
	PaperPlaneRightIcon,
	SparkleIcon,
	StopIcon,
	TrashSimpleIcon,
} from "@phosphor-icons/react";
import type { UIMessage } from "ai";
import type { Operation } from "fast-json-patch";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIStore } from "@/integrations/ai/store";
import { client } from "@/integrations/orpc/client";
import { applyResumePatches } from "@/utils/resume/patch";
import { cn } from "@/utils/style";
import { useResumeStore } from "../resume/store/resume";

/**
 * Extract patch operations from the latest assistant messages' tool call parts.
 * Returns operations that haven't been applied yet (tracked by processedToolCallIds).
 */
function extractNewPatchOperations(
	messages: UIMessage[],
	processedIds: Set<string>,
): { operations: Operation[]; newIds: string[] } {
	const operations: Operation[] = [];
	const newIds: string[] = [];

	for (const message of messages) {
		if (message.role !== "assistant") continue;
		for (const part of message.parts) {
			if (part.type !== "tool-patch_resume") continue;

			// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool parts have dynamic shapes
			const toolPart = part as any;
			if (toolPart.state !== "output-available") continue;

			const callId = toolPart.toolCallId as string;
			if (processedIds.has(callId)) continue;

			const result = toolPart.output as { success: boolean; appliedOperations?: Operation[] } | undefined;
			if (result?.success && result.appliedOperations) {
				operations.push(...result.appliedOperations);
				newIds.push(callId);
			}
		}
	}

	return { operations, newIds };
}

/**
 * LocalStorage helpers for persisting chat messages per resume.
 */
const STORAGE_KEY_PREFIX = "ai-chat-messages";

function getStorageKey(resumeId: string): string {
	return `${STORAGE_KEY_PREFIX}:${resumeId}`;
}

function loadStoredMessages(resumeId: string): UIMessage[] {
	try {
		const stored = localStorage.getItem(getStorageKey(resumeId));
		if (!stored) return [];
		return JSON.parse(stored) as UIMessage[];
	} catch {
		return [];
	}
}

function saveStoredMessages(resumeId: string, messages: UIMessage[]): void {
	try {
		localStorage.setItem(getStorageKey(resumeId), JSON.stringify(messages));
	} catch {
		// Silently fail if localStorage is full or unavailable
	}
}

function clearStoredMessages(resumeId: string): void {
	localStorage.removeItem(getStorageKey(resumeId));
}

function formatPath(path: string): string {
	return path.replace(/^\//, "").replace(/\//g, " › ");
}

function formatOperationLabel(op: string): string {
	switch (op) {
		case "replace":
			return t`Updated`;
		case "add":
			return t`Added`;
		case "remove":
			return t`Removed`;
		default:
			return op;
	}
}

function ToolBadge({ state, operations }: { state: string; operations?: { op: string; path: string }[] }) {
	const isDone = state === "output-available";

	return (
		<div className="my-0.5 flex flex-col gap-1.5">
			<span
				data-state={state}
				className={cn(
					"inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-[11px]",
					"data-[state=output-available]:border-emerald-500/30 data-[state=output-available]:bg-emerald-500/10 data-[state=output-available]:text-emerald-600 dark:data-[state=output-available]:text-emerald-400",
				)}
			>
				{isDone ? (
					<CheckCircleIcon weight="fill" className="size-3" />
				) : (
					<CircleNotchIcon className="size-3 animate-spin" />
				)}
				{isDone ? "Changes applied" : "Applying changes..."}
			</span>

			{isDone && operations && operations.length > 0 && (
				<div className="flex flex-col gap-0.5 pl-1 text-[11px] text-muted-foreground">
					{operations.map((op, i) => (
						<span key={i} className="flex items-center gap-1">
							<span className="opacity-40">•</span>
							{formatOperationLabel(op.op)} {formatPath(op.path)}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

function MessageParts({ message }: { message: UIMessage }) {
	const parts = message.parts;

	if (parts.length === 0) return null;

	return (
		<div className="flex flex-col gap-2">
			{parts.map((part, i) => {
				if (part.type === "step-start") {
					if (i === 0) return null;
					return <hr key={i} className="my-0.5 border-border/40" />;
				}

				if (part.type === "text" && part.text.trim()) {
					return (
						<p key={i} className="whitespace-pre-wrap text-[13px] leading-relaxed">
							{part.text}
						</p>
					);
				}

				if (part.type === "reasoning" && part.text.trim()) {
					return (
						<p key={i} className="whitespace-pre-wrap text-[11px] text-muted-foreground italic leading-relaxed">
							{part.text}
						</p>
					);
				}

				if (part.type === "tool-patch_resume") {
					// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool parts have dynamic shapes
					const toolPart = part as any;
					const state = toolPart.state as string;
					const operations = toolPart.input?.operations as { op: string; path: string }[] | undefined;
					return <ToolBadge key={i} state={state} operations={operations} />;
				}

				return null;
			})}
		</div>
	);
}

export function AIChat() {
	const enabled = useAIStore((s) => s.enabled);
	const provider = useAIStore((s) => s.provider);
	const model = useAIStore((s) => s.model);
	const apiKey = useAIStore((s) => s.apiKey);
	const baseURL = useAIStore((s) => s.baseURL);

	const resumeId = useResumeStore((s) => s.resume.id);
	const resumeData = useResumeStore((s) => s.resume.data);
	const updateResumeData = useResumeStore((s) => s.updateResumeData);

	const [input, setInput] = useState("");
	const [open, setOpen] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const processedToolCallIds = useRef(new Set<string>());

	// Load stored messages once on mount and pre-populate processedToolCallIds
	// so that already-applied patches are not re-applied.
	const [initialMessages] = useState(() => {
		const stored = loadStoredMessages(resumeId);

		for (const msg of stored) {
			if (msg.role !== "assistant") continue;
			for (const part of msg.parts) {
				if (part.type !== "tool-patch_resume") continue;
				// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool parts have dynamic shapes
				const toolPart = part as any;
				if (toolPart.state === "output-available") {
					processedToolCallIds.current.add(toolPart.toolCallId as string);
				}
			}
		}

		return stored;
	});

	const { messages, sendMessage, status, stop, setMessages } = useChat({
		messages: initialMessages,
		transport: {
			async sendMessages(options) {
				return eventIteratorToUnproxiedDataStream(
					await client.ai.chat(
						{
							provider,
							model,
							apiKey,
							baseURL,
							messages: options.messages,
							resumeData,
						},
						{ signal: options.abortSignal },
					),
				);
			},
			reconnectToStream() {
				throw new Error("Unsupported");
			},
		},
		onError(error) {
			toast.error("AI chat error", { description: error.message });
		},
	});

	// Apply patches when new tool results arrive
	useEffect(() => {
		const { operations, newIds } = extractNewPatchOperations(messages, processedToolCallIds.current);
		if (operations.length === 0) return;

		try {
			const patched = applyResumePatches(resumeData, operations);
			updateResumeData((draft) => {
				Object.assign(draft, patched);
			});
			for (const id of newIds) processedToolCallIds.current.add(id);
		} catch (error) {
			toast.error("Failed to apply resume changes", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}, [messages, resumeData, updateResumeData]);

	// Persist messages to localStorage whenever they change
	useEffect(() => {
		saveStoredMessages(resumeId, messages);
	}, [resumeId, messages]);

	// Auto-scroll to bottom (sentinel so it works with ScrollArea viewport)
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Refocus the input when the AI finishes responding
	useEffect(() => {
		if (status === "ready") inputRef.current?.focus();
	}, [status]);

	const handleOpenChange = useCallback((nextOpen: boolean) => {
		setOpen(nextOpen);
	}, []);

	const handleClearMessages = useCallback(() => {
		setMessages([]);
		clearStoredMessages(resumeId);
		processedToolCallIds.current.clear();
	}, [resumeId, setMessages]);

	const handleSubmit = useCallback(
		(e: React.SubmitEvent) => {
			e.preventDefault();
			if (!input.trim() || status !== "ready") return;
			sendMessage({ text: input });
			setInput("");
		},
		[input, status, sendMessage],
	);

	if (!enabled) return null;

	const isLoading = status === "submitted" || status === "streaming";

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button size="icon" variant="ghost">
					<SparkleIcon />
				</Button>
			</PopoverTrigger>

			<PopoverContent className="flex h-128 w-md flex-col gap-y-0 overflow-hidden p-0" side="top" align="center">
				{/* Header with clear button */}
				<div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
					<p className="font-medium text-muted-foreground text-xs">
						<Trans>AI Chat</Trans>
					</p>
					<Button
						size="icon-sm"
						variant="ghost"
						className="size-7"
						title={t`Clear chat history`}
						onClick={handleClearMessages}
						disabled={messages.length === 0 || isLoading}
					>
						<TrashSimpleIcon className="size-3" />
					</Button>
				</div>

				{/* Message list — min-h-0 so flex constrains height and viewport scrolls */}
				<ScrollArea className="min-h-0 flex-1 px-4">
					<div className="flex flex-col gap-y-4 pt-4">
						{messages.length === 0 && (
							<div className="flex h-full items-center justify-center py-6">
								<p className="text-center text-muted-foreground text-xs">
									<Trans>Ask me to update your resume...</Trans>
								</p>
							</div>
						)}

						<div className="flex flex-col gap-4">
							{messages.map((message) => (
								<div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
									<div
										data-role={message.role}
										className={cn(
											"max-w-[85%] rounded-xl px-3.5 py-2.5",
											"data-[role=user]:rounded-br-sm data-[role=user]:bg-primary data-[role=user]:text-primary-foreground",
											"data-[role=assistant]:rounded-bl-sm data-[role=assistant]:bg-muted data-[role=assistant]:text-foreground",
										)}
									>
										{message.role === "user" ? (
											<p className="text-[13px] leading-relaxed">
												{message.parts.map((part, i) =>
													part.type === "text" ? <span key={i}>{part.text}</span> : null,
												)}
											</p>
										) : (
											<MessageParts message={message} />
										)}
									</div>
								</div>
							))}

							{status === "submitted" && (
								<div className="flex justify-start">
									<div className="rounded-xl rounded-bl-sm bg-muted px-3.5 py-2.5">
										<div className="flex items-center gap-2 text-[13px] text-muted-foreground">
											<CircleNotchIcon className="size-3 animate-spin" />
											<span>
												<Trans>Thinking...</Trans>
											</span>
										</div>
									</div>
								</div>
							)}

							<div ref={bottomRef} aria-hidden />
						</div>
					</div>
				</ScrollArea>

				{/* Input form — shrink-0 so it stays visible when content scrolls */}
				<form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-1.5 border-t px-3 py-2">
					<input
						ref={inputRef}
						value={input}
						disabled={!enabled || isLoading}
						onChange={(e) => setInput(e.target.value)}
						placeholder={t`e.g. Change my name to...`}
						className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
					/>
					{isLoading ? (
						<Button type="button" size="icon" variant="ghost" onClick={stop} className="size-7 shrink-0">
							<StopIcon className="size-3.5" />
						</Button>
					) : (
						<Button type="submit" size="icon" variant="ghost" disabled={!input.trim()} className="size-7 shrink-0">
							<PaperPlaneRightIcon className="size-3.5" />
						</Button>
					)}
				</form>
			</PopoverContent>
		</Popover>
	);
}
