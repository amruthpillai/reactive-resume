import type { Application } from "../types";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	ArchiveIcon,
	ArrowRightIcon,
	DotsThreeVerticalIcon,
	PencilSimpleIcon,
	TrashIcon,
	TrayArrowUpIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { STAGES } from "@reactive-resume/schema/applications/data";
import { Button } from "@reactive-resume/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { useConfirm } from "@/hooks/use-confirm";
import { orpc } from "@/libs/orpc/client";
import { applicationsListQueryKey } from "../queries";

type Props = {
	application: Application;
	onEdit: (application: Application) => void;
	// Whether the trigger should only appear on hover of the parent (cards). Rows keep it visible.
	showOnHover?: boolean;
	className?: string;
};

// Stop pointer/click from reaching the card (which would start a drag or open the detail panel).
// React portals bubble synthetic events through the React tree, so a menu-item click would
// otherwise reach the card's onClick even though the menu is portaled in the DOM.
const stop = (event: React.SyntheticEvent) => event.stopPropagation();

// Shared kebab menu for board cards and table rows: edit, move stage, archive, delete.
export function ApplicationActionsMenu({ application, onEdit, showOnHover, className }: Props) {
	const queryClient = useQueryClient();
	const confirm = useConfirm();

	const invalidate = () => {
		void queryClient.invalidateQueries({ queryKey: applicationsListQueryKey() });
		void queryClient.invalidateQueries({ queryKey: orpc.applications.stats.queryKey() });
		void queryClient.invalidateQueries({ queryKey: orpc.applications.tags.queryKey() });
	};

	const update = useMutation(
		orpc.applications.update.mutationOptions({
			onSuccess: invalidate,
			onError: () => toast.add({ type: "error", description: t`Something went wrong. Please try again.` }),
		}),
	);

	const remove = useMutation(
		orpc.applications.delete.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.add({ type: "success", description: t`Application deleted.` });
			},
			onError: () => toast.add({ type: "error", description: t`Couldn't delete the application.` }),
		}),
	);

	const onDelete = async () => {
		const confirmed = await confirm(t`Delete this application?`, {
			description: t`"${application.role} · ${application.company}" and its full timeline will be permanently deleted. This can't be undone.`,
			confirmText: t`Delete`,
		});
		if (confirmed) remove.mutate({ id: application.id });
	};

	return (
		<div className={cn("shrink-0", className)}>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							size="icon-sm"
							variant="ghost"
							aria-label={t`Application actions`}
							onClick={stop}
							onPointerDown={stop}
							className={cn(
								"size-6 text-muted-foreground",
								showOnHover &&
									"opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[popup-open]:opacity-100",
							)}
						>
							<DotsThreeVerticalIcon />
						</Button>
					}
				/>
				<DropdownMenuContent align="end" className="w-44" onClick={stop}>
					<DropdownMenuItem onClick={() => onEdit(application)}>
						<PencilSimpleIcon />
						<Trans>Edit</Trans>
					</DropdownMenuItem>

					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<ArrowRightIcon />
							<Trans>Move to</Trans>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							{STAGES.map((stage) => (
								<DropdownMenuItem
									key={stage.value}
									disabled={stage.value === application.status}
									onClick={() => update.mutate({ id: application.id, status: stage.value })}
								>
									<span className="size-2 rounded-sm" style={{ background: stage.color }} />
									{stage.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					<DropdownMenuItem onClick={() => update.mutate({ id: application.id, archived: !application.archived })}>
						{application.archived ? <TrayArrowUpIcon /> : <ArchiveIcon />}
						{application.archived ? <Trans>Unarchive</Trans> : <Trans>Archive</Trans>}
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem variant="destructive" onClick={onDelete}>
						<TrashIcon />
						<Trans>Delete</Trans>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
