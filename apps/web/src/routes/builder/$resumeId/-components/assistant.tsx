import type { UIMessage } from "@ai-sdk/react";
import type { ResumePatchProposal, ResumePatchProposalPreview } from "@reactive-resume/ai/tools/patch-proposal";
import type React from "react";
import type { Resume } from "@/components/resume/builder-resume-draft";
import { useChat } from "@ai-sdk/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import {
	ArrowClockwiseIcon,
	CaretDownIcon,
	ChatCircleDotsIcon,
	CheckIcon,
	MagicWandIcon,
	NotchesIcon,
	PaperPlaneRightIcon,
	SparkleIcon,
	WarningCircleIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAIStore } from "@reactive-resume/ai/store";
import {
	buildResumePatchProposalPreview,
	resumePatchProposalToolOutputSchema,
} from "@reactive-resume/ai/tools/patch-proposal";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { ButtonGroup } from "@reactive-resume/ui/components/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { Sheet, SheetContent } from "@reactive-resume/ui/components/sheet";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { cn } from "@reactive-resume/utils/style";
import { useCurrentResume, useReplaceResumeFromServer } from "@/components/resume/builder-resume-draft";
import { useIsMobile } from "@/hooks/use-mobile";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc, streamClient } from "@/libs/orpc/client";
import { useBuilderAssistantStore } from "./assistant-store";

type AssistantLayout = {
	window: { x: number; y: number; width: number; height: number };
};

type QueuedProposal = {
	key: string;
	sourceMessageId: string;
	toolCallId: string;
	proposal: ResumePatchProposal;
	preview: ResumePatchProposalPreview;
	stalePreview?: boolean;
};

type ProposalResolution = {
	key: string;
	sourceMessageId: string;
	title: string;
	status: "accepted" | "rejected";
};

const MIN_WINDOW_WIDTH = 360;
const MIN_WINDOW_HEIGHT = 440;
const DEFAULT_WINDOW_WIDTH = 460;
const DEFAULT_WINDOW_HEIGHT = 650;
const LAYOUT_STORAGE_VERSION = 2;

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function createDefaultLayout(): AssistantLayout {
	if (typeof window === "undefined") {
		return {
			window: { x: 24, y: 88, width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT },
		};
	}

	const width = Math.min(DEFAULT_WINDOW_WIDTH, window.innerWidth - 32);
	const height = Math.min(DEFAULT_WINDOW_HEIGHT, window.innerHeight - 112);

	return {
		window: {
			x: Math.max(16, Math.round((window.innerWidth - width) / 2)),
			y: Math.max(68, Math.round((window.innerHeight - height) / 2)),
			width,
			height,
		},
	};
}

function constrainLayout(layout: AssistantLayout): AssistantLayout {
	if (typeof window === "undefined") return layout;

	const maxWindowWidth = Math.max(MIN_WINDOW_WIDTH, window.innerWidth - 32);
	const maxWindowHeight = Math.max(MIN_WINDOW_HEIGHT, window.innerHeight - 88);
	const width = clamp(layout.window.width, MIN_WINDOW_WIDTH, maxWindowWidth);
	const height = clamp(layout.window.height, MIN_WINDOW_HEIGHT, maxWindowHeight);

	return {
		window: {
			x: clamp(layout.window.x, 12, window.innerWidth - width - 12),
			y: clamp(layout.window.y, 68, window.innerHeight - height - 12),
			width,
			height,
		},
	};
}

function getLayoutStorageKey(resumeId: string) {
	return `resume-builder-ai-assistant:${resumeId}:layout:v${LAYOUT_STORAGE_VERSION}`;
}

