import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { getResumeErrorMessage } from "@/utils/error-message";

type Props = Omit<React.ComponentProps<typeof DropdownMenuContent>, "children"> & {
  resume: RouterOutput["resume"]["list"][number];
  children: React.ComponentProps<typeof DropdownMenuTrigger>["render"];
};

export function ResumeDropdownMenu({ resume, children, ...props }: Props) {
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
      const confirmation = await confirm(t`Are you sure you want to lock this resume?`, {
        description: t`When locked, the resume cannot be updated or deleted.`,
      });

      if (!confirmation) return;
    }

    setLockedResume(
      { id: resume.id, isLocked: !resume.isLocked },
      {
        onError: (error) => {
          toast.error(getResumeErrorMessage(error));
        },
      },
    );
  };

  const handleDelete = async () => {
    const confirmation = await confirm(t`Are you sure you want to delete this resume?`, {
      description: t`This action cannot be undone.`,
    });

    if (!confirmation) return;

    const toastId = toast.loading(t`Deleting your resume...`);

    deleteResume(
      { id: resume.id },
      {
        onSuccess: () => {
          toast.success(t`Your resume has been deleted successfully.`, { id: toastId });
        },
        onError: (error) => {
          toast.error(getResumeErrorMessage(error), { id: toastId });
        },
      },
    );
  };

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
          <Trans comment="Resume card dropdown action to edit resume metadata">Update</Trans>
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
