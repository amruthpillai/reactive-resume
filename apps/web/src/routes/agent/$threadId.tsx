import type * as React from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	ArrowSquareOutIcon,
	ChatCircleDotsIcon,
	CircleNotchIcon,
	FilePdfIcon,
	MinusIcon,
	PlusIcon,
	SidebarSimpleIcon,
	SquaresFourIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import { ResizableGroup, ResizablePanel, ResizableSeparator } from "@reactive-resume/ui/components/resizable";
import { Tabs, TabsList, TabsTrigger } from "@reactive-resume/ui/components/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";
import { downloadWithAnchor, generateFilename } from "@reactive-resume/utils/file";
import { cn } from "@reactive-resume/utils/style";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { ResumePreview } from "@/features/resume/preview/preview";
import { orpc } from "@/libs/orpc/client";
import { AgentChat } from "./-components/agent-chat";
import { AgentThreadSidebar } from "./-components/thread-sidebar";
import { useAgentResumeUpdateSubscription } from "./-hooks/use-agent-resume-updates";

type AgentThreadDetail = RouterOutput["agent"]["threads"]["get"];

type ToolbarButtonProps = React.ComponentProps<typeof Button> & {
	label: string;
};

type ResumePaneProps = {
	resume: AgentThreadDetail["resume"];
};

export const Route = createFileRoute("/agent/$threadId")({
	component: RouteComponent,
});

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