function usePersistentAssistantLayout(resumeId: string) {
	const [layout, setLayout] = useState<AssistantLayout>(() => createDefaultLayout());
	const hydratedRef = useRef(false);

	useEffect(() => {
		const key = getLayoutStorageKey(resumeId);

		try {
			const stored = window.localStorage.getItem(key);
			const parsed = stored ? (JSON.parse(stored) as AssistantLayout) : createDefaultLayout();
			setLayout(constrainLayout(parsed));
		} catch {
			setLayout(constrainLayout(createDefaultLayout()));
		} finally {
			hydratedRef.current = true;
		}
	}, [resumeId]);

	useEffect(() => {
		if (!hydratedRef.current) return;

		try {
			window.localStorage.setItem(getLayoutStorageKey(resumeId), JSON.stringify(layout));
		} catch {
			// Layout persistence is best effort only.
		}
	}, [layout, resumeId]);

	useEffect(() => {
		const onResize = () => setLayout((current) => constrainLayout(current));
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	return { layout, setLayout };
}

function formatPreviewValue(value: unknown): string {
	if (value === undefined || value === null || value === "") return "Empty";
	if (typeof value === "string") {
		const text = value
			.replace(/<[^>]*>/g, " ")
			.replace(/\s+/g, " ")
			.trim();

		return text || value;
	}

	return JSON.stringify(value, null, 2);
}

function refreshQueuedProposal(item: QueuedProposal, resume: Resume): QueuedProposal {
	const proposal = { ...item.proposal, baseUpdatedAt: resume.updatedAt.toISOString() };

	try {
		return {
			...item,
			proposal,
			preview: buildResumePatchProposalPreview(resume.data, proposal),
			stalePreview: false,
		};
	} catch {
		return { ...item, proposal, stalePreview: true };
	}
}

function getPatchErrorMessage(error: unknown): string {
	return getOrpcErrorMessage(error, {
		allowServerMessage: true,
		byCode: {
			INVALID_PATCH_OPERATIONS: t`The AI proposed a change that no longer applies to this resume.`,
			RESUME_LOCKED: t`This resume is locked and cannot be updated.`,
			RESUME_VERSION_CONFLICT: t`This proposal is stale. Ask the assistant to regenerate it from the latest resume.`,
		},
		fallback: t`Could not apply the AI proposal.`,
	});
}

function beginElementDrag(
	event: React.PointerEvent<HTMLElement>,
	onMove: (deltaX: number, deltaY: number) => void,
	onEnd?: () => void,
) {
	if (event.button !== 0) return;

	const target = event.currentTarget;
	const startX = event.clientX;
	const startY = event.clientY;

	target.setPointerCapture(event.pointerId);

	const handlePointerMove = (moveEvent: PointerEvent) => {
		onMove(moveEvent.clientX - startX, moveEvent.clientY - startY);
	};

	const handlePointerUp = () => {
		target.removeEventListener("pointermove", handlePointerMove);
		target.removeEventListener("pointerup", handlePointerUp);
		target.removeEventListener("pointercancel", handlePointerUp);
		onEnd?.();
	};

	target.addEventListener("pointermove", handlePointerMove);
	target.addEventListener("pointerup", handlePointerUp);
	target.addEventListener("pointercancel", handlePointerUp);
}

export function BuilderAssistant() {
	const resume = useCurrentResume();
	const isMobile = useIsMobile();
	const { layout, setLayout } = usePersistentAssistantLayout(resume.id);
	const isOpen = useBuilderAssistantStore((state) => state.isOpen);
	const setIsOpen = useBuilderAssistantStore((state) => state.setOpen);

	const beginWindowDrag = (event: React.PointerEvent<HTMLElement>) => {
		const start = layout.window;

		beginElementDrag(event, (deltaX, deltaY) => {
			setLayout((current) =>
				constrainLayout({
					...current,
					window: { ...current.window, x: start.x + deltaX, y: start.y + deltaY },
				}),
			);
		});
	};

	const beginWindowResize = (event: React.PointerEvent<HTMLElement>) => {
		event.stopPropagation();
		const start = layout.window;

		beginElementDrag(event, (deltaX, deltaY) => {
			setLayout((current) =>
				constrainLayout({
					...current,
					window: {
						...current.window,
						width: start.width + deltaX,
						height: start.height + deltaY,
					},
				}),
			);
		});
	};

	if (isMobile) {
		return (
			<Sheet open={isOpen} onOpenChange={setIsOpen}>
				<SheetContent side="right" showCloseButton={false} className="h-svh w-svw max-w-none! gap-0 p-0">
					<AssistantPanel resume={resume} isMobile onClose={() => setIsOpen(false)} />
				</SheetContent>
			</Sheet>
		);
	}

	return isOpen ? (
		<div
			className="fixed top-0 left-0 z-[60] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
			style={{
				width: layout.window.width,
				height: layout.window.height,
				transform: `translate3d(${layout.window.x}px, ${layout.window.y}px, 0)`,
			}}
		>
			<AssistantPanel
				resume={resume}
				onClose={() => setIsOpen(false)}
				onDragHeaderPointerDown={beginWindowDrag}
				onResizePointerDown={beginWindowResize}
			/>
		</div>
	) : null;
}

type AssistantPanelProps = {
	resume: Resume;
	isMobile?: boolean;
	onClose: () => void;
	onDragHeaderPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
	onResizePointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
};

function AssistantPanel({
	resume,
	isMobile = false,
	onClose,
	onDragHeaderPointerDown,
	onResizePointerDown,
}: AssistantPanelProps) {
	const replaceResumeFromServer = useReplaceResumeFromServer();
	const aiEnabled = useAIStore((state) => state.enabled);
	const provider = useAIStore((state) => state.provider);
	const model = useAIStore((state) => state.model);
	const apiKey = useAIStore((state) => state.apiKey);
	const baseURL = useAIStore((state) => state.baseURL);
	const [input, setInput] = useState("");
	const [queue, setQueue] = useState<QueuedProposal[]>([]);
	const [activeIndex, setActiveIndex] = useState(0);
	const [resolutions, setResolutions] = useState<Record<string, ProposalResolution>>({});
	const seenProposalKeysRef = useRef(new Set<string>());
	const requestContextRef = useRef({
		provider,
		model,
		apiKey,
		baseURL,
		resumeData: resume.data,
		resumeUpdatedAt: resume.updatedAt,
	});

	requestContextRef.current = {
		provider,
		model,
		apiKey,
		baseURL,
		resumeData: resume.data,
		resumeUpdatedAt: resume.updatedAt,
	};

	const transport = useMemo(
		() => ({
			async sendMessages(options: { messages: UIMessage[]; abortSignal?: AbortSignal }) {
				const requestContext = requestContextRef.current;

				return eventIteratorToUnproxiedDataStream(
					await streamClient.ai.chat(
						{
							provider: requestContext.provider,
							model: requestContext.model,
							apiKey: requestContext.apiKey,
							baseURL: requestContext.baseURL,
							messages: options.messages,
							resumeData: requestContext.resumeData,
							resumeUpdatedAt: requestContext.resumeUpdatedAt,
						},
						{ signal: options.abortSignal },
					),
				);
			},
			reconnectToStream() {
				throw new Error("AI assistant stream reconnection is not supported.");
			},
		}),
		[],
	);

	const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({ transport });
	const patchMutation = useMutation(orpc.resume.patch.mutationOptions({ meta: { noInvalidate: true } }));
	const hasChatError = status === "error" || Boolean(error);
	const isStreaming = !hasChatError && (status === "submitted" || status === "streaming");
	const isApplying = patchMutation.isPending;
	const activeProposal = queue[activeIndex];
	const activeProposalSourceVisible = activeProposal
		? messages.some((message) => message.id === activeProposal.sourceMessageId)
		: false;

	const resolveProposal = useCallback((item: QueuedProposal, status: ProposalResolution["status"]) => {
		setResolutions((current) => ({
			...current,
			[item.key]: {
				key: item.key,
				sourceMessageId: item.sourceMessageId,
				title: item.preview.title,
				status,
			},
		}));
	}, []);

	useEffect(() => {
		if (activeIndex < queue.length) return;
		setActiveIndex(Math.max(0, queue.length - 1));
	}, [activeIndex, queue.length]);

	useEffect(() => {
		if (!error || (status !== "submitted" && status !== "streaming")) return;
		stop();
	}, [error, status, stop]);

	useEffect(() => {
		const incoming: QueuedProposal[] = [];

		for (const message of messages) {
			for (const part of message.parts ?? []) {
				if (part.type !== "tool-propose_resume_patches" || part.state !== "output-available") continue;

				const parsed = resumePatchProposalToolOutputSchema.safeParse(part.output);
				if (!parsed.success) continue;

				for (const proposal of parsed.data.proposals) {
					const key = `${part.toolCallId}:${proposal.id}`;
					if (seenProposalKeysRef.current.has(key)) continue;

					try {
						incoming.push({
							key,
							sourceMessageId: message.id,
							toolCallId: part.toolCallId,
							proposal,
							preview: buildResumePatchProposalPreview(resume.data, proposal),
						});
						seenProposalKeysRef.current.add(key);
					} catch {
						toast.error(t`The AI returned a proposal that could not be previewed.`);
					}
				}
			}
		}

		if (incoming.length === 0) return;

		setQueue((current) => [...current, ...incoming]);
		setActiveIndex((index) => (queue.length === 0 ? 0 : index));
	}, [messages, queue.length, resume.data]);

	const removeActiveProposal = useCallback(() => {
		setQueue((current) => {
			const next = current.filter((_, index) => index !== activeIndex);
			setActiveIndex((index) => Math.min(index, Math.max(0, next.length - 1)));
			return next;
		});
	}, [activeIndex]);

	const handleAcceptCurrent = async () => {
		if (!activeProposal) return;

		try {
			const updated = (await patchMutation.mutateAsync({
				id: resume.id,
				operations: activeProposal.proposal.operations,
				expectedUpdatedAt: activeProposal.proposal.baseUpdatedAt
					? new Date(activeProposal.proposal.baseUpdatedAt)
					: resume.updatedAt,
			})) as Resume;

			requestContextRef.current = {
				...requestContextRef.current,
				resumeData: updated.data,
				resumeUpdatedAt: updated.updatedAt,
			};
			replaceResumeFromServer(updated);
			toast.success(t`AI proposal applied.`);
			resolveProposal(activeProposal, "accepted");

			setQueue((current) => {
				const next = current
					.filter((_, index) => index !== activeIndex)
					.map((item) => refreshQueuedProposal(item, updated));
				setActiveIndex((index) => Math.min(index, Math.max(0, next.length - 1)));
				return next;
			});
		} catch (error) {
			toast.error(getPatchErrorMessage(error));
		}
	};

	const handleRejectCurrent = () => {
		if (!activeProposal) return;

		resolveProposal(activeProposal, "rejected");
		removeActiveProposal();
		toast.message(t`AI proposal rejected.`);
	};

	const handleAcceptAll = async () => {
		if (queue.length === 0) return;

		try {
			const operations = queue.flatMap((item) => item.proposal.operations);
			const updated = (await patchMutation.mutateAsync({
				id: resume.id,
				operations,
				expectedUpdatedAt: queue[0]?.proposal.baseUpdatedAt
					? new Date(queue[0].proposal.baseUpdatedAt)
					: resume.updatedAt,
			})) as Resume;

			requestContextRef.current = {
				...requestContextRef.current,
				resumeData: updated.data,
				resumeUpdatedAt: updated.updatedAt,
			};
			replaceResumeFromServer(updated);
			setResolutions((current) => ({
				...current,
				...Object.fromEntries(
					queue.map((item) => [
						item.key,
						{
							key: item.key,
							sourceMessageId: item.sourceMessageId,
							title: item.preview.title,
							status: "accepted" as const,
						},
					]),
				),
			}));
			setQueue([]);
			setActiveIndex(0);
			toast.success(t`AI proposals applied.`);
		} catch (error) {
			toast.error(getPatchErrorMessage(error));
		}
	};

	const handleRejectAll = () => {
		setResolutions((current) => ({
			...current,
			...Object.fromEntries(
				queue.map((item) => [
					item.key,
					{
						key: item.key,
						sourceMessageId: item.sourceMessageId,
						title: item.preview.title,
						status: "rejected" as const,
					},
				]),
			),
		}));
		setQueue([]);
		setActiveIndex(0);
		toast.message(t`AI proposals rejected.`);
	};

	const resetChat = () => {
		stop();
		clearError();
		setMessages([]);
		setQueue([]);
		setActiveIndex(0);
		setResolutions({});
		setInput("");
		seenProposalKeysRef.current.clear();
	};

	const submitMessage = () => {
		const text = input.trim();
		if (!text || !aiEnabled || isStreaming) return;

		clearError();
		sendMessage({ text });
		setInput("");
	};

	return (
		<div className="flex size-full flex-col bg-popover">
			<header className="flex h-13 shrink-0 select-none items-center gap-3 border-b px-3">
				<div
					className={cn(
						"flex min-w-0 flex-1 items-center gap-3 self-stretch py-2",
						onDragHeaderPointerDown && "cursor-grab active:cursor-grabbing",
					)}
					onPointerDown={onDragHeaderPointerDown}
				>
					<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
						<ChatCircleDotsIcon className="size-4" weight="fill" />
					</div>

					<div className="min-w-0 flex-1">
						<div className="font-semibold text-sm leading-tight">
							<Trans>AI Resume Assistant</Trans>
						</div>
						<div className="truncate text-muted-foreground text-xs">
							{aiEnabled ? `${provider} · ${model}` : t`AI integration disabled`}
						</div>
					</div>
				</div>

				<Button size="icon-sm" variant="ghost" title={t`Reset chat`} aria-label={t`Reset chat`} onClick={resetChat}>
					<ArrowClockwiseIcon />
				</Button>
				<Button size="icon-sm" variant="ghost" title={t`Close`} onClick={onClose}>
					<XIcon />
				</Button>
			</header>

			{!aiEnabled ? (
				<DisabledAssistantState />
			) : (
				<>
					<div className="min-h-0 flex-1">
						<ScrollArea className="h-full">
							<div className="space-y-3 p-3">
								{messages.length === 0 && !activeProposal ? <EmptyProposalState /> : null}

								<div className="space-y-2">
									{messages.map((message) => {
										const proposalForMessage =
											activeProposal?.sourceMessageId === message.id ? activeProposal : undefined;
										const resolutionsForMessage = Object.values(resolutions).filter(
											(resolution) => resolution.sourceMessageId === message.id,
										);

										return (
											<AssistantTimelineItem
												key={message.id}
												message={message}
												proposal={proposalForMessage}
												resolutions={resolutionsForMessage}
												proposalIndex={activeIndex}
												proposalTotal={queue.length}
												isApplying={isApplying}
												onAcceptProposal={handleAcceptCurrent}
												onRejectProposal={handleRejectCurrent}
												onAcceptAllProposals={handleAcceptAll}
												onRejectAllProposals={handleRejectAll}
												onPreviousProposal={() => setActiveIndex((index) => Math.max(0, index - 1))}
												onNextProposal={() => setActiveIndex((index) => Math.min(queue.length - 1, index + 1))}
											/>
										);
									})}

									{activeProposal && !activeProposalSourceVisible ? (
										<ProposalApprovalCard
											item={activeProposal}
											index={activeIndex}
											total={queue.length}
											isApplying={isApplying}
											onAccept={handleAcceptCurrent}
											onReject={handleRejectCurrent}
											onAcceptAll={handleAcceptAll}
											onRejectAll={handleRejectAll}
											onPrevious={() => setActiveIndex((index) => Math.max(0, index - 1))}
											onNext={() => setActiveIndex((index) => Math.min(queue.length - 1, index + 1))}
										/>
									) : null}

									{isStreaming ? <AssistantThinkingBubble status={status} /> : null}
									{hasChatError ? <AssistantErrorBubble error={error} /> : null}
								</div>
							</div>
						</ScrollArea>
					</div>

					<form
						className="border-t p-3"
						onSubmit={(event) => {
							event.preventDefault();
							submitMessage();
						}}
					>
						<div className="flex items-end gap-2">
							<Textarea
								value={input}
								onChange={(event) => setInput(event.target.value)}
								placeholder={t`Ask for a targeted resume change...`}
								className="max-h-28 min-h-12 resize-none"
								disabled={isStreaming}
								onKeyDown={(event) => {
									if (event.key !== "Enter" || event.shiftKey) return;
									event.preventDefault();
									submitMessage();
								}}
							/>
							<Button size="icon" type="submit" disabled={!input.trim() || isStreaming}>
								{isStreaming ? <MagicWandIcon className="animate-pulse" /> : <PaperPlaneRightIcon />}
								<span className="sr-only">
									<Trans>Send</Trans>
								</span>
							</Button>
							{isStreaming ? (
								<Button size="icon" variant="outline" onClick={stop}>
									<XIcon />
									<span className="sr-only">
										<Trans>Stop</Trans>
									</span>
								</Button>
							) : null}
						</div>
					</form>
				</>
			)}

			{!isMobile && onResizePointerDown ? (
				<button
					type="button"
					onPointerDown={onResizePointerDown}
					aria-label={t`Resize AI assistant`}
					className="absolute right-0 bottom-0 cursor-nwse-resize"
				>
					<NotchesIcon className="size-3" />
				</button>
			) : null}
		</div>
	);
}

function DisabledAssistantState() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
			<div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
				<SparkleIcon className="size-6" />
			</div>
			<div className="space-y-1">
				<div className="font-semibold text-base">
					<Trans>Enable AI integration</Trans>
				</div>
				<p className="max-w-[32ch] text-muted-foreground text-sm">
					<Trans>Connect and verify an AI provider before using resume editing proposals.</Trans>
				</p>
			</div>
			<Button nativeButton={false} render={<Link to="/dashboard/settings/integrations" />}>
				<Trans>Open Integrations</Trans>
			</Button>
		</div>
	);
}

