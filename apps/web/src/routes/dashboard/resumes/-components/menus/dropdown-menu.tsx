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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { useResumeMenuActions } from "./use-resume-menu-actions";

type Props = Omit<React.ComponentProps<typeof DropdownMenuContent>, "children"> & {
	resume: RouterOutput["resume"]["list"][number];
	children: React.ComponentProps<typeof DropdownMenuTrigger>["render"];
};

export function ResumeDropdownMenu({ resume, children, ...props }: Props) {
	const { handleDelete, handleDuplicate, handleToggleLock, handleUpdate } = useResumeMenuActions(resume);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={children} />

			<DropdownMenuContent {...props}>
				<Link to="/builder/$resumeId" params={{ resumeId: resume.id }}>
					<DropdownMenuItem>
						<FolderOpenIcon />
						<Trans comment="Resume card dropdown action to open the resume editor">Open</Trans>
					</DropdownMenuItem>
				</Link>

				<DropdownMenuSeparator />

				<DropdownMenuItem disabled={resume.isLocked} onClick={handleUpdate}>
					<PencilSimpleLineIcon />
					<Trans comment="Resume card dropdown action to edit resume metadata">Edit details</Trans>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={handleDuplicate}>
					<CopySimpleIcon />
					<Trans comment="Resume card dropdown action to create a copy">Duplicate</Trans>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={handleToggleLock}>
					{resume.isLocked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
					{resume.isLocked ? (
						<Trans comment="Resume card dropdown action to remove edit lock">Unlock</Trans>
					) : (
						<Trans comment="Resume card dropdown action to prevent edits">Lock</Trans>
					)}
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem variant="destructive" disabled={resume.isLocked} onClick={handleDelete}>
					<TrashSimpleIcon />
					<Trans comment="Resume card dropdown destructive action to remove a resume">Delete</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
