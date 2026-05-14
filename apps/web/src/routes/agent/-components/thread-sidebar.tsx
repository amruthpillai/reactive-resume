import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
	ArchiveIcon,
	ArrowLeftIcon,
	ChatCircleDotsIcon,
	DotsThreeVerticalIcon,
	PlusIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { ScrollArea } from "@reactive-resume/ui/components/scroll-area";
import { cn } from "@reactive-resume/utils/style";
import { useConfirm } from "@/hooks/use-confirm";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

type AgentThreadSummary = RouterOutput["agent"]["threads"]["list"][number];

function formatRelativeTime(value: Date | string, locale: string) {
	const date = value instanceof Date ? value : new Date(value);
	const diffMs = date.getTime() - Date.now();
	const absMs = Math.abs(diffMs);
	const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
		{ amount: 31_536_000_000, unit: "year" },
		{ amount: 2_592_000_000, unit: "month" },
		{ amount: 604_800_000, unit: "week" },
		{ amount: 86_400_000, unit: "day" },
		{ amount: 3_600_000, unit: "hour" },
		{ amount: 60_000, unit: "minute" },
	];

	if (absMs < 60_000) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");

	const division = divisions.find((candidate) => absMs >= candidate.amount);
	if (!division) return "";

	return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
		Math.round(diffMs / division.amount),
		division.unit,
	);
}

function ThreadActions({ thread, activeThreadId }: { thread: AgentThreadSummary; activeThreadId: string | null }) {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const queryClient = useQueryClient();
	const archiveMutation = useMutation(orpc.agent.threads.archive.mutationOptions());
	const deleteMutation = useMutation(orpc.agent.threads.delete.mutationOptions());
	const isArchived = thread.status === "archived";

	const handleArchive = () => {
		archiveMutation.mutate(
			{ id: thread.id },
			{
				onSuccess: async () => {
					await queryClient.invalidateQueries({ queryKey: orpc.agent.threads.list.queryKey() });
					if (activeThreadId === thread.id) {
						await queryClient.invalidateQueries({
							queryKey: orpc.agent.threads.get.queryKey({ input: { id: thread.id } }),
						});
					}
				},
				onError: (error) => toast.error(getOrpcErrorMessage(error, { fallback: t`Failed to archive thread.` })),
			},
		);
	};

	const handleDelete = async () => {
		const confirmed = await confirm(t`Delete this agent thread?`, {
			description: t`This action cannot be undone. Messages and thread attachments will be removed.`,
		});

		if (!confirmed) return;

		deleteMutation.mutate(
			{ id: thread.id },
			{
				onSuccess: async () => {
					await queryClient.invalidateQueries({ queryKey: orpc.agent.threads.list.queryKey() });
					if (activeThreadId === thread.id) void navigate({ to: "/agent" });
				},
				onError: (error) => toast.error(getOrpcErrorMessage(error, { fallback: t`Failed to delete thread.` })),
			},
		);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						size="icon-sm"
						variant="ghost"
						className="absolute end-1.5 top-2 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover/thread:opacity-100 aria-expanded:opacity-100"
					>
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
				<DropdownMenuItem variant="destructive" disabled={deleteMutation.isPending} onClick={() => void handleDelete()}>
					<TrashIcon />
					<Trans>Delete</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ThreadRow({ thread, activeThreadId }: { thread: AgentThreadSummary; activeThreadId: string | null }) {
	const { i18n } = useLingui();
	const isActive = thread.id === activeThreadId;
	const isArchived = thread.status === "archived";
	const title = thread.title === thread.resumeName ? t`New thread` : thread.title;

	return (
		<div
			className={cn(
				"group/thread relative rounded-md transition-colors hover:bg-accent",
				isActive && "bg-accent",
				isArchived && "opacity-60",
			)}
		>
			<Link
				to="/agent/$threadId"
				params={{ threadId: thread.id }}
				className="block min-w-0 rounded-md px-3 py-2 pe-10 text-sm outline-hidden ring-ring focus-visible:ring-2"
			>
				<div className="truncate font-medium">{title}</div>
				<div className="truncate text-muted-foreground text-xs">
					{formatRelativeTime(thread.lastMessageAt, i18n.locale)}
				</div>
			</Link>
			<ThreadActions thread={thread} activeThreadId={activeThreadId} />
		</div>
	);
}

export function AgentThreadSidebar({
	activeThreadId = null,
	className,
}: {
	activeThreadId?: string | null;
	className?: string;
}) {
	const { data: threads, isLoading } = useQuery(orpc.agent.threads.list.queryOptions());

	return (
		<aside className={cn("flex h-full min-h-0 flex-col border-e bg-muted/30", className)}>
			<div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3">
				<div className="flex min-w-0 items-center gap-2">
					<ChatCircleDotsIcon className="shrink-0" />
					<div className="min-w-0 truncate font-semibold">
						<Trans>Threads</Trans>
					</div>
				</div>
				<Button size="icon-sm" variant="ghost" nativeButton={false} render={<Link to="/dashboard/resumes" />}>
					<ArrowLeftIcon />
					<span className="sr-only">
						<Trans>Back to resumes</Trans>
					</span>
				</Button>
			</div>

			<ScrollArea className="min-h-0 flex-1">
				<div className="space-y-1 p-2">
					<Button
						variant="ghost"
						className="mb-2 w-full justify-start border border-dashed bg-background/40 text-muted-foreground hover:text-foreground"
						nativeButton={false}
						render={<Link to="/agent/new" />}
					>
						<PlusIcon />
						<Trans>New thread</Trans>
					</Button>

					{isLoading ? (
						<div className="px-3 py-2 text-muted-foreground text-sm">
							<Trans>Loading threads...</Trans>
						</div>
					) : null}

					{threads?.length === 0 ? (
						<div className="rounded-md border border-dashed p-3 text-muted-foreground text-sm">
							<Trans>No threads yet.</Trans>
						</div>
					) : null}

					{threads?.map((thread) => (
						<ThreadRow key={thread.id} thread={thread} activeThreadId={activeThreadId} />
					))}
				</div>
			</ScrollArea>
		</aside>
	);
}