function EmptyProposalState() {
	return (
		<div className="rounded-lg border border-dashed bg-muted/20 p-4">
			<div className="mb-2 flex items-center gap-2 font-medium text-sm">
				<SparkleIcon className="size-4 text-primary" />
				<Trans>Ask for an incremental change</Trans>
			</div>
			<p className="text-muted-foreground text-xs leading-relaxed">
				<Trans>
					Examples: rewrite the summary, tighten one experience bullet, add metrics, or adapt the resume for a job
					description.
				</Trans>
			</p>
		</div>
	);
}

type ProposalApprovalCardProps = {
	item: QueuedProposal;
	index: number;
	total: number;
	isApplying: boolean;
	onAccept: () => void;
	onReject: () => void;
	onAcceptAll: () => void;
	onRejectAll: () => void;
	onPrevious: () => void;
	onNext: () => void;
};

function ProposalApprovalCard({
	item,
	index,
	total,
	isApplying,
	onAccept,
	onReject,
	onAcceptAll,
	onRejectAll,
	onPrevious,
	onNext,
}: ProposalApprovalCardProps) {
	return (
		<section className="rounded-lg border bg-background shadow-sm ring-1 ring-primary/10">
			<div className="space-y-2 border-b bg-muted/20 p-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 gap-2.5">
						<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
							<MagicWandIcon className="size-4" />
						</div>
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-1.5">
								<code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
									propose_resume_patches
								</code>
								{total > 1 ? (
									<span className="text-muted-foreground text-xs">
										<Trans>
											Proposal {index + 1} of {total}
										</Trans>
									</span>
								) : null}
							</div>
							<h3 className="mt-1 font-semibold text-sm leading-snug">{item.preview.title}</h3>
							{item.preview.summary ? (
								<p className="mt-1 text-muted-foreground text-xs leading-relaxed">{item.preview.summary}</p>
							) : null}
						</div>
					</div>
					<Badge variant={item.stalePreview ? "destructive" : "secondary"}>
						{item.stalePreview ? <Trans>Needs review</Trans> : <Trans>Review required</Trans>}
					</Badge>
				</div>

				<div className="flex flex-wrap gap-1.5">
					{item.preview.entries.map((entry, entryIndex) => (
						<Badge key={`${entry.path}-${entryIndex}`} variant="outline">
							{entry.operationLabel}
						</Badge>
					))}
				</div>
			</div>

			<div className="max-h-[310px] space-y-3 overflow-y-auto p-3">
				{item.preview.entries.map((entry, entryIndex) => (
					<div key={`${entry.path}-${entryIndex}`} className="space-y-2 rounded-md border bg-muted/20 p-2.5">
						<div className="flex items-center justify-between gap-2">
							<div className="font-medium text-xs">{entry.label}</div>
							<code className="max-w-[55%] truncate rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
								{entry.path}
							</code>
						</div>
						<div className="grid gap-2 sm:grid-cols-2">
							<div>
								<div className="mb-1 text-[11px] text-muted-foreground uppercase tracking-normal">
									<Trans>Before</Trans>
								</div>
								<pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-background p-2 text-xs leading-relaxed">
									{formatPreviewValue(entry.before)}
								</pre>
							</div>
							<div>
								<div className="mb-1 text-[11px] text-muted-foreground uppercase tracking-normal">
									<Trans>After</Trans>
								</div>
								<pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-background p-2 text-xs leading-relaxed">
									{formatPreviewValue(entry.after)}
								</pre>
							</div>
						</div>
					</div>
				))}

				<details className="rounded-md border bg-muted/20 p-2">
					<summary className="cursor-pointer font-medium text-xs">
						<Trans>Raw JSON Patch</Trans>
					</summary>
					<pre className="mt-2 max-h-44 overflow-auto rounded bg-background p-2 text-[11px]">
						{JSON.stringify(item.proposal.operations, null, 2)}
					</pre>
				</details>
			</div>

			<div className={cn("flex items-center gap-2 border-t p-3", total > 1 ? "justify-between" : "justify-end")}>
				{total > 1 ? (
					<div className="flex gap-1">
						<Button size="xs" variant="outline" disabled={index === 0 || isApplying} onClick={onPrevious}>
							<Trans>Prev</Trans>
						</Button>
						<Button size="xs" variant="outline" disabled={index >= total - 1 || isApplying} onClick={onNext}>
							<Trans>Next</Trans>
						</Button>
					</div>
				) : null}

				<div className="flex gap-2">
					<SplitDecisionButton
						variant="outline"
						disabled={isApplying}
						label={<Trans>Reject</Trans>}
						icon={<XIcon />}
						menuLabel={<Trans>Reject all</Trans>}
						onClick={onReject}
						onMenuClick={onRejectAll}
					/>
					<SplitDecisionButton
						disabled={isApplying}
						label={<Trans>Accept</Trans>}
						icon={<CheckIcon />}
						menuLabel={<Trans>Accept all</Trans>}
						onClick={onAccept}
						onMenuClick={onAcceptAll}
					/>
				</div>
			</div>
		</section>
	);
}

