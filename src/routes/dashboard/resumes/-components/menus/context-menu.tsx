import {
	CopySimpleIcon,
	FolderOpenIcon,
	LockSimpleIcon,
	LockSimpleOpenIcon,
	PencilSimpleLineIcon,
	TrashSimpleIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";

type Props = {
	resume: RouterOutput["resume"]["list"][number];
	children: React.ReactNode;
};

export function ResumeContextMenu({ resume, children }: Props) {
	const confirm = useConfirm();
	const { openDialog } = useDialogStore();

	const { mutate: deleteResume } = useMutation(orpc.resume.delete.mutationOptions());
	const { mutate: setLockedResume } = useMutation(orpc.resume.setLocked.mutationOptions());

	const handleUpdate = () => {
		openDialog("resume.update", resume);
	};

	const handleDuplicate = () => {
		openDialog("resume.duplicate", resume);
	};

	const handleToggleLock = async () => {
		if (!resume.isLocked) {
			const confirmation = await confirm("Are you sure you want to lock this resume?", {
				description: "When locked, the resume cannot be updated or deleted.",
			});

			if (!confirmation) return;
		}

		setLockedResume(
			{ id: resume.id, isLocked: !resume.isLocked },
			{
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);
	};

	const handleDelete = async () => {
		const confirmation = await confirm("Are you sure you want to delete this resume?", {
			description: "This action cannot be undone.",
		});

		if (!confirmation) return;

		const toastId = toast.loading("Deleting your resume...");

		deleteResume(
			{ id: resume.id },
			{
				onSuccess: () => {
					toast.success("Your resume has been deleted successfully.", { id: toastId });
				},
				onError: (error) => {
					toast.error(error.message, { id: toastId });
				},
			},
		);
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

			<ContextMenuContent>
				<ContextMenuItem asChild>
					<Link to="/builder/$resumeId" params={{ resumeId: resume.id }}>
						<FolderOpenIcon />
						Open
					</Link>
				</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem disabled={resume.isLocked} onSelect={handleUpdate}>
					<PencilSimpleLineIcon />
					Update
				</ContextMenuItem>

				<ContextMenuItem onSelect={handleDuplicate}>
					<CopySimpleIcon />
					Duplicate
				</ContextMenuItem>

				<ContextMenuItem onSelect={handleToggleLock}>
					{resume.isLocked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
					{resume.isLocked ? Unlock : Lock}
				</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem variant="destructive" disabled={resume.isLocked} onSelect={handleDelete}>
					<TrashSimpleIcon />
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
