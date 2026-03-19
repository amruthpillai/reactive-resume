import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { TrashSimpleIcon, WarningIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useConfirm } from "@/hooks/use-confirm";
import { authClient } from "@/integrations/auth/client";
import { orpc } from "@/integrations/orpc/client";

import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/danger-zone")({
  component: RouteComponent,
});

const CONFIRMATION_TEXT = "delete";

function RouteComponent() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [confirmationText, setConfirmationText] = useState("");
  const isConfirmationValid = confirmationText === CONFIRMATION_TEXT;

  const { mutate: deleteAccount } = useMutation(orpc.auth.deleteAccount.mutationOptions());

  const handleDeleteAccount = async () => {
    const confirmed = await confirm(t`Are you sure you want to delete your account?`, {
      description: t`This action cannot be undone. All your data will be permanently deleted.`,
      confirmText: t`Confirm`,
      cancelText: t`Cancel`,
    });

    if (!confirmed) return;

    const toastId = toast.loading(t`Deleting your account...`);

    deleteAccount(undefined, {
      onSuccess: async () => {
        toast.success(t`Your account has been deleted successfully.`, { id: toastId });
        await authClient.signOut();
        void navigate({ to: "/" });
      },
      onError: (error) => {
        toast.error(error.message, { id: toastId });
      },
    });
  };

  return (
    <div className="space-y-4">
      <DashboardHeader icon={WarningIcon} title={t`Danger Zone`} />

      <Separator />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{ willChange: "transform, opacity" }}
        className="grid max-w-xl gap-6"
      >
        <p className="leading-relaxed">
          <Trans>To delete your account, you need to enter the confirmation text and click the button below.</Trans>
        </p>

        <Input
          type="text"
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder={t`Type "${CONFIRMATION_TEXT}" to confirm`}
        />

        <motion.div
          className="justify-self-end"
          whileHover={!isConfirmationValid ? undefined : { y: -1, scale: 1.01 }}
          whileTap={!isConfirmationValid ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          style={{ willChange: "transform" }}
        >
          <Button variant="destructive" onClick={handleDeleteAccount} disabled={!isConfirmationValid}>
            <TrashSimpleIcon />
            <Trans>Delete Account</Trans>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
