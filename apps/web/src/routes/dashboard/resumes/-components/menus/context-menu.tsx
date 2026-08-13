import type { RouterOutput } from "@/libs/orpc/client";
import { Trans } from "@lingui/react/macro";
import {
	CopySimpleIcon,
	FolderOpenIcon,
	LockSimpleIcon,
	LockSimpleOpenIcon,
	PencilSimpleLineIcon,
	TrashSimpleIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@reactive-resume/ui/components/context-menu";
import { useResumeMenuActions } from "./use-resume-menu-actions";

type Props = {
	resume: RouterOutput["resume"]["list"][number];
	children: React.ComponentProps<typeof ContextMenuTrigger>["render"];
};

export function ResumeContextMenu({ resume, children }: Props) {
	const { handleDelete, handleDuplicate, handleToggleLock, handleUpdate } = useResumeMenuActions(resume);

	return (
		<ContextMenu>
			<ContextMenuTrigger render={children} />

			<ContextMenuContent>
				<ContextMenuItem
					render={
						<Link to="/builder/$resumeId" params={{ resumeId: resume.id }}>
							<FolderOpenIcon />
							<Trans comment="Resume card context menu action to open the resume editor">Open</Trans>
						</Link>
					}
				/>

				<ContextMenuSeparator />

				<ContextMenuItem disabled={resume.isLocked} onClick={handleUpdate}>
					<PencilSimpleLineIcon />
					<Trans comment="Resume card context menu action to edit resume metadata">Edit details</Trans>
				</ContextMenuItem>

				<ContextMenuItem onClick={handleDuplicate}>
					<CopySimpleIcon />
					<Trans comment="Resume card context menu action to create a copy">Duplicate</Trans>
				</ContextMenuItem>

				<ContextMenuItem onClick={handleToggleLock}>
					{resume.isLocked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
					{resume.isLocked ? (
						<Trans comment="Resume card context menu action to remove edit lock">Unlock</Trans>
					) : (
						<Trans comment="Resume card context menu action to prevent edits">Lock</Trans>
					)}
				</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem variant="destructive" disabled={resume.isLocked} onClick={handleDelete}>
					<TrashSimpleIcon />
					<Trans comment="Resume card context menu destructive action to remove a resume">Delete</Trans>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