type SplitDecisionButtonProps = {
	label: React.ReactNode;
	menuLabel: React.ReactNode;
	icon: React.ReactNode;
	disabled?: boolean;
	variant?: React.ComponentProps<typeof Button>["variant"];
	onClick: () => void;
	onMenuClick: () => void;
};

function SplitDecisionButton({
	label,
	menuLabel,
	icon,
	disabled,
	variant = "default",
	onClick,
	onMenuClick,
}: SplitDecisionButtonProps) {
	return (
		<ButtonGroup>
			<Button size="sm" variant={variant} disabled={disabled} onClick={onClick}>
				{icon}
				{label}
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button size="icon-sm" variant={variant} disabled={disabled} aria-label={t`More proposal actions`}>
							<CaretDownIcon />
						</Button>
					}
				/>
				<DropdownMenuContent align="end" side="top" sideOffset={8} positionerClassName="z-[80]" className="min-w-32">
					<DropdownMenuItem onClick={onMenuClick}>{menuLabel}</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</ButtonGroup>
	);
}

function AssistantThinkingBubble({ status }: { status: string }) {
	return (
		<div className="flex justify-start">
			<div
				className="flex max-w-[86%] items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground text-sm"
				role="status"
				aria-live="polite"
			>
				<span>{status === "submitted" ? <Trans>Sending request</Trans> : <Trans>Preparing changes</Trans>}</span>
				<span className="inline-flex items-center gap-1" aria-hidden="true">
					<span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
					<span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
					<span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
				</span>
			</div>
		</div>
	);
}

