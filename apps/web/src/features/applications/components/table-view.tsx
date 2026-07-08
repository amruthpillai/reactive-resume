import type { ApplicationStatus, ApplicationTimelineEntry } from "@reactive-resume/schema/applications/data";
import type { Application } from "../types";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArchiveIcon, ArrowRightIcon, TagIcon, TrashIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { STAGES } from "@reactive-resume/schema/applications/data";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { Checkbox } from "@reactive-resume/ui/components/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { Input } from "@reactive-resume/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@reactive-resume/ui/components/popover";
import { getInitials } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import { orpc } from "@/libs/orpc/client";
import { applicationsListQueryKey } from "../queries";
import { tileColor } from "../tile-color";
import { ApplicationActionsMenu } from "./application-actions-menu";

const PAGE_SIZE = 25;
const stageOf = (status: string) => STAGES.find((s) => s.value === status);
const byNewest = (a: ApplicationTimelineEntry, b: ApplicationTimelineEntry) =>
	new Date(b.at).getTime() - new Date(a.at).getTime();
const latestStageDate = (activity: ApplicationTimelineEntry[], status: ApplicationStatus) =>
	[...activity].sort(byNewest).find((entry) => entry.type === "stage" && entry.stage === status)?.at;
const formatDate = (value: Date | string) =>
	new Date(value).toLocaleDateString(undefined, { month: "numeric", day: "numeric", timeZone: "UTC", year: "numeric" });

type Props = {
	applications: Application[];
	onOpen: (application: Application) => void;
	onEdit: (application: Application) => void;
};

