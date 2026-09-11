import type { RouterOutput } from "@/libs/orpc/client";
import { t } from "@lingui/core/macro";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@reactive-resume/ui/components/toast";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { getResumeErrorMessage } from "@/libs/error-message";
import { orpc } from "@/libs/orpc/client";

type Resume = RouterOutput["resume"]["list"][number];

export function useResumeMenuActions(resume: Resume) {
	const confirm = useConfirm();
	const { openDialog } = useDialogStore();
	const { mutate: deleteResume } = useMutation(orpc.resume.delete.mutationOptions());
	const { mutate: setLockedResume } = useMutation(orpc.resume.setLocked.mutationOptions());

	const handleToggleLock = async () => {
		if (!resume.isLocked) {
			const confirmed = await confirm(t`Are you sure you want to lock this resume?`, {
				description: t`When locked, the resume cannot be updated or deleted.`,
			});
			if (!confirmed) return;
		}

		setLockedResume(
			{ id: resume.id, isLocked: !resume.isLocked },
			{ onError: (error) => toast.add({ type: "error", description: getResumeErrorMessage(error) }) },
		);
	};

	const handleDelete = async () => {
		const confirmed = await confirm(t`Are you sure you want to delete this resume?`, {
			description: t`This action cannot be undone.`,
		});
		if (!confirmed) return;

		const toastId = toast.add({ type: "loading", description: t`Deleting your resume...` });
		deleteResume(
			{ id: resume.id },
			{
				onSuccess: () => toast.add({ type: "success", description: t`Your resume has been deleted.`, id: toastId }),
				onError: (error) => toast.add({ type: "error", description: getResumeErrorMessage(error), id: toastId }),
			},
		);
	};

	return {
		handleDelete,
		handleDuplicate: () => openDialog("resume.duplicate", resume),
		handleToggleLock,
		handleUpdate: () => openDialog("resume.update", resume),
	};
}