function AssistantErrorBubble({ error }: { error?: Error }) {
	return (
		<div className="flex justify-start">
			<div
				className="max-w-[86%] rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive text-sm"
				role="alert"
			>
				<div className="flex items-center gap-2 font-medium">
					<WarningCircleIcon className="size-4" />
					<Trans>Assistant request failed</Trans>
				</div>
				<p className="mt-1 text-destructive/80 text-xs leading-relaxed">
					{error?.message?.trim() || <Trans>The assistant stopped before returning a proposal.</Trans>}
				</p>
			</div>
		</div>
	);
}

type AssistantTimelineItemProps = {
	message: UIMessage;
	proposal?: QueuedProposal;
	resolutions: ProposalResolution[];
	proposalIndex: number;
	proposalTotal: number;
	isApplying: boolean;
	onAcceptProposal: () => void;
	onRejectProposal: () => void;
	onAcceptAllProposals: () => void;
	onRejectAllProposals: () => void;
	onPreviousProposal: () => void;
	onNextProposal: () => void;
};

function AssistantTimelineItem({
	message,
	proposal,
	resolutions,
	proposalIndex,
	proposalTotal,
	isApplying,
	onAcceptProposal,
	onRejectProposal,
	onAcceptAllProposals,
	onRejectAllProposals,
	onPreviousProposal,
	onNextProposal,
}: AssistantTimelineItemProps) {
	const hasVisibleText = message.parts.some((part) => part.type === "text" && part.text.trim());

	if (!hasVisibleText && !proposal && resolutions.length === 0) return null;

	return (
		<div className="space-y-2">
			{hasVisibleText ? <AssistantMessage message={message} /> : null}

			{proposal ? (
				<ProposalApprovalCard
					item={proposal}
					index={proposalIndex}
					total={proposalTotal}
					isApplying={isApplying}
					onAccept={onAcceptProposal}
					onReject={onRejectProposal}
					onAcceptAll={onAcceptAllProposals}
					onRejectAll={onRejectAllProposals}
					onPrevious={onPreviousProposal}
					onNext={onNextProposal}
				/>
			) : resolutions.length > 0 ? (
				<ProposalResolutionBubble resolutions={resolutions} />
			) : null}
		</div>
	);
}