export function ApplicationTable({ applications, onOpen, onEdit }: Props) {
	const queryClient = useQueryClient();
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [page, setPage] = useState(0);

	// Drop selected rows that are no longer in the current (filtered) set, so the bulk-action bar
	// never reports a count for rows the user can't see.
	useEffect(() => {
		setSelected((prev) => {
			if (prev.size === 0) return prev;
			const visible = new Set(applications.map((app) => app.id));
			const next = new Set([...prev].filter((id) => visible.has(id)));
			return next.size === prev.size ? prev : next;
		});
	}, [applications]);

	const invalidate = () => {
		void queryClient.invalidateQueries({ queryKey: applicationsListQueryKey() });
		void queryClient.invalidateQueries({ queryKey: orpc.applications.tags.queryKey() });
		void queryClient.invalidateQueries({ queryKey: orpc.applications.stats.queryKey() });
	};

	const clearSelection = () => setSelected(new Set());

	const bulkUpdate = useMutation(
		orpc.applications.bulkUpdate.mutationOptions({
			onSuccess: () => {
				invalidate();
				clearSelection();
			},
			onError: () => toast.error(t`Bulk update failed. Please try again.`),
		}),
	);

	const bulkDelete = useMutation(
		orpc.applications.bulkDelete.mutationOptions({
			onSuccess: (result) => {
				invalidate();
				clearSelection();
				toast.success(t`Deleted ${result.deleted} application(s).`);
			},
			onError: () => toast.error(t`Bulk delete failed. Please try again.`),
		}),
	);

	const pageCount = Math.max(1, Math.ceil(applications.length / PAGE_SIZE));
	const safePage = Math.min(page, pageCount - 1);
	const rows = useMemo(
		() => applications.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
		[applications, safePage],
	);

	const pageIds = rows.map((row) => row.id);
	const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
	const someChecked = pageIds.some((id) => selected.has(id));

	const toggleAll = () => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (allChecked) for (const id of pageIds) next.delete(id);
			else for (const id of pageIds) next.add(id);
			return next;
		});
	};

	const toggleOne = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const ids = [...selected];

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			{selected.size > 0 && (
				<div className="flex flex-wrap items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-background">
					<span className="font-semibold text-sm">
						{selected.size} <Trans>selected</Trans>
					</span>
					<span className="mx-1 h-4 w-px bg-background/25" />

					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button size="sm" variant="secondary" className="h-7">
									<ArrowRightIcon />
									<Trans>Move stage</Trans>
								</Button>
							}
						/>
						<DropdownMenuContent align="start">
							{STAGES.map((stage) => (
								<DropdownMenuItem key={stage.value} onClick={() => bulkUpdate.mutate({ ids, status: stage.value })}>
									<span className="size-2 rounded-sm" style={{ background: stage.color }} />
									{stage.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<AddTagPopover onAdd={(tag) => bulkUpdate.mutate({ ids, addTags: [tag] })} />

					<Button
						size="sm"
						variant="secondary"
						className="h-7"
						onClick={() => bulkUpdate.mutate({ ids, archived: true })}
					>
						<ArchiveIcon />
						<Trans>Archive</Trans>
					</Button>
					<Button
						size="sm"
						variant="secondary"
						className="h-7 text-destructive"
						onClick={() => bulkDelete.mutate({ ids })}
					>
						<TrashIcon />
						<Trans>Delete</Trans>
					</Button>

					<Button
						size="sm"
						variant="ghost"
						className="ms-auto h-7 text-background hover:bg-background/15"
						onClick={clearSelection}
					>
						<Trans>Clear</Trans>
					</Button>
				</div>
			)}

			{/* Desktop: full table. Mobile: a stacked card list (below) instead of a 900px h-scroll. */}
			<div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border max-sm:hidden">
				<table className="w-full min-w-[900px] border-collapse text-sm">
					<thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur">
						<tr className="[&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium [&>th]:text-muted-foreground [&>th]:text-xs [&>th]:uppercase [&>th]:tracking-wide">
							<th className="w-10">
								<Checkbox
									checked={allChecked}
									indeterminate={someChecked && !allChecked}
									onCheckedChange={toggleAll}
									aria-label={t`Select all`}
								/>
							</th>
							<th>
								<Trans>Company / Role</Trans>
							</th>
							<th>
								<Trans>Stage</Trans>
							</th>
							<th>
								<Trans>Location</Trans>
							</th>
							<th>
								<Trans>Salary</Trans>
							</th>
							<th>
								<Trans>Tags</Trans>
							</th>
							<th>
								<Trans>Source</Trans>
							</th>
							<th>
								<Trans>Applied</Trans>
							</th>
							<th className="w-10">
								<span className="sr-only">
									<Trans>Actions</Trans>
								</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((app) => {
							const stage = stageOf(app.status);
							return (
								<tr
									key={app.id}
									className={cn(
										"border-border border-t transition-colors hover:bg-muted/40",
										selected.has(app.id) && "bg-primary/5",
									)}
								>
									<td className="px-3 py-2">
										<Checkbox
											checked={selected.has(app.id)}
											onCheckedChange={() => toggleOne(app.id)}
											aria-label={t`Select ${app.company}`}
										/>
									</td>
									<td className="px-3 py-2">
										<button type="button" className="flex items-center gap-2.5 text-left" onClick={() => onOpen(app)}>
											<span
												className={cn(
													"flex size-7 shrink-0 items-center justify-center rounded-md font-bold text-[10px] text-white",
													tileColor(app.company),
												)}
											>
												{getInitials(app.company)}
											</span>
											<div className="min-w-0">
												<div className="truncate font-medium hover:underline">{app.role}</div>
												<div className="truncate text-muted-foreground text-xs">{app.company}</div>
											</div>
										</button>
									</td>
									<td className="whitespace-nowrap px-3 py-2">
										<span className="inline-flex items-center gap-1.5">
											<span className="size-2 rounded-sm" style={{ background: stage?.color }} />
											{stage?.label ?? app.status}
										</span>
									</td>
									<td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{app.location || "—"}</td>
									<td className="whitespace-nowrap px-3 py-2 font-medium">{app.salary || "—"}</td>
									<td className="px-3 py-2">
										<div className="flex max-w-40 flex-wrap gap-1">
											{app.tags.slice(0, 2).map((tag) => (
												<Badge key={tag} variant="secondary" className="text-[10px]">
													{tag}
												</Badge>
											))}
											{app.tags.length > 2 && (
												<span className="text-muted-foreground text-xs">+{app.tags.length - 2}</span>
											)}
										</div>
									</td>
									<td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{app.source || "—"}</td>
									<td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
										{formatDate(latestStageDate(app.activity, "applied") ?? app.appliedAt)}
									</td>
									<td className="px-1 py-2">
										<ApplicationActionsMenu application={app} onEdit={onEdit} />
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Mobile: stacked cards (same paginated rows), tap to open. */}
			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto sm:hidden">
				{rows.map((app) => {
					const stage = stageOf(app.status);
					return (
						<div
							key={app.id}
							className={cn(
								"flex items-center gap-3 rounded-xl border border-border p-3",
								selected.has(app.id) && "bg-primary/5",
							)}
						>
							<Checkbox
								checked={selected.has(app.id)}
								onCheckedChange={() => toggleOne(app.id)}
								aria-label={t`Select ${app.company}`}
							/>
							<button
								type="button"
								className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
								onClick={() => onOpen(app)}
							>
								<span
									className={cn(
										"flex size-8 shrink-0 items-center justify-center rounded-md font-bold text-[10px] text-white",
										tileColor(app.company),
									)}
								>
									{getInitials(app.company)}
								</span>
								<div className="min-w-0 flex-1">
									<div className="truncate font-medium text-sm">{app.role}</div>
									<div className="truncate text-muted-foreground text-xs">{app.company}</div>
									<div className="mt-1 flex items-center gap-1.5 text-xs">
										<span className="size-2 shrink-0 rounded-sm" style={{ background: stage?.color }} />
										<span className="text-muted-foreground">{stage?.label ?? app.status}</span>
										{app.salary && <span className="truncate font-medium">· {app.salary}</span>}
									</div>
								</div>
							</button>
							<ApplicationActionsMenu application={app} onEdit={onEdit} />
						</div>
					);
				})}
			</div>

			<div className="flex items-center gap-3 text-muted-foreground text-sm">
				<span>
					<Trans>
						Showing {rows.length} of {applications.length}
					</Trans>
				</span>
				{pageCount > 1 && (
					<div className="ms-auto flex items-center gap-1.5">
						<Button size="sm" variant="outline" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
							‹
						</Button>
						<span className="text-xs">
							{safePage + 1} / {pageCount}
						</span>
						<Button
							size="sm"
							variant="outline"
							disabled={safePage >= pageCount - 1}
							onClick={() => setPage(safePage + 1)}
						>
							›
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

function AddTagPopover({ onAdd }: { onAdd: (tag: string) => void }) {
	const [value, setValue] = useState("");
	const [open, setOpen] = useState(false);

	const submit = () => {
		const tag = value.trim();
		if (!tag) return;
		onAdd(tag);
		setValue("");
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button size="sm" variant="secondary" className="h-7">
						<TagIcon />
						<Trans>Add tag</Trans>
					</Button>
				}
			/>
			<PopoverContent align="start" className="w-56 p-2">
				<div className="flex gap-2">
					<Input
						autoFocus
						value={value}
						placeholder={t`New tag…`}
						onChange={(event) => setValue(event.target.value)}
						onKeyDown={(event) => event.key === "Enter" && submit()}
					/>
					<Button size="sm" onClick={submit}>
						<Trans>Add</Trans>
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