function ProposalResolutionBubble({ resolutions }: { resolutions: ProposalResolution[] }) {
	const acceptedCount = resolutions.filter((resolution) => resolution.status === "accepted").length;
	const rejectedCount = resolutions.length - acceptedCount;
	const label =
		acceptedCount > 0 && rejectedCount > 0
			? t`Reviewed proposals`
			: acceptedCount > 0
				? t`Accepted proposal`
				: t`Rejected proposal`;

	return (
		<div className="flex justify-start">
			<div className="flex max-w-[86%] items-start gap-2 rounded-lg border bg-muted/35 px-3 py-2 text-sm">
				<div
					className={cn(
						"mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
						acceptedCount > 0 && rejectedCount === 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
					)}
				>
					{acceptedCount > 0 && rejectedCount === 0 ? (
						<CheckIcon className="size-3.5" />
					) : (
						<XIcon className="size-3.5" />
					)}
				</div>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-1.5">
						<code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
							propose_resume_patches
						</code>
						<span className="font-medium">{label}</span>
					</div>
					<div className="truncate text-muted-foreground text-xs">
						{resolutions.length === 1 ? resolutions[0]?.title : t`${resolutions.length} proposals reviewed`}
					</div>
				</div>
			</div>
		</div>
	);
}

function AssistantMessage({ message }: { message: UIMessage }) {
	const isUser = message.role === "user";
	const textParts = message.parts.filter((part) => part.type === "text");

	if (textParts.length === 0) return null;

	return (
		<div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[86%] space-y-2 rounded-lg px-3 py-2 text-sm",
					isUser
						? "bg-primary text-primary-foreground selection:bg-background/80 selection:text-foreground"
						: "bg-muted text-foreground",
				)}
			>
				{textParts.map((part, index) => (
					<p key={index} className="whitespace-pre-wrap leading-relaxed">
						{part.text}
					</p>
				))}
			</div>
		</div>
	);
}
